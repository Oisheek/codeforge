import Java from "tree-sitter-java";
import * as queries from "../queries/java.js";

export default {
    id: "java",

    grammar: Java,

    queries,

    extensions: [".java"],

    aliases: ["java"],
};