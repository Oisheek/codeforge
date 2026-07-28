import fs from "fs/promises";
import path from "path";

async function readPackageJson(root) {
  const file = path.join(root, "package.json");

  try {
    const content = await fs.readFile(file, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function detectProject(root) {
  const packageJson = await readPackageJson(root);

  let framework = "unknown";
  let packageManager = "unknown";

  if (!packageJson) {
    return {
      framework,
      packageManager,
      packageJson: null
    };
  }

  const deps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {})
  };

  if (deps.next)
    framework = "next";

  else if (deps.react)
    framework = "react";

  else if (deps["@nestjs/core"])
    framework = "nest";

  else if (deps.express)
    framework = "express";

  else if (deps.vue)
    framework = "vue";

  else if (deps.vite)
    framework = "vite";

  else
    framework = "node";

  if (packageJson.packageManager?.startsWith("pnpm"))
    packageManager = "pnpm";

  else if (packageJson.packageManager?.startsWith("yarn"))
    packageManager = "yarn";

  else
    packageManager = "npm";

  return {
    framework,
    packageManager,
    packageJson
  };
}