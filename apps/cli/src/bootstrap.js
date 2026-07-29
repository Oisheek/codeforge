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

// apps/cli/src -> ../../../.env (workspace root)
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

    const git = await inspectGit(root);

    const provider = createOpenRouter(config);

    logger.success("OpenRouter provider initialized.");

    logger.success("CodeForge initialized.");

    startCLI({
      config,
      project,
      git,
      provider,
    });

  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}