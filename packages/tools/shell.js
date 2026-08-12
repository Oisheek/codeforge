import {
  spawn,
} from "node:child_process";

import {
  defineTool,
} from "../core/tool.js";

function createShellError(
  code,
  message,
  details = null
) {
  const error =
    new Error(message);

  error.code = code;

  if (details !== null) {
    error.details = details;
  }

  return error;
}

/**
 * Execute a command in the project.
 *
 * Approval/capability authorization belongs
 * to the agent/tool execution layer.
 *
 * @param {object} options
 * @param {string} options.command
 * @param {string} [options.cwd]
 * @param {number} [options.timeoutMs=120000]
 * @param {number} [options.maxOutputBytes=200000]
 * @returns {Promise<object>}
 */
export async function executeShell({
  command,
  cwd = process.cwd(),
  timeoutMs = 120_000,
  maxOutputBytes = 200_000,
} = {}) {
  if (
    typeof command !== "string" ||
    command.trim().length === 0
  ) {
    throw new TypeError(
      "Shell command must be a non-empty string."
    );
  }

  if (
    typeof cwd !== "string" ||
    cwd.trim().length === 0
  ) {
    throw new TypeError(
      "Shell cwd must be a non-empty string."
    );
  }

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new TypeError(
      "Shell timeoutMs must be a positive number."
    );
  }

  if (
    !Number.isFinite(maxOutputBytes) ||
    maxOutputBytes <= 0
  ) {
    throw new TypeError(
      "Shell maxOutputBytes must be a positive number."
    );
  }

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    let stdoutTruncated = false;
    let stderrTruncated = false;

    let timedOut = false;
    let settled = false;

    const appendOutput = (
      current,
      chunk
    ) => {
      const text =
        chunk.toString();

      const next =
        current + text;

      if (
        Buffer.byteLength(
          next,
          "utf8"
        ) <= maxOutputBytes
      ) {
        return {
          value: next,
          truncated: false,
        };
      }

      const buffer =
        Buffer.from(
          next,
          "utf8"
        );

      return {
        value:
          buffer
            .subarray(
              0,
              maxOutputBytes
            )
            .toString("utf8"),

        truncated: true,
      };
    };

    const child =
      spawn(
        command,
        {
          cwd,
          shell: true,
          windowsHide: true,

          stdio: [
            "ignore",
            "pipe",
            "pipe",
          ],
        }
      );

    const timer =
      setTimeout(() => {
        timedOut = true;

        try {
          child.kill();
        } catch {
          // Process may already have exited.
        }
      }, timeoutMs);

    child.stdout.on(
      "data",
      (chunk) => {
        const result =
          appendOutput(
            stdout,
            chunk
          );

        stdout =
          result.value;

        stdoutTruncated =
          stdoutTruncated ||
          result.truncated;
      }
    );

    child.stderr.on(
      "data",
      (chunk) => {
        const result =
          appendOutput(
            stderr,
            chunk
          );

        stderr =
          result.value;

        stderrTruncated =
          stderrTruncated ||
          result.truncated;
      }
    );

    const finish = ({
      code = null,
      signal = null,
      error = null,
    } = {}) => {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timer);

      if (error) {
        resolve({
          success: false,

          output: {
            command,
            cwd,
            stdout,
            stderr,
            stdoutTruncated,
            stderrTruncated,
            exitCode: code,
            signal,
            timedOut,
          },

          error: {
            code:
              error?.code ??
              "shell_execution_error",

            message:
              error?.message ??
              "Shell execution failed.",
          },
        });

        return;
      }

      resolve({
        success:
          !timedOut &&
          code === 0,

        output: {
          command,
          cwd,
          stdout,
          stderr,
          stdoutTruncated,
          stderrTruncated,
          exitCode: code,
          signal,
          timedOut,
        },
      });
    };

    child.on(
      "error",
      (error) => {
        finish({
          error,
        });
      }
    );

    child.on(
      "close",
      (code, signal) => {
        finish({
          code,
          signal,
        });
      }
    );
  });
};

/**
 * CodeForge command-execution tool.
 */
export const shellTool =
  defineTool({
    name: "execute_command",

    description:
      "Execute a shell command in the current project. Use this to run tests, builds, scripts, git commands, or other project commands. Execution requires explicit user approval.",

    source: "builtin",

    capabilities: [
      "process.execute",
    ],

    sideEffect: "execute",

    approval: "always",

    inputSchema: {
      type: "object",

      properties: {
        command: {
          type: "string",
          minLength: 1,
          description:
            "Shell command to execute.",
        },
      },

      required: [
        "command",
      ],

      additionalProperties: false,
    },

    async execute(
      input,
      context = {}
    ) {
      const command =
        input?.command;

      if (
        typeof command !== "string" ||
        command.trim().length === 0
      ) {
        throw createShellError(
          "invalid_command",
          "Command must be a non-empty string."
        );
      }

      const projectRoot =
        context.projectRoot;

      if (
        typeof projectRoot !== "string" ||
        projectRoot.trim().length === 0
      ) {
        throw createShellError(
          "project_root_required",
          "A project root is required for command execution."
        );
      }

      return executeShell({
        command,
        cwd: projectRoot,
      });
    },
  });