/**
 * packages/retrieval/retriever.js
 *
 * Repository retrieval facade.
 *
 * Provides deterministic repository lookup plus lightweight
 * lexical/structural retrieval for natural-language queries.
 */

const DEFAULT_LIMIT = 8;
const DEFAULT_SOURCE_LENGTH = 4000;

const REPOSITORY_SCOPE_TERMS = new Set([
    "project",
    "repository",
    "repo",
    "codebase",
    "architecture",
    "structure",
    "overview",
]);

const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "can",
    "code",
    "does",
    "explain",
    "for",
    "how",
    "in",
    "is",
    "me",
    "of",
    "please",
    "show",
    "tell",
    "the",
    "this",
    "to",
    "what",
    "where",
    "with",
]);

function normalize(value) {
    return String(value ?? "").toLowerCase();
}

function tokenize(query) {
    return normalize(query)
        .split(/[^a-z0-9_$.-]+/i)
        .map((token) => token.trim())
        .filter(Boolean);
}

function getSearchTerms(query) {
    const tokens = tokenize(query);

    const filtered = tokens.filter(
        (token) => !STOP_WORDS.has(token)
    );

    return filtered.length > 0
        ? filtered
        : tokens;
}

function isRepositoryScopeQuery(query) {
    const tokens = tokenize(query);

    return tokens.some((token) =>
        REPOSITORY_SCOPE_TERMS.has(token)
    );
}

function countOccurrences(text, term) {
    if (!text || !term) {
        return 0;
    }

    let count = 0;
    let position = 0;

    while (true) {
        position = text.indexOf(term, position);

        if (position === -1) {
            break;
        }

        count += 1;
        position += term.length;
    }

    return count;
}

function sourceExcerpt(source, terms, maxLength) {
    if (!source) {
        return "";
    }

    if (source.length <= maxLength) {
        return source;
    }

    const normalizedSource = normalize(source);

    let matchIndex = -1;

    for (const term of terms) {
        const index = normalizedSource.indexOf(term);

        if (
            index !== -1 &&
            (matchIndex === -1 || index < matchIndex)
        ) {
            matchIndex = index;
        }
    }

    if (matchIndex === -1) {
        return source.slice(0, maxLength);
    }

    const half = Math.floor(maxLength / 2);

    let start = Math.max(0, matchIndex - half);
    let end = Math.min(
        source.length,
        start + maxLength
    );

    if (end - start < maxLength) {
        start = Math.max(0, end - maxLength);
    }

    const prefix = start > 0 ? "...\n" : "";
    const suffix =
        end < source.length ? "\n..." : "";

    return (
        prefix +
        source.slice(start, end) +
        suffix
    );
}

function symbolMatches(symbol, terms) {
    const name = normalize(symbol?.name);
    const qualifiedName = normalize(
        symbol?.qualifiedName
    );
    const kind = normalize(symbol?.kind);

    let score = 0;

    for (const term of terms) {
        if (name === term) {
            score += 40;
        } else if (name.includes(term)) {
            score += 20;
        }

        if (qualifiedName.includes(term)) {
            score += 12;
        }

        if (kind === term) {
            score += 4;
        }
    }

    return score;
}

function fileMatches(file, terms) {
    const fileName = normalize(file?.name);
    const filePath = normalize(file?.path);
    const source = normalize(file?.source);

    let score = 0;

    for (const term of terms) {
        if (fileName === term) {
            score += 35;
        } else if (fileName.includes(term)) {
            score += 24;
        }

        if (filePath.includes(term)) {
            score += 14;
        }

        const sourceHits = Math.min(
            countOccurrences(source, term),
            5
        );

        score += sourceHits * 2;

        for (const symbol of file?.symbols ?? []) {
            score += symbolMatches(
                symbol,
                [term]
            );
        }

        for (const item of file?.imports ?? []) {
            if (
                normalize(item?.source).includes(term)
            ) {
                score += 8;
            }
        }

        for (const item of file?.exports ?? []) {
            if (
                normalize(item?.name).includes(term)
            ) {
                score += 8;
            }
        }
    }

    return score;
}

function architecturalScore(file) {
    const fileName = normalize(file?.name);
    const filePath = normalize(file?.path);

    let score = 0;

    const importantNames = [
        "index.js",
        "index.ts",
        "main.js",
        "main.ts",
        "cli.js",
        "cli.ts",
        "bootstrap.js",
        "bootstrap.ts",
        "executor.js",
        "executor.ts",
        "package.json",
        "readme.md",
    ];

    if (importantNames.includes(fileName)) {
        score += 30;
    }

    if (
        filePath.includes("/agent/") ||
        filePath.includes("\\agent\\")
    ) {
        score += 15;
    }

    if (
        filePath.includes("/retrieval/") ||
        filePath.includes("\\retrieval\\")
    ) {
        score += 12;
    }

    if (
        filePath.includes("/providers/") ||
        filePath.includes("\\providers\\")
    ) {
        score += 10;
    }

    if (
        filePath.includes("/cli/") ||
        filePath.includes("\\cli\\")
    ) {
        score += 10;
    }

    score += Math.min(
        file?.imports?.length ?? 0,
        10
    );

    score += Math.min(
        file?.exports?.length ?? 0,
        10
    );

    score += Math.min(
        file?.symbols?.length ?? 0,
        10
    );

    return score;
}

function createFileResult({
    file,
    score,
    terms,
    maxSourceLength,
    reason,
}) {
    return {
        type: "file",
        path: file.path,
        name: file.name,
        language: file.language,
        supported: file.supported,
        score,
        reason,

        content: sourceExcerpt(
            file.source,
            terms,
            maxSourceLength
        ),

        symbols: (file.symbols ?? []).map(
            (symbol) => ({
                name: symbol.name,
                qualifiedName:
                    symbol.qualifiedName,
                kind: symbol.kind,
                exported: symbol.exported,
                signature: symbol.signature,
                location: symbol.location,
            })
        ),

        imports: file.imports ?? [],
        exports: file.exports ?? [],

        metrics: file.metrics ?? null,
    };
}

export class Retriever {
    constructor({
        repository,
        symbols,
        imports,
        graph,
    }) {
        this.repository = repository;
        this.symbols = symbols;
        this.imports = imports;
        this.graph = graph;
    }

    /**
     * Repository object.
     */
    getRepository() {
        return this.repository;
    }

    /**
     * Find symbols by exact name.
     */
    findSymbol(name) {
        return this.symbols.find(name);
    }

    /**
     * Find symbols by kind.
     */
    findSymbolsByKind(kind) {
        return this.symbols.kind(kind);
    }

    /**
     * All indexed symbols.
     */
    getAllSymbols() {
        return this.symbols.values();
    }

    /**
     * Symbols in a file.
     */
    getFileSymbols(path) {
        return this.symbols.file(path);
    }

    /**
     * Imports of a file.
     */
    getFileImports(path) {
        return this.imports.file(path);
    }

    /**
     * Files importing a module.
     */
    getImporters(module) {
        return this.imports.source(module);
    }

    /**
     * Dependency graph.
     */
    getDependencies(path) {
        return this.graph.getDependencies(path);
    }

    /**
     * Reverse dependency graph.
     */
    getDependents(module) {
        return this.graph.getDependents(module);
    }

    /**
     * Parsed file.
     */
    getFile(path) {
        return this.graph.getFile(path);
    }

    /**
     * Check if a file exists.
     */
    hasFile(path) {
        return this.graph.hasFile(path);
    }

    /**
     * Unified repository search.
     *
     * Current implementation combines:
     * - exact symbol lookup
     * - lexical file/path matching
     * - symbol matching
     * - import/export matching
     * - lightweight source matching
     * - repository-scope architectural ranking
     *
     * Semantic/vector retrieval can be added behind
     * this same API later.
     */
    search(query, options = {}) {
        const {
            limit = DEFAULT_LIMIT,
            maxSourceLength =
                DEFAULT_SOURCE_LENGTH,
        } = options;

        const files =
            this.repository?.files ??
            this.repository ??
            [];

        if (!Array.isArray(files)) {
            return [];
        }

        const terms = getSearchTerms(query);

        if (terms.length === 0) {
            return [];
        }

        const repositoryScope =
            isRepositoryScopeQuery(query);

        const scored = [];

        for (const file of files) {
            let score = fileMatches(
                file,
                terms
            );

            let reason = "lexical";

            if (repositoryScope) {
                const architecture =
                    architecturalScore(file);

                score += architecture;

                if (architecture > 0) {
                    reason = "architecture";
                }
            }

            if (score <= 0) {
                continue;
            }

            scored.push(
                createFileResult({
                    file,
                    score,
                    terms,
                    maxSourceLength,
                    reason,
                })
            );
        }

        scored.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return String(a.path).localeCompare(
                String(b.path)
            );
        });

        return scored.slice(
            0,
            Math.max(1, limit)
        );
    }

    /**
     * Repository statistics.
     */
    stats() {
        return {
            files: this.graph.fileCount(),
            symbols: this.symbols.stats().total,
            imports: this.imports.stats().modules,
            graph: this.graph.stats(),
        };
    }
}

/**
 * Factory.
 */
export function createRetriever(indexes) {
    return new Retriever(indexes);
}