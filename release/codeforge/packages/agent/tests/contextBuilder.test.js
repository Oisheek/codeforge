import test from "node:test";
import assert from "node:assert/strict";
import {
  buildContext,
  formatRetrievalResults,
} from "../contextBuilder.js";

test(
  "formats repository retrieval evidence deterministically",
  () => {
    const text =
      formatRetrievalResults([
        {
          path:
            "packages/agent/router.js",

          language:
            "javascript",

          score: 100,

          reason:
            "lexical",

          symbols: [
            {
              name:
                "routeRequest",
              kind:
                "function",
            },
          ],

          imports: [
            {
              source:
                "./fallback.js",
            },
          ],

          exports: [
            {
              name:
                "routeRequest",
            },
          ],

          content:
            "export function routeRequest() {}",
        },
      ]);

    assert.match(
      text,
      /packages\/agent\/router\.js/
    );

    assert.match(
      text,
      /routeRequest/
    );

    assert.match(
      text,
      /Source excerpt/
    );
  }
);

test(
  "formats empty retrieval results as an empty string",
  () => {
    assert.equal(
      formatRetrievalResults([]),
      ""
    );
  }
);

test(
  "builds model context from the retrieval results it receives",
  () => {
    const rag = {
      enabled: true,
      query: "routing fallback",
      results: [
        {
          path:
            "packages/agent/router.js",
          score: 100,
          reason: "lexical",
          content:
            "ROUTER_EVIDENCE",
          symbols: [],
          imports: [],
          exports: [],
        },
        {
          path:
            "packages/agent/fallback.js",
          score: 90,
          reason: "lexical",
          content:
            "FALLBACK_EVIDENCE",
          symbols: [],
          imports: [],
          exports: [],
        },
      ],
      stats: {
        retrieved: 2,
      },
    };

    const context =
      buildContext({
        prompt:
          "Explain routing and fallback",
        plan: {
          intent: "search",
          steps: [],
          requiresRAG: true,
          requiresThinking: false,
          requiresTools: false,
          requiresWrite: false,
          requiresGit: false,
        },
        rag,
      });

    assert.match(
      context.modelUser,
      /ROUTER_EVIDENCE/
    );

    assert.match(
      context.modelUser,
      /FALLBACK_EVIDENCE/
    );
  }
);