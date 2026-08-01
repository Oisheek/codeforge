import fs from "node:fs/promises";
import path from "node:path";
import {
  createToolError,
  resolveProjectPath,
} from "./filesystem.js";
import {
  defineTool,
} from "../core/tool.js";

const DEFAULT_IGNORE = new Set([
  ".git",
  "node_modules",
  ".pnpm",
  "dist",
  "build",
  "coverage",
]);

const DEFAULT_MAX_RESULTS = 100;
const MAX_RESULTS_LIMIT = 500;



function normalizeMaxResults(value) {
  if (value == null) {
    return DEFAULT_MAX_RESULTS;
  }

  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_RESULTS_LIMIT
  ) {
    throw new TypeError(
      `maxResults must be an integer between 1 and ${MAX_RESULTS_LIMIT}.`
    );
  }

  return value;
}

function normalizePath(filePath, root) {
  return path
    .relative(root, filePath)
    .split(path.sep)
    .join("/");
}

async function searchFile({
  filePath,
  root,
  query,
  caseSensitive,
  results,
  maxResults,
}) {
  let content;

  try {
    content = await fs.readFile(
      filePath,
      "utf8"
    );
  } catch {
    return;
  }

  const lines = content.split(/\r?\n/);

  const needle = caseSensitive
    ? query
    : query.toLowerCase();

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const line = lines[index];

    const haystack = caseSensitive
      ? line
      : line.toLowerCase();

    if (!haystack.includes(needle)) {
      continue;
    }

    results.push({
      path: normalizePath(
        filePath,
        root
      ),

      line: index + 1,

      text: line,
    });

    if (results.length >= maxResults) {
      return;
    }
  }
}

async function walk({
  directory,
  root,
  query,
  caseSensitive,
  results,
  maxResults,
}) {
  if (results.length >= maxResults) {
    return;
  }

  let entries;

  try {
    entries = await fs.readdir(
      directory,
      {
        withFileTypes: true,
      }
    );
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= maxResults) {
      return;
    }

    if (DEFAULT_IGNORE.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      await walk({
        directory: fullPath,
        root,
        query,
        caseSensitive,
        results,
        maxResults,
      });

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    await searchFile({
      filePath: fullPath,
      root,
      query,
      caseSensitive,
      results,
      maxResults,
    });
  }
}

export const searchFilesTool = defineTool({
  name: "search_files",

  description:
    "Search project files for literal text and return matching file paths, line numbers, and lines.",

  source: "builtin",

  capabilities: [
    "filesystem.read",
    "filesystem.search",
  ],

  sideEffect: "none",

  approval: "never",

  inputSchema: {
    type: "object",

    properties: {
      query: {
        type: "string",
        description:
          "Literal text to search for.",
      },

      path: {
        type: "string",
        description:
          "Optional project-relative file or directory to search. Defaults to the project root.",
      },

      caseSensitive: {
        type: "boolean",
        description:
          "Whether matching should be case-sensitive. Defaults to false.",
      },

      maxResults: {
        type: "integer",
        minimum: 1,
        maximum: MAX_RESULTS_LIMIT,
        description:
          "Maximum number of matches to return. Defaults to 100.",
      },
    },

    required: [
      "query",
    ],

    additionalProperties: false,
  },

  async execute(
    input,
    context = {}
  ) {
    if (
      typeof input?.query !== "string" ||
      input.query.length === 0
    ) {
      throw new TypeError(
        "query must be a non-empty string."
      );
    }

    const searchPath =
      input.path ?? ".";

    const caseSensitive =
      input.caseSensitive ?? false;

    if (
      typeof caseSensitive !== "boolean"
    ) {
      throw new TypeError(
        "caseSensitive must be a boolean."
      );
    }

    const maxResults =
      normalizeMaxResults(
        input.maxResults
      );

    const {
      root,
      resolved,
    } = resolveProjectPath(
      context.projectRoot,
      searchPath
    );

    let stats;

    try {
      stats = await fs.stat(
        resolved
      );
    } catch (error) {
  if (error?.code === "ENOENT") {
    throw createToolError(
      "path_not_found",
      `Search path not found: ${searchPath}`
    );
  }

  throw error;
}

    const results = [];

    if (stats.isFile()) {
      await searchFile({
        filePath: resolved,
        root,
        query: input.query,
        caseSensitive,
        results,
        maxResults,
      });
    } else if (stats.isDirectory()) {
      await walk({
        directory: resolved,
        root,
        query: input.query,
        caseSensitive,
        results,
        maxResults,
      });
    } else {
      throw createToolError(
  "invalid_search_path",
  `Search path is not a file or directory: ${searchPath}`
);
    }

    return {
      query: input.query,
      path: searchPath,
      caseSensitive,
      matches: results,
      count: results.length,
      truncated:
        results.length >= maxResults,
    };
  },
});