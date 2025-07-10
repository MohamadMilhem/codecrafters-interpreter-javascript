import { tokenType } from '../constants/token-type.js';
import { errorType } from "../constants/error-type.js";
import { keywords } from "../constants/keywords.js";

/**
 * Tokenizes the input file content in a pure, functional style.
 * @param {string} fileContent - The source code to tokenize.
 * @returns {{ tokens: Array, errors: Array }}
 */
export const tokenizeCommand = (fileContent) => {
    const fileLength = fileContent.length;
    let tokens = [];
    let errors = [];
    let lineNumber = 1;
    let currCharIdx = 0;
    let skipNext = false;
    let comment = false;

    const addToken = (type, text = "", value = null) => {
        tokens = [...tokens, { type, text, value, line: lineNumber }];
    };

    const errorToken = (line, type, text = "") => {
        errors = [...errors, { line, type, text }];
    };

    const isDigit = (char) => char >= '0' && char <= '9';
    const isAlpha = (char) => (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char === '_');
    const isAlphaNumeric = (char) => isDigit(char) || isAlpha(char);

    const getCurrentChar = () => (currCharIdx >= fileLength ? '\0' : fileContent[currCharIdx]);
    const getNextChar = () => (currCharIdx + 1 >= fileLength ? '\0' : fileContent[currCharIdx + 1]);
    const moveToNextChar = () => { currCharIdx++; };

    const match = (expected) => {
        if (getNextChar() !== expected) return false;
        skipNext = true;
        return true;
    };

    const getIdentifier = () => {
        let identifierChars = [getCurrentChar()];
        while (isAlphaNumeric(getNextChar())) {
            moveToNextChar();
            identifierChars.push(getCurrentChar());
        }
        let text = identifierChars.join('');
        let currentTokenType = keywords.get(text) || tokenType.IDENTIFIER;
        addToken(currentTokenType, text);
    };

    const getNumber = () => {
        let numberDigits = [getCurrentChar()];
        while (isDigit(getNextChar())) {
            moveToNextChar();
            numberDigits.push(getCurrentChar());
        }
        if (getNextChar() === '.') {
            moveToNextChar();
            numberDigits.push(getCurrentChar());
            while (isDigit(getNextChar())) {
                moveToNextChar();
                numberDigits.push(getCurrentChar());
            }
        }
        let lexeme = numberDigits.join('');
        let literal = parseFloat(lexeme);
        addToken(tokenType.NUMBER, lexeme, literal);
    };

    const getString = () => {
        let charsInString = [getCurrentChar()];
        moveToNextChar();
        while (currCharIdx < fileLength && getCurrentChar() !== '"') {
            charsInString.push(getCurrentChar());
            if (getCurrentChar() === '\n') lineNumber++;
            moveToNextChar();
        }
        if (currCharIdx === fileLength) {
            errorToken(lineNumber, errorType.UNTERMINATED_STRING);
            return;
        }
        charsInString.push(getCurrentChar());
        let nameOfText = charsInString.join('');
        let valueOfText = nameOfText.substring(1, nameOfText.length - 1);
        addToken(tokenType.STRING, nameOfText, valueOfText);
    };

    const checkCharacter = (character) => {
        switch (character) {
            case '(': addToken(tokenType.LEFT_PAREN, character); break;
            case ')': addToken(tokenType.RIGHT_PAREN, character); break;
            case '{': addToken(tokenType.LEFT_BRACE, character); break;
            case '}': addToken(tokenType.RIGHT_BRACE, character); break;
            case ',': addToken(tokenType.COMMA, character); break;
            case '.': addToken(tokenType.DOT, character); break;
            case '-': addToken(tokenType.MINUS, character); break;
            case '+': addToken(tokenType.PLUS, character); break;
            case ';': addToken(tokenType.SEMICOLON, character); break;
            case '*': addToken(tokenType.STAR, character); break;
            case '!':
                if (match('=')) { // Calls match once
                    addToken(tokenType.BANG_EQUAL, "!=");
                } else {
                    addToken(tokenType.BANG, "!");
                }
                break;
            case '=':
                if (match('=')) { // Calls match once
                    addToken(tokenType.EQUAL_EQUAL, "==");
                } else {
                    addToken(tokenType.EQUAL, "=");
                }
                break;
            case '<':
                if (match('=')) { // Calls match once
                    addToken(tokenType.LESS_EQUAL, "<=");
                } else {
                    addToken(tokenType.LESS, "<");
                }
                break;
            case '>':
                if (match('=')) { // Calls match once
                    addToken(tokenType.GREATER_EQUAL, ">=");
                } else {
                    addToken(tokenType.GREATER, ">");
                }
                break;
            case '/':
                if (match('/')) { // Correctly handles comments
                    comment = true;
                    // skipNext is true (set by match), so the main loop will skip the second '/'
                    break;
                }
                addToken(tokenType.SLASH, character);
                break;
            case '"': getString(); break;
            case ' ': break;
            case '\n': lineNumber++; comment = false; break;
            case '\r': break;
            case '\t': break;
            default:
                if (isDigit(character)) { getNumber(); }
                else if (isAlpha(character)) { getIdentifier(); }
                else { errorToken(lineNumber, errorType.UNEXPECTED_CHAR, character); }
                break;
        }
    };

    for (currCharIdx = 0; currCharIdx < fileLength; currCharIdx++) {
        if (skipNext) { skipNext = false; continue; }
        if (comment && fileContent[currCharIdx] !== '\n') continue;
        checkCharacter(fileContent[currCharIdx]);
    }
    addToken(tokenType.EOF);
    return { tokens, errors };
};