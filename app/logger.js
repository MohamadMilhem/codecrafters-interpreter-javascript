export function error(lineNumber, errorType, text=""){
    console.error(`[line ${lineNumber}] Error: ${errorType}` + (text.length ? ' ' : '') + `${text}`);
}

export function printNumbers(token){
    console.log(token.type + " " + token.text + " " + (token.value % 1 === 0 ? token.value.toFixed(1) : token.value));
}