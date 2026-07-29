import { createPrompt, logger } from "../../../packages/terminal/index.js";

export function startCLI(app) {
  const { config, project, git } = app;

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

  prompt.on("line", (input) => {
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

    logger.plain(`You typed: ${command}`);

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