import Go from "tree-sitter-go";
import * as queries from "../queries/go.js";

export default {
    id: "go",

    grammar: Go,

    queries,

    extensions: [".go"],

    aliases: ["go", "golang"],
};