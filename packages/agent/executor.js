import { detectIntent } from "./intent.js";
import { createExecutionPlan } from "./planner.js";
import { retrieveContext } from "./rag.js";
import { buildContext } from "./contextBuilder.js";
import { routeRequest } from "./router.js";
import { configureThinking } from "./thinking.js";
import { getFallbackRoute } from "./fallback.js";

export async function execute({
  prompt,
  repository,
  provider,
  providers = [],
  config = {},
  project = {},
  git = {},
  memory = {},
  systemPrompt = "",
}) {
  // 1. Detect intent
  const intent = detectIntent(prompt);

  // 2. Build execution plan
  const plan = createExecutionPlan(intent);

  // 3. Retrieve repository context
  const rag = await retrieveContext({
    repository,
    plan,
    query: prompt,
  });

  // 4. Build model context
  const context = buildContext({
    prompt,
    plan,
    project,
    git,
    memory,
    rag,
    systemPrompt,
  });

  // 5. Select provider/model
  let route = routeRequest({
    plan,
    config,
    providers,
  });

  // 6. Configure reasoning
  const thinking = configureThinking({
    plan,
    route,
  });

  let attempt = 0;
  const maxAttempts = config.maxAttempts ?? 3;

  while (attempt < maxAttempts) {
    try {
      const messages = [];

if (context.system) {
  messages.push({
    role: "system",
    content: context.system,
  });
}

messages.push({
  role: "user",
  content: context.user,
});

const response = await provider.generate({
  messages,
  model: route.model,
  temperature: route.temperature,
  maxTokens: route.maxTokens,
  thinking,
  stream: route.stream,
});

      return {
        success: true,
        intent,
        plan,
        route,
        thinking,
        context,
        response,
      };
    } catch (error) {
      attempt++;

      const fallback = getFallbackRoute({
        error,
        route,
        providers,
      });

      if (!fallback || attempt >= maxAttempts) {
        throw error;
      }

      route = fallback;
    }
  }
}