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

const configuredModels = {
  ...defaultConfig.models,
  ...(config.models ?? {}),
};

function resolveModel(
  environmentVariable,
  configuredValue,
  defaultValue
) {
  const environmentValue =
    process.env[environmentVariable];

  if (
    typeof environmentValue === "string" &&
    environmentValue.trim().length > 0
  ) {
    return environmentValue.trim();
  }

  if (
    typeof configuredValue === "string" &&
    configuredValue.trim().length > 0
  ) {
    return configuredValue.trim();
  }

  return defaultValue;
}

const finalConfig = {
  ...defaultConfig,
  ...config,

  selectors: {
    ...defaultConfig.selectors,
    ...(config.selectors ?? {}),
  },

  // Runtime values from environment
  apiKey: process.env.OPENROUTER_API_KEY,

  models: {
    fast: resolveModel(
      "CODEFORGE_MODEL_FAST",
      configuredModels.fast,
      defaultConfig.models.fast
    ),

    general: resolveModel(
      "CODEFORGE_MODEL_GENERAL",
      configuredModels.general,
      defaultConfig.models.general
    ),

    coding: resolveModel(
      "CODEFORGE_MODEL_CODING",
      configuredModels.coding,
      defaultConfig.models.coding
    ),

    heavyCoding: resolveModel(
      "CODEFORGE_MODEL_HEAVY_CODING",
      configuredModels.heavyCoding,
      defaultConfig.models.heavyCoding
    ),

    planner: resolveModel(
      "CODEFORGE_MODEL_PLANNER",
      configuredModels.planner,
      defaultConfig.models.planner
    ),

    subagent: resolveModel(
      "CODEFORGE_MODEL_SUBAGENT",
      configuredModels.subagent,
      defaultConfig.models.subagent
    ),

    vision: resolveModel(
      "CODEFORGE_MODEL_VISION",
      configuredModels.vision,
      defaultConfig.models.vision
    ),

    documentVision: resolveModel(
      "CODEFORGE_MODEL_DOCUMENT_VISION",
      configuredModels.documentVision,
      defaultConfig.models.documentVision
    ),

    embedding: resolveModel(
      "CODEFORGE_MODEL_EMBEDDING",
      configuredModels.embedding,
      defaultConfig.models.embedding
    ),

    reranker: resolveModel(
      "CODEFORGE_MODEL_RERANKER",
      configuredModels.reranker,
      defaultConfig.models.reranker
    ),

    fallback: resolveModel(
      "CODEFORGE_MODEL_FALLBACK",
      configuredModels.fallback,
      defaultConfig.models.fallback
    ),

    emergency: resolveModel(
      "CODEFORGE_MODEL_EMERGENCY",
      configuredModels.emergency,
      defaultConfig.models.emergency
    ),
  },

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