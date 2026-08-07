/**
 * packages/terminal/dashboard.js
 *
 * Coordinates agent activity events with
 * the live terminal renderer.
 *
 * Execution remains owned by packages/agent.
 * Presentation remains owned by packages/terminal.
 */

import {
  applyActivityEvent,
  createActivityState,
} from "./activity.js";

import {
  createLiveRenderer,
} from "./renderer.js";

export function createAgentDashboard({
  enabled = true,
  projectRoot = null,
} = {}) {
  const interactive =
    Boolean(
      enabled &&
      process.stdout.isTTY
    );

  const state =
    createActivityState({
      projectRoot,
    });

  const renderer =
    createLiveRenderer({
      enabled:
        interactive,
    });

  function handle(
    event = {}
  ) {
    if (!interactive) {
      return;
    }

    applyActivityEvent(
      state,
      event
    );

    renderer.setState(
      state
    );
  }

  function suspend() {
    renderer.suspend();
  }

  function resume() {
    renderer.resume();
  }

  function finish() {
    if (!interactive) {
      return;
    }

    renderer.setState(
      state
    );

    renderer.finish();
  }

  function dispose() {
    renderer.dispose();
  }

  return {
    enabled:
      interactive,

    handle,

    suspend,
    resume,

    finish,
    dispose,
  };
}