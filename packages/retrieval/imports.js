import { graph } from "./graph.js";

/**
 * Find all files importing a module.
 */
export function findImporters(module) {
    return graph.getDependents(module);
}

/**
 * Get all imports for a file.
 */
export function getImports(filePath) {
    return graph.getDependencies(filePath);
}

/**
 * Check whether a file imports a module.
 */
export function importsModule(filePath, module) {
    return graph
        .getDependencies(filePath)
        .includes(module);
}

/**
 * Build a repository-wide import index.
 */
export function getImportIndex() {
    const index = new Map();

    for (const file of graph.getFiles()) {
        index.set(
            file.path,
            graph.getDependencies(file.path)
        );
    }

    return index;
}

/**
 * Return all unique imported modules.
 */
export function getImportedModules() {
    const modules = new Set();

    for (const file of graph.getFiles()) {
        for (const dep of graph.getDependencies(file.path)) {
            modules.add(dep);
        }
    }

    return [...modules].sort();
}