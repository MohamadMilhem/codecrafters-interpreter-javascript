import { tokenType } from './token-type.js';
import { errorType } from "./error-type.js";
import { error } from "./logger.js";

const tokens = []
export let errorsCount = 0;
let skipNext = false;
let lines, lineNumber, curr_line, characterNumber;
let comment = false;

export function tokenizeCommand(fileContent) {
    lines = fileContent.split("\n");
    lineNumber = 0;

    for (curr_line of lines) {
        lineNumber++;
        characterNumber = -1;
        for (let character of curr_line) {
            characterNumber++;
            if (skipNext){
                skipNext = false;
                continue;
            }
            checkCharacter(character, lineNumber);
            if (comment){
                skipNext = false;
                comment = false;
                break;
            }
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
        case '!':
            addToken(match('=') ? tokenType.BANG_EQUAL : tokenType.BANG,
                character + (match('=') ? '=' : ''));
            break;
        case '=':
            addToken(match('=') ? tokenType.EQUAL_EQUAL : tokenType.EQUAL,
                character + (match('=') ? '=' : ''));
            break;
        case '<':
            addToken(match('=') ? tokenType.LESS_EQUAL : tokenType.LESS,
                character + (match('=') ? '=' : ''));
            break;
        case '>':
            addToken(match('=') ? tokenType.GREATER_EQUAL : tokenType.GREATER,
                character + (match('=') ? '=' : ''));
            break;
        case '/':
            if (match('/')){
                comment = true;
                break;
            }
            addToken(tokenType.SLASH, character);
        case ' ':
            break;
        case '\n':
            break;
        case '\r':
            break;
        case '\t':
            break;
        default:
            error(lineNumber, errorType.UNEXPECTED_CHAR, character);
            errorsCount++;
            break;
    }
}

function match(expected) {
    if (curr_line.length === characterNumber +  1)return false;
    if (curr_line[characterNumber + 1] !== expected)return false;

    skipNext = true;
    return true;
}


function addToken(tokenType, text="") {
    tokens.push({type: tokenType, text: text, value: null});
}