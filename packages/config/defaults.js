export const defaultConfig = {
  provider: "openrouter",

  models: {
    fast: "google/gemma-4-26b-a4b-it:free",

    general: "google/gemma-4-26b-a4b-it:free",

    coding: "cohere/north-mini-code:free",

    heavyCoding: "poolside/laguna-s-2.1:free",

    planner:
      "nvidia/nemotron-3-ultra-550b-a55b:free",

    subagent:
      "poolside/laguna-xs-2.1:free",

    vision:
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",

    documentVision:
      "nvidia/nemotron-nano-12b-v2-vl:free",

    embedding:
      "nvidia/llama-nemotron-embed-vl-1b-v2:free",

    reranker:
      "nvidia/llama-nemotron-rerank-vl-1b-v2:free",

    fallback:
      "openai/gpt-oss-20b:free",

    emergency:
      "openrouter/free",
  },

  selectors: {
    provider: "openrouter",

    rag: "nvidia/nemotron-3-embed-1b:free",

    model: "google/gemma-4-26b-a4b-it:free",

    maxTokens: 128,

    modelMaxTokens: 256,
  },

  temperature: 0.2,

  maxTokens: 4096,

  maxAttempts: 3,

  maxToolRounds: 10,

  confirmEdits: true,

  theme: "default",

  debug: false,

  telemetry: false,

  agentDashboard: true,
};