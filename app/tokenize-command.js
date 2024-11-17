import { tokenType } from './tokenType.js';
const tokens = []

export function tokenizeCommand(fileContent) {
    let lines = fileContent.split("\n");

    for (let curr_line of lines) {
        for (let character of curr_line) {
            checkCharacter(character, curr_line);
        }
    }

    addToken(tokenType.EOF);

    return tokens;
}

function checkCharacter(character, curr_line) {
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
        default:
            console.log("Line: " + curr_line + "\n" + "Unexpected character: " + character);
            break;
    }
}

function addToken(tokenType, text="") {
    tokens.push({type: tokenType, text: text, value: null});
}