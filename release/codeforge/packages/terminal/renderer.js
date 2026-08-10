import readline from "node:readline";
import path from "node:path";

import {
  colors,
} from "./colors.js";

const SPINNER_FRAMES =
  Object.freeze([
    "◐",
    "◓",
    "◑",
    "◒",
  ]);

const FRAME_INTERVAL_MS =
  120;

const MAX_COMPLETED_LINES =
  6;

function formatDuration(ms) {
  if (!Number.isFinite(ms)) {
    return "";
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  return `${(
    ms / 1000
  ).toFixed(1)}s`;
}

function formatNumber(
  value
) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString();
}

function formatCost(
  value
) {
  if (!Number.isFinite(value)) {
    return null;
  }

  if (value === 0) {
    return "$0";
  }

  if (value < 0.000001) {
    return `$${value.toFixed(
      8
    )}`;
  }

  if (value < 0.01) {
    return `$${value.toFixed(
      6
    )}`;
  }

  return `$${value.toFixed(
    4
  )}`;
}

function stripAnsi(
  value
) {
  return String(
    value ?? ""
  ).replace(
    // eslint-disable-next-line no-control-regex
    /\x1B\[[0-?]*[ -/]*[@-~]/g,
    ""
  );
}

function truncate(
  value,
  maxLength
) {
  const text =
    String(
      value ?? ""
    );

  if (
    stripAnsi(text).length <=
    maxLength
  ) {
    return text;
  }

  return (
    text.slice(
      0,
      Math.max(
        1,
        maxLength - 1
      )
    ) +
    "…"
  );
}

function terminalWidth() {
  return Math.max(
    40,
    process.stdout.columns ??
      80
  );
}

function safeLine(
  value
) {
  return truncate(
    value,
    terminalWidth() - 1
  );
}

function relativePath(
  filePath,
  projectRoot
) {
  if (!filePath) {
    return "";
  }

  if (!projectRoot) {
    return filePath;
  }

  const relative =
    path.relative(
      projectRoot,
      filePath
    );

  if (
    !relative ||
    relative.startsWith(
      ".."
    ) ||
    path.isAbsolute(
      relative
    )
  ) {
    return filePath;
  }

  return relative
    .split(path.sep)
    .join("/");
}

function statusSymbol(
  status
) {
  if (
    status ===
    "success"
  ) {
    return colors.success(
      "✓"
    );
  }

  if (
    status ===
    "error"
  ) {
    return colors.error(
      "!"
    );
  }

  if (
    status ===
    "skipped"
  ) {
    return colors.muted(
      "–"
    );
  }

  return colors.muted(
    "·"
  );
}

function completedLine(
  item
) {
  const duration =
    Number.isFinite(
      item.durationMs
    )
      ? colors.muted(
          ` · ${formatDuration(
            item.durationMs
          )}`
        )
      : "";

  let detail = "";

  /*
   * Intent and plan details are useful.
   * The route/model detail is shown in
   * the live metrics area, so avoid
   * producing an extremely long stage line.
   */
  if (
    item.detail &&
    [
      "intent",
      "plan",
      "retrieve",
      "fallback",
      "tool",
      "tool_round",
    ].includes(
      item.stage
    )
  ) {
    detail =
      colors.muted(
        ` · ${item.detail}`
      );
  }

  return safeLine(
    `  ${statusSymbol(
      item.status
    )} ${item.label}${detail}${duration}`
  );
}

function getActiveElapsed(
  state
) {
  if (
    !Number.isFinite(
      state.activeStartedAt
    )
  ) {
    return 0;
  }

  return (
    Date.now() -
    state.activeStartedAt
  );
}

function activeLine(
  state,
  frameIndex
) {
  if (
    !state.activeStage
  ) {
    return null;
  }

  const spinner =
    colors.primary(
      SPINNER_FRAMES[
        frameIndex %
          SPINNER_FRAMES.length
      ]
    );

  const elapsed =
    colors.muted(
      formatDuration(
        getActiveElapsed(
          state
        )
      )
    );

  return safeLine(
    `  ${spinner} ${colors.bold(
      state.activeLabel ||
        "Working"
    )} ${elapsed}`
  );
}

function repositoryLine(
  state
) {
  const results =
    state.retrievedResults ??
    [];

  if (
    results.length === 0
  ) {
    return null;
  }

  const first =
    results[0];

  const firstPath =
    relativePath(
      first.path,
      state.projectRoot
    );

  const extra =
    results.length > 1
      ? ` +${results.length - 1}`
      : "";

  return safeLine(
    `  ${colors.muted(
      "Context"
    )}  ${firstPath}${extra}`
  );
}

function contextLine(
  state
) {
  const metrics =
    state.contextMetrics;

  if (
    !Array.isArray(metrics) ||
    metrics.length === 0
  ) {
    return null;
  }

  const latest =
    metrics[
      metrics.length - 1
    ];

  const total =
    latest
      ?.estimatedTokens
      ?.total;

  if (
    !Number.isFinite(total)
  ) {
    return null;
  }

  return safeLine(
    `  ${colors.muted(
      "Tokens"
    )}   ~${formatNumber(
      total
    )} context`
  );
}

function modelLine(
  state
) {
  if (
    !state.model &&
    !state.provider
  ) {
    return null;
  }

  const route = [
    state.provider,
    state.model,
  ]
    .filter(Boolean)
    .join(" · ");

  return safeLine(
    `  ${colors.muted(
      "Model"
    )}    ${route}`
  );
}

function attemptLine(
  state
) {
  if (
    !Number.isFinite(
      state.attempt
    ) &&
    !Number.isFinite(
      state.attempts
    )
  ) {
    return null;
  }

  const current =
    Number.isFinite(
      state.attempts
    )
      ? state.attempts
      : state.attempt;

  const maximum =
    Number.isFinite(
      state.maxAttempts
    )
      ? `/${state.maxAttempts}`
      : "";

  return (
    `  ${colors.muted(
      "Attempt"
    )}  ${current}${maximum}`
  );
}

function usageLine(
  state
) {
  const usage =
    state.usage ?? {};

  if (
    !usage.totalTokens &&
    usage.cost == null
  ) {
    return null;
  }

  const parts = [];

  if (
    Number.isFinite(
      usage.totalTokens
    ) &&
    usage.totalTokens > 0
  ) {
    parts.push(
      `${formatNumber(
        usage.totalTokens
      )} tokens`
    );
  }

  const cost =
    formatCost(
      usage.cost
    );

  if (cost) {
    parts.push(cost);
  }

  if (
    parts.length === 0
  ) {
    return null;
  }

  return safeLine(
    `  ${colors.muted(
      "Usage"
    )}    ${parts.join(
      " · "
    )}`
  );
}

function buildLines(
  state,
  frameIndex
) {
  const lines = [];

  lines.push(
    colors.bold(
      `${colors.primary(
        "✦"
      )} CodeForge`
    )
  );

  lines.push("");

  const completed =
    state.completedStages
      .filter(
        (item) =>
          item.stage !==
          "complete"
      )
      .slice(
        -MAX_COMPLETED_LINES
      );

  for (
    const item of completed
  ) {
    lines.push(
      completedLine(
        item
      )
    );
  }

  const active =
    activeLine(
      state,
      frameIndex
    );

  if (active) {
    lines.push(
      active
    );
  }

  const metrics = [
    repositoryLine(
      state
    ),
    contextLine(
      state
    ),
    modelLine(
      state
    ),
    attemptLine(
      state
    ),
    usageLine(
      state
    ),
  ].filter(Boolean);

  if (
    metrics.length > 0
  ) {
    lines.push("");

    for (
      const line of metrics
    ) {
      lines.push(line);
    }
  }

  return lines;
}

function clearRenderedLines(
  count
) {
  if (
    count <= 0 ||
    !process.stdout.isTTY
  ) {
    return;
  }

  /*
   * draw() leaves the cursor one line below
   * the rendered dashboard because the frame
   * ends with a newline.
   *
   * Move back to the beginning of the block.
   */
  readline.moveCursor(
    process.stdout,
    0,
    -count
  );

  /*
   * Clear the dashboard and everything below
   * it. The next draw starts from exactly the
   * same terminal position.
   */
  readline.clearScreenDown(
    process.stdout
  );

  readline.cursorTo(
    process.stdout,
    0
  );
}

function finalRepositoryLines(
  state
) {
  const results =
    state.retrievedResults ?? [];

  if (results.length === 0) {
    return [];
  }

  const lines = [
    colors.bold(
      "Repository Context"
    ),
  ];

  for (
    let index = 0;
    index < results.length;
    index += 1
  ) {
    const result =
      results[index];

    const filePath =
      relativePath(
        result.path,
        state.projectRoot
      );

    const metadata = [];

    if (result.reason) {
      metadata.push(
        result.reason
      );
    }

    if (
      Number.isFinite(
        result.score
      )
    ) {
      metadata.push(
        `score ${result.score}`
      );
    }

    lines.push(
      safeLine(
        `${String(
          index + 1
        ).padStart(
          2,
          "0"
        )}  ${filePath}${
          metadata.length > 0
            ? `  ${colors.muted(
                metadata.join(
                  " · "
                )
              )}`
            : ""
        }`
      )
    );
  }

  return lines;
}

function finalContextLines(
  state
) {
  const metrics =
    state.contextMetrics;

  if (
    !Array.isArray(metrics) ||
    metrics.length === 0
  ) {
    return [];
  }

  const lines = [
    colors.bold(
      "Context Usage"
    ),
  ];

  for (
    const metric of metrics
  ) {
    const estimated =
      metric?.estimatedTokens ??
      {};

    const round =
      Number.isFinite(
        metric?.round
      )
        ? metric.round
        : 0;

    lines.push(
      `Round ${round}`
    );

    const entries = [
      [
        "System",
        estimated.system,
      ],
      [
        "User/RAG",
        estimated.user,
      ],
      [
        "Assistant",
        estimated.assistant,
      ],
      [
        "Tool Results",
        estimated.toolResults,
      ],
      [
        "Tool Schemas",
        estimated.toolSchemas,
      ],
      [
        "Estimated",
        estimated.total,
      ],
    ];

    for (
      const [
        label,
        value,
      ] of entries
    ) {
      if (
        !Number.isFinite(
          value
        )
      ) {
        continue;
      }

      lines.push(
        `  ${label.padEnd(
          12
        )} ~${formatNumber(
          value
        )} tokens`
      );
    }
  }

  return lines;
}

function finalModelLines(
  state
) {
  const usage =
    state.usage ?? {};

  const lines = [
    colors.bold(
      "Model Usage"
    ),
  ];

  const route = [
    state.provider,
    state.model,
  ]
    .filter(Boolean)
    .join(" · ");

  if (route) {
    lines.push(
      `Route        ${route}`
    );
  }

  const attempts =
    Number.isFinite(
      state.attempts
    )
      ? state.attempts
      : state.attempt;

  if (
    Number.isFinite(
      attempts
    )
  ) {
    lines.push(
      `Attempts     ${attempts}`
    );
  }

  const usageEntries = [
    [
      "Prompt",
      usage.promptTokens,
    ],
    [
      "Completion",
      usage.completionTokens,
    ],
    [
      "Reasoning",
      usage.reasoningTokens,
    ],
    [
      "Total",
      usage.totalTokens,
    ],
  ];

  for (
    const [
      label,
      value,
    ] of usageEntries
  ) {
    if (
      !Number.isFinite(
        value
      )
    ) {
      continue;
    }

    lines.push(
      `${label.padEnd(
        12
      )}${formatNumber(
        value
      )} tokens`
    );
  }

  const cost =
    formatCost(
      usage.cost
    );

  if (cost) {
    lines.push(
      `Cost         ${cost}`
    );
  }

  if (
    usage.finishReason
  ) {
    lines.push(
      `Finish       ${usage.finishReason}`
    );
  }

  return lines;
}

function finalStageLines(
  state
) {
  const completed =
    state.completedStages ?? [];

  if (
    !Array.isArray(completed) ||
    completed.length === 0
  ) {
    return [];
  }

  return completed
    .filter(
      (item) =>
        item.stage !==
        "complete"
    )
    .map(
      (item) =>
        completedLine(item)
    );
}

function printFinalSummary(
  state
) {
  if (!state) {
    return;
  }

  const elapsed =
    Number.isFinite(
      state.startedAt
    )
      ? Date.now() -
        state.startedAt
      : null;

  if (state.failed) {
    console.log(
      `${colors.error(
        "!"
      )} ${colors.bold(
        "CodeForge failed"
      )}${
        Number.isFinite(
          elapsed
        )
          ? colors.muted(
              ` · ${formatDuration(
                elapsed
              )}`
            )
          : ""
      }`
    );

    return;
  }
const stageLines =
  finalStageLines(
    state
  );

for (
  const line of stageLines
) {
  console.log(line);
}

if (
  stageLines.length > 0
) {
  console.log("");
}

console.log(
  `${colors.success(
    "✓"
  )} ${colors.bold(
    "Completed"
  )}${
    Number.isFinite(
      elapsed
    )
      ? colors.muted(
          ` · ${formatDuration(
            elapsed
          )}`
        )
      : ""
  }`
);

const sections = [
    finalRepositoryLines(
      state
    ),
    finalContextLines(
      state
    ),
    finalModelLines(
      state
    ),
  ].filter(
    (section) =>
      section.length > 1
  );

  for (
    const section of sections
  ) {
    console.log("");

    for (
      const line of section
    ) {
      console.log(line);
    }
  }

  console.log("");
}

export function createLiveRenderer({
  enabled =
    process.stdout.isTTY,
  intervalMs =
    FRAME_INTERVAL_MS,
} = {}) {
  const interactive =
    Boolean(enabled);

  let state = null;

  let timer = null;
  let frameIndex = 0;
  let renderedLineCount = 0;
  let suspended = false;

  function draw() {
    if (
      !interactive ||
      suspended ||
      !state
    ) {
      return;
    }

    clearRenderedLines(
      renderedLineCount
    );

    const lines =
      buildLines(
        state,
        frameIndex
      );

    process.stdout.write(
      `${lines.join(
        "\n"
      )}\n`
    );

    renderedLineCount =
      lines.length;

    frameIndex += 1;
  }

  function start() {
    if (
      !interactive ||
      timer
    ) {
      return;
    }

    timer =
      setInterval(
        draw,
        intervalMs
      );

    /*
     * Do not keep Node alive solely
     * for terminal animation.
     */
    timer.unref?.();
  }

  function stopTimer() {
    if (!timer) {
      return;
    }

    clearInterval(
      timer
    );

    timer = null;
  }

  function setState(
    nextState
  ) {
    state =
      nextState;

    if (
      interactive &&
      !suspended
    ) {
      draw();
      start();
    }
  }

  function suspend() {
    if (!interactive) {
      return;
    }

    stopTimer();

    clearRenderedLines(
      renderedLineCount
    );

    renderedLineCount =
      0;

    suspended = true;
  }

  function resume() {
    if (
      !interactive ||
      !suspended
    ) {
      return;
    }

    suspended = false;

    draw();
    start();
  }

function finish() {
  if (!interactive) {
    return;
  }

  stopTimer();

  /*
   * Remove only the animated/live dashboard.
   *
   * Its information is immediately replaced
   * by a persistent execution summary below.
   */
  clearRenderedLines(
    renderedLineCount
  );

  renderedLineCount =
    0;

  printFinalSummary(
    state
  );
}

  function dispose() {
    stopTimer();

    if (
      interactive &&
      renderedLineCount > 0
    ) {
      clearRenderedLines(
        renderedLineCount
      );
    }

    renderedLineCount =
      0;

    state = null;
  }

  return {
    enabled: interactive,

    setState,
    draw,

    suspend,
    resume,

    finish,
    dispose,
  };
}