import { tokenType } from '../constants/token-type.js';
import { errorType } from "../constants/error-type.js";
import { error } from "../utils/logger.js";
import {keywords} from "../constants/keywords.js";
import {TokenizationError} from "../utils/error-handler.js";
import {errorsCountParse} from "./parse-command.js";

const tokens = []
export let errorsCountTokenize = 0;
let skipNext = false, comment = false;
let lineNumber = 1, curr_char_idx = 0;
let fileLength = 0;
let file;
export function tokenizeCommand(fileContent) {
    fileLength = fileContent.length;
    file = fileContent;

    for (curr_char_idx = 0; curr_char_idx < fileLength; curr_char_idx++) {
        if (skipNext){
            skipNext = false;
            continue;
        }
        if (comment && fileContent[curr_char_idx] !== '\n')continue;
        checkCharacter(fileContent[curr_char_idx]);
    }

    addToken(tokenType.EOF);

    return {
        tokens: tokens,
        hasErrors: errorsCountTokenize > 0,
        errorCount: errorsCountTokenize,
    };
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
            if (isDigit(character)){
                getNumber();
            }
            else if (isAlpha(character)){
                getIdentifier();
            }
            else {
                error(lineNumber, errorType.UNEXPECTED_CHAR, character);
                errorsCountTokenize++;
                return;
            }
            break;
    }
}

function isDigit(char) {
    return char >= '0' && char <= '9';
}

function isAlpha(char) {
    return (char >= 'a' && char <= 'z')
        || (char >= 'A' && char <= 'Z')
        || (char === '_');
}

function isAlphaNumeric(char) {
    return isDigit(char) || isAlpha(char);
}

function getIdentifier() {
    let identifier_chars = [];
    identifier_chars.push(getCurrentChar());
    while(isAlphaNumeric(getNextChar())){
        moveToNextChar();
        identifier_chars.push(getCurrentChar());
    }

    let text = identifier_chars.join('');
    let current_tokenType = keywords.get(text);
    if (current_tokenType === undefined) {
        current_tokenType = tokenType.IDENTIFIER;
    }
    addToken(current_tokenType, text);
}

function getNumber(){
    let number_digits = [];
    number_digits.push(getCurrentChar());
    while(isDigit(getNextChar())){
        moveToNextChar()
        number_digits.push(getCurrentChar());
    }

    if (getNextChar() === '.') {
        moveToNextChar();
        number_digits.push(getCurrentChar());
        while(isDigit(getNextChar())){
            moveToNextChar();
            number_digits.push(getCurrentChar());
        }
    }

    let lexeme = number_digits.join('');
    let literal = parseFloat(lexeme);

    addToken(tokenType.NUMBER, lexeme, literal);

}

function getString() {
    let chars_in_string = [];
    chars_in_string.push(getCurrentChar());
    moveToNextChar();
    while(curr_char_idx < fileLength && getCurrentChar() !== '"'){
        chars_in_string.push(getCurrentChar());
        if (getCurrentChar() === '\n')
            lineNumber++;
        moveToNextChar();
    }

    if (curr_char_idx === fileLength) {
        error(lineNumber, errorType.UNTERMINATED_STRING);
        errorsCountTokenize++;
        return;
    }

    chars_in_string.push(getCurrentChar());
    let nameOfText = chars_in_string.join('');
    let valueOfText = nameOfText.substring(1 ,nameOfText.length - 1);
    addToken(tokenType.STRING, nameOfText, valueOfText);
}


function match(expected) {
    if (getNextChar() !== expected) return false;
    skipNext = true;
    return true;
}


function addToken(tokenType, text="", value=null) {
    tokens.push({type: tokenType, text: text, value: value, line: lineNumber});
}


function getCurrentChar(){
    if (curr_char_idx >= file.length) return '\0';
    return file[curr_char_idx];
}

function getNextChar(){
    if (curr_char_idx + 1 >= file.length) return '\0';
    return file[curr_char_idx + 1];
}

function moveToNextChar(){
    curr_char_idx++;
}