import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const EMULATOR_DATA_DIR = join(process.cwd(), "emulator-data");

if (existsSync(EMULATOR_DATA_DIR)) {
  rmSync(EMULATOR_DATA_DIR, { recursive: true, force: true });
  console.log(`Removed ${EMULATOR_DATA_DIR}`);
}

mkdirSync(EMULATOR_DATA_DIR, { recursive: true });
console.log(`Created empty ${EMULATOR_DATA_DIR}`);
