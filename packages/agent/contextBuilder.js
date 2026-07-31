export function buildContext({
  prompt,
  plan,
  project = {},
  git = {},
  memory = {},
  rag = {},
  systemPrompt = "",
}) {
  const context = {
    system: systemPrompt,

    user: prompt,

    project: {
      name: project.name ?? null,
      root: project.root ?? null,
      language: project.language ?? null,
    },

    git: {
      branch: git.branch?.current ?? null,
      clean: git.status?.clean ?? true,
    },

    memory,

    retrieval: rag.enabled
      ? {
          query: rag.query,
          results: rag.results,
          stats: rag.stats,
        }
      : null,

    execution: {
      intent: plan.intent,
      steps: plan.steps,
      requiresRAG: plan.requiresRAG,
      requiresThinking: plan.requiresThinking,
      requiresTools: plan.requiresTools,
      requiresWrite: plan.requiresWrite,
      requiresGit: plan.requiresGit,
    },
  };

  return context;
}