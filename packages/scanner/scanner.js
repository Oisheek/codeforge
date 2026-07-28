import fs from "fs/promises";
import path from "path";

import { detectProject } from "./detect.js";
import { buildTree } from "./tree.js";

export async function scanProject(root) {
  const detection = await detectProject(root);

  let files = [];

  try {
    files = await fs.readdir(root);
  } catch {}

  return {
    name: path.basename(root),

    root,

    packageManager: detection.packageManager,

    framework: detection.framework,

    hasGit: files.includes(".git"),

    hasNodeModules: files.includes("node_modules"),

    tree: await buildTree(root),

    packageJson: detection.packageJson,

    files
  };
}