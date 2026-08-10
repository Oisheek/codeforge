import * as javascript from "./javascript.js";
import * as typescript from "./typescript.js";
import * as python from "./python.js";
import * as java from "./java.js";
import * as go from "./go.js";
import * as rust from "./rust.js";
import * as c from "./c.js";
import * as cpp from "./cpp.js";
import * as csharp from "./csharp.js";
import * as php from "./php.js";
import * as ruby from "./ruby.js";
import * as swift from "./swift.js";

const QUERIES = {
    javascript,
    jsx: javascript,

    typescript,
    tsx: typescript,

    python,
    java,
    go,
    rust,
    c,
    cpp,
    csharp,
    php,
    ruby,
    swift,
};

export function getQuerySet(language) {
    return QUERIES[language] ?? null;
}