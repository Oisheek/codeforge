import fs from "node:fs/promises";

import {
  defineTool,
} from "../core/tool.js";

import {
  createToolError,
  normalizeProjectPath,
  resolveProjectPath,
} from "./filesystem.js";

export const readFileTool = defineTool({
  name: "read_file",

  description:
    "Read the contents of a UTF-8 text file inside the current project.",

  source: "builtin",

  capabilities: [
    "filesystem.read",
  ],

  sideEffect: "none",

  approval: "never",

  inputSchema: {
    type: "object",

    properties: {
      path: {
        type: "string",
        description:
          "Path to the file relative to the project root.",
      },
    },

    required: [
      "path",
    ],

    additionalProperties: false,
  },

  async execute(
    input,
    context = {}
  ) {
    const {
      resolved,
      relative,
    } = resolveProjectPath(
      context.projectRoot,
      input?.path
    );

    let stats;

    try {
      stats =
        await fs.stat(
          resolved
        );
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw createToolError(
          "file_not_found",
          `File not found: ${input.path}`
        );
      }

      throw error;
    }

    if (!stats.isFile()) {
      throw createToolError(
        "not_a_file",
        `Path is not a file: ${input.path}`
      );
    }

    const content =
      await fs.readFile(
        resolved,
        "utf8"
      );

    return {
      path:
        normalizeProjectPath(
          relative
        ),

      content,

      size: stats.size,
    };
  },
});