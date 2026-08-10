import JavaScript from "tree-sitter-javascript";
import * as queries from "../queries/javascript.js";

export default {
    id: "javascript",

    grammar: JavaScript,

    queries,

    extensions: [".js", ".mjs", ".cjs"],

    aliases: ["javascript", "js"],
};