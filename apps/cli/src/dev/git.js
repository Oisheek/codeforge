import {
  findWorkspaceRoot,
} from "../../../../packages/scanner/index.js";

import {
  inspectGit,
} from "../../../../packages/git/index.js";

export async function testGit() {
  console.log("\n===== Git =====");

  const root = await findWorkspaceRoot(process.cwd());

  const git = await inspectGit(root);

  console.dir(git, { depth: null });
}