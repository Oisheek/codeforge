import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { defaultConfig } from "./defaults.js";

const CONFIG_DIR = path.join(os.homedir(), ".codeforge");

const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const SESSION_FILE = path.join(CONFIG_DIR, "session.json");

const CACHE_DIR = path.join(CONFIG_DIR, "cache");
const LOGS_DIR = path.join(CONFIG_DIR, "logs");
const HISTORY_DIR = path.join(CONFIG_DIR, "history");

function ensureConfigDirectory() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

function ensureConfigFile() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(defaultConfig, null, 2),
      "utf8"
    );
  }
}

function ensureSessionFile() {
  if (!fs.existsSync(SESSION_FILE)) {
    fs.writeFileSync(
      SESSION_FILE,
      JSON.stringify({}, null, 2),
      "utf8"
    );
  }
}

export function loadConfig() {
  ensureConfigDirectory();
  ensureConfigFile();
  ensureSessionFile();

  const config = JSON.parse(
    fs.readFileSync(CONFIG_FILE, "utf8")
  );

  const finalConfig = {
    ...defaultConfig,
    ...config,

    // Runtime values from environment
    apiKey: process.env.OPENROUTER_API_KEY,

    model:
      process.env.OPENROUTER_MODEL ??
      config.model ??
      defaultConfig.model,

    temperature: Number(
      process.env.OPENROUTER_TEMPERATURE ??
      config.temperature ??
      defaultConfig.temperature
    ),

    maxTokens: Number(
      process.env.OPENROUTER_MAX_TOKENS ??
      config.maxTokens ??
      defaultConfig.maxTokens
    ),
  };
  return finalConfig;
}

export function saveConfig(config) {
  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(config, null, 2),
    "utf8"
  );
}