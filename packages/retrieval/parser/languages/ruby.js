import Ruby from "tree-sitter-ruby";
import * as queries from "../queries/ruby.js";

export default {
    id: "ruby",

    grammar: Ruby,

    queries,

    extensions: [".rb"],

    aliases: ["ruby", "rb"],
};