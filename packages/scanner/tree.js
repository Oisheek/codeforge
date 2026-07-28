import fs from "fs/promises";
import path from "path";
import { DEFAULT_IGNORE } from "./ignore.js";

const MAX_DEPTH = 3;

async function walk(dir, depth = 0) {
  if (depth > MAX_DEPTH)
    return [];

  let entries = await fs.readdir(dir, {
    withFileTypes: true
  });

  entries = entries
    .filter(entry => !DEFAULT_IGNORE.includes(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines = [];

  for (const entry of entries) {
    const indent = "  ".repeat(depth);

    if (entry.isDirectory()) {
      lines.push(`${indent}${entry.name}/`);

      const children = await walk(
        path.join(dir, entry.name),
        depth + 1
      );

      lines.push(...children);
    } else {
      lines.push(`${indent}${entry.name}`);
    }
  }

  return lines;
}

export async function buildTree(root) {
  const lines = await walk(root);

  return lines.join("\n");
}