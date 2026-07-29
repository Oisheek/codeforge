import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { testScanner } from "./scanner.js";
import { testGit } from "./git.js";
import { testProvider } from "./provider.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../../../.env");

console.log("Loading .env from:", envPath);

const result = dotenv.config({
  path: envPath,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

console.log("Environment loaded successfully.");
console.log("cwd:", process.cwd());
console.log(
  "apiKey:",
  process.env.OPENROUTER_API_KEY ? "[present]" : "[missing]"
);
console.log("model:", process.env.OPENROUTER_MODEL);

await testScanner();
await testGit();
await testProvider();