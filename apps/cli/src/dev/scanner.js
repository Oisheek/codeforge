import {
  findWorkspaceRoot,
  scanProject,
} from "../../../../packages/scanner/index.js";

export async function testScanner() {
  console.log("\n===== Scanner =====");

  const root = await findWorkspaceRoot(process.cwd());

  const project = await scanProject(root);

  console.dir(project, { depth: null });
}