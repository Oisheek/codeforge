import fs from "fs/promises";
import path from "path";

export async function findWorkspaceRoot(start) {
  let current = path.resolve(start);

  while (true) {
    try {
      await fs.access(path.join(current, "pnpm-workspace.yaml"));
      return current;
    } catch {}

    const parent = path.dirname(current);

    if (parent === current) {
      return start;
    }

    current = parent;
  }
}