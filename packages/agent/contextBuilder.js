function formatRetrievalResults(results = []) {
  if (!Array.isArray(results) || results.length === 0) {
    return "";
  }

  return results
    .map((result, index) => {
      const header = [
        `Result ${index + 1}`,
        result.path ? `File: ${result.path}` : null,
        result.language ? `Language: ${result.language}` : null,
        Number.isFinite(result.score)
          ? `Relevance score: ${result.score}`
          : null,
        result.reason
          ? `Match reason: ${result.reason}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      const symbols =
        Array.isArray(result.symbols) &&
        result.symbols.length > 0
          ? result.symbols
              .slice(0, 20)
              .map((symbol) => {
                const kind = symbol.kind
                  ? `${symbol.kind} `
                  : "";

                return `- ${kind}${symbol.name}`;
              })
              .join("\n")
          : "";

      const imports =
        Array.isArray(result.imports) &&
        result.imports.length > 0
          ? result.imports
              .slice(0, 20)
              .map((item) => `- ${item.source}`)
              .join("\n")
          : "";

      const exports =
        Array.isArray(result.exports) &&
        result.exports.length > 0
          ? result.exports
              .slice(0, 20)
              .map((item) => `- ${item.name}`)
              .join("\n")
          : "";

      const sections = [header];

      if (symbols) {
        sections.push(`Symbols:\n${symbols}`);
      }

      if (imports) {
        sections.push(`Imports:\n${imports}`);
      }

      if (exports) {
        sections.push(`Exports:\n${exports}`);
      }

      if (result.content) {
        sections.push(
          `Source excerpt:\n${result.content}`
        );
      }

      return sections.join("\n\n");
    })
    .join("\n\n---\n\n");
}

function buildModelUserMessage({
  prompt,
  project,
  git,
  rag,
}) {
  const sections = [];

  sections.push(
    [
      "User request:",
      prompt,
    ].join("\n")
  );

  const projectDetails = [
    project?.name
      ? `Project: ${project.name}`
      : null,

    project?.root
      ? `Project root: ${project.root}`
      : null,

    project?.language
      ? `Primary language: ${project.language}`
      : null,

    git?.branch?.current
      ? `Git branch: ${git.branch.current}`
      : null,

    typeof git?.status?.clean === "boolean"
      ? `Working tree: ${
          git.status.clean
            ? "clean"
            : "has uncommitted changes"
        }`
      : null,
  ].filter(Boolean);

  if (projectDetails.length > 0) {
    sections.push(
      [
        "Project context:",
        ...projectDetails,
      ].join("\n")
    );
  }

  if (rag?.enabled) {
    const retrievalText =
      formatRetrievalResults(rag.results);

    if (retrievalText) {
      sections.push(
        [
          "Retrieved repository context:",
          "",
          retrievalText,
        ].join("\n")
      );
    } else {
      sections.push(
        [
          "Retrieved repository context:",
          "No relevant repository results were found.",
        ].join("\n")
      );
    }
  }

  sections.push(
    [
      "Instructions:",
      "Use the repository context above when it is relevant to the request.",
      "Base claims about the codebase on the provided repository evidence.",
      "Do not invent files, symbols, dependencies, or behavior that are not supported by the available context.",
      "If the available repository context is insufficient, say what information is missing rather than pretending you inspected code that was not provided.",
      "Return a direct final answer to the user.",
    ].join("\n")
  );

  return sections.join("\n\n");
}

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

    modelUser: buildModelUserMessage({
      prompt,
      project,
      git,
      rag,
    }),

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