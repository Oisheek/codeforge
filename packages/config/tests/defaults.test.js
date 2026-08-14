import test from "node:test";
import assert from "node:assert/strict";

import { defaultConfig } from "../defaults.js";

test("defines model selector defaults", () => {
  assert.deepEqual(
    defaultConfig.selectors,
   {
  provider: "openrouter",
  rag: "inclusionai/ling-3.0-flash:free",
  model: "inclusionai/ling-3.0-flash:free",
  maxTokens: 128,
  modelMaxTokens: 256,
}
  );
});

test("defines all required model roles", () => {
  assert.ok(defaultConfig.models.fast);
  assert.ok(defaultConfig.models.general);
  assert.ok(defaultConfig.models.coding);
  assert.ok(defaultConfig.models.heavyCoding);
  assert.ok(defaultConfig.models.planner);
  assert.ok(defaultConfig.models.subagent);
});

test("defines model fallback configuration", () => {
  assert.ok(defaultConfig.models.fallback);
  assert.ok(defaultConfig.models.emergency);
});