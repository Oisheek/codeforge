import fs from "node:fs/promises";
import path from "node:path";


export class RetrievalCache {
    constructor(cachePath = ".codeforge/cache/retrieval.json") {
        this.cachePath = cachePath;
        this.entries = new Map();
        this.loaded = false;
    }

    async load() {
        if (this.loaded) {
            return;
        }

        try {
            const data = await fs.readFile(this.cachePath, "utf8");
            const json = JSON.parse(data);

            this.entries = new Map(Object.entries(json));
        } catch {
            this.entries = new Map();
        }

        this.loaded = true;
    }

    async save() {
        await fs.mkdir(path.dirname(this.cachePath), {
            recursive: true,
        });

        const json = Object.fromEntries(this.entries);

        await fs.writeFile(
            this.cachePath,
            JSON.stringify(json, null, 2),
            "utf8"
        );
    }

    has(filePath, hash) {
        const entry = this.entries.get(filePath);

        return !!entry && entry.hash === hash;
    }

    get(filePath) {
        return this.entries.get(filePath) ?? null;
    }

    set(filePath, hash, data) {
        this.entries.set(filePath, {
            hash,
            timestamp: Date.now(),
            ...data,
        });
    }

    delete(filePath) {
        this.entries.delete(filePath);
    }

    clear() {
        this.entries.clear();
    }

    size() {
        return this.entries.size;
    }

    keys() {
        return [...this.entries.keys()];
    }

    values() {
        return [...this.entries.values()];
    }

    entriesArray() {
        return [...this.entries.entries()];
    }
}

export const cache = new RetrievalCache();