import { GoogleGenAI } from '@google/genai';

// Get API key from argument or environment variable
const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Error: Gemini API key is required.');
  console.log('\nUsage:');
  console.log('  node scripts/test-models-availability.mjs <your_api_key>');
  console.log('  OR set the GEMINI_API_KEY environment variable and run:');
  console.log('  node scripts/test-models-availability.mjs');
  process.exit(1);
}

const testPrompt = 'Say "Hello! I am working." in exactly 5 words or less.';
const modelsToTest = [
  'models/gemma-4-26b-a4b-it',
  'models/gemma-4-31b-it',
  'models/gemini-flash-latest',
  'models/gemini-flash-lite-latest',
  'models/gemini-pro-latest',
  'models/gemini-3.1-pro-preview',
  'models/gemini-3.1-flash-lite',
  'models/gemini-3.5-flash',
];

console.log('🔍 Testing Gemini Model Availability\n');
console.log(`API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}`);
console.log(`Test Prompt: "${testPrompt}"\n`);
console.log('═══════════════════════════════════════════════════════════════════════════════');

const results = {
  available: [],
  unavailable: [],
  errors: [],
};

async function testModel(modelName) {
  const startTime = Date.now();
  try {
    console.log(`\n⏳ Testing: ${modelName}`);
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: testPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 100,
      },
    });

    const duration = Date.now() - startTime;
    const text = response.text || '';
    
    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log(`   Response: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
    results.available.push({
      model: modelName,
      duration,
      responsePreview: text.substring(0, 100),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const status = error.status || error.code || 'UNKNOWN';
    const message = error.message || 'Unknown error';
    
    if (error.status === 503 || message.includes('high demand')) {
      console.log(`⚠️  UNAVAILABLE - 503 High Demand (${duration}ms)`);
      console.log(`   Message: ${message}`);
      results.unavailable.push({
        model: modelName,
        reason: '503 High Demand',
        duration,
      });
    } else {
      console.log(`❌ ERROR - ${status} (${duration}ms)`);
      console.log(`   Message: ${message}`);
      results.errors.push({
        model: modelName,
        status,
        message,
        duration,
      });
    }
  }
}

async function main() {
  // Test each model sequentially
  for (const model of modelsToTest) {
    await testModel(model);
    // Add a small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('\n📊 TEST SUMMARY\n');
  
  console.log(`✅ Available Models (${results.available.length}):`);
  if (results.available.length === 0) {
    console.log('   None');
  } else {
    results.available.forEach(m => {
      console.log(`   • ${m.model} (${m.duration}ms)`);
      console.log(`     Response: "${m.responsePreview}"`);
    });
  }

  console.log(`\n⚠️  High Demand / Unavailable (${results.unavailable.length}):`);
  if (results.unavailable.length === 0) {
    console.log('   None');
  } else {
    results.unavailable.forEach(m => {
      console.log(`   • ${m.model} (${m.duration}ms)`);
      console.log(`     Reason: ${m.reason}`);
    });
  }

  console.log(`\n❌ Errors (${results.errors.length}):`);
  if (results.errors.length === 0) {
    console.log('   None');
  } else {
    results.errors.forEach(m => {
      console.log(`   • ${m.model} (${m.duration}ms)`);
      console.log(`     Status: ${m.status}`);
      console.log(`     Message: ${m.message}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('\n💡 Recommendations:\n');
  
  if (results.available.length > 0) {
    console.log(`✅ You can use these models right now:`);
    results.available.forEach(m => {
      console.log(`   • ${m.model}`);
    });
  }

  if (results.unavailable.length > 0) {
    console.log(`\n⏰ These models are experiencing high demand. Try again in a few minutes:`);
    results.unavailable.forEach(m => {
      console.log(`   • ${m.model}`);
    });
    console.log('\n   💡 Google\'s free tier is popular! Consider:');
    console.log('      1. Waiting a few minutes and retrying');
    console.log('      2. Using one of the available models instead');
    console.log('      3. Enabling billing to get access to Tier 1 (higher limits)');
  }

  if (results.errors.length > 0) {
    console.log(`\n❌ These models have other issues:`);
    results.errors.forEach(m => {
      console.log(`   • ${m.model}: ${m.message}`);
    });
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
