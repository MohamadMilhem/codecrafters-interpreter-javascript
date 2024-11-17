import { tokenType } from './token-type.js';
import { errorType } from "./error-type.js";
import { error } from "./logger.js";

const tokens = []
export let errorsCount = 0;
let skipNext = false, comment = false;
let lineNumber = 1, curr_char = 0;
let fileLength = 0;
let file;
export function tokenizeCommand(fileContent) {
    fileLength = fileContent.length;
    file = fileContent;

    for (curr_char = 0; curr_char < fileLength; curr_char++) {
        if (skipNext){
            skipNext = false;
            continue;
        }
        if (comment && fileContent[curr_char] !== '\n')continue;
        checkCharacter(fileContent[curr_char]);
    }

    addToken(tokenType.EOF);

    return tokens;
}

function checkCharacter(character) {
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
            break;
        case '"':
            getString();
            break;
        case ' ':
            break;
        case '\n':
            lineNumber++;
            comment = false;
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

function getString() {
    let chars_in_string = [];
    chars_in_string.push(file[curr_char]);
    curr_char++;
    while(curr_char < fileLength && file[curr_char] !== '"'){
        chars_in_string.push(file[curr_char]);
        if (file[curr_char] === '\n')
            lineNumber++;
        curr_char++;
    }

    if (curr_char === fileLength) {
        error(lineNumber, errorType.UNTERMINATED_STRING);
        errorsCount++;
        return;
    }

    chars_in_string.push(file[curr_char]);
    let nameOfText = chars_in_string.join('');
    let valueOfText = nameOfText.substring(1 ,nameOfText.length - 1);
    addToken(tokenType.STRING, nameOfText, valueOfText);
}


function match(expected) {
    if (fileLength === curr_char +  1)return false;
    if (file[curr_char + 1] !== expected)return false;

    skipNext = true;
    return true;
}


function addToken(tokenType, text="", value=null) {
    tokens.push({type: tokenType, text: text, value: value});
}