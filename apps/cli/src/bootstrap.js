import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

import {
  scanProject,
  findWorkspaceRoot,
} from "../../../packages/scanner/index.js";

import {
  inspectGit,
} from "../../../packages/git/index.js";

import {
  buildRepository,
} from "../../../packages/retrieval/index.js";

import {
  createSystemPrompt,
} from "../../../packages/prompts/index.js";

import {
  execute,
} from "../../../packages/agent/index.js";

import {
  createOpenRouter,
} from "../../../packages/providers/index.js";

import {
  showBanner,
  logger,
} from "../../../packages/terminal/index.js";

import {
  loadConfig,
} from "../../../packages/config/index.js";

import { startCLI } from "./cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

export async function bootstrap() {
  try {
    const config = loadConfig();

    showBanner();

    logger.success("Configuration loaded.");

    const root = await findWorkspaceRoot(process.cwd());

    const project = await scanProject(root);

    logger.success(`Project: ${project.name}`);

    logger.info("Building repository index...");

    // Temporary: this will still fail until we fix the parser input.
    const repository = await buildRepository(root);

    logger.success("Repository indexed.");

    const git = await inspectGit(root);

    const provider = createOpenRouter(config);

    logger.success("OpenRouter provider initialized.");

    const systemPrompt = createSystemPrompt();

    console.log("execute:", typeof execute);

    logger.success("CodeForge initialized.");

    startCLI({
      config,
      project,
      git,
      provider,
      repository,
      systemPrompt,
      execute,
    });

  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}