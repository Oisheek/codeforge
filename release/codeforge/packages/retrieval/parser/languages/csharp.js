import CSharp from "tree-sitter-c-sharp";
import * as queries from "../queries/csharp.js";

export default {
    id: "csharp",

    grammar: CSharp,

    queries,

    extensions: [".cs"],

    aliases: ["csharp", "c#"],
};