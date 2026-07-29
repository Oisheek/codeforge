import Swift from "tree-sitter-swift";
import * as queries from "../queries/swift.js";

export default {
    id: "swift",

    grammar: Swift,

    queries,

    extensions: [".swift"],

    aliases: ["swift"],
};