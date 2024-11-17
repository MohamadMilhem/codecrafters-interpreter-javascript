import { tokenType } from './token-type.js';
import { errorType } from "./error-type.js";
import { error } from "./logger.js";

const tokens = []
export let errorsCount = 0;

export function tokenizeCommand(fileContent) {
    let lines = fileContent.split("\n");
    let lineNumber = 0;

    for (let curr_line of lines) {
        lineNumber++;
        for (let character of curr_line) {
            checkCharacter(character, lineNumber);
        }
    }

    addToken(tokenType.EOF);

    return tokens;
}

function checkCharacter(character, lineNumber) {
    switch (character) {
        case '(':
            addToken(tokenType.LEFT_PAREN, character);
            break;
        case ')':
            addToken(tokenType.RIGHT_PAREN, character);
            break;
        case '{':
            addToken(tokenType.LEFT_BRACE, character);
            break;
        case '}':
            addToken(tokenType.RIGHT_BRACE, character);
            break;
        case ',':
            addToken(tokenType.COMMA, character);
            break;
        case '.':
            addToken(tokenType.DOT, character);
            break;
        case '-':
            addToken(tokenType.MINUS, character);
            break;
        case '+':
            addToken(tokenType.PLUS, character);
            break;
        case ';':
            addToken(tokenType.SEMICOLON, character);
            break;
        case '*':
            addToken(tokenType.STAR, character);
            break;
        case ' ':
            break;
        case '\n':
            break;
        case '\r':
            break;
        default:
            error(lineNumber, errorType.UNEXPECTED_CHAR, character);
            errorsCount++;
            break;
    }
}

function addToken(tokenType, text="") {
    tokens.push({type: tokenType, text: text, value: null});
}