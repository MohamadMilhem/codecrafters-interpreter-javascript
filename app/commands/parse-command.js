import {errorsCountTokenize, tokenizeCommand} from "./tokenize-command.js";
import { tokenType } from "../constants/token-type.js";
import { ParseError } from "../utils/error-handler.js";
import { error, plainError, parseError} from "../utils/logger.js";

export let errorsCountParse = 0;
let tokens = [];

export function parseCommand(fileContent) {
    errorsCountParse = 0;
    tokens = tokenizeCommand(fileContent);

    if (tokens[0].type === tokenType.EOF || errorsCountTokenize > 0) {
        return;
    }

    try {
        const result = expression(0);

        if (!isAtEnd(result.curr_idx)){
            parseError(peek(result.curr_idx), "Unexpected tokens after expression.");
            errorsCountParse++;
        }

        return {
            expr: result.expr,
            hasErrors: errorsCountParse > 0,
            errorCount: errorsCountParse,
        };
    } catch (e) {
        if (e instanceof ParseError){
            // Reported by parseError
            return {
                expr: {name: "error", value: null, message: e.message},
                hasErrors: true,
                errorCount: errorsCountParse,
            };
        } else {
            // unexpected runtime error (not handled)
            plainError("Parser crashed: " + e.message);
            return {
                expr: {name: "error", value: null, message: "Parser crashed"},
                hasErrors: true,
                errorCount: errorsCountParse + 1,
            }
        }
    }
}

function synchronize(curr_idx) {
    if (isAtEnd(curr_idx)) {
        return curr_idx;
    }

    curr_idx++;

    while(!isAtEnd(curr_idx)){
        if (previous(curr_idx).type === tokenType.SEMICOLON) return curr_idx;

        switch(peek(curr_idx).type){
            case tokenType.CLASS:
            case tokenType.FUNCTION:
            case tokenType.VAR:
            case tokenType.FOR:
            case tokenType.IF:
            case tokenType.WHILE:
            case tokenType.PRINT:
            case tokenType.RETURN:
                return curr_idx;
        }

        curr_idx++;
    }

    return curr_idx;
}

function expression(curr_idx) {
    return equality(curr_idx);
}

function equality(curr_idx) {
    try {
        let { expr, curr_idx: newIdx } = comparison(curr_idx);
        curr_idx = newIdx;

        while (match([tokenType.BANG_EQUAL, tokenType.EQUAL_EQUAL], curr_idx)) {
            curr_idx++;
            const operator = previous(curr_idx);

            try {
                const { expr: right, curr_idx: next_idx } = comparison(curr_idx);
                curr_idx = next_idx;
                expr = {
                    name: "binary",
                    operator: operator,
                    leftExpression: expr,
                    rightExpression: right,
                };
            } catch (e) {
                if (e instanceof ParseError) {
                    // Missing right operand - create error node and synchronize
                    if (!isAtEnd(curr_idx))
                        curr_idx = synchronize(curr_idx);
                    expr = {
                        name: "error",
                        value: null,
                        expression: expr,
                        message: `Missing right operand for '${operator.text}' operator`
                    };
                    break; // Exit the loop since we're in an error state
                }
                throw e;
            }
        }

        return { expr, curr_idx };
    } catch (e) {
        if (e instanceof ParseError) {
            if (!isAtEnd(curr_idx))
                curr_idx = synchronize(curr_idx);
            return {
                expr: { name: "error", value: null, message: e.message },
                curr_idx
            };
        }
        throw e;
    }
}

function comparison(curr_idx) {
    try {
        let { expr, curr_idx: new_idx } = term(curr_idx);
        curr_idx = new_idx;

        while (match([tokenType.GREATER, tokenType.GREATER_EQUAL, tokenType.LESS, tokenType.LESS_EQUAL,], curr_idx)) {
            curr_idx++;
            const operator = previous(curr_idx);

            try {
                const { expr: right, curr_idx: next_idx } = term(curr_idx);
                curr_idx = next_idx;
                expr = {
                    name: "binary",
                    operator: operator,
                    leftExpression: expr,
                    rightExpression: right,
                };
            } catch (e) {
                if (e instanceof ParseError) {
                    // Missing right operand - create error node and synchronize
                    curr_idx = synchronize(curr_idx);
                    expr = {
                        name: "error",
                        value: null,
                        expression: expr,
                        message: `Missing right operand for '${operator.text}' operator`
                    };
                    break; // Exit the loop since we're in an error state
                }
                throw e;
            }
        }

        return { expr, curr_idx };
    } catch (e) {
        if (e instanceof ParseError) {
            curr_idx = synchronize(curr_idx);
            return {
                expr: { name: "error", value: null, message: e.message },
                curr_idx
            };
        }
        throw e;
    }
}

function term(curr_idx) {
    try {
        let {expr, curr_idx: new_idx} = factor(curr_idx);
        curr_idx = new_idx;

        while(match([tokenType.MINUS, tokenType.PLUS], curr_idx)) {
            curr_idx++;
            const operator = previous(curr_idx);

            try {
                let {expr: right, curr_idx: new_idx} = factor(curr_idx);
                curr_idx = new_idx;
                expr = {
                    name: "binary",
                    operator: operator,
                    leftExpression: expr,
                    rightExpression: right,
                };
            } catch (e) {
                if (e instanceof ParseError) {
                    // Missing right operand - create error node and synchronize
                    curr_idx = synchronize(curr_idx);
                    expr = {
                        name: "error",
                        value: null,
                        expression: expr,
                        message: `Missing right operand for '${operator.text}' operator`
                    };
                    break; // Exit the loop since we're in an error state
                }
                throw e;
            }
        }

        return {expr, curr_idx};
    } catch (e) {
        if (e instanceof ParseError) {
            curr_idx = synchronize(curr_idx);
            return {
                expr: { name: "error", value: null, message: e.message },
                curr_idx
            };
        }
        throw e;
    }
}

function factor(curr_idx) {
    try {
        let {expr, curr_idx: new_idx} = unary(curr_idx);
        curr_idx = new_idx;

        while(match([tokenType.SLASH, tokenType.STAR], curr_idx)) {
            curr_idx++;
            const operator = previous(curr_idx);

            try {
                let {expr: right, curr_idx: new_idx} = unary(curr_idx);
                curr_idx = new_idx;
                expr = {
                    name: "binary",
                    operator: operator,
                    leftExpression: expr,
                    rightExpression: right,
                };
            } catch (e) {
                if (e instanceof ParseError) {
                    // Missing right operand - create error node and synchronize
                    curr_idx = synchronize(curr_idx);
                    expr = {
                        name: "error",
                        value: null,
                        expression: expr,
                        message: `Missing right operand for '${operator.text}' operator`
                    };
                    break; // Exit the loop since we're in an error state
                }
                throw e;
            }
        }

        return {expr, curr_idx};
    } catch (e) {
        if (e instanceof ParseError) {
            curr_idx = synchronize(curr_idx);
            return {
                expr: { name: "error", value: null, message: e.message },
                curr_idx
            };
        }
        throw e;
    }
}

function unary(curr_idx) {
    if (match([tokenType.BANG, tokenType.MINUS], curr_idx)) {
        curr_idx++;
        const operator = previous(curr_idx);

        try {
            let {expr: right, curr_idx: new_idx} = unary(curr_idx);
            curr_idx = new_idx;
            let expr = {
                name: "unary",
                operator: operator,
                expression: right,
            };
            return {expr, curr_idx};
        } catch (e) {
            if (e instanceof ParseError) {
                curr_idx = synchronize(curr_idx);
                return {
                    expr: {
                        name: "error",
                        value: null,
                        message: `Missing operand for ${operator.text} operator`
                    },
                    curr_idx
                };
            }
            throw e;
        }
    }

    return primary(curr_idx);
}

function primary(curr_idx){
    if (match([tokenType.FALSE], curr_idx)) {
        curr_idx++;
        let expr = {
            name: "literal",
            value: false
        };
        return {expr, curr_idx} ;
    }
    if (match([tokenType.TRUE], curr_idx)) {
        curr_idx++;
        let expr = {
            name: "literal",
            value: true
        };
        return {expr, curr_idx} ;
    }
    if (match([tokenType.NIL], curr_idx)){
        curr_idx++;
        let expr = {
            name: "literal",
            value: null
        };
        return {expr, curr_idx} ;
    }

    if (match([tokenType.NUMBER, tokenType.STRING], curr_idx)) {
        curr_idx++;
        let expr = {
            name: "literal",
            value: previous(curr_idx).value,
        };
        return {expr, curr_idx};
    }

    if (match([tokenType.LEFT_PAREN], curr_idx)) {
        curr_idx++;
        let {expr, curr_idx: next_idx} = expression(curr_idx);
        curr_idx = next_idx;
        try {
            curr_idx = consume(tokenType.RIGHT_PAREN, "Expect ')' after expression.", curr_idx);
            expr = { name: "grouping", expression: expr};
            return {expr, curr_idx};
        } catch (e) {
            if (e instanceof ParseError){
                // synchronize after error.
                curr_idx = synchronize(curr_idx);
                return {
                    expr: {
                        name: "error",
                        value: null,
                        expression: expr,
                        message: "Missing closing parenthesis"
                    },
                    curr_idx
                };
            }
            throw e;
        }
    }

    // didn't match any expression syntax.
    const errorMessage = isAtEnd(curr_idx)
        ? "Unexpected end of input."
        : `Unexpected token '${peek(curr_idx).text}'.`;

    const token = isAtEnd(curr_idx) ? previous(curr_idx) : peek(curr_idx);
    parseError(token, errorMessage);

    // create an error node but continue parsing.
    errorsCountParse++;
    curr_idx = synchronize(curr_idx);
    return {
        expr: {
            name: "error",
            value: null,
            message: errorMessage
        },
        curr_idx
    };
}

function consume(type, message, curr_idx) {
    if (check(type, curr_idx)) {
        curr_idx++;
        return curr_idx;
    }

    const token = isAtEnd(curr_idx) ? previous(curr_idx) : peek(curr_idx);
    parseError(token, message);
    errorsCountParse++;

    throw new ParseError(token, message);
}

function match(types, curr_idx) {
    for (let type of types) {
        if (check(type, curr_idx)) {
            return true;
        }
    }
    return false;
}

function check(type, curr_idx) {
    if (isAtEnd(curr_idx)) return false;
    return peek(curr_idx).type === type;
}

function isAtEnd(curr_idx) {
    return peek(curr_idx)?.type === tokenType.EOF;
}

function previous(curr_idx) {
    return tokens[curr_idx - 1];
}

function peek(curr_idx) {
    return tokens[curr_idx];
}