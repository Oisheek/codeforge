import test from "node:test";
import assert from "node:assert/strict";

import { routeRequest } from "../router.js";

test("uses the model selector role when routing", () => {
  const route = routeRequest({
    plan: {
      intent: "code",
      modelRole: "heavyCoding",
      requiresThinking: true,
    },
    config: {
      models: {
        fast: "fast-model",
        general: "general-model",
        coding: "coding-model",
        planner: "planner-model",
        heavyCoding: "heavy-model",
      },
    },
  });

  assert.equal(route.modelRole, "heavyCoding");
  assert.equal(route.model, "heavy-model");
});

test("falls back to deterministic routing when no model role is selected", () => {
  const route = routeRequest({
    plan: {
      intent: "code",
      requiresThinking: true,
    },
    config: {
      models: {
        coding: "coding-model",
        planner: "planner-model",
      },
    },
  });

  assert.equal(route.modelRole, "planner");
  assert.equal(route.model, "planner-model");
});

test("uses the selected role even when it differs from the detected intent", () => {
  const route = routeRequest({
    plan: {
      intent: "code",
      modelRole: "fast",
      requiresThinking: false,
    },
    config: {
      models: {
        fast: "fast-model",
        coding: "coding-model",
      },
    },
  });

  assert.equal(route.modelRole, "fast");
  assert.equal(route.model, "fast-model");
});