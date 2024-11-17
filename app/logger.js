export function error(lineNumber, errorType, text){
    console.error(`[line ${lineNumber}] Error: ${errorType} ${text}`);
}