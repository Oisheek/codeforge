import {
  detectIntent,
} from "./intent.js";

import {
  buildContext,
} from "./contextBuilder.js";

import {
  selectContext,
} from "./contextSelector.js";

import {
  createPlan,
} from "./planner.js";

export async function execute({
  app,
  input,
}) {
  const intent =
    detectIntent(input);

  let context =
    buildContext(app, input);

  context.intent = intent;

  context =
    selectContext(context);

  const plan =
    await createPlan({
      provider: app.provider,
      context,
    });

  return plan;
}