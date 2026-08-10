/**
 * packages/retrieval/parser/types.js
 *
 * Normalized parser data contracts.
 * Every extractor should create objects using these factories.
 */

import crypto from "node:crypto";

/* -------------------------------------------------------------------------- */
/* Location                                                                    */
/* -------------------------------------------------------------------------- */

export function createLocation(data = {}) {
    return {
        startLine: data.startLine ?? 0,
        startColumn: data.startColumn ?? 0,

        endLine: data.endLine ?? 0,
        endColumn: data.endColumn ?? 0,
    };
}

/* -------------------------------------------------------------------------- */
/* Parsed File                                                                 */
/* -------------------------------------------------------------------------- */

export function createParsedFile(data = {}) {
    return {
        path: data.path ?? "",
        name: data.name ?? "",
        extension: data.extension ?? "",
        language: data.language ?? "",

        hash: data.hash ?? "",
        size: data.size ?? 0,

        supported: data.supported ?? true,

        parser: data.parser ?? "tree-sitter",
        parserVersion: data.parserVersion ?? 1,
        grammarVersion: data.grammarVersion ?? 1,

        source: data.source ?? "",
        ast: data.ast ?? null,

        imports: data.imports ?? [],
        exports: data.exports ?? [],
        symbols: data.symbols ?? [],
        calls: data.calls ?? [],
        comments: data.comments ?? [],
        todos: data.todos ?? [],

        diagnostics: data.diagnostics ?? [],
        metrics: data.metrics ?? createMetrics(),
    };
}

/* -------------------------------------------------------------------------- */
/* Symbol                                                                      */
/* -------------------------------------------------------------------------- */

export function createSymbol(data = {}) {
    return {
        id: data.id ?? crypto.randomUUID(),

        name: data.name ?? "anonymous",
        qualifiedName: data.qualifiedName ?? null,

        kind: data.kind ?? "unknown",

        language: data.language ?? "",
        file: data.file ?? "",

        parent: data.parent ?? null,

        exported: data.exported ?? false,

        signature: data.signature ?? null,

        modifiers: data.modifiers ?? [],

        metadata: data.metadata ?? {},

        location: data.location ?? createLocation(),
    };
}

/* -------------------------------------------------------------------------- */
/* Import                                                                      */
/* -------------------------------------------------------------------------- */

export function createImport(data = {}) {
    return {
        source: data.source ?? "",

        default: data.default ?? null,
        namespace: data.namespace ?? null,
        specifiers: data.specifiers ?? [],

        alias: data.alias ?? null,

        typeOnly: data.typeOnly ?? false,
        dynamic: data.dynamic ?? false,

        metadata: data.metadata ?? {},

        location: data.location ?? createLocation(),
    };
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

export function createExport(data = {}) {
    return {
        name: data.name ?? "",

        kind: data.kind ?? "named",

        source: data.source ?? null,

        default: data.default ?? false,

        exported: data.exported ?? null,

        metadata: data.metadata ?? {},

        location: data.location ?? createLocation(),
    };
}

/* -------------------------------------------------------------------------- */
/* Call                                                                        */
/* -------------------------------------------------------------------------- */

export function createCall(data = {}) {
    return {
        name: data.name ?? "",

        kind: data.kind ?? "function",

        receiver: data.receiver ?? null,

        arguments: data.arguments ?? 0,

        async: data.async ?? false,

        metadata: data.metadata ?? {},

        location: data.location ?? createLocation(),
    };
}
/* -------------------------------------------------------------------------- */
/* Comment                                                                     */
/* -------------------------------------------------------------------------- */

export function createComment(data = {}) {
    return {
        text: data.text ?? "",

        block: data.block ?? false,

        documentation: data.documentation ?? false,

        line: data.line ?? 0,

        metadata: data.metadata ?? {},

        location: data.location ?? createLocation(),
    };
}

/* -------------------------------------------------------------------------- */
/* TODO                                                                        */
/* -------------------------------------------------------------------------- */

export function createTodo(data = {}) {
    return {
        type: data.type ?? "TODO",

        text: data.text ?? "",

        line: data.line ?? 0,

        metadata: data.metadata ?? {},

        location: data.location ?? createLocation(),
    };
}

/* -------------------------------------------------------------------------- */
/* Diagnostic                                                                  */
/* -------------------------------------------------------------------------- */

export function createDiagnostic(data = {}) {
    return {
        severity: data.severity ?? "error",

        type: data.type ?? "syntax",

        message: data.message ?? "",

        location: data.location ?? createLocation(),
    };
}

/* -------------------------------------------------------------------------- */
/* Metrics                                                                     */
/* -------------------------------------------------------------------------- */

export function createMetrics(data = {}) {
    return {
        files: data.files ?? 1,

        lines: data.lines ?? 0,
        code: data.code ?? 0,
        comments: data.comments ?? 0,
        blanks: data.blanks ?? 0,

        statements: data.statements ?? 0,

        functions: data.functions ?? 0,
        classes: data.classes ?? 0,
        methods: data.methods ?? 0,

        imports: data.imports ?? 0,
        exports: data.exports ?? 0,

        todos: data.todos ?? 0,

        branches: data.branches ?? 0,

        depth: data.depth ?? 0,

        complexity: data.complexity ?? 0,
    };
}