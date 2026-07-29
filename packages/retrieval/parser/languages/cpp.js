import CPP from "tree-sitter-cpp";
import * as queries from "../queries/cpp.js";

export default {
    id: "cpp",

    grammar: CPP,

    queries,

    extensions: [
        ".cpp",
        ".cc",
        ".cxx",
        ".hpp",
        ".hh",
        ".hxx",
    ],

    aliases: ["cpp", "c++"],
};