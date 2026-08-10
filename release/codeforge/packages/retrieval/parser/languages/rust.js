import Rust from "tree-sitter-rust";
import * as queries from "../queries/rust.js";

export default {
    id: "rust",

    grammar: Rust,

    queries,

    extensions: [".rs"],

    aliases: ["rust", "rs"],
};