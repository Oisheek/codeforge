import C from "tree-sitter-c";
import * as queries from "../queries/c.js";

export default {
    id: "c",

    grammar: C,

    queries,

    extensions: [".c", ".h"],

    aliases: ["c"],
};