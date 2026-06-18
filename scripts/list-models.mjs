import { GoogleGenAI } from '@google/genai';

// Get API key from argument or environment variable
const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Error: Gemini API key is required.');
  console.log('\nUsage:');
  console.log('  node scripts/list-models.mjs <your_api_key>');
  console.log('  OR set the GEMINI_API_KEY environment variable and run:');
  console.log('  node scripts/list-models.mjs');
  process.exit(1);
}

console.log('🔍 Fetching available Gemini models from Google AI Studio...');

try {
  const ai = new GoogleGenAI({ apiKey });
  const models = await ai.models.list();
  
  console.log('\n✅ Available Models:');
  console.log('================================================================================');
  
  for await (const model of models) {
    const actions = model.supportedActions?.join(', ') || 'None';
    console.log(`Model ID:     ${model.name}`);
    console.log(`Display Name: ${model.displayName}`);
    console.log(`Description:  ${model.description || 'No description'}`);
    console.log(`Input Limit:  ${model.inputTokenLimit?.toLocaleString() || 'N/A'} tokens`);
    console.log(`Output Limit: ${model.outputTokenLimit?.toLocaleString() || 'N/A'} tokens`);
    console.log(`Actions:      ${actions}`);
    console.log('--------------------------------------------------------------------------------');
  }
} catch (error) {
  console.error('\n❌ Error calling Gemini API:');
  if (error.status) {
    console.error(`Status Code: ${error.status}`);
  }
  console.error(error.message || error);
  console.log('\nIf you are seeing a 503 (Service Unavailable) or high demand error, Google\'s servers are currently overloaded.');
}
