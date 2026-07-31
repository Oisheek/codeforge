import { OpenRouter } from "@openrouter/sdk";

export function createOpenRouter(config) {
  if (!config.apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const client = new OpenRouter({
    apiKey: config.apiKey,
  });

  function buildRequest({
    messages,
    model = config.model,
    temperature = config.temperature,
    maxTokens = config.maxTokens,
    thinking,
    stream = false,
    ...options
  }) {
    const request = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
      ...options,
    };

    // Future-proof reasoning support
    if (thinking?.enabled) {
      request.reasoning = {
        effort: thinking.mode ?? "medium",
      };
    }

    return request;
  }

  function normalizeResponse(response) {
    return {
      id: response.id,
      model: response.model,
      usage: response.usage,
      finishReason: response.choices?.[0]?.finish_reason,
      message: response.choices?.[0]?.message,
      raw: response,
    };
  }

  function normalizeError(error) {
    return {
      code: error?.code ?? "provider_error",
      status: error?.status,
      message: error?.message ?? "OpenRouter request failed.",
      cause: error,
    };
  }

  async function generate({
    messages,
    model,
    temperature,
    maxTokens,
    thinking,
    ...options
  }) {
    try {
      const request = buildRequest({
        messages,
        model,
        temperature,
        maxTokens,
        thinking,
        stream: false,
        ...options,
      });

      const response = await client.chat.send({
        chatRequest: request,
      });

      return normalizeResponse(response);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  // Backward compatibility
  async function chat(options) {
    const response = await generate(options);
    return response.message;
  }

  async function stream({
    messages,
    model,
    temperature,
    maxTokens,
    thinking,
    ...options
  }) {
    try {
      const request = buildRequest({
        messages,
        model,
        temperature,
        maxTokens,
        thinking,
        stream: true,
        ...options,
      });

      return await client.chat.send({
        chatRequest: request,
      });
    } catch (error) {
      throw normalizeError(error);
    }
  }

  return {
    generate,
    chat,
    stream,
  };
}