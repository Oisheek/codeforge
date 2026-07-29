import { OpenRouter } from "@openrouter/sdk";

export function createOpenRouter(config) {
  if (!config.apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const client = new OpenRouter({
    apiKey: config.apiKey,
  });

  async function chat({
    messages,
    model = config.model,
    temperature = config.temperature,
    maxTokens = config.maxTokens,
  }) {
    const response = await client.chat.send({
      chatRequest: {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      },
    });

    return response.choices[0].message;
  }

  async function stream({
    messages,
    model = config.model,
    temperature = config.temperature,
    maxTokens = config.maxTokens,
  }) {
    return client.chat.send({
      chatRequest: {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      },
    });
  }

  return {
    chat,
    stream,
  };
}