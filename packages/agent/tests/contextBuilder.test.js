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
test(
  "adds engineering workflow instructions for tool-enabled tasks",
  () => {
    const context =
      buildContext({
        prompt:
          "Fix the failing implementation and run the tests.",

        plan: {
          intent: "debug",
          steps: [
            "Inspect the relevant files.",
            "Fix the implementation.",
            "Run verification.",
          ],
          requiresRAG: true,
          requiresThinking: true,
          requiresTools: true,
          requiresWrite: true,
          requiresGit: false,
        },

        project: {
          name: "CodeForge",
          root: "/tmp/codeforge",
          language: "javascript",
        },

        git: {
          branch: {
            current: "main",
          },

          status: {
            clean: true,
          },
        },

        rag: {
          enabled: false,
          results: [],
        },

        systemPrompt:
          "You are CodeForge.",
      });

    assert.match(
      context.modelUser,
      /Engineering workflow:/
    );

    assert.match(
      context.modelUser,
      /Inspect relevant project files before making changes\./
    );

    assert.match(
      context.modelUser,
      /Use the available file tools to make the requested implementation changes\./
    );

    assert.match(
      context.modelUser,
      /After making changes, use execute_command to run an appropriate verification command when one is available\./
    );

    assert.match(
      context.modelUser,
      /If verification fails, use the failure output to diagnose the problem, modify the implementation, and verify again\./
    );

    assert.match(
      context.modelUser,
      /Do not claim the implementation is complete until it has been verified/
    );
  }
);
test(
  "does not add engineering workflow instructions for non-tool tasks",
  () => {
    const context =
      buildContext({
        prompt:
          "Explain recursion in simple terms.",

        plan: {
          intent: "explain",
          steps: [
            "Explain recursion.",
          ],
          requiresRAG: false,
          requiresThinking: false,
          requiresTools: false,
          requiresWrite: false,
          requiresGit: false,
        },

        project: {
          name: "CodeForge",
          root: "/tmp/codeforge",
          language: "javascript",
        },

        git: {
          branch: {
            current: "main",
          },

          status: {
            clean: true,
          },
        },

        rag: {
          enabled: false,
          results: [],
        },

        systemPrompt:
          "You are CodeForge.",
      });

    assert.doesNotMatch(
      context.modelUser,
      /Engineering workflow:/
    );

    assert.match(
      context.modelUser,
      /Return a direct final answer to the user\./
    );
  }
);