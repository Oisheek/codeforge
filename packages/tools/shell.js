import {
  spawn,
} from "node:child_process";

/**
 * Execute a command in the project.
 *
 * This tool deliberately does not decide whether execution is allowed.
 * Approval/capability authorization belongs to the agent/tool execution layer.
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
    let timedOut = false;
    let settled = false;

    const appendOutput = (
      current,
      chunk
    ) => {
      const next =
        current +
        chunk.toString();

      if (
        Buffer.byteLength(
          next,
          "utf8"
        ) <= maxOutputBytes
      ) {
        return next;
      }

      const buffer =
        Buffer.from(
          next,
          "utf8"
        );

      return buffer
        .subarray(
          0,
          maxOutputBytes
        )
        .toString("utf8");
    };

    const child = spawn(
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
        stdout =
          appendOutput(
            stdout,
            chunk
          );
      }
    );

    child.stderr.on(
      "data",
      (chunk) => {
        stderr =
          appendOutput(
            stderr,
            chunk
          );
      }
    );

    const finish = ({
      code = null,
      signal = null,
    } = {}) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      const success =
        !timedOut &&
        code === 0;

      resolve({
        success,
        output: {
          command,
          cwd,
          stdout,
          stderr,
          exitCode: code,
          signal,
          timedOut,
        },
      });
    };

    child.on(
      "error",
      (error) => {
        finish();

        resolve({
          success: false,
          output: {
            command,
            cwd,
            stdout,
            stderr,
            exitCode: null,
            signal: null,
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
}