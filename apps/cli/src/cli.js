import { createPrompt, logger } from "../../../packages/terminal/index.js";
console.log(typeof execute);
export function startCLI(app) {
  const {
  config,
  project,
  git,
  provider,
  repository,
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
        defaultModel: config.defaultModel,
      },
    ],
    config,
    project,
    git,
    memory: {},
    systemPrompt,
  });

  logger.plain("");
  logger.plain(
  result.response.message?.content ?? "No response."
);
  logger.plain("");
} catch (error) {
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