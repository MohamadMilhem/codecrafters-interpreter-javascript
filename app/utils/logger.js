import {tokenType} from "../constants/token-type.js";

export function error(lineNumber, errorType, text=""){
    console.error(`[line ${lineNumber}] Error: ${errorType}` + (text.length ? ' ' : '') + `${text}`);
}

export function printNumbers(token){
    console.log(token.type + " " + token.text + " " + (token.value % 1 === 0 ? token.value.toFixed(1) : token.value));
}

export function parseError(token, message) {
    if (token.type === tokenType.EOF) {
        error(token.line, " at end: ", message);
    } else {
        error(token.line, " at '" + token.text + "': ", message);
    }
}

export function printTokens(tokens){
    for (let token of tokens) {
        if (token.type === tokenType.NUMBER) {
            printNumbers(token);
            continue;
        }
        console.log(token.type + " " + token.text + " " + token.value);
    }
}

export function plainError(text){
    console.error(text);
}