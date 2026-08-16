#!/usr/bin/env node

import packageJson from "../../../package.json" with { type: "json" };
import { bootstrap } from "./bootstrap.js";

const VERSION = packageJson.version;

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(`CodeForge AI v${VERSION}`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
CodeForge AI v${VERSION}
Terminal-native AI Software Engineering Agent

Usage:
  codeforge              Start CodeForge
  codeforge --help       Show this help
  codeforge --version    Show version

Environment:
  OPENROUTER_API_KEY     OpenRouter API key
`);
  process.exit(0);
}

bootstrap();
