import fs from "node:fs/promises";

import {
  createToolError,
  resolveProjectPath,
} from "./filesystem.js";

import {
  defineTool,
} from "../core/tool.js";

function countOccurrences(
  content,
  search
) {
  let count = 0;
  let position = 0;

  while (true) {
    const index =
      content.indexOf(
        search,
        position
      );

    if (index === -1) {
      return count;
    }

    count += 1;

    position =
      index + search.length;
  }
}

export const editFileTool =
  defineTool({
    name: "edit_file",

    description:
  "Edit an existing UTF-8 text file inside the project by replacing exactly one occurrence of oldText with newText. Use this when the target file path and exact text to replace are known. The edit requires approval.",

    source: "builtin",

    capabilities: [
      "filesystem.read",
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
          description:
            "Path to the existing file relative to the project root.",
        },

        oldText: {
          type: "string",
          minLength: 1,
          description:
            "Exact existing text to replace. It must occur exactly once in the file.",
        },

        newText: {
          type: "string",
          description:
            "Replacement text.",
        },
      },

      required: [
        "path",
        "oldText",
        "newText",
      ],

      additionalProperties: false,
    },

    async execute(
      input,
      context = {}
    ) {
      const filePath =
        input?.path;

      const oldText =
        input?.oldText;

      const newText =
        input?.newText;

      if (
        typeof oldText !== "string" ||
        oldText.length === 0
      ) {
        throw createToolError(
          "invalid_old_text",
          "oldText must be a non-empty string."
        );
      }

      if (
        typeof newText !== "string"
      ) {
        throw createToolError(
          "invalid_new_text",
          "newText must be a string."
        );
      }

      const {
        resolved,
        relative,
      } = resolveProjectPath(
        context.projectRoot,
        filePath
      );

      let stats;

      try {
        stats =
          await fs.stat(
            resolved
          );
      } catch (error) {
        if (
          error?.code === "ENOENT"
        ) {
          throw createToolError(
            "file_not_found",
            `File not found: ${relative}`
          );
        }

        throw error;
      }

      if (!stats.isFile()) {
        throw createToolError(
          "path_not_file",
          `Path is not a file: ${relative}`
        );
      }

      let content;

      try {
        content =
          await fs.readFile(
            resolved,
            "utf8"
          );
      } catch (error) {
        throw createToolError(
          "file_read_failed",
          `Failed to read file: ${relative}`,
          {
            cause:
              error?.message ??
              String(error),
          }
        );
      }

      const occurrences =
        countOccurrences(
          content,
          oldText
        );

      if (occurrences === 0) {
        throw createToolError(
          "edit_target_not_found",
          `oldText was not found in file: ${relative}`
        );
      }

      if (occurrences > 1) {
        throw createToolError(
          "edit_target_ambiguous",
          `oldText occurs more than once in file: ${relative}`,
          {
            occurrences,
          }
        );
      }

      const updatedContent =
        content.replace(
          oldText,
          newText
        );

      try {
        await fs.writeFile(
          resolved,
          updatedContent,
          {
            encoding: "utf8",
            flag: "w",
          }
        );
      } catch (error) {
        throw createToolError(
          "file_write_failed",
          `Failed to edit file: ${relative}`,
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
          await fs.stat(
            resolved
          );
      } catch (error) {
        throw createToolError(
          "file_verification_failed",
          `Unable to verify edited file: ${relative}`,
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
          `Edited path is not a file: ${relative}`
        );
      }

      return {
        path: relative,
        previousSize:
          stats.size,
        size:
          after.size,
        replacements: 1,
      };
    },
  });