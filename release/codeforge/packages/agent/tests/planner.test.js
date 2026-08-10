import test from "node:test";
import assert from "node:assert/strict";

import {
  createExecutionPlan,
} from "../planner.js";

import {
  Intent,
} from "../intent.js";

test(
  "does not retrieve repository context for a general explanation",
  () => {
    const plan =
      createExecutionPlan(
        Intent.EXPLAIN,
        {
          prompt:
            "Who are you? Explain what you do.",
        }
      );

    assert.equal(
      plan.requiresRAG,
      false
    );

    assert.equal(
      plan.requiresTools,
      false
    );

    assert.deepEqual(
      plan.steps,
      [
        "context",
        "route",
        "generate",
      ]
    );
  }
);

test(
  "does not retrieve repository context for general programming knowledge",
  () => {
    const plan =
      createExecutionPlan(
        Intent.EXPLAIN,
        {
          prompt:
            "Explain dependency injection.",
        }
      );

    assert.equal(
      plan.requiresRAG,
      false
    );
  }
);

test(
  "retrieves repository context for a repository explanation",
  () => {
    const plan =
      createExecutionPlan(
        Intent.EXPLAIN,
        {
          prompt:
            "Explain the routing implementation in this repository.",
        }
      );

    assert.equal(
      plan.requiresRAG,
      true
    );

    assert.equal(
      plan.steps.includes(
        "retrieve"
      ),
      true
    );
  }
);

test(
  "retrieves repository context for an explanation of our system",
  () => {
    const plan =
      createExecutionPlan(
        Intent.EXPLAIN,
        {
          prompt:
            "Explain how our routing system works.",
        }
      );

    assert.equal(
      plan.requiresRAG,
      true
    );
  }
);

test(
  "uses tools instead of broad retrieval for a direct file explanation",
  () => {
    const plan =
      createExecutionPlan(
        Intent.EXPLAIN,
        {
          prompt:
            "Explain packages/agent/router.js",
        }
      );

    assert.equal(
      plan.requiresRAG,
      false
    );

    assert.equal(
      plan.requiresTools,
      true
    );

    assert.equal(
      plan.directFileTarget,
      true
    );

    assert.deepEqual(
      plan.fileTargets,
      [
        "packages/agent/router.js",
      ]
    );
  }
);

test(
  "retrieves repository context for an explanation of our routing system",
  () => {
    const plan =
      createExecutionPlan(
        Intent.EXPLAIN,
        {
          prompt:
            "Explain how our routing system works",
        }
      );

    assert.equal(
      plan.requiresRAG,
      true
    );

    assert.equal(
      plan.steps.includes(
        "retrieve"
      ),
      true
    );
  }
);

test(
  "retrieves repository context for an explanation of our fallback",
  () => {
    const plan =
      createExecutionPlan(
        Intent.EXPLAIN,
        {
          prompt:
            "Explain how our fallback works",
        }
      );

    assert.equal(
      plan.requiresRAG,
      true
    );
  }
);

test(
  "does not retrieve repository context for a general routing explanation",
  () => {
    const plan =
      createExecutionPlan(
        Intent.EXPLAIN,
        {
          prompt:
            "Explain how routing systems work",
        }
      );

    assert.equal(
      plan.requiresRAG,
      false
    );

    assert.equal(
      plan.steps.includes(
        "retrieve"
      ),
      false
    );
  }
);