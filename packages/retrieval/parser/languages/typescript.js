import TypeScript from "tree-sitter-typescript";
import * as queries from "../queries/typescript.js";

export default {
    id: "typescript",

    grammar: TypeScript.typescript,

    queries,

    extensions: [".ts", ".mts", ".cts"],

    aliases: ["typescript", "ts"],
};