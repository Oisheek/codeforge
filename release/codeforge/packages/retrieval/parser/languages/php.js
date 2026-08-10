import PHP from "tree-sitter-php";
import * as queries from "../queries/php.js";

export default {
    id: "php",

    grammar: PHP,

    queries,

    extensions: [".php"],

    aliases: ["php"],
};