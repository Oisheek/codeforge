import path from "node:path";

export function createToolError(
  code,
  message,
  details = null
) {
  const error = new Error(message);

  error.code = code;
  error.details = details;

  return error;
}

export function resolveProjectPath(
  projectRoot,
  targetPath
) {
  if (
    typeof projectRoot !== "string" ||
    projectRoot.trim().length === 0
  ) {
    throw createToolError(
      "project_root_required",
      "Project root is required."
    );
  }

  if (
    typeof targetPath !== "string" ||
    targetPath.trim().length === 0
  ) {
    throw createToolError(
      "invalid_path",
      "Path must be a non-empty string."
    );
  }

  const root =
    path.resolve(projectRoot);

  const resolved =
    path.resolve(
      root,
      targetPath
    );

  const relative =
    path.relative(
      root,
      resolved
    );

  if (
    relative === ".." ||
    relative.startsWith(
      `..${path.sep}`
    ) ||
    path.isAbsolute(relative)
  ) {
    throw createToolError(
      "path_outside_project",
      "Path is outside the project root."
    );
  }

  return {
    root,
    resolved,
    relative:
      relative || ".",
  };
}

export function normalizeProjectPath(
  filePath
) {
  return filePath
    .split(path.sep)
    .join("/");
}