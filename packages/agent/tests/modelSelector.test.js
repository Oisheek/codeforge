import test from "node:test";
import assert from "node:assert/strict";

import {
  createModelSelector,
  MODEL_ROLES,
} from "../modelSelector.js";

function createFakeProvider(response) {
  return {
    calls: [],

    async generate(options) {
      this.calls.push(options);

      return {
        message: {
          content: response,
        },
      };
    },
  };
}

test(
  "selects a model role from structured model output",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          role: "heavyCoding",
          confidence: 0.93,
          complexity: "high",
          reasoningRequired: true,
          toolRequired: true,
          retrievalRequired: true,
        })
      );

    const selector =
      createModelSelector({
        provider,
        model: "selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Debug the fallback system and trace why the wrong provider is selected.",
        intent: "debug",
        plan: {
          requiresRAG: true,
          requiresThinking: true,
          requiresTools: true,
        },
        availableRoles:
          MODEL_ROLES,
      });

    assert.deepEqual(
      result,
      {
        role: "heavyCoding",
        confidence: 0.93,
        complexity: "high",
        reasoningRequired: true,
        toolRequired: true,
        source: "model",
      }
    );

    assert.equal(
      provider.calls.length,
      1
    );

    assert.equal(
      provider.calls[0].model,
      "selector-model"
    );
  }
);

test(
  "accepts fenced JSON from the selector model",
  async () => {
    const provider =
      createFakeProvider(
        [
          "Here is the routing decision:",
          "```json",
          JSON.stringify({
            role: "fast",
            confidence: 0.88,
            complexity: "low",
            reasoningRequired: false,
            toolRequired: false,
            retrievalRequired: false,
          }),
          "```",
        ].join("\n")
      );

    const selector =
      createModelSelector({
        provider,
        model: "selector-model",
      });

    const result =
      await selector.select({
        prompt: "Hello",
        intent: "chat",
        plan: {},
      });

    assert.equal(
      result.role,
      "fast"
    );

    assert.equal(
      result.confidence,
      0.88
    );

    assert.equal(
      result.source,
      "model"
    );
  }
);

test(
  "rejects an unknown model role",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          role: "unknown-model",
          confidence: 0.99,
          complexity: "high",
          reasoningRequired: true,
          toolRequired: true,
          retrievalRequired: true,
        })
      );

    const selector =
      createModelSelector({
        provider,
        model: "selector-model",
      });

    const result =
      await selector.select({
        prompt: "Implement a compiler",
        intent: "code",
        plan: {
          requiresThinking: true,
          requiresTools: true,
          requiresRAG: true,
        },
      });

    assert.equal(
      result.source,
      "fallback"
    );

    assert.equal(
      result.role,
      "planner"
    );
  }
);

test(
  "falls back safely when selector returns malformed JSON",
  async () => {
    const provider =
      createFakeProvider(
        "I think this should use the coding model."
      );

    const selector =
      createModelSelector({
        provider,
        model: "selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Implement the authentication system",
        intent: "code",
        plan: {
          requiresThinking: true,
          requiresTools: true,
          requiresRAG: true,
        },
      });

    assert.equal(
      result.source,
      "fallback"
    );

    assert.equal(
      result.role,
      "planner"
    );

    assert.equal(
      result.reasoningRequired,
      true
    );

    assert.equal(
      result.toolRequired,
      true
    );
  }
);

test(
  "falls back when the selector model fails",
  async () => {
    const provider = {
      async generate() {
        throw new Error(
          "selector unavailable"
        );
      },
    };

    const selector =
      createModelSelector({
        provider,
        model: "selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Review this implementation",
        intent: "review",
        plan: {
          requiresThinking: true,
          requiresRAG: true,
        },
      });

    assert.equal(
      result.source,
      "fallback"
    );

    assert.equal(
      result.role,
      "planner"
    );
  }
);

test(
  "works without a configured selector model",
  async () => {
    const selector =
      createModelSelector({
        provider: null,
        model: null,
      });

    const result =
      await selector.select({
        prompt:
          "Write a function",
        intent: "code",
        plan: {
          requiresThinking: true,
          requiresWrite: true,
          requiresRAG: true,
        },
      });

    assert.equal(
      result.source,
      "fallback"
    );

    assert.equal(
      result.role,
      "planner"
    );
  }
);

test(
  "uses the first available role when the fallback role is unavailable",
  async () => {
    const selector =
      createModelSelector({
        provider: null,
        model: null,
      });

    const result =
      await selector.select({
        prompt:
          "Do something complicated",
        intent: "code",
        plan: {
          requiresThinking: true,
        },
        availableRoles: [
          "general",
          "fast",
        ],
      });

    assert.equal(
      result.role,
      "general"
    );
  }
);

test(
  "clamps selector confidence to the valid range",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          role: "coding",
          confidence: 42,
          complexity: "high",
          reasoningRequired: true,
          toolRequired: true,
          retrievalRequired: true,
        })
      );

    const selector =
      createModelSelector({
        provider,
        model: "selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Implement this feature",
        intent: "code",
        plan: {
          requiresThinking: true,
        },
      });

    assert.equal(
      result.confidence,
      1
    );
  }
);