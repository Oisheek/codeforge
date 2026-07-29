import dotenv from "dotenv";

import {
  scanProject,
  findWorkspaceRoot,
} from "../../../packages/scanner/index.js";

import {
  inspectGit,
} from "../../../packages/git/index.js";

import {
  showBanner,
  logger,
} from "../../../packages/terminal/index.js";

import { loadConfig } from "../../../packages/config/index.js";
import { startCLI } from "./cli.js";

export async function bootstrap() {
  try {
    dotenv.config();

    const config = loadConfig();

    showBanner();

    logger.success("Configuration loaded.");

    const root = await findWorkspaceRoot(process.cwd());

    const project = await scanProject(root);

    logger.success(`Project: ${project.name}`);

    const git = await inspectGit(root);

    logger.success("CodeForge initialized.");

    startCLI({
      config,
      project,
      git,
    });

  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}