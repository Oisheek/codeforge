import test from "node:test";
import assert from "node:assert/strict";

import {
  createRagSelector,
  RAG_SCOPES,
} from "../ragSelector.js";

function createFakeProvider(
  response
) {
  return {
    calls: [],

    async generate(options) {
      this.calls.push(
        options
      );

      return {
        message: {
          content: response,
        },
      };
    },
  };
}

test(
  "selects repository RAG for a repository architecture question",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          required: true,
          scope: "repository",
          confidence: 0.97,
        })
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain how our routing and fallback architecture works.",
        plan: {},
      });

    assert.deepEqual(
      result,
      {
        required: true,
        scope: "repository",
        confidence: 0.97,
        source: "model",
      }
    );

    assert.equal(
      provider.calls.length,
      1
    );

    assert.equal(
      provider.calls[0].model,
      "rag-selector-model"
    );
  }
);

test(
  "selects no RAG for general programming knowledge",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          required: false,
          scope: "none",
          confidence: 0.99,
        })
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain recursion in programming.",
        plan: {},
      });

    assert.equal(
      result.required,
      false
    );

    assert.equal(
      result.scope,
      "none"
    );

    assert.equal(
      result.source,
      "model"
    );
  }
);

test(
  "does not select repository RAG for general code generation",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          required: true,
          scope: "repository",
          confidence: 0.99,
        })
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Write a JavaScript function that reverses a string.",
        plan: {
          intent: "code",
          requiresRAG: true,
        },
      });

    assert.equal(
      result.required,
      false
    );

    assert.equal(
      result.scope,
      "none"
    );
  }
);

test(
  "supports file-level retrieval decisions",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          required: true,
          scope: "file",
          confidence: 0.94,
        })
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain packages/agent/router.js.",
        plan: {
          directFileTarget: true,
        },
      });

    assert.equal(
      result.required,
      true
    );

    assert.equal(
      result.scope,
      "file"
    );

    assert.equal(
      result.confidence,
      0.94
    );
  }
);

test(
  "supports symbol-level retrieval decisions",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          required: true,
          scope: "symbol",
          confidence: 0.91,
        })
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "What does resolveModelRole do?",
        plan: {},
      });

    assert.equal(
      result.required,
      true
    );

    assert.equal(
      result.scope,
      "symbol"
    );

    assert.equal(
      result.source,
      "model"
    );
  }
);

test(
  "accepts fenced JSON",
  async () => {
    const provider =
      createFakeProvider(
        [
          "```json",
          JSON.stringify({
            required: true,
            scope: "repository",
            confidence: 0.88,
          }),
          "```",
        ].join("\n")
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain our repository architecture.",
        plan: {},
      });

    assert.equal(
      result.required,
      true
    );

    assert.equal(
      result.scope,
      "repository"
    );

    assert.equal(
      result.source,
      "model"
    );
  }
);

test(
  "rejects an unknown RAG scope",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          required: true,
          scope: "database",
          confidence: 0.99,
        })
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain our database.",
        plan: {},
      });

    assert.equal(
      result.source,
      "fallback"
    );

    assert.equal(
      result.required,
      false
    );

    assert.equal(
      result.scope,
      "none"
    );
  }
);

test(
  "rejects contradictory no-RAG decisions",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          required: false,
          scope: "repository",
          confidence: 0.99,
        })
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain our repository.",
        plan: {},
      });

    assert.equal(
      result.source,
      "fallback"
    );
  }
);

test(
  "falls back when the selector returns malformed JSON",
  async () => {
    const provider =
      createFakeProvider(
        "I think repository context is needed."
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain our routing system.",
        plan: {},
      });

    assert.equal(
      result.source,
      "fallback"
    );

    assert.equal(
      result.required,
      true
    );

    assert.equal(
      result.scope,
      "repository"
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
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain our routing system.",
        plan: {},
      });

    assert.equal(
      result.source,
      "fallback"
    );

    assert.equal(
      result.required,
      true
    );

    assert.equal(
      result.scope,
      "repository"
    );
  }
);

test(
  "works without a configured selector model",
  async () => {
    const selector =
      createRagSelector({
        provider: null,
        model: null,
      });

    const result =
      await selector.select({
        prompt:
          "Explain recursion.",
        plan: {},
      });

    assert.equal(
      result.source,
      "fallback"
    );

    assert.equal(
      result.required,
      false
    );

    assert.equal(
      result.scope,
      "none"
    );
  }
);

test(
  "uses repository fallback for explicit repository references",
  async () => {
    const selector =
      createRagSelector({
        provider: null,
        model: null,
      });

    const result =
      await selector.select({
        prompt:
          "Explain the implementation in this repository.",
        plan: {},
      });

    assert.equal(
      result.required,
      true
    );

    assert.equal(
      result.scope,
      "repository"
    );

    assert.equal(
      result.source,
      "fallback"
    );
  }
);

test(
  "uses file fallback for direct file targets",
  async () => {
    const selector =
      createRagSelector({
        provider: null,
        model: null,
      });

    const result =
      await selector.select({
        prompt:
          "Explain packages/agent/router.js",
        plan: {
          directFileTarget: true,
        },
      });

    assert.equal(
      result.required,
      true
    );

    assert.equal(
      result.scope,
      "file"
    );
  }
);

test(
  "uses planner RAG as a safe fallback",
  async () => {
    const selector =
      createRagSelector({
        provider: null,
        model: null,
      });

    const result =
      await selector.select({
        prompt:
          "Analyze this implementation.",
        plan: {
          requiresRAG: true,
        },
      });

    assert.equal(
      result.required,
      true
    );

    assert.equal(
      result.scope,
      "repository"
    );
  }
);

test(
  "clamps confidence to the valid range",
  async () => {
    const provider =
      createFakeProvider(
        JSON.stringify({
          required: true,
          scope: "repository",
          confidence: 42,
        })
      );

    const selector =
      createRagSelector({
        provider,
        model: "rag-selector-model",
      });

    const result =
      await selector.select({
        prompt:
          "Explain our architecture.",
        plan: {},
      });

    assert.equal(
      result.confidence,
      1
    );
  }
);

test(
  "exposes the supported RAG scopes",
  () => {
    assert.deepEqual(
      RAG_SCOPES,
      [
        "none",
        "file",
        "symbol",
        "repository",
      ]
    );
  }
);