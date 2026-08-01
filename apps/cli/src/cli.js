import {
  createPrompt,
  logger,
  createAgentDashboard,
} from "../../../packages/terminal/index.js";

async function requestToolApproval(
  prompt,
  request
) {
  const {
    toolName,
    arguments: args = {},
  } = request;

  logger.plain("");
  logger.warn(
    `Approval required: ${toolName}`
  );

  if (args.path) {
    logger.plain(
      `Path: ${args.path}`
    );
  }

  if (
    toolName === "write_file" &&
    typeof args.content === "string"
  ) {
    logger.plain(
      `Content size: ${Buffer.byteLength(
        args.content,
        "utf8"
      )} bytes`
    );
  }

  return new Promise((resolve) => {
    prompt.question(
      "Approve this operation? [y/N] ",
      (answer) => {
        const normalized =
          answer
            .trim()
            .toLowerCase();

        const approved =
          normalized === "y" ||
          normalized === "yes";

        logger.plain("");

        resolve(approved);
      }
    );
  });
}

export function startCLI(app) {
  const {
    config,
    project,
    git,
    provider,
    repository,
    tools,
    systemPrompt,
    execute,
  } = app;

  logger.success(`Loaded project: ${project.name}`);

  if (git?.isRepository) {
    logger.info(`Git Branch: ${git.branch.current}`);

    if (git.status.clean) {
      logger.success("Working tree clean.");
    } else {
      logger.warn("Working tree has uncommitted changes.");
    }
  }

  const dashboard = createAgentDashboard({
  enabled: config.agentDashboard,
  projectRoot: project.root,
});

  const prompt = createPrompt();

  prompt.prompt();

  prompt.on("line", async (input) => {
    const command = input.trim();

    if (!command) {
      prompt.prompt();
      return;
    }

    if (command.toLowerCase() === "exit") {
      logger.info("Goodbye!");
      prompt.close();
      return;
    }

    try {
      const result = await execute({
        prompt: command,
        repository,
        provider,
        providers: [
  {
    name: "openrouter",
  },
],
        tools,
        config,
        project,
        git,
        memory: {},
        systemPrompt,

        requestApproval:
  (request) =>
    requestToolApproval(
      prompt,
      request
    ),

        onEvent: dashboard.handle,
      });

      dashboard.finish();

      logger.plain("");
      logger.plain(
        result.response.message?.content ?? "No response."
      );
      logger.plain("");
    } catch (error) {
      dashboard.finish();
      logger.error(error.message);
    }

    prompt.prompt();
  });

  prompt.on("close", () => {
    process.exit(0);
  });

  process.on("SIGINT", () => {
    logger.info("Shutting down...");
    prompt.close();
  });
}