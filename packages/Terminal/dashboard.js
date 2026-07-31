import path from "node:path";

import { colors } from "./colors.js";

const STATUS = Object.freeze({
  pending: "○",
  running: "◉",
  success: "✔",
  error: "✖",
  skipped: "–",
});

const LABELS = Object.freeze({
  intent: "Intent",
  plan: "Plan",
  retrieve: "Retrieval",
  context: "Context",
  route: "Routing",
  thinking: "Reasoning",
  generate: "Model",
  fallback: "Fallback",
  complete: "Complete",
});

function formatDuration(ms) {
  if (!Number.isFinite(ms)) {
    return "";
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(ms / 1000).toFixed(2)}s`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString();
}

function formatCost(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) {
    return "$0";
  }

  if (value < 0.000001) {
    return `$${value.toFixed(8)}`;
  }

  if (value < 0.01) {
    return `$${value.toFixed(6)}`;
  }

  return `$${value.toFixed(4)}`;
}

function truncate(value, max = 72) {
  const text = String(value ?? "");

  return text.length <= max
    ? text
    : `${text.slice(0, max - 1)}…`;
}

function statusColor(status, text) {
  if (status === "success") {
    return colors.success(text);
  }

  if (status === "error") {
    return colors.error(text);
  }

  if (status === "running") {
    return colors.primary(text);
  }

  if (status === "skipped") {
    return colors.muted(text);
  }

  return colors.text(text);
}

function formatRepositoryPath(filePath, projectRoot) {
  if (!filePath) {
    return "";
  }

  if (!projectRoot) {
    return filePath;
  }

  const relative = path.relative(
    projectRoot,
    filePath
  );

  if (
    !relative ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    return filePath;
  }

  return relative.split(path.sep).join("/");
}

function createTelemetry() {
  return {
    retrievedFiles: [],
    retrievedResults: [],

    provider: null,
    model: null,

    attempt: null,
    maxAttempts: null,
    attempts: null,

    finishReason: null,

    usage: {
      promptTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cost: null,
    },
  };
}

export function createAgentDashboard({
  enabled = true,
  projectRoot = null,
} = {}) {
  const interactive = Boolean(
    enabled &&
    process.stdout.isTTY
  );

  const states = new Map();
  const order = [];

  let renderedLines = 0;
  let startedAt = 0;
  let telemetry = createTelemetry();

  function ensureStage(stage) {
    if (!states.has(stage)) {
      states.set(stage, {
        status: "pending",
        detail: "",
        startedAt: null,
        durationMs: null,
      });

      order.push(stage);
    }

    return states.get(stage);
  }

  function updateTelemetry(event) {
    const data = event?.data;

    if (!data) {
      return;
    }

    if (event.stage === "retrieve") {
      if (Array.isArray(data.files)) {
        telemetry.retrievedFiles = [
          ...data.files,
        ];
      }

      if (Array.isArray(data.results)) {
        telemetry.retrievedResults =
          data.results.map((result) => ({
            path: result?.path ?? "",
            score:
              Number.isFinite(result?.score)
                ? result.score
                : null,
            reason:
              result?.reason ?? null,
          }));
      }
    }

    if (data.provider) {
      telemetry.provider = data.provider;
    }

    if (data.model) {
      telemetry.model = data.model;
    }

    if (
      Number.isFinite(data.attempt)
    ) {
      telemetry.attempt = data.attempt;
    }

    if (
      Number.isFinite(data.maxAttempts)
    ) {
      telemetry.maxAttempts =
        data.maxAttempts;
    }

    if (
      Number.isFinite(data.attempts)
    ) {
      telemetry.attempts = data.attempts;
    }

    if (data.finishReason) {
      telemetry.finishReason =
        data.finishReason;
    }

    if (data.usage) {
      telemetry.usage = {
        ...telemetry.usage,
        ...data.usage,
      };
    }
  }

  function buildStageLines() {
    const lines = [];

    lines.push(
      colors.bold(
        colors.primary(
          "CodeForge Agent Activity"
        )
      )
    );

    lines.push(
      colors.muted(
        "────────────────────────────────────────────────────────────"
      )
    );

    for (const stage of order) {
      const state = states.get(stage);

      const symbol =
        STATUS[state.status] ??
        STATUS.pending;

      const label =
        LABELS[stage] ??
        stage;

      const duration =
        state.durationMs == null
          ? ""
          : ` ${formatDuration(
              state.durationMs
            )}`;

      const detail =
        state.detail
          ? `  ${colors.muted(
              truncate(state.detail)
            )}`
          : "";

      lines.push(
        `${statusColor(
          state.status,
          symbol
        )} ${colors.bold(
          label.padEnd(10)
        )}${duration}${detail}`
      );
    }

    if (startedAt) {
      lines.push(
        colors.muted(
          `Elapsed: ${formatDuration(
            Date.now() - startedAt
          )}`
        )
      );
    }

    return lines;
  }

  function render() {
    if (!interactive) {
      return;
    }

    if (renderedLines > 0) {
      process.stdout.write(
        `\x1b[${renderedLines}A`
      );
    }

    const lines = buildStageLines();

    const output = lines
      .map(
        (line) =>
          `\x1b[2K\r${line}`
      )
      .join("\n");

    process.stdout.write(
      `${output}\n`
    );

    if (
      renderedLines >
      lines.length
    ) {
      for (
        let i = lines.length;
        i < renderedLines;
        i += 1
      ) {
        process.stdout.write(
          "\x1b[2K\n"
        );
      }
    }

    renderedLines = lines.length;
  }

  function renderTelemetry() {
    if (!interactive) {
      return;
    }

    const results =
      telemetry.retrievedResults.length > 0
        ? telemetry.retrievedResults
        : telemetry.retrievedFiles.map(
            (file) => ({
              path: file,
              score: null,
              reason: null,
            })
          );

    if (results.length > 0) {
      process.stdout.write("\n");

      console.log(
        colors.bold(
          colors.primary(
            "Repository Context"
          )
        )
      );

      console.log(
        colors.muted(
          "────────────────────────────────────────────────────────────"
        )
      );

      results.forEach(
        (result, index) => {
          const number = String(
            index + 1
          ).padStart(2, "0");

          const metadata = [
            result.reason,
            Number.isFinite(result.score)
              ? `score ${result.score}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");

          const suffix = metadata
            ? `  ${colors.muted(metadata)}`
            : "";

          const displayPath =
            formatRepositoryPath(
              result.path,
              projectRoot
            );

          console.log(
            `${colors.muted(
              number
            )}  ${truncate(
              displayPath,
              68
            )}${suffix}`
          );
        }
      );
    }

    const usage = telemetry.usage;

    const hasUsage =
      usage.promptTokens > 0 ||
      usage.completionTokens > 0 ||
      usage.reasoningTokens > 0 ||
      usage.totalTokens > 0 ||
      usage.cost !== null;

    if (
      hasUsage ||
      telemetry.model ||
      telemetry.provider
    ) {
      process.stdout.write("\n");

      console.log(
        colors.bold(
          colors.primary(
            "Model Usage"
          )
        )
      );

      console.log(
        colors.muted(
          "────────────────────────────────────────────────────────────"
        )
      );

      if (
        telemetry.provider ||
        telemetry.model
      ) {
        console.log(
          `${colors.bold(
            "Route"
          )}        ${[
            telemetry.provider,
            telemetry.model,
          ]
            .filter(Boolean)
            .join(" · ")}`
        );
      }

      if (
        Number.isFinite(
          telemetry.attempts
        )
      ) {
        console.log(
          `${colors.bold(
            "Attempts"
          )}     ${telemetry.attempts}`
        );
      } else if (
        Number.isFinite(
          telemetry.attempt
        )
      ) {
        console.log(
          `${colors.bold(
            "Attempt"
          )}      ${
            telemetry.attempt
          }${
            Number.isFinite(
              telemetry.maxAttempts
            )
              ? `/${telemetry.maxAttempts}`
              : ""
          }`
        );
      }

      console.log(
        `${colors.bold(
          "Prompt"
        )}       ${formatNumber(
          usage.promptTokens
        )} tokens`
      );

      console.log(
        `${colors.bold(
          "Completion"
        )}   ${formatNumber(
          usage.completionTokens
        )} tokens`
      );

      console.log(
        `${colors.bold(
          "Reasoning"
        )}    ${formatNumber(
          usage.reasoningTokens
        )} tokens`
      );

      console.log(
        `${colors.bold(
          "Total"
        )}        ${formatNumber(
          usage.totalTokens
        )} tokens`
      );

      console.log(
        `${colors.bold(
          "Cost"
        )}         ${formatCost(
          usage.cost
        )}`
      );

      if (telemetry.finishReason) {
        console.log(
          `${colors.bold(
            "Finish"
          )}       ${telemetry.finishReason}`
        );
      }
    }
  }

  function handle(event = {}) {
    if (
      !interactive ||
      !event.stage
    ) {
      return;
    }

    if (event.type === "run:start") {
      states.clear();
      order.length = 0;
      renderedLines = 0;
      startedAt = Date.now();
      telemetry =
        createTelemetry();

      return;
    }

    updateTelemetry(event);

    const state =
      ensureStage(event.stage);

    if (
      event.type === "stage:start"
    ) {
      state.status = "running";
      state.startedAt = Date.now();
      state.detail =
        event.detail ?? "";
    } else if (
      event.type === "stage:success"
    ) {
      state.status = "success";

      state.durationMs =
        state.startedAt
          ? Date.now() -
            state.startedAt
          : event.durationMs ??
            null;

      state.detail =
        event.detail ??
        state.detail;
    } else if (
      event.type === "stage:error"
    ) {
      state.status = "error";

      state.durationMs =
        state.startedAt
          ? Date.now() -
            state.startedAt
          : event.durationMs ??
            null;

      state.detail =
        event.detail ??
        "Failed";
    } else if (
      event.type === "stage:skipped"
    ) {
      state.status = "skipped";

      state.detail =
        event.detail ??
        "Skipped";
    }

    render();
  }

  function finish() {
    if (!interactive) {
      return;
    }

    render();

    process.stdout.write("\n");

    renderedLines = 0;

    renderTelemetry();

    process.stdout.write("\n");

    startedAt = 0;
  }

  return {
    enabled: interactive,
    handle,
    finish,
  };
}