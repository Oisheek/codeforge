import {
  isTool,
} from "../core/tool.js";

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a canonical CodeForge tool.
   */
  register(tool) {
    if (!isTool(tool)) {
      throw new TypeError(
        "Invalid tool. Tools must be created with defineTool()."
      );
    }

    if (this.tools.has(tool.name)) {
      throw new Error(
        `Tool already registered: ${tool.name}`
      );
    }

    this.tools.set(tool.name, tool);

    return tool;
  }

  /**
   * Register multiple tools.
   */
  registerMany(tools) {
    if (!Array.isArray(tools)) {
      throw new TypeError(
        "Tools must be an array."
      );
    }

    for (const tool of tools) {
      this.register(tool);
    }

    return this;
  }

  /**
   * Resolve a tool by its canonical name.
   */
  get(name) {
    if (typeof name !== "string") {
      return null;
    }

    return this.tools.get(name) ?? null;
  }

  /**
   * Check whether a tool exists.
   */
  has(name) {
    return this.tools.has(name);
  }

  /**
   * Remove a registered tool.
   */
  unregister(name) {
    return this.tools.delete(name);
  }

  /**
   * Remove all registered tools.
   */
  clear() {
    this.tools.clear();
  }

  /**
   * Return every registered tool.
   */
  values() {
    return [...this.tools.values()];
  }

  /**
   * Return all registered tool names.
   */
  names() {
    return [...this.tools.keys()];
  }

  /**
   * Number of registered tools.
   */
  size() {
    return this.tools.size;
  }

  /**
   * Find tools exposing a capability.
   */
  findByCapability(capability) {
    if (typeof capability !== "string") {
      return [];
    }

    return this.values().filter(
      (tool) =>
        tool.capabilities.includes(
          capability
        )
    );
  }

  /**
   * Find tools originating from a source.
   *
   * Examples:
   * builtin
   * plugin
   * mcp
   */
  findBySource(source) {
    if (typeof source !== "string") {
      return [];
    }

    return this.values().filter(
      (tool) => tool.source === source
    );
  }

  /**
   * Create a restricted view of the registry.
   *
   * This becomes important for sub-agents,
   * approval scopes, plugins, and autonomous
   * workflows.
   */
  select({
    names = null,
    capabilities = null,
    sources = null,
  } = {}) {
    let tools = this.values();

    if (Array.isArray(names)) {
      const allowed =
        new Set(names);

      tools = tools.filter(
        (tool) =>
          allowed.has(tool.name)
      );
    }

    if (Array.isArray(capabilities)) {
      const required =
        new Set(capabilities);

      tools = tools.filter(
        (tool) =>
          [...required].every(
            (capability) =>
              tool.capabilities.includes(
                capability
              )
          )
      );
    }

    if (Array.isArray(sources)) {
      const allowed =
        new Set(sources);

      tools = tools.filter(
        (tool) =>
          allowed.has(tool.source)
      );
    }

    return tools;
  }

  /**
   * Metadata suitable for model/tool discovery.
   *
   * execute() is intentionally excluded.
   */
  describe() {
    return this.values().map(
      (tool) => ({
        name: tool.name,
        description:
          tool.description,
        version:
          tool.version,
        source:
          tool.source,
        inputSchema:
          tool.inputSchema,
        capabilities:
          [...tool.capabilities],
        sideEffect:
          tool.sideEffect,
        approval:
          tool.approval,
      })
    );
  }
}

/**
 * Factory.
 */
export function createToolRegistry(
  tools = []
) {
  const registry =
    new ToolRegistry();

  registry.registerMany(tools);

  return registry;
}