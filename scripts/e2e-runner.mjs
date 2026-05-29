import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "fast";

const BASE_URLS = {
  fast: "http://127.0.0.1:4200",
  smoke: "http://127.0.0.1:5000",
  regression: "http://127.0.0.1:5000",
};

const baseUrl = BASE_URLS[mode];
if (!baseUrl) {
  console.error(`Unknown mode: ${mode}. Use one of: fast, smoke, regression`);
  process.exit(1);
}

function listSpecFiles(dir) {
  if (!existsSync(dir)) return [];

  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const info = statSync(fullPath);
      if (info.isDirectory()) {
        walk(fullPath);
      } else if (/(\.spec\.|\.test\.)/.test(entry)) {
        files.push(fullPath);
      }
    }
  };

  walk(dir);
  return files;
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function waitForUrl(url, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const attempt = async () => {
      try {
        const response = await fetch(url);
        if (response.status >= 200 && response.status < 500) {
          resolve();
          return;
        }
      } catch {
        // Keep retrying until timeout.
      }

      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(attempt, 1000);
    };

    attempt();
  });
}

async function main() {
  const specs = listSpecFiles(join(process.cwd(), "e2e"));
  if (specs.length === 0) {
    console.log("No E2E specs found under e2e/. Skipping E2E run.");
    process.exit(0);
  }

  if (mode === "smoke" || mode === "regression") {
    run("npm", ["run", "build:local"]);
  }

  console.log(`Waiting for test target: ${baseUrl}`);
  await waitForUrl(baseUrl);

  const env = {
    ...process.env,
    PLAYWRIGHT_BASE_URL: baseUrl,
  };

  const playwrightArgs = ["exec", "playwright", "test"];
  if (mode === "smoke") {
    playwrightArgs.push("--grep", "@smoke");
  }

  console.log(
    `Running Playwright (${mode}) against ${baseUrl}${
      mode === "smoke" ? " with @smoke filter" : ""
    }`,
  );

  run("npm", playwrightArgs, env);
}

main().catch((error) => {
  console.error(`E2E runner failed: ${error.message}`);
  console.error(
    "If Playwright is not installed yet, install it with: npm install -D @playwright/test playwright",
  );
  process.exit(1);
});
