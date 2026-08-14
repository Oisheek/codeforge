import test from "node:test";
import assert from "node:assert/strict";
import {
  createToolRegistry,
  readFileTool,
  searchFilesTool,
  editFileTool,
  shellTool,
} from "../../tools/index.js";

import {
  execute,
} from "../executor.js";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function createRepository({
  results = [],
  onSearch = null,
} = {}) {
  return {
    retriever: {
      async search(
        query,
        options
      ) {
        if (
          typeof onSearch ===
          "function"
        ) {
          onSearch(
            query,
            options
          );
        }

        return results;
      },
    },
  };
}

function createProvider(
  responses = []
) {
  let callIndex = 0;

  const calls = [];

  return {
    calls,

    async generate(options) {
      calls.push(
        structuredClone(options)
      );

      const response =
        responses[callIndex];

      callIndex += 1;

      if (response instanceof Error) {
        throw response;
      }

      if (
        typeof response ===
        "function"
      ) {
        return response(
          options,
          callIndex
        );
      }

      if (!response) {
        throw new Error(
          `Unexpected provider call ${callIndex}.`
        );
      }

      return response;
    },
  };
}

function createResponse({
  content = "OK",
  model = "test-model",
  toolCalls = [],
  usage = {},
} = {}) {
  return {
    model,

    message: {
      role: "assistant",
      content,

      ...(toolCalls.length > 0
        ? {
            tool_calls:
              toolCalls,
          }
        : {}),
    },

    toolCalls,
    usage,
  };
}

function createConfig(
  overrides = {}
) {
  return {
    provider: "openrouter",

    models: {
      fast: "test-model",
      general: "test-model",
      coding: "test-model",
      planner: "test-model",
      fallback: "fallback-model",
      emergency: "emergency-model",
    },

    maxAttempts: 3,
    maxToolRounds: 5,

    ...overrides,
  };
}

test(
  "returns a normal model response without live API access",
  async () => {
    const provider =
      createProvider([
        createResponse({
          content:
            "DETERMINISTIC_OK",
        }),
      ]);

    const result =
      await execute({
        prompt: "Hello",

        repository:
          createRepository(),

        provider,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig(),
      });

    assert.equal(
      result.response.message
        .content,
      "DETERMINISTIC_OK"
    );

    assert.equal(
      provider.calls.length,
      1
    );
  }
);

test(
  "passes engineering workflow instructions to the model for coding tasks",
  async () => {
    const provider =
      createProvider([
        createResponse({
          content:
            "CODING_CONTEXT_OK",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Fix the failing implementation and run the tests.",

        repository:
          createRepository(),

        provider,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
          }),
      });

    assert.equal(
      result.response.message.content,
      "CODING_CONTEXT_OK"
    );

    assert.equal(
      provider.calls.length,
      1
    );

    const firstRequest =
      provider.calls[0];

    const userMessage =
      firstRequest.messages.find(
        (message) =>
          message.role === "user"
      );

    assert.ok(
      userMessage
    );

    assert.match(
      userMessage.content,
      /Engineering workflow:/
    );

    assert.match(
      userMessage.content,
      /Inspect relevant project files before making changes\./
    );

    assert.match(
      userMessage.content,
      /After making changes, use execute_command to run an appropriate verification command when one is available\./
    );

    assert.match(
      userMessage.content,
      /If verification fails, use the failure output to diagnose the problem, modify the implementation, and verify again\./
    );
  }
);

test(
  "runs RAG selection and model selection before final execution",
  async () => {
    const provider =
      createProvider([
        createResponse({
          content: JSON.stringify({
            required: false,
            scope: "none",
            confidence: 0.98,
          }),
        }),

        createResponse({
          content: JSON.stringify({
            role: "coding",
            confidence: 0.95,
            complexity: "medium",
            reasoningRequired: false,
            toolRequired: false,
            retrievalRequired: false,
          }),
        }),

        createResponse({
          content: "SELECTORS_INTEGRATED_OK",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "write a JavaScript function that reverses a string",

        repository:
          createRepository(),

        provider,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            models: {
              fast: "fast-model",
              general: "general-model",
              coding: "coding-model",
              planner: "planner-model",
              fallback: "fallback-model",
              emergency: "emergency-model",
            },

            selectors: {
              provider: "openrouter",
              rag: "rag-selector-model",
              model: "model-selector-model",
              maxTokens: 128,
              modelMaxTokens: 256,
            },
          }),
      });

    assert.equal(
      result.response.message.content,
      "SELECTORS_INTEGRATED_OK"
    );

    assert.equal(
      provider.calls.length,
      3
    );

    assert.equal(
      provider.calls[0].model,
      "rag-selector-model"
    );

    assert.equal(
      provider.calls[1].model,
      "model-selector-model"
    );

    assert.equal(
      provider.calls[2].model,
      "coding-model"
    );
  }
);

test(
  "uses fallback model after a retryable provider failure",
  async () => {
    const rateLimitError =
      new Error(
        "Rate limit exceeded"
      );

    rateLimitError.code =
      "rate_limit";

    rateLimitError.status =
      429;

    const provider =
      createProvider([
        rateLimitError,

        (options) =>
          createResponse({
            content:
              "FALLBACK_OK",

            model:
              options.model,
          }),
      ]);

    const events = [];

    const result =
      await execute({
        prompt: "Hello",

        repository:
          createRepository(),

        provider,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig(),

        onEvent: (event) =>
          events.push(event),
      });

    assert.equal(
      result.response.message
        .content,
      "FALLBACK_OK"
    );

    assert.equal(
      provider.calls.length,
      2
    );

    assert.equal(
      provider.calls[0].model,
      "test-model"
    );

    assert.equal(
      provider.calls[1].model,
      "fallback-model"
    );

    assert.equal(
      result.telemetry.attempts,
      2
    );

    const fallbackSuccess =
      events.find(
        (event) =>
          event.stage ===
            "fallback" &&
          event.type ===
            "stage:success"
      );

    assert.ok(
      fallbackSuccess
    );

    assert.equal(
      fallbackSuccess.data.model,
      "fallback-model"
    );
  }
);

test(
  "recovers when the model corrects malformed tool arguments",
  async () => {
    let actualReads = 0;

    const wrappedRead = {
      ...readFileTool,

      async execute(
        input,
        context
      ) {
        actualReads += 1;

        return readFileTool.execute(
          input,
          context
        );
      },
    };

    const tools =
      createToolRegistry([
        wrappedRead,
      ]);

    const malformedCall = {
      id: "call_bad_json",
      type: "function",

      function: {
        name: "read_file",

        arguments:
          "{\"path\":\"package.json\"",
      },
    };

    const correctedCall = {
      id: "call_fixed_json",
      type: "function",

      function: {
        name: "read_file",

        arguments:
          "{\"path\":\"package.json\"}",
      },
    };

    const provider =
      createProvider([
        createResponse({
          content: null,
          toolCalls: [
            malformedCall,
          ],
        }),

        createResponse({
          content: null,
          toolCalls: [
            correctedCall,
          ],
        }),

        createResponse({
          content:
            "RECOVERY_OK",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Read package.json",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),
      });

    assert.equal(
      result.response.message
        .content,
      "RECOVERY_OK"
    );

    assert.equal(
      provider.calls.length,
      3
    );

    /*
     * The malformed request must never
     * reach the actual tool.
     */
    assert.equal(
      actualReads,
      1
    );

    assert.equal(
      result.telemetry.toolRounds,
      2
    );

    assert.equal(
      result.toolResults.length,
      2
    );

    assert.equal(
      result.toolResults[0]
        .result.success,
      false
    );

    assert.equal(
      result.toolResults[0]
        .result.error.code,
      "invalid_tool_arguments"
    );

    assert.equal(
      result.toolResults[1]
        .result.success,
      true
    );

    /*
     * Verify that CodeForge returned the
     * protocol failure to the model.
     */
    const secondRequest =
      provider.calls[1];

    const protocolMessage =
      secondRequest.messages.find(
        (message) =>
          message.role ===
            "tool" &&
          message.tool_call_id ===
            "call_bad_json"
      );

    assert.ok(
      protocolMessage
    );

    const protocolResult =
      JSON.parse(
        protocolMessage.content
      );

    assert.equal(
      protocolResult.success,
      false
    );

    assert.equal(
      protocolResult.error.code,
      "invalid_tool_arguments"
    );
  }
);

test(
  "stops after exceeding the malformed tool-call protocol error limit",
  async () => {
    let actualReads = 0;

    const wrappedRead = {
      ...readFileTool,

      async execute(
        input,
        context
      ) {
        actualReads += 1;

        return readFileTool.execute(
          input,
          context
        );
      },
    };

    const tools =
      createToolRegistry([
        wrappedRead,
      ]);

let providerCalls = 0;
let recoveryMessages = null;

    const provider = {
  async generate({ messages }) {
    providerCalls += 1;

    if (providerCalls === 2) {
      recoveryMessages = messages;
    }

        const toolCall = {
          id:
            `call_bad_${providerCalls}`,

          type: "function",

          function: {
            name:
              "read_file",

            arguments:
              "{\"path\":\"package.json\"",
          },
        };

        return createResponse({
          content: null,

          toolCalls: [
            toolCall,
          ],
        });
      },
    };

    await assert.rejects(
      () =>
        execute({
          prompt:
            "Read package.json",

          repository:
            createRepository(),

          provider,
          tools,

          project: {
            root:
              process.cwd(),
          },

          config:
            createConfig({
              maxAttempts: 1,
              maxToolRounds: 10,
            }),
        }),

      (error) => {
        assert.equal(
          error.code,
          "max_tool_protocol_errors_exceeded"
        );

        assert.equal(
          error.message,
          "Maximum tool protocol errors exceeded (2)."
        );

        assert.equal(
          error.cause?.code,
          "invalid_tool_arguments"
        );

        assert.equal(
          error.cause?.message,
          "Tool call arguments contain invalid JSON."
        );

        return true;
      }
    );

    assert.equal(
      providerCalls,
      3
    );

    /*
     * Every call was malformed, therefore
     * read_file must never execute.
     */
    assert.equal(
      actualReads,
      0
    );
  }
);

test(
  "prevents duplicate tool calls from executing twice",
  async () => {
    let actualReads = 0;

    const wrappedRead = {
      ...readFileTool,

      async execute(
        input,
        context
      ) {
        actualReads += 1;

        return readFileTool.execute(
          input,
          context
        );
      },
    };

    const tools =
      createToolRegistry([
        wrappedRead,
      ]);

    const firstCall = {
      id: "read_1",
      type: "function",

      function: {
        name: "read_file",

        arguments:
          JSON.stringify({
            path: "package.json",
          }),
      },
    };

    const duplicateCall = {
      id: "read_2",
      type: "function",

      function: {
        name: "read_file",

        arguments:
          JSON.stringify({
            path: "package.json",
          }),
      },
    };

    const provider =
      createProvider([
        createResponse({
          content: null,

          toolCalls: [
            firstCall,
          ],
        }),

        createResponse({
          content: null,

          toolCalls: [
            duplicateCall,
          ],
        }),

        createResponse({
          content:
            "DEDUP_OK",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Read package.json",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),
      });

    assert.equal(
      result.response.message
        .content,
      "DEDUP_OK"
    );

    assert.equal(
      provider.calls.length,
      3
    );

    /*
     * The duplicate request must not
     * execute the filesystem tool again.
     */
    assert.equal(
      actualReads,
      1
    );

    assert.equal(
      result.telemetry.toolRounds,
      2
    );

    assert.equal(
      result.toolResults.length,
      2
    );

    assert.equal(
      result.toolResults[0]
        .result.success,
      true
    );

    assert.equal(
      result.toolResults[1]
        .result.success,
      false
    );

    assert.equal(
      result.toolResults[1]
        .result.error.code,
      "duplicate_tool_call"
    );
  }
);

test(
  "enforces the search tool execution budget",
  async () => {
    let actualSearches = 0;

    const wrappedSearch = {
      ...searchFilesTool,

      async execute(
        input,
        context
      ) {
        actualSearches += 1;

        return searchFilesTool.execute(
          input,
          context
        );
      },
    };

    const tools =
      createToolRegistry([
        wrappedSearch,
      ]);

    const createSearchCall = (
      number
    ) => ({
      id:
        `search_${number}`,

      type: "function",

      function: {
        name:
          "search_files",

        arguments:
          JSON.stringify({
            query:
              `budget_test_${number}`,
          }),
      },
    });

    const provider =
      createProvider([
        createResponse({
          content: null,

          toolCalls: [
            createSearchCall(1),
          ],
        }),

        createResponse({
          content: null,

          toolCalls: [
            createSearchCall(2),
          ],
        }),

        createResponse({
          content: null,

          toolCalls: [
            createSearchCall(3),
          ],
        }),

        createResponse({
          content:
            "BUDGET_OK",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Find routing implementation",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),
      });

    assert.equal(
      result.response.message
        .content,
      "BUDGET_OK"
    );

    assert.equal(
      provider.calls.length,
      4
    );

    /*
     * CodeForge's current search budget
     * allows two executions.
     */
    assert.equal(
      actualSearches,
      2
    );

    assert.equal(
      result.telemetry.toolRounds,
      3
    );

    assert.equal(
      result.toolResults.length,
      3
    );

    assert.equal(
      result.toolResults[0]
        .result.success,
      true
    );

    assert.equal(
      result.toolResults[1]
        .result.success,
      true
    );

    assert.equal(
      result.toolResults[2]
        .result.success,
      false
    );

    assert.equal(
      result.toolResults[2]
        .result.error.code,
      "tool_budget_exceeded"
    );
  }
);

test(
  "bypasses repository retrieval for a direct file request",
  async () => {
    let searches = 0;

    const repository = {
      retriever: {
        async search() {
          searches += 1;

          throw new Error(
            "RAG SHOULD NOT RUN"
          );
        },
      },
    };

    const provider =
      createProvider([
        createResponse({
          content:
            "DIRECT_FILE_OK",
        }),
      ]);

    const events = [];

    const result =
      await execute({
        prompt:
          "Open package.json and tell me what it contains.",

        repository,
        provider,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
          }),

        onEvent(event) {
          events.push(event);
        },
      });

    assert.equal(
      result.response.message
        .content,
      "DIRECT_FILE_OK"
    );

    /*
     * A direct-file task should not perform
     * repository-wide retrieval.
     */
    assert.equal(
      searches,
      0
    );

    const retrievalEvents =
      events.filter(
        (event) =>
          event.stage ===
          "retrieve"
      );

    assert.equal(
      retrievalEvents.length,
      0
    );

    const planSuccess =
      events.find(
        (event) =>
          event.type ===
            "stage:success" &&
          event.stage ===
            "plan"
      );

    assert.ok(
      planSuccess
    );

    assert.equal(
      planSuccess.detail.includes(
        "retrieve"
      ),
      false
    );
  }
);

test(
  "retrieves repository context for a cross-file search request",
  async () => {
    let searches = 0;
    let capturedQuery = null;
    let capturedOptions = null;

    const repository = {
      retriever: {
        async search(
          query,
          options
        ) {
          searches += 1;
          capturedQuery = query;
          capturedOptions =
            options;

          return [
            {
              path:
                "packages/agent/router.js",

              score: 100,

              reason:
                "routing implementation",

              content:
                "export function routeRequest() {}",
            },
          ];
        },
      },
    };

    const capturedRequests = [];

    const provider = {
      async generate(options) {
        capturedRequests.push(
          structuredClone(
            options
          )
        );

        return createResponse({
          content:
            "RAG_OK",
        });
      },
    };

    const events = [];

    const prompt =
      "Find the routing implementation and explain how it works.";

    const result =
      await execute({
        prompt,
        repository,
        provider,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
          }),

        onEvent(event) {
          events.push(event);
        },
      });

    assert.equal(
      result.response.message
        .content,
      "RAG_OK"
    );

    /*
     * Cross-file search should invoke the
     * repository retriever exactly once.
     */
    assert.equal(
      searches,
      1
    );

    assert.equal(
      capturedQuery,
      prompt
    );

    /*
     * Lock down the bounded RAG policy.
     */
    assert.deepEqual(
      capturedOptions,
      {
        limit: 6,
        maxSourceLength: 2500,
      }
    );

    const retrievalStart =
      events.find(
        (event) =>
          event.type ===
            "stage:start" &&
          event.stage ===
            "retrieve"
      );

    assert.ok(
      retrievalStart
    );

    const retrievalSuccess =
      events.find(
        (event) =>
          event.type ===
            "stage:success" &&
          event.stage ===
            "retrieve"
      );

    assert.ok(
      retrievalSuccess
    );

    assert.equal(
      retrievalSuccess.data
        .count,
      1
    );

    assert.deepEqual(
      retrievalSuccess.data
        .files,
      [
        "packages/agent/router.js",
      ]
    );

    /*
     * Retrieval is only useful if its result
     * actually reaches the model context.
     */
    assert.equal(
      capturedRequests.length,
      1
    );

    const userMessage =
      capturedRequests[0]
        .messages.find(
          (message) =>
            message.role ===
            "user"
        );

    assert.ok(
      userMessage
    );

    assert.equal(
      userMessage.content.includes(
        "Retrieved repository context:"
      ),
      true
    );

    assert.equal(
      userMessage.content.includes(
        "packages/agent/router.js"
      ),
      true
    );

    assert.equal(
      userMessage.content.includes(
        "export function routeRequest() {}"
      ),
      true
    );
  }
);

test(
  "stops when the maximum tool-round limit is exceeded",
  async () => {
    let actualReads = 0;
    let providerCalls = 0;

    const wrappedRead = {
      ...readFileTool,

      async execute(
        input,
        context
      ) {
        actualReads += 1;

        return readFileTool.execute(
          input,
          context
        );
      },
    };

    const tools =
      createToolRegistry([
        wrappedRead,
      ]);

    const paths = [
      "package.json",
      "packages/agent/executor.js",
      "packages/agent/router.js",
      "packages/agent/fallback.js",
    ];

    const provider = {
      async generate() {
        providerCalls += 1;

        const index =
          providerCalls - 1;

        const toolCall = {
          id:
            `read_round_${providerCalls}`,

          type: "function",

          function: {
            name: "read_file",

            arguments:
              JSON.stringify({
                path:
                  paths[index] ??
                  `never-reached-${providerCalls}.txt`,
              }),
          },
        };

        return createResponse({
          content: null,

          toolCalls: [
            toolCall,
          ],
        });
      },
    };

    await assert.rejects(
      () =>
        execute({
          prompt:
            "Inspect these files.",

          repository:
            createRepository(),

          provider,
          tools,

          project: {
            root:
              process.cwd(),
          },

          config:
            createConfig({
              maxAttempts: 1,

              /*
               * Keep this deliberately small so
               * the test remains fast.
               */
              maxToolRounds: 2,
            }),
        }),

      (error) => {
        assert.equal(
          error.code,
          "max_tool_rounds_exceeded"
        );

        assert.equal(
          error.message,
          "Maximum tool rounds exceeded (2)."
        );

        return true;
      }
    );

    /*
     * Round 1 executes.
     * Round 2 executes.
     *
     * The third provider response requests
     * another tool, but executor must reject
     * it before execution.
     */
    assert.equal(
      providerCalls,
      3
    );

    assert.equal(
      actualReads,
      2
    );
  }
);

test(
  "does not fallback after a non-retryable provider error",
  async () => {
    let providerCalls = 0;

    const modelsSeen = [];

    const failure =
      new Error(
        "Invalid request"
      );

    failure.code =
      "invalid_request";

    failure.status =
      400;

    const provider = {
      async generate(options) {
        providerCalls += 1;

        modelsSeen.push(
          options.model
        );

        throw failure;
      },
    };

    const events = [];

    await assert.rejects(
      () =>
        execute({
          prompt: "Hello",

          repository:
            createRepository(),

          provider,

          project: {
            root:
              process.cwd(),
          },

          config:
            createConfig({
              maxAttempts: 3,
            }),

          onEvent(event) {
            events.push(event);
          },
        }),

      (error) => {
        assert.equal(
          error.code,
          "invalid_request"
        );

        assert.equal(
          error.status,
          400
        );

        assert.equal(
          error.message,
          "Invalid request"
        );

        return true;
      }
    );

    /*
     * A non-retryable error must not consume
     * fallback or emergency attempts.
     */
    assert.equal(
      providerCalls,
      1
    );

    assert.deepEqual(
      modelsSeen,
      [
        "test-model",
      ]
    );

    /*
     * The executor may check fallback policy,
     * but it must not successfully select a
     * fallback route.
     */
    const fallbackSuccesses =
      events.filter(
        (event) =>
          event.stage ===
            "fallback" &&
          event.type ===
            "stage:success"
      );

    assert.equal(
      fallbackSuccesses.length,
      0
    );

    const fallbackModels =
      modelsSeen.filter(
        (model) =>
          model ===
            "fallback-model" ||
          model ===
            "emergency-model"
      );

    assert.equal(
      fallbackModels.length,
      0
    );
  }
);

test(
  "suppresses repository search when strong RAG evidence is already available",
  async () => {
    const toolNamesSeen = [];

    const repository = {
      retriever: {
        async search() {
          return [
            {
              type: "file",
              path:
                "packages/agent/router.js",
              score: 120,
              reason:
                "implementation",
              content:
                "export function routeRequest() { return 'openrouter'; }",
              symbols: [],
              imports: [],
              exports: [],
            },
            {
              type: "file",
              path:
                "packages/agent/fallback.js",
              score: 100,
              reason:
                "implementation",
              content:
                "export function getFallbackRoute() { return 'fallback'; }",
              symbols: [],
              imports: [],
              exports: [],
            },
            {
              type: "file",
              path:
                "packages/providers/index.js",
              score: 90,
              reason:
                "implementation",
              content:
                "export function createProvider() { return 'provider'; }",
              symbols: [],
              imports: [],
              exports: [],
            },
          ];
        },
      },
    };

    const provider = {
      async generate(options) {
        const names =
          (options.tools ?? [])
            .map(
              (tool) =>
                tool.function?.name
            )
            .filter(Boolean);

        toolNamesSeen.push(names);

        return createResponse({
          content:
            "RAG_EVIDENCE_OK",
        });
      },
    };

    const tools =
      createToolRegistry([
        searchFilesTool,
        readFileTool,
      ]);

    const result =
      await execute({
        prompt:
          "Find the routing implementation and explain routing fallback behavior and provider selection across the codebase.",

        repository,
        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),
      });

    assert.equal(
      result.response.message.content,
      "RAG_EVIDENCE_OK"
    );

    assert.equal(
      toolNamesSeen.length,
      1
    );

    assert.equal(
      toolNamesSeen[0].includes(
        "search_files"
      ),
      false
    );

    assert.equal(
      toolNamesSeen[0].includes(
        "read_file"
      ),
      true
    );
  }
);
test(
  "keeps repository search available when RAG evidence is insufficient",
  async () => {
    const toolNamesSeen = [];

    const repository = {
      retriever: {
        async search() {
          return [
            {
              type: "file",
              path:
                "packages/agent/router.js",
              score: 120,
              reason:
                "implementation",
              content:
                "export function routeRequest() { return 'openrouter'; }",
              symbols: [],
              imports: [],
              exports: [],
            },
          ];
        },
      },
    };

    const provider = {
      async generate(options) {
        const names =
          (options.tools ?? [])
            .map(
              (tool) =>
                tool.function?.name
            )
            .filter(Boolean);

        toolNamesSeen.push(names);

        return createResponse({
          content:
            "SEARCH_STILL_AVAILABLE",
        });
      },
    };

    const tools =
      createToolRegistry([
        searchFilesTool,
        readFileTool,
      ]);

    const result =
      await execute({
        prompt:
          "Find the routing implementation and explain routing fallback behavior and provider selection across the codebase.",

        repository,
        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),
      });

    assert.equal(
      result.response.message.content,
      "SEARCH_STILL_AVAILABLE"
    );

    assert.equal(
      toolNamesSeen.length,
      1
    );

    assert.equal(
      toolNamesSeen[0].includes(
        "search_files"
      ),
      true
    );

    assert.equal(
      toolNamesSeen[0].includes(
        "read_file"
      ),
      true
    );
  }
);

test(
  "suppresses repository reads when RAG evidence is substantial",
  async () => {
    const substantialContent =
      "implementation evidence ".repeat(
        30
      );

    const repository =
      createRepository({
        results: [
          {
            path:
              "packages/agent/router.js",
            reason:
              "implementation",
            content:
              substantialContent,
          },
          {
            path:
              "packages/agent/fallback.js",
            reason:
              "implementation",
            content:
              substantialContent,
          },
          {
            path:
              "packages/providers/index.js",
            reason:
              "implementation",
            content:
              substantialContent,
          },
        ],
      });

    const provider =
      createProvider([
        createResponse({
          content:
            "Repository explanation.",
        }),
      ]);

    const tools =
      createToolRegistry([
        readFileTool,
        searchFilesTool,
      ]);

    await execute({
      prompt:
        "Find the routing implementation and explain routing fallback behavior and provider selection",

      repository,
      provider,
      tools,

      project: {
        root:
          process.cwd(),
      },

      config:
        createConfig({
          maxAttempts: 1,
        }),
    });

    assert.equal(
      provider.calls.length,
      1
    );

    const toolNames =
      (
        provider.calls[0].tools ??
        []
      )
        .map(
          (tool) =>
            tool?.function?.name
        )
        .filter(Boolean);

    assert.equal(
      toolNames.includes(
        "search_files"
      ),
      false
    );

    assert.equal(
      toolNames.includes(
        "read_file"
      ),
      false
    );
  }
);

test(
  "keeps repository reads available when RAG excerpts are not substantial",
  async () => {
    const repository =
      createRepository({
        results: [
          {
            path:
              "packages/agent/router.js",
            reason:
              "implementation",
            content:
              "short routing excerpt",
          },
          {
            path:
              "packages/agent/fallback.js",
            reason:
              "implementation",
            content:
              "short fallback excerpt",
          },
          {
            path:
              "packages/providers/index.js",
            reason:
              "implementation",
            content:
              "short provider excerpt",
          },
        ],
      });

    const provider =
      createProvider([
        createResponse({
          content:
            "Need repository evidence.",
        }),
      ]);

    const tools =
      createToolRegistry([
        readFileTool,
        searchFilesTool,
      ]);

    await execute({
      prompt:
        "Find the routing implementation and explain routing fallback behavior and provider selection",

      repository,
      provider,
      tools,

      project: {
        root:
          process.cwd(),
      },

      config:
        createConfig({
          maxAttempts: 1,
        }),
    });

    const toolNames =
      (
        provider.calls[0].tools ??
        []
      )
        .map(
          (tool) =>
            tool?.function?.name
        )
        .filter(Boolean);

    /*
     * Repository discovery is already
     * covered by multiple implementation
     * results, so search remains suppressed.
     */
    assert.equal(
      toolNames.includes(
        "search_files"
      ),
      false
    );

    /*
     * The excerpts themselves are too
     * small to replace direct file reads.
     */
    assert.equal(
      toolNames.includes(
        "read_file"
      ),
      true
    );
  }
);

test(
  "recovers when the model requests an unregistered tool",
  async () => {
    let providerCalls = 0;
let recoveryMessages = null;
    const provider = {
  async generate({ messages }) {
    providerCalls += 1;

    if (providerCalls === 2) {
      recoveryMessages = messages;
    }

    if (providerCalls === 1) {
      return createResponse({
        content: null,

        toolCalls: [
          {
            id: "unknown_tool_1",

            type: "function",

            function: {
              name: "exec",

              arguments:
                JSON.stringify({
                  command:
                    "find routing implementation",
                }),
            },
          },
        ],
      });
    }

    return createResponse({
      content:
        "Recovered without using the unregistered tool.",
    });
  },
};

    const tools =
      createToolRegistry([
        readFileTool,
        searchFilesTool,
      ]);

    const events = [];

    const result =
      await execute({
        prompt:
          "Find the routing implementation.",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
          }),

        onEvent(event) {
          events.push(event);
        },
      });

    assert.equal(
      providerCalls,
      2
    );
assert.equal(
  result.response.message.content,
  "Recovered without using the unregistered tool."
);
   const recoveryText =
  JSON.stringify(
    recoveryMessages
  );

assert.ok(
  recoveryText.includes(
    "Tool is not registered: exec"
  )
);

assert.ok(
  recoveryText.includes(
    "read_file"
  )
);

assert.ok(
  recoveryText.includes(
    "search_files"
  )
);

assert.ok(
  recoveryText.includes(
    "Use only registered tools."
  )
);
    const toolErrors =
      events.filter(
        (event) =>
          event.stage === "tool" &&
          event.type === "stage:error"
      );

    assert.ok(
      toolErrors.some(
        (event) =>
          event.data?.code ===
            "tool_not_found" ||
          event.detail?.includes(
            "Tool is not registered: exec"
          )
      )
    );
  }
);

test(
  "answers directly when RAG evidence is comprehensive",
  async () => {
    const provider =
      createProvider([
        createResponse({
          content:
            "Routing explanation from retrieved context.",
        }),
      ]);

    const repository =
      createRepository({
        results: [
          {
            path:
              "packages/agent/router.js",
            score: 120,
            reason:
              "implementation",
            content:
              "r".repeat(900),
          },
          {
            path:
              "packages/agent/fallback.js",
            score: 110,
            reason:
              "implementation",
            content:
              "f".repeat(900),
          },
          {
            path:
              "packages/providers/index.js",
            score: 100,
            reason:
              "implementation",
            content:
              "p".repeat(900),
          },
        ],
      });

    const tools =
      createToolRegistry([
        readFileTool,
        searchFilesTool,
      ]);

    const result =
      await execute({
        prompt:
          "Find the routing implementation and explain routing, fallback behavior, and provider selection.",

        repository,
        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
          }),
      });
      
assert.equal(
  provider.calls.length,
  1
);

assert.deepEqual(
  provider.calls[0].tools,
  []
);
    const toolNames =
      (
        provider.calls[0]
          ?.tools ?? []
      )
        .map(
          (tool) =>
            tool?.function?.name
        );

    assert.equal(
      toolNames.includes(
        "search_files"
      ),
      false
    );

    assert.equal(
      toolNames.includes(
        "read_file"
      ),
      false
    );

    assert.equal(
      result.response.message.content,
      "Routing explanation from retrieved context."
    );
  }
);

test(
  "uses one model call and no repository tools for comprehensive architectural RAG",
  async () => {
    const provider =
      createProvider([
        createResponse({
          content:
            "Routing architecture explained from RAG.",
        }),
      ]);

    const repository =
      createRepository({
        results: [
          {
            path:
              "packages/providers/openrouter.js",
            score: 307,
            reason:
              "implementation",
            content:
              "OpenRouter provider implementation. ".repeat(
                100
              ),
          },
          {
            path:
              "packages/agent/fallback.js",
            score: 246,
            reason:
              "implementation",
            content:
              "Fallback routing implementation. ".repeat(
                80
              ),
          },
          {
            path:
              "packages/providers/index.js",
            score: 358,
            reason:
              "implementation",
            content:
              "Provider registry implementation. ".repeat(
                40
              ),
          },
          {
            path:
              "packages/agent/router.js",
            score: 265,
            reason:
              "implementation",
            content:
              "Request routing implementation. ".repeat(
                70
              ),
          },
          {
            path:
              "packages/agent/executor.js",
            score: 384,
            reason:
              "implementation",
            content:
              "Agent execution orchestration. ".repeat(
                100
              ),
          },
        ],
      });

    const tools =
      createToolRegistry([
        readFileTool,
        searchFilesTool,
      ]);

    const result =
      await execute({
        prompt:
          "Find the routing implementation and explain how routing, fallback behavior, and provider selection interact across the codebase.",

        repository,
        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
          }),
      });

    /*
     * Comprehensive architectural RAG should
     * require exactly one model request.
     */
    assert.equal(
      provider.calls.length,
      1
    );

    const firstRequest =
      provider.calls[0];

    /*
     * Repository tools must not be exposed
     * when RAG already contains sufficient
     * cross-file architectural evidence.
     */
    assert.deepEqual(
      firstRequest.tools ?? [],
      []
    );

    /*
     * Verify that the important architectural
     * files actually survived RAG packing and
     * reached the model request.
     */
    const requestText =
      JSON.stringify(
        firstRequest.messages
      );

    assert.ok(
      requestText.includes(
        "packages/providers/openrouter.js"
      )
    );

    assert.ok(
      requestText.includes(
        "packages/agent/fallback.js"
      )
    );

    assert.ok(
      requestText.includes(
        "packages/providers/index.js"
      )
    );

    assert.ok(
      requestText.includes(
        "packages/agent/router.js"
      )
    );

    assert.ok(
      requestText.includes(
        "packages/agent/executor.js"
      )
    );

    assert.equal(
      result.response.message.content,
      "Routing architecture explained from RAG."
    );
  }
);

test(
  "requests approval before executing execute_command",
  async () => {
    const tools =
      createToolRegistry([
        shellTool,
      ]);

    const provider =
      createProvider([
        createResponse({
          content: null,

          toolCalls: [
            {
              id: "shell_approval_1",

              type: "function",

              function: {
                name:
                  "execute_command",

                arguments:
                  JSON.stringify({
                    command:
                      'node -e "console.log(123)"',
                  }),
              },
            },
          ],
        }),

        createResponse({
          content:
            "APPROVAL_REQUIRED_OK",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Run the command.",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),
      });

    assert.equal(
      result.response.message.content,
      "APPROVAL_REQUIRED_OK"
    );

    assert.equal(
      result.toolResults.length,
      1
    );

    assert.equal(
      result.toolResults[0].name,
      "execute_command"
    );

    assert.equal(
      result.toolResults[0].result.success,
      false
    );

    assert.equal(
      result.toolResults[0].result.error.code,
      "approval_required"
    );
  }
);

test(
  "executes execute_command after approval",
  async () => {
    const tools =
      createToolRegistry([
        shellTool,
      ]);

    const approvalRequests = [];

    const provider =
      createProvider([
        createResponse({
          content: null,

          toolCalls: [
            {
              id: "shell_approved_1",

              type: "function",

              function: {
                name:
                  "execute_command",

                arguments:
                  JSON.stringify({
                    command:
                      'node -e "console.log(123)"',
                  }),
              },
            },
          ],
        }),

        createResponse({
          content:
            "SHELL_APPROVED_OK",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Run the command.",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),

        requestApproval:
          async (request) => {
            approvalRequests.push(
              request
            );

            return true;
          },
      });

    assert.equal(
      result.response.message.content,
      "SHELL_APPROVED_OK"
    );

    assert.equal(
      approvalRequests.length,
      1
    );

    assert.equal(
      approvalRequests[0].toolName,
      "execute_command"
    );

    assert.equal(
      approvalRequests[0]
        .arguments.command,
      'node -e "console.log(123)"'
    );

    assert.equal(
      result.toolResults.length,
      1
    );

    assert.equal(
      result.toolResults[0].result.success,
      true
    );

    const stdout =
  result.toolResults[0]
    .result.output.output.stdout;

assert.ok(
  stdout.includes("123")
);

    assert.equal(
      result.toolResults[0]
        .result.output.output.exitCode,
      0
    );
  }
);

test(
  "does not execute execute_command after approval is denied",
  async () => {
    const tools =
      createToolRegistry([
        shellTool,
      ]);

    const approvalRequests = [];

    const provider =
      createProvider([
        createResponse({
          content: null,

          toolCalls: [
            {
              id: "shell_denied_1",

              type: "function",

              function: {
                name:
                  "execute_command",

                arguments:
                  JSON.stringify({
                    command:
                      'node -e "console.log(123)"',
                  }),
              },
            },
          ],
        }),

        createResponse({
          content:
            "SHELL_DENIED_OK",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Run the command.",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),

        requestApproval:
          async (request) => {
            approvalRequests.push(
              request
            );

            return false;
          },
      });

    assert.equal(
      result.response.message.content,
      "SHELL_DENIED_OK"
    );

    assert.equal(
      approvalRequests.length,
      1
    );

    assert.equal(
      result.toolResults.length,
      1
    );

    assert.equal(
      result.toolResults[0].result.success,
      false
    );

    assert.equal(
      result.toolResults[0]
        .result.error.code,
      "approval_denied"
    );
  }
);

test(
  "returns execute_command failure to the model",
  async () => {
    const tools =
      createToolRegistry([
        shellTool,
      ]);

    const provider =
      createProvider([
        createResponse({
          content: null,

          toolCalls: [
            {
              id: "shell_failure_1",

              type: "function",

              function: {
                name:
                  "execute_command",

                arguments:
                  JSON.stringify({
                    command:
                      'node -e "process.exit(7)"',
                  }),
              },
            },
          ],
        }),

        createResponse({
          content:
            "SHELL_FAILURE_HANDLED",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Run the failing command.",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),

        requestApproval:
          async () => true,
      });

    assert.equal(
      result.response.message.content,
      "SHELL_FAILURE_HANDLED"
    );

    assert.equal(
      result.toolResults.length,
      1
    );

    assert.equal(
      result.toolResults[0].result.success,
      true
    );

    assert.equal(
      result.toolResults[0]
        .result.output.success,
      false
    );

    assert.equal(
      result.toolResults[0]
        .result.output.output.exitCode,
      7
    );
  }
);

test(
  "iterates execute_command after a command failure",
  async () => {
    const tools =
      createToolRegistry([
        shellTool,
      ]);

    const approvalRequests = [];

    const provider =
      createProvider([
        createResponse({
          content: null,

          toolCalls: [
            {
              id: "shell_iterate_1",

              type: "function",

              function: {
                name:
                  "execute_command",

                arguments:
                  JSON.stringify({
                    command:
                      'node -e "process.exit(7)"',
                  }),
              },
            },
          ],
        }),

        createResponse({
          content: null,

          toolCalls: [
            {
              id: "shell_iterate_2",

              type: "function",

              function: {
                name:
                  "execute_command",

                arguments:
                  JSON.stringify({
                    command:
                      'node -e "console.log(456)"',
                  }),
              },
            },
          ],
        }),

        createResponse({
          content:
            "ITERATION_SUCCESS",
        }),
      ]);

    const result =
      await execute({
        prompt:
          "Run the command and fix it if it fails.",

        repository:
          createRepository(),

        provider,
        tools,

        project: {
          root:
            process.cwd(),
        },

        config:
          createConfig({
            maxAttempts: 1,
            maxToolRounds: 5,
          }),

        requestApproval:
          async (request) => {
            approvalRequests.push(
              request
            );

            return true;
          },
      });

    /*
     * The model should have made:
     *
     * 1. First execute_command call.
     * 2. Second execute_command call after
     *    receiving the failure result.
     * 3. Final response.
     */
    assert.equal(
      provider.calls.length,
      3
    );

    /*
     * Both commands require approval.
     */
    assert.equal(
      approvalRequests.length,
      2
    );

    assert.equal(
      approvalRequests[0]
        .arguments.command,
      'node -e "process.exit(7)"'
    );

    assert.equal(
      approvalRequests[1]
        .arguments.command,
      'node -e "console.log(456)"'
    );

    /*
     * First command actually failed.
     */
    assert.equal(
      result.toolResults[0]
        .result.success,
      true
    );

    assert.equal(
      result.toolResults[0]
        .result.output.success,
      false
    );

    assert.equal(
      result.toolResults[0]
        .result.output.output.exitCode,
      7
    );

    /*
     * Second command actually succeeded.
     */
    assert.equal(
      result.toolResults[1]
        .result.success,
      true
    );

    assert.equal(
      result.toolResults[1]
        .result.output.success,
      true
    );

    assert.equal(
      result.toolResults[1]
        .result.output.output.exitCode,
      0
    );

    assert.ok(
      result.toolResults[1]
        .result.output.output.stdout
        .includes("456")
    );

    /*
     * The executor completed normally after
     * the successful second command.
     */
    assert.equal(
      result.response.message.content,
      "ITERATION_SUCCESS"
    );

    assert.equal(
      result.telemetry.toolRounds,
      2
    );
  }
);

test(
  "iterates edit_file and execute_command until verification succeeds",
  async () => {
    const temporaryDirectory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "codeforge-agent-"
        )
      );

    const filePath =
      path.join(
        temporaryDirectory,
        "sample.js"
      );

    try {
      await fs.writeFile(
        filePath,
        'export const value = "bad";\n',
        "utf8"
      );

      const tools =
        createToolRegistry([
          editFileTool,
          shellTool,
        ]);

      const approvalRequests = [];

      const provider =
        createProvider([
          /*
           * Round 1:
           * Make the first edit.
           */
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "edit_verify_1",

                type: "function",

                function: {
                  name:
                    "edit_file",

                  arguments:
                    JSON.stringify({
                      path:
                        filePath,

                      oldText:
                        'export const value = "bad";',

                      newText:
                        'export const value = "good";',
                    }),
                },
              },
            ],
          }),

          /*
           * Round 2:
           * Verify the change.
           *
           * The command deliberately checks
           * for the corrected value.
           */
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "execute_verify_1",

                type: "function",

function: {
  name:
    "execute_command",

  arguments:
    JSON.stringify({
      command:
        `node -e "const fs=require('fs'); const s=fs.readFileSync('sample.js','utf8'); if (!s.includes('value = \\"good\\"')) process.exit(1)"`,
    }),
},
              },
            ],
          }),

          /*
           * Round 3:
           * Final response after verification.
           */
          createResponse({
            content:
              "EDIT_VERIFY_SUCCESS",
          }),
        ]);

      const result =
        await execute({
          prompt:
            "Fix the value in the file and verify the change.",

          repository:
            createRepository(),

          provider,
          tools,

          project: {
            root:
              temporaryDirectory,
          },

          config:
            createConfig({
              maxAttempts: 1,
              maxToolRounds: 5,
            }),

          requestApproval:
            async (request) => {
              approvalRequests.push(
                request
              );

              return true;
            },
        });

      const finalSource =
        await fs.readFile(
          filePath,
          "utf8"
        );

      /*
       * The file was actually modified.
       */
      assert.equal(
        finalSource,
        'export const value = "good";\n'
      );

      /*
       * Three model calls:
       *
       * 1. edit_file
       * 2. execute_command
       * 3. final response
       */
      assert.equal(
        provider.calls.length,
        3
      );

      /*
       * Both mutating operations required
       * approval.
       */
      assert.equal(
        approvalRequests.length,
        2
      );

      assert.equal(
        approvalRequests[0].toolName,
        "edit_file"
      );

      assert.equal(
        approvalRequests[1].toolName,
        "execute_command"
      );

      /*
       * edit_file succeeded.
       */
      assert.equal(
        result.toolResults[0]
          .result.success,
        true
      );

      /*
       * execute_command succeeded.
       */
      assert.equal(
        result.toolResults[1]
          .result.success,
        true
      );

      assert.equal(
        result.toolResults[1]
          .result.output.success,
        true
      );

      assert.equal(
        result.toolResults[1]
          .result.output.output.exitCode,
        0
      );

      /*
       * Final model response.
       */
      assert.equal(
        result.response.message.content,
        "EDIT_VERIFY_SUCCESS"
      );

      assert.equal(
        result.telemetry.toolRounds,
        2
      );
    } finally {
      await fs.rm(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
);

test(
  "tracks verification after a successful write followed by execute_command",
  async () => {
    const temporaryDirectory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "codeforge-verification-"
        )
      );

    const filePath =
      path.join(
        temporaryDirectory,
        "sample.js"
      );

    try {
      await fs.writeFile(
        filePath,
        'export const value = "bad";\n',
        "utf8"
      );

      const tools =
        createToolRegistry([
          editFileTool,
          shellTool,
        ]);

      const provider =
        createProvider([
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "verification_edit_1",

                type: "function",

                function: {
                  name:
                    "edit_file",

                  arguments:
                    JSON.stringify({
                      path:
                        filePath,

                      oldText:
                        'export const value = "bad";',

                      newText:
                        'export const value = "good";',
                    }),
                },
              },
            ],
          }),

          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "verification_command_1",

                type: "function",

                function: {
                  name:
                    "execute_command",

                  arguments:
                    JSON.stringify({
                      command:
                        'node -e "const fs=require(\'fs\'); const s=fs.readFileSync(\'sample.js\',\'utf8\'); if (!s.includes(\'value = \\"good\\"\')) process.exit(1)"',
                    }),
                },
              },
            ],
          }),

          createResponse({
            content:
              "VERIFIED",
          }),
        ]);

      const result =
        await execute({
          prompt:
            "Fix the implementation and verify it.",

          repository:
            createRepository(),

          provider,
          tools,

          project: {
            root:
              temporaryDirectory,
          },

          config:
            createConfig({
              maxAttempts: 1,
              maxToolRounds: 5,
            }),

          requestApproval:
            async () => true,
        });

      assert.equal(
        result.response.message.content,
        "VERIFIED"
      );

      assert.equal(
        result.telemetry.verification.required,
        true
      );

      assert.equal(
        result.telemetry.verification.attempted,
        true
      );

      assert.equal(
        result.telemetry.verification.succeeded,
        true
      );
    } finally {
      await fs.rm(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
);

test(
  "does not accept a final response after a write before verification",
  async () => {
    const temporaryDirectory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "codeforge-premature-verification-"
        )
      );

    const filePath =
      path.join(
        temporaryDirectory,
        "sample.js"
      );

    try {
      await fs.writeFile(
        filePath,
        'export const value = "bad";\n',
        "utf8"
      );

      const tools =
        createToolRegistry([
          editFileTool,
          shellTool,
        ]);

      const provider =
        createProvider([
          /*
           * Round 1:
           * The model modifies the file.
           */
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "premature_edit_1",

                type: "function",

                function: {
                  name:
                    "edit_file",

                  arguments:
                    JSON.stringify({
                      path:
                        filePath,

                      oldText:
                        'export const value = "bad";',

                      newText:
                        'export const value = "good";',
                    }),
                },
              },
            ],
          }),

          /*
           * Round 2:
           * The model incorrectly tries to finish
           * without verifying the change.
           *
           * The executor should NOT accept this
           * as the final response.
           */
          createResponse({
            content:
              "PREMATURE_FINISH",
          }),

          /*
           * Round 3:
           * The executor should require the model
           * to continue and the model now verifies.
           */
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "premature_verify_1",

                type: "function",

                function: {
                  name:
                    "execute_command",

                  arguments:
                    JSON.stringify({
                      command:
                        'node -e "const fs=require(\'fs\'); const s=fs.readFileSync(\'sample.js\',\'utf8\'); if (!s.includes(\'value = \\"good\\"\')) process.exit(1)"',
                    }),
                },
              },
            ],
          }),

          /*
           * Round 4:
           * Final response after verification.
           */
          createResponse({
            content:
              "VERIFIED_AFTER_CONTINUATION",
          }),
        ]);

      const result =
        await execute({
          prompt:
            "Fix the implementation and verify it.",

          repository:
            createRepository(),

          provider,
          tools,

          project: {
            root:
              temporaryDirectory,
          },

          config:
            createConfig({
              maxAttempts: 1,
              maxToolRounds: 5,
            }),

          requestApproval:
            async () => true,
        });

      /*
       * The premature response must not be
       * accepted as the final response.
       */
      assert.equal(
        result.response.message.content,
        "VERIFIED_AFTER_CONTINUATION"
      );

      /*
       * Four model calls:
       *
       * 1. edit
       * 2. premature final response
       * 3. verification command
       * 4. final response
       */
      assert.equal(
        provider.calls.length,
        4
      );

      assert.equal(
        result.telemetry.verification.required,
        true
      );

      assert.equal(
        result.telemetry.verification.attempted,
        true
      );

      assert.equal(
        result.telemetry.verification.succeeded,
        true
      );
    } finally {
      await fs.rm(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
);

test(
  "tracks failed verification and successful repair verification",
  async () => {
    const temporaryDirectory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "codeforge-repair-verification-"
        )
      );

    const filePath =
      path.join(
        temporaryDirectory,
        "sample.js"
      );

    try {
      await fs.writeFile(
        filePath,
        'export const value = "bad";\n',
        "utf8"
      );

      const tools =
        createToolRegistry([
          editFileTool,
          shellTool,
        ]);

      const provider =
        createProvider([
          /*
           * Round 1:
           * Make an incorrect repair.
           */
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "repair_edit_1",

                type: "function",

                function: {
                  name:
                    "edit_file",

                  arguments:
                    JSON.stringify({
                      path:
                        filePath,

                      oldText:
                        'export const value = "bad";',

                      newText:
                        'export const value = "still-bad";',
                    }),
                },
              },
            ],
          }),

          /*
           * Round 2:
           * Verification fails because the expected
           * corrected value is not present.
           */
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "repair_verify_1",

                type: "function",

                function: {
                  name:
                    "execute_command",

                  arguments:
                    JSON.stringify({
                      command:
                        `node -e "const fs=require('fs'); const s=fs.readFileSync('${filePath.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}', 'utf8'); if (!s.includes('value = \\"good\\"')) process.exit(1)"`,
                    }),
                },
              },
            ],
          }),

          /*
           * Round 3:
           * Repair the incorrect change.
           */
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "repair_edit_2",

                type: "function",

                function: {
                  name:
                    "edit_file",

                  arguments:
                    JSON.stringify({
                      path:
                        filePath,

                      oldText:
                        'export const value = "still-bad";',

                      newText:
                        'export const value = "good";',
                    }),
                },
              },
            ],
          }),

          /*
           * Round 4:
           * Verification succeeds.
           */
          createResponse({
            content: null,

            toolCalls: [
              {
                id:
                  "repair_verify_2",

                type: "function",

                function: {
                  name:
                    "execute_command",

                  arguments:
                    JSON.stringify({
                      command:
                        `node -e "const fs=require('fs'); const s=fs.readFileSync('${filePath.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}', 'utf8'); if (!s.includes('value = \\"good\\"')) process.exit(1)"`,
                    }),
                  },
                },
            ],
          }),

          /*
           * Round 5:
           * Final response after successful repair
           * verification.
           */
          createResponse({
            content:
              "REPAIR_VERIFIED",
          }),
        ]);

      const result =
        await execute({
          prompt:
            "Fix the implementation and verify it.",

          repository:
            createRepository(),

          provider,
          tools,

          project: {
            root:
              temporaryDirectory,
          },

          config:
            createConfig({
              maxAttempts: 1,
              maxToolRounds: 6,
            }),

          requestApproval:
            async () => true,
        });

      assert.equal(
        result.response.message.content,
        "REPAIR_VERIFIED"
      );

      assert.equal(
        result.telemetry.verification.required,
        true
      );

      assert.equal(
        result.telemetry.verification.attempted,
        true
      );

      assert.equal(
        result.telemetry.verification.succeeded,
        true
      );

      assert.equal(
        result.telemetry.toolRounds,
        4
      );
    } finally {
      await fs.rm(
        temporaryDirectory,
        {
          recursive: true,
          force: true,
        }
      );
    }
  }
);