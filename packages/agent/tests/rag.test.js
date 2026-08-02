import test from "node:test";
import assert from "node:assert/strict";

import {
  formatRetrievalResults,
} from "../contextBuilder.js";

import {
  retrieveContext,
} from "../rag.js";

function createRepository(
  results
) {
  return {
    retriever: {
      async search() {
        return results;
      },
    },
  };
}

const ragPlan = {
  requiresRAG: true,
};

test(
  "keeps retrieval evidence within the configured token budget",
  async () => {
    const repository =
      createRepository([
        {
          path: "first.js",
          score: 100,
          reason: "lexical",
          content:
            "a".repeat(400),
          symbols: [],
          imports: [],
          exports: [],
        },

        {
          path: "second.js",
          score: 90,
          reason: "lexical",
          content:
            "b".repeat(400),
          symbols: [],
          imports: [],
          exports: [],
        },

        {
          path: "third.js",
          score: 80,
          reason: "lexical",
          content:
            "c".repeat(400),
          symbols: [],
          imports: [],
          exports: [],
        },
      ]);

    const rag =
      await retrieveContext({
        repository,
        plan: ragPlan,
        query: "routing",
        options: {
          tokenBudget: 250,
        },
      });
const finalEvidence =
  formatRetrievalResults(
    rag.results
  );

const actualEstimatedTokens =
  Math.ceil(
    finalEvidence.length / 4
  );

assert.ok(
  actualEstimatedTokens <=
    rag.stats.tokenBudget
);

assert.equal(
  rag.stats.estimatedTokens,
  actualEstimatedTokens
);
    assert.ok(
      rag.stats.estimatedTokens <=
        rag.stats.tokenBudget
    );

    assert.equal(
      rag.stats.tokenBudget,
      250
    );

    assert.equal(
      rag.stats.retrieved,
      3
    );

    assert.ok(
      rag.stats.selected <
        rag.stats.retrieved
    );

    assert.equal(
      rag.results.length,
      rag.stats.selected
    );
  }
);

test(
  "preserves retrieval ranking order when applying the token budget",
  async () => {
    const repository =
      createRepository([
        {
          path: "highest.js",
          score: 100,
          reason: "lexical",
          content:
            "a".repeat(100),
          symbols: [],
          imports: [],
          exports: [],
        },

        {
          path: "second.js",
          score: 90,
          reason: "lexical",
          content:
            "b".repeat(100),
          symbols: [],
          imports: [],
          exports: [],
        },

        {
          path: "third.js",
          score: 80,
          reason: "lexical",
          content:
            "c".repeat(100),
          symbols: [],
          imports: [],
          exports: [],
        },
      ]);

    const rag =
      await retrieveContext({
        repository,
        plan: ragPlan,
        query: "routing",
        options: {
          tokenBudget: 1000,
        },
      });

    assert.deepEqual(
      rag.results.map(
        (result) =>
          result.path
      ),
      [
        "highest.js",
        "second.js",
        "third.js",
      ]
    );
  }
);

test(
  "reports retrieval budget utilization",
  async () => {
    const repository =
      createRepository([
        {
          path: "router.js",
          score: 100,
          reason: "lexical",
          content:
            "routing evidence",
          symbols: [],
          imports: [],
          exports: [],
        },
      ]);

    const rag =
      await retrieveContext({
        repository,
        plan: ragPlan,
        query: "routing",
        options: {
          tokenBudget: 500,
        },
      });

    assert.equal(
      rag.stats.retrieved,
      1
    );

    assert.equal(
      rag.stats.selected,
      1
    );

    assert.equal(
      rag.stats.tokenBudget,
      500
    );

    assert.ok(
      rag.stats.estimatedTokens > 0
    );

    assert.ok(
      rag.stats.remainingTokens >= 0
    );

    assert.ok(
      rag.stats.utilization >= 0 &&
      rag.stats.utilization <= 1
    );
  }
);