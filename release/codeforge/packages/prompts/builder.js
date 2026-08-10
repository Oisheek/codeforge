import { createSystemPrompt } from "./system.js";
import { createPlannerPrompt } from "./planner.js";
import { createCoderPrompt } from "./coder.js";
import { createReviewerPrompt } from "./reviewer.js";

export function buildPlannerMessages(context) {
  return [
    {
      role: "system",
      content: createSystemPrompt(),
    },
    {
      role: "user",
      content: createPlannerPrompt(context),
    },
  ];
}

export function buildCoderMessages(context) {
  return [
    {
      role: "system",
      content: createSystemPrompt(),
    },
    {
      role: "user",
      content: createCoderPrompt(context),
    },
  ];
}

export function buildReviewerMessages(context) {
  return [
    {
      role: "system",
      content: createSystemPrompt(),
    },
    {
      role: "user",
      content: createReviewerPrompt(context),
    },
  ];
}