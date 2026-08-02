import path from "node:path";

import { colors } from "./colors.js";

const STATUS = Object.freeze({
  pending: "○",
  running: "●",
  success: "✔",
  error: "✖",
  skipped: "—",
});

const LABELS = Object.freeze({
  intent: "Intent",
  plan: "Plan",
  retrieve: "Retrieval",
  context: "Context",
  route: "Routing",
  thinking: "Reasoning",
  generate: "Model",
  tool_round: "Tool Round",
  tool: "Tool",
  approval: "Approval",
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

function formatRepositoryPath(
  filePath,
  projectRoot
) {
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

  return relative
    .split(path.sep)
    .join("/");
}

function createTelemetry() {
  return {
    retrievedFiles: [],
    retrievedResults: [],

    contextMetrics: [],

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

  let startedAt = 0;
  let telemetry = createTelemetry();
  let headerPrinted = false;

  function ensureStage(stage) {
    if (!states.has(stage)) {
      states.set(stage, {
        status: "pending",
        detail: "",
        startedAt: null,
        durationMs: null,
      });
    }

    return states.get(stage);
  }

  function updateTelemetry(event) {
    const data = event?.data;

    if (!data) {
      return;
    }

    if (
  event.type === "context:metrics"
) {
  telemetry.contextMetrics.push({
    toolRound:
      data.toolRound ?? 0,

    messages:
      data.messages ?? 0,

    chars:
      data.chars ?? {},

    estimatedTokens:
      data.estimatedTokens ?? {},
  });

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
            path:
              result?.path ?? "",

            score:
              Number.isFinite(
                result?.score
              )
                ? result.score
                : null,

            reason:
              result?.reason ??
              null,
          }));
      }
    }

    if (data.provider) {
      telemetry.provider =
        data.provider;
    }

    if (data.model) {
      telemetry.model =
        data.model;
    }

    if (
      Number.isFinite(
        data.attempt
      )
    ) {
      telemetry.attempt =
        data.attempt;
    }

    if (
      Number.isFinite(
        data.maxAttempts
      )
    ) {
      telemetry.maxAttempts =
        data.maxAttempts;
    }

    if (
      Number.isFinite(
        data.attempts
      )
    ) {
      telemetry.attempts =
        data.attempts;
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

  function printHeader() {
    if (
      !interactive ||
      headerPrinted
    ) {
      return;
    }

    console.log(
      colors.bold(
        colors.primary(
          "CodeForge Agent Activity"
        )
      )
    );

    console.log(
      colors.muted(
        "────────────────────────────────────────────────────────────"
      )
    );

    headerPrinted = true;
  }

  function printStage(
    stage,
    state
  ) {
    if (!interactive) {
      return;
    }

    printHeader();

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
            truncate(
              state.detail
            )
          )}`
        : "";

    console.log(
      `${statusColor(
        state.status,
        symbol
      )} ${colors.bold(
        label.padEnd(10)
      )}${duration}${detail}`
    );
  }

  function renderTelemetry() {
    if (!interactive) {
      return;
    }

    const results =
      telemetry.retrievedResults
        .length > 0
        ? telemetry.retrievedResults
        : telemetry.retrievedFiles.map(
            (file) => ({
              path: file,
              score: null,
              reason: null,
            })
          );

    if (results.length > 0) {
      console.log("");

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
          const number =
            String(
              index + 1
            ).padStart(
              2,
              "0"
            );

          const metadata = [
            result.reason,

            Number.isFinite(
              result.score
            )
              ? `score ${result.score}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");

          const suffix =
            metadata
              ? `  ${colors.muted(
                  metadata
                )}`
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
if (
  telemetry.contextMetrics.length > 0
) {
  console.log("");

  console.log(
    colors.bold(
      colors.primary(
        "Context Usage"
      )
    )
  );

  console.log(
    colors.muted(
      "────────────────────────────────────────────────────────────"
    )
  );

  for (
    const metric
    of telemetry.contextMetrics
  ) {
    const tokens =
      metric.estimatedTokens ?? {};

    console.log(
      `${colors.bold(
        `Round ${metric.toolRound}`
      )}      ${
        metric.messages
      } messages`
    );

    console.log(
      `  System       ~${formatNumber(
        tokens.system ?? 0
      )} tokens`
    );

    console.log(
      `  User/RAG     ~${formatNumber(
        tokens.user ?? 0
      )} tokens`
    );

    console.log(
      `  Assistant    ~${formatNumber(
        tokens.assistant ?? 0
      )} tokens`
    );

    console.log(
      `  Tool Results ~${formatNumber(
        tokens.toolResults ?? 0
      )} tokens`
    );

    console.log(
      `  Tool Schemas ~${formatNumber(
        tokens.toolSchemas ?? 0
      )} tokens`
    );

    console.log(
      `  Estimated    ~${formatNumber(
        tokens.total ?? 0
      )} tokens`
    );
  }
}

    const usage =
      telemetry.usage;

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
      console.log("");

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
          )}     ${
            telemetry.attempts
          }`
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

      if (
        telemetry.finishReason
      ) {
        console.log(
          `${colors.bold(
            "Finish"
          )}       ${
            telemetry.finishReason
          }`
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

    if (
      event.type ===
      "run:start"
    ) {
      states.clear();

      startedAt =
        Date.now();

      telemetry =
        createTelemetry();

      headerPrinted = false;

      return;
    }

    updateTelemetry(event);

    const state =
      ensureStage(
        event.stage
      );

    if (
      event.type ===
      "stage:start"
    ) {
      state.status =
        "running";

      state.startedAt =
        Date.now();

      state.detail =
        event.detail ?? "";

      // Do not print stage:start.
      // Only completed/error/skipped
      // states are printed so the
      // dashboard stays concise.
      return;
    }

    if (
      event.type ===
      "stage:success"
    ) {
      state.status =
        "success";

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
      event.type ===
      "stage:error"
    ) {
      state.status =
        "error";

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
      event.type ===
      "stage:skipped"
    ) {
      state.status =
        "skipped";

      state.detail =
        event.detail ??
        "Skipped";
    } else {
      return;
    }

    printStage(
      event.stage,
      state
    );
  }

  function finish() {
    if (!interactive) {
      return;
    }

    if (startedAt) {
      console.log(
        colors.muted(
          `Elapsed: ${formatDuration(
            Date.now() -
              startedAt
          )}`
        )
      );
    }

    renderTelemetry();

    console.log("");

    startedAt = 0;
    headerPrinted = false;
  }

  return {
    enabled: interactive,
    handle,
    finish,
  };
}