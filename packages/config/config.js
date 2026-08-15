import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { defaultConfig } from "./defaults.js";

const CONFIG_DIR = path.join(os.homedir(), ".codeforge");
const CURRENT_CONFIG_VERSION = 2;

const MODEL_ROLES = [
  "fast",
  "general",
  "coding",
  "heavyCoding",
  "planner",
  "subagent",
  "vision",
  "documentVision",
  "embedding",
  "reranker",
  "fallback",
  "emergency",
];

const SELECTOR_ROLES = [
  "rag",
  "model",
];

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
      JSON.stringify(
        {
          ...defaultConfig,
          configVersion: CURRENT_CONFIG_VERSION,
        },
        null,
        2
      ),
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

export function validateConfig(config) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    throw new TypeError(
      "Configuration must be an object."
    );
  }

  if (
    typeof config.provider !== "string" ||
    config.provider.trim().length === 0
  ) {
    throw new TypeError(
      "Configuration provider must be a non-empty string."
    );
  }

  if (
    !config.models ||
    typeof config.models !== "object" ||
    Array.isArray(config.models)
  ) {
    throw new TypeError(
      "Configuration models must be an object."
    );
  }

  for (const role of MODEL_ROLES) {
    if (
      typeof config.models[role] !== "string" ||
      config.models[role].trim().length === 0
    ) {
      throw new TypeError(
        `Configuration model "${role}" must be a non-empty string.`
      );
    }
  }

  if (
    !config.selectors ||
    typeof config.selectors !== "object" ||
    Array.isArray(config.selectors)
  ) {
    throw new TypeError(
      "Configuration selectors must be an object."
    );
  }

  if (
    typeof config.selectors.provider !== "string" ||
    config.selectors.provider.trim().length === 0
  ) {
    throw new TypeError(
      "Configuration selector provider must be a non-empty string."
    );
  }

  for (const field of SELECTOR_ROLES) {
    if (
      typeof config.selectors[field] !== "string" ||
      config.selectors[field].trim().length === 0
    ) {
      throw new TypeError(
        `Configuration selector "${field}" must be a non-empty string.`
      );
    }
  }

  for (const field of [
    "maxTokens",
    "modelMaxTokens",
  ]) {
    if (
      !Number.isFinite(config.selectors[field]) ||
      config.selectors[field] <= 0
    ) {
      throw new TypeError(
        `Configuration selector "${field}" must be a positive number.`
      );
    }
  }

  if (!Number.isFinite(config.temperature)) {
    throw new TypeError(
      "Configuration temperature must be a finite number."
    );
  }

  if (
    !Number.isFinite(config.maxTokens) ||
    config.maxTokens <= 0
  ) {
    throw new TypeError(
      "Configuration maxTokens must be a positive number."
    );
  }

  return true;
}

/**
 * Migrate an existing configuration without destroying
 * explicit user customizations.
 *
 * Legacy values that exactly match the old defaults are
 * replaced with the current defaults.
 *
 * Values that differ from the old defaults are preserved.
 */
export function migrateConfig(config) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config)
  ) {
    return {
      config: {
        ...defaultConfig,
        configVersion: CURRENT_CONFIG_VERSION,
      },
      migrated: true,
    };
  }

  const version = Number(config.configVersion ?? 0);

  if (version >= CURRENT_CONFIG_VERSION) {
    return {
      config,
      migrated: false,
    };
  }

  const migratedConfig = {
    ...defaultConfig,
    ...config,

    configVersion: CURRENT_CONFIG_VERSION,

    models: {
      ...defaultConfig.models,
      ...(config.models ?? {}),
    },

    selectors: {
      ...defaultConfig.selectors,
      ...(config.selectors ?? {}),
    },
  };

  return {
    config: migratedConfig,
    migrated: true,
  };
}

function ensureConfig() {
  ensureConfigDirectory();
  ensureConfigFile();
}

function getEnvOverride(name, fallback) {
  const value = process.env[name];

  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

export function loadConfig() {
  ensureConfig();

  let config = {};

  try {
    config = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf8")
    );
  } catch {
    config = {};
  }

  const migration = migrateConfig(config);
  config = migration.config;

  if (migration.migrated) {
    saveConfig(config);
  }

  const configuredModels = {
    ...defaultConfig.models,
    ...(config.models ?? {}),
  };

  const configuredSelectors = {
    ...defaultConfig.selectors,
    ...(config.selectors ?? {}),
  };

const models = {
  fast: getEnvOverride(
    "CODEFORGE_MODEL_FAST",
    configuredModels.fast
  ),

  general: getEnvOverride(
    "CODEFORGE_MODEL_GENERAL",
    configuredModels.general
  ),

  coding: getEnvOverride(
    "CODEFORGE_MODEL_CODING",
    configuredModels.coding
  ),

  heavyCoding: getEnvOverride(
    "CODEFORGE_MODEL_HEAVY_CODING",
    configuredModels.heavyCoding
  ),

  planner: getEnvOverride(
    "CODEFORGE_MODEL_PLANNER",
    configuredModels.planner
  ),

  subagent: getEnvOverride(
    "CODEFORGE_MODEL_SUBAGENT",
    configuredModels.subagent
  ),

  vision: getEnvOverride(
    "CODEFORGE_MODEL_VISION",
    configuredModels.vision
  ),

  documentVision: getEnvOverride(
    "CODEFORGE_MODEL_DOCUMENT_VISION",
    configuredModels.documentVision
  ),

  embedding: getEnvOverride(
    "CODEFORGE_MODEL_EMBEDDING",
    configuredModels.embedding
  ),

  reranker: getEnvOverride(
    "CODEFORGE_MODEL_RERANKER",
    configuredModels.reranker
  ),

  fallback: getEnvOverride(
    "CODEFORGE_MODEL_FALLBACK",
    configuredModels.fallback
  ),

  emergency: getEnvOverride(
    "CODEFORGE_MODEL_EMERGENCY",
    configuredModels.emergency
  ),
};
 const selectors = {
  provider: getEnvOverride(
    "CODEFORGE_SELECTOR_PROVIDER",
    configuredSelectors.provider
  ),

  rag: getEnvOverride(
    "CODEFORGE_SELECTOR_RAG",
    configuredSelectors.rag
  ),

  model: getEnvOverride(
    "CODEFORGE_SELECTOR_MODEL",
    configuredSelectors.model
  ),

  maxTokens: configuredSelectors.maxTokens,

  modelMaxTokens:
    configuredSelectors.modelMaxTokens,
};

  return {
  ...defaultConfig,
  ...config,
  configVersion: CURRENT_CONFIG_VERSION,
  apiKey: getEnvOverride(
    "OPENROUTER_API_KEY",
    config.apiKey ?? ""
  ),
  models,
  selectors,
};
}

export function saveConfig(config) {
  ensureConfigDirectory();

  fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(config, null, 2),
    "utf8"
  );
}

export {
  CONFIG_DIR,
  CONFIG_FILE,
  SESSION_FILE,
  CACHE_DIR,
  LOGS_DIR,
  HISTORY_DIR,
  MODEL_ROLES,
  SELECTOR_ROLES,
  ensureConfigDirectory,
  ensureConfigFile,
  ensureSessionFile,
};