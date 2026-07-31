import { createOpenRouter } from "./openrouter.js";

const PROVIDERS = {
  openrouter: createOpenRouter,
};

export function createProvider(name, config) {
  const factory = PROVIDERS[name];

  if (!factory) {
    throw new Error(`Unknown provider: ${name}`);
  }

  return factory(config);
}

export function registerProvider(name, factory) {
  if (typeof factory !== "function") {
    throw new TypeError("Provider factory must be a function.");
  }

  PROVIDERS[name] = factory;
}

export function getAvailableProviders() {
  return Object.keys(PROVIDERS);
}

export {
  createOpenRouter,
};