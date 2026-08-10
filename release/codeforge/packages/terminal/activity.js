/**
 * packages/terminal/activity.js
 *
 * Mutable presentation state for the live
 * CodeForge terminal dashboard.
 *
 * The agent/executor owns execution.
 * This module only translates execution events
 * into UI state.
 */

const STAGE_LABELS = Object.freeze({
  intent: {
    active: "Understanding request",
    complete: "Understood request",
  },

  plan: {
    active: "Planning approach",
    complete: "Planned approach",
  },

  retrieve: {
    active: "Searching repository",
    complete: "Searched repository",
  },

  context: {
    active: "Building context",
    complete: "Built context",
  },

  route: {
    active: "Selecting model",
    complete: "Selected model",
  },

  thinking: {
    active: "Preparing reasoning",
    complete: "Reasoning configured",
  },

  generate: {
    active: "Thinking",
    complete: "Generated response",
  },

  tool_round: {
    active: "Using tools",
    complete: "Completed tool round",
  },

  tool: {
    active: "Running tool",
    complete: "Completed tool",
  },

  approval: {
    active: "Waiting for approval",
    complete: "Approval resolved",
  },

  fallback: {
    active: "Selecting fallback",
    complete: "Switched model",
  },

  complete: {
    active: "Finishing",
    complete: "Completed",
  },
});

function createUsage() {
  return {
    promptTokens: 0,
    completionTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    cost: null,
  };
}

export function createActivityState({
  projectRoot = null,
} = {}) {
  return {
    projectRoot,

    running: false,
    completed: false,
    failed: false,

    startedAt: null,
    completedAt: null,

    activeStage: null,
    activeLabel: "",
    activeDetail: "",
    activeStartedAt: null,

    completedStages: [],

    retrievedFiles: [],
    retrievedResults: [],

    contextMetrics: [],

    provider: null,
    modelRole: null,
    model: null,

    attempt: null,
    maxAttempts: null,
    attempts: null,

    finishReason: null,

    usage: createUsage(),

    lastError: null,
  };
}

export function resetActivityState(
  state
) {
  const fresh =
    createActivityState({
      projectRoot:
        state.projectRoot,
    });

  Object.assign(
    state,
    fresh
  );

  state.running = true;
  state.startedAt =
    Date.now();

  return state;
}

function getStageLabel(
  stage,
  mode
) {
  return (
    STAGE_LABELS[stage]?.[mode] ??
    stage ??
    "Working"
  );
}

function updateTelemetry(
  state,
  event
) {
  const data =
    event?.data;

  if (!data) {
    return;
  }

  if (
    event.type ===
    "context:metrics"
  ) {
    /*
     * A fallback may measure the same model
     * context again before another provider
     * attempt.
     *
     * Preserve genuinely different tool rounds,
     * but avoid visually duplicating an identical
     * context measurement.
     */
    const metric = {
      toolRound:
        data.toolRound ?? 0,

      messages:
        data.messages ?? 0,

      chars:
        data.chars ?? {},

      estimatedTokens:
        data.estimatedTokens ?? {},
    };

    const previous =
      state.contextMetrics[
        state.contextMetrics.length - 1
      ];

    const duplicate =
      previous &&
      previous.toolRound ===
        metric.toolRound &&
      previous.messages ===
        metric.messages &&
      previous.estimatedTokens?.total ===
        metric.estimatedTokens?.total;

    if (!duplicate) {
      state.contextMetrics.push(
        metric
      );
    }

    return;
  }

  if (
    event.stage ===
    "retrieve"
  ) {
    if (
      Array.isArray(
        data.files
      )
    ) {
      state.retrievedFiles = [
        ...data.files,
      ];
    }

    if (
      Array.isArray(
        data.results
      )
    ) {
      state.retrievedResults =
        data.results.map(
          (result) => ({
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
          })
        );
    }
  }

  if (data.provider) {
    state.provider =
      data.provider;
  }

  if (data.modelRole) {
    state.modelRole =
      data.modelRole;
  }

  if (data.model) {
    state.model =
      data.model;
  }

  if (
    Number.isFinite(
      data.attempt
    )
  ) {
    state.attempt =
      data.attempt;
  }

  if (
    Number.isFinite(
      data.maxAttempts
    )
  ) {
    state.maxAttempts =
      data.maxAttempts;
  }

  if (
    Number.isFinite(
      data.attempts
    )
  ) {
    state.attempts =
      data.attempts;
  }

  if (data.finishReason) {
    state.finishReason =
      data.finishReason;
  }

  if (data.usage) {
    state.usage = {
      ...state.usage,
      ...data.usage,
    };
  }
}

function completeStage(
  state,
  event,
  status
) {
  const stage =
    event.stage;

  const now =
    Date.now();

  let durationMs =
    Number.isFinite(
      event.durationMs
    )
      ? event.durationMs
      : null;

  if (
    state.activeStage ===
      stage &&
    Number.isFinite(
      state.activeStartedAt
    )
  ) {
    durationMs =
      now -
      state.activeStartedAt;
  }

  const existingIndex =
    state.completedStages.findIndex(
      (item) =>
        item.stage === stage
    );

  const item = {
    stage,
    status,

    label:
      getStageLabel(
        stage,
        "complete"
      ),

    detail:
      event.detail ?? "",

    durationMs,
  };

  if (
    existingIndex >= 0
  ) {
    state.completedStages[
      existingIndex
    ] = item;
  } else {
    state.completedStages.push(
      item
    );
  }

  if (
    state.activeStage ===
    stage
  ) {
    state.activeStage =
      null;

    state.activeLabel =
      "";

    state.activeDetail =
      "";

    state.activeStartedAt =
      null;
  }
}

export function applyActivityEvent(
  state,
  event = {}
) {
  if (
    event.type ===
    "run:start"
  ) {
    resetActivityState(
      state
    );

    return state;
  }

  updateTelemetry(
    state,
    event
  );

  if (
    event.type ===
    "context:metrics"
  ) {
    return state;
  }

  if (
    event.type ===
    "stage:start"
  ) {
    state.activeStage =
      event.stage;

    state.activeLabel =
      getStageLabel(
        event.stage,
        "active"
      );

    state.activeDetail =
      event.detail ?? "";

    state.activeStartedAt =
      Date.now();

    return state;
  }

  if (
    event.type ===
    "stage:success"
  ) {
    completeStage(
      state,
      event,
      "success"
    );

    if (
      event.stage ===
      "complete"
    ) {
      state.running =
        false;

      state.completed =
        true;

      state.completedAt =
        Date.now();
    }

    return state;
  }

  if (
    event.type ===
    "stage:error"
  ) {
    completeStage(
      state,
      event,
      "error"
    );

    state.lastError =
      event.detail ??
      "Execution failed";

    if (
      event.stage ===
      "complete"
    ) {
      state.running =
        false;

      state.failed =
        true;

      state.completedAt =
        Date.now();
    }

    return state;
  }

  if (
    event.type ===
    "stage:skipped"
  ) {
    completeStage(
      state,
      event,
      "skipped"
    );
  }

  return state;
}