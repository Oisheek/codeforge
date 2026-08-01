import fs from "node:fs/promises";
import path from "node:path";

import {
  createToolError,
  resolveProjectPath,
} from "./filesystem.js";

import {
  defineTool,
} from "../core/tool.js";

async function assertParentDirectory(
  resolvedPath
) {
  const parent =
    path.dirname(resolvedPath);

  try {
    const stats =
      await fs.stat(parent);

    if (!stats.isDirectory()) {
      throw createToolError(
        "parent_not_directory",
        "Parent path is not a directory."
      );
    }
  } catch (error) {
    if (
      error?.code ===
      "parent_not_directory"
    ) {
      throw error;
    }

    if (error?.code === "ENOENT") {
      throw createToolError(
        "parent_directory_not_found",
        "Parent directory does not exist."
      );
    }

    throw error;
  }
}

async function inspectExistingFile(
  resolvedPath
) {
  try {
    const stats =
      await fs.stat(resolvedPath);

    if (!stats.isFile()) {
      throw createToolError(
        "path_not_file",
        "Target path is not a file."
      );
    }

    return {
      exists: true,
      size: stats.size,
    };
  } catch (error) {
    if (
      error?.code ===
      "path_not_file"
    ) {
      throw error;
    }

    if (error?.code === "ENOENT") {
      return {
        exists: false,
        size: 0,
      };
    }

    throw error;
  }
}

export const writeFileTool =
  defineTool({
    name: "write_file",

    description:
      "Write UTF-8 text content to a file inside the project root.",

    capabilities: [
      "filesystem.write",
    ],

    sideEffect: "write",
    approval: "policy",

    inputSchema: {
      type: "object",

      properties: {
        path: {
          type: "string",
          minLength: 1,
        },

        content: {
          type: "string",
        },
      },

      required: [
        "path",
        "content",
      ],

      additionalProperties: false,
    },

    async execute(
      input,
      context
    ) {
      const {
        projectRoot,
      } = context;

      const filePath =
        input?.path;

      const content =
        input?.content;

      if (typeof content !== "string") {
        throw createToolError(
          "invalid_content",
          "File content must be a string."
        );
      }

      const {
        resolved,
        relative,
      } = resolveProjectPath(
        projectRoot,
        filePath
      );

      await assertParentDirectory(
        resolved
      );

      const before =
        await inspectExistingFile(
          resolved
        );

      try {
        await fs.writeFile(
          resolved,
          content,
          {
            encoding: "utf8",
            flag: "w",
          }
        );
      } catch (error) {
        throw createToolError(
          "file_write_failed",
          `Failed to write file: ${relative}`,
          {
            cause:
              error?.message ??
              String(error),
          }
        );
      }

      let after;

      try {
        after =
          await fs.stat(resolved);
      } catch (error) {
        throw createToolError(
          "file_verification_failed",
          `Unable to verify written file: ${relative}`,
          {
            cause:
              error?.message ??
              String(error),
          }
        );
      }

      if (!after.isFile()) {
        throw createToolError(
          "file_verification_failed",
          `Written path is not a file: ${relative}`
        );
      }

      return {
        path: relative,
        created: !before.exists,
        overwritten: before.exists,
        previousSize: before.size,
        size: after.size,
      };
    },
  });