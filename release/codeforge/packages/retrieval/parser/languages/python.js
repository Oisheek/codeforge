import Python from "tree-sitter-python";
import * as queries from "../queries/python.js";

export default {
    id: "python",

    grammar: Python,

    queries,

    extensions: [".py"],

    aliases: ["python", "py"],
};