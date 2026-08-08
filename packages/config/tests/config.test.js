import test from "node:test";
import assert from "node:assert/strict";

import {
  loadConfig,
  validateConfig,
} from "../config.js";

test("loads selector defaults", () => {
  const config = loadConfig();

  assert.equal(
    config.selectors.provider,
    "openrouter"
  );

  assert.equal(
    config.selectors.rag,
    "google/gemma-4-31b-it:free"
  );

  assert.equal(
    config.selectors.model,
    "google/gemma-4-31b-it:free"
  );

  assert.equal(
    config.selectors.maxTokens,
    128
  );

  assert.equal(
    config.selectors.modelMaxTokens,
    256
  );
});

test("preserves selector configuration when loading config", () => {
  const config = loadConfig();

  assert.ok(
    config.selectors
  );

  assert.equal(
    typeof config.selectors.provider,
    "string"
  );

  assert.equal(
    typeof config.selectors.rag,
    "string"
  );

  assert.equal(
    typeof config.selectors.model,
    "string"
  );

  assert.equal(
    typeof config.selectors.maxTokens,
    "number"
  );

  assert.equal(
    typeof config.selectors.modelMaxTokens,
    "number"
  );
});

test("uses environment variables to override model roles", () => {
  const previousCoding =
    process.env.CODEFORGE_MODEL_CODING;

  const previousGeneral =
    process.env.CODEFORGE_MODEL_GENERAL;

  try {
    process.env.CODEFORGE_MODEL_CODING =
      "env-coding-model";

    process.env.CODEFORGE_MODEL_GENERAL =
      "env-general-model";

    const config = loadConfig();

    assert.equal(
      config.models.coding,
      "env-coding-model"
    );

    assert.equal(
      config.models.general,
      "env-general-model"
    );
  } finally {
    if (
      previousCoding === undefined
    ) {
      delete process.env.CODEFORGE_MODEL_CODING;
    } else {
      process.env.CODEFORGE_MODEL_CODING =
        previousCoding;
    }

    if (
      previousGeneral === undefined
    ) {
      delete process.env.CODEFORGE_MODEL_GENERAL;
    } else {
      process.env.CODEFORGE_MODEL_GENERAL =
        previousGeneral;
    }
  }
});

test("ignores empty model environment overrides", () => {
  const previousCoding =
    process.env.CODEFORGE_MODEL_CODING;

  try {
    process.env.CODEFORGE_MODEL_CODING =
      "   ";

    const config = loadConfig();

    assert.notEqual(
      config.models.coding,
      ""
    );

    assert.notEqual(
      config.models.coding,
      "   "
    );
  } finally {
    if (
      previousCoding === undefined
    ) {
      delete process.env.CODEFORGE_MODEL_CODING;
    } else {
      process.env.CODEFORGE_MODEL_CODING =
        previousCoding;
    }
  }
});

test("accepts a valid loaded configuration", () => {
  const config = loadConfig();

  assert.equal(
    validateConfig(config),
    true
  );
});

test("rejects a configuration without a provider", () => {
  const config = loadConfig();

  delete config.provider;

  assert.throws(
    () => validateConfig(config),
    /provider must be a non-empty string/
  );
});

test("rejects a configuration with an invalid model role", () => {
  const config = loadConfig();

  config.models.coding = "";

  assert.throws(
    () => validateConfig(config),
    /model "coding" must be a non-empty string/
  );
});

test("rejects a configuration without selectors", () => {
  const config = loadConfig();

  delete config.selectors;

  assert.throws(
    () => validateConfig(config),
    /selectors must be an object/
  );
});

test("rejects invalid selector token limits", () => {
  const config = loadConfig();

  config.selectors.maxTokens = 0;

  assert.throws(
    () => validateConfig(config),
    /selector "maxTokens" must be a positive number/
  );
});

test("rejects invalid runtime token limits", () => {
  const config = loadConfig();

  config.maxTokens = -1;

  assert.throws(
    () => validateConfig(config),
    /maxTokens must be a positive number/
  );
});