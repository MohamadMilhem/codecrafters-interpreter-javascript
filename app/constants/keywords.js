import {tokenType} from "./token-type.js";

export const keywords = new Map([
    ["and",    tokenType.AND],
    ["class",  tokenType.CLASS],
    ["else",   tokenType.ELSE],
    ["false",  tokenType.FALSE],
    ["for",    tokenType.FOR],
    ["fun",    tokenType.FUN],
    ["if",     tokenType.IF],
    ["nil",    tokenType.NIL],
    ["or",     tokenType.OR],
    ["print",  tokenType.PRINT],
    ["return", tokenType.RETURN],
    ["super",  tokenType.SUPER],
    ["this",   tokenType.THIS],
    ["true",   tokenType.TRUE],
    ["var",    tokenType.VAR],
    ["while",  tokenType.WHILE]
]);