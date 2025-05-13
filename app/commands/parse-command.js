import {errorsCountTokenize, tokenizeCommand} from "./tokenize-command.js";
import {tokenType} from "../constants/token-type.js";
import {ParseError} from "../utils/error-handler.js";
import {error, plainError, parseError} from "../utils/logger.js";
import {statementsTypes} from "../constants/statements-types.js";
import {errorType} from "../constants/error-type.js";

export let errorsCountParse = 0;
let tokens = [];

export function parseCommand(_tokens) {

    tokens = _tokens;
    let statements = [];
    let curr_statement = null;
    let curr_idx = 0;

    do {
        curr_statement = declaration(curr_idx);
        statements.push(curr_statement.statement);

        curr_idx = curr_statement.curr_idx;
    } while (!isAtEnd(curr_idx));

    if (!isAtEnd(curr_idx)){
        parseError(peek(curr_idx), "Unexpected tokens after expression.");
        errorsCountParse++;
    }
    return {
        statements: statements,
        hasErrors: errorsCountParse > 0,
        errorCount: errorsCountParse,
    }
}

function declaration(curr_idx) {
    try {
        if (match([tokenType.VAR], curr_idx)) {
            curr_idx = consume(tokenType.VAR, "" ,curr_idx);
            return varDeclaration(curr_idx);
        }
        return statement(curr_idx);
    } catch (e) {
        synchronize();
        return null;
    }
}

function varDeclaration(curr_idx) {
    if (!match([tokenType.IDENTIFIER], curr_idx)) {
        throw new ParseError(peek(curr_idx), "Expected IDENTIFIER to be identifiable.");
    }

    let name = tokens[curr_idx];
    curr_idx = consume(tokenType.IDENTIFIER, "" ,curr_idx);

    let initializer = null;
    if (match([tokenType.EQUAL], curr_idx)) {
        curr_idx = consume(tokenType.EQUAL, "" , curr_idx);
        initializer = expression(curr_idx);
        curr_idx = initializer.curr_idx;
    }

    curr_idx = consume(tokenType.SEMICOLON, "Expect ';' after variable declaration.", curr_idx);

    return {
        statement : {
            statementType : statementsTypes.STATEMENT_VAR_DEC,
            exprValue : initializer !== null ? initializer.expr : null,
            nameToken : name,
        },
        curr_idx : curr_idx
    }
}


function statement(curr_idx) {
    if (match([tokenType.PRINT], curr_idx)) {
        curr_idx = consume(tokenType.PRINT, "Expected Print statement.", curr_idx);
        return printStatement(curr_idx);
    }
    if (match([tokenType.LEFT_BRACE], curr_idx)){
        curr_idx = consume(tokenType.LEFT_BRACE, "Expected beginning of a block.", curr_idx);
        return blockStatement(curr_idx);
    }
    if (match([tokenType.IF], curr_idx)) {
        curr_idx = consume(tokenType.IF, "Expected if statement.", curr_idx);
        return ifStatement(curr_idx);
    }
    if (match([tokenType.WHILE], curr_idx)){
        curr_idx = consume(tokenType.WHILE, "Expected while statement.", curr_idx);
        return whileStatement(curr_idx);
    }
    if (match([tokenType.FOR], curr_idx)){
        curr_idx = consume(tokenType.FOR, "Expect for statement.", curr_idx);
        return forStatement(curr_idx);
    }
    return expressionStatement(curr_idx);
}

function printStatement(curr_idx) {
    const value = expression(curr_idx);
    curr_idx = value.curr_idx;
    if (!isAtEnd(curr_idx))
        curr_idx = consume(tokenType.SEMICOLON, "Expected ';' after expression.", curr_idx);
    return {
        statement: {
            statementType: statementsTypes.STATEMENT_PRINT,
            exprValue: value.expr,
        },
        curr_idx: curr_idx,
    }
}

function blockStatement(curr_idx){
    const statements = [];
    while(!check(tokenType.RIGHT_BRACE, curr_idx) && !isAtEnd(curr_idx)) {
        const current_statement = declaration(curr_idx);
        statements.push(current_statement.statement);
        curr_idx = current_statement.curr_idx;
    }
    curr_idx = consume(tokenType.RIGHT_BRACE, "Expect '}' after block." , curr_idx);
    return {
        statement: {
            statementType: statementsTypes.STATEMENT_BLOCK,
            statements: statements,
        },
        curr_idx : curr_idx
    };
}

function ifStatement(curr_idx){
    curr_idx = consume(tokenType.LEFT_PAREN, "Expect '(' after 'if'." , curr_idx);
    const condition_expr = expression(curr_idx);
    curr_idx = condition_expr.curr_idx;
    curr_idx = consume(tokenType.RIGHT_PAREN, "Expect ')' after if condition.",curr_idx);

    const thenBranch = statement(curr_idx);
    curr_idx = thenBranch.curr_idx;
    let elseBranch = null;
    if (match([tokenType.ELSE], curr_idx)) {
        curr_idx = consume(tokenType.ELSE, "Expect else branch.", curr_idx);
        elseBranch = statement(curr_idx);
        curr_idx = elseBranch.curr_idx;
    }

    return {
        statement : {
            statementType: statementsTypes.STATEMENT_IF,
            condition_expr : condition_expr,
            thenBranch : thenBranch,
            elseBranch : elseBranch,
        },
        curr_idx : curr_idx
    }

}

function whileStatement(curr_idx){
    curr_idx = consume(tokenType.LEFT_PAREN, "Expect '(' after 'if'." , curr_idx);
    const condition_expr = expression(curr_idx);
    curr_idx = condition_expr.curr_idx;
    curr_idx = consume(tokenType.RIGHT_PAREN, "Expect ')' after if condition.",curr_idx);

    const body = statement(curr_idx);
    curr_idx = body.curr_idx;
    return {
        statement : {
            statementType: statementsTypes.STATEMENT_WHILE,
            condition_expr : condition_expr,
            body : body,
        },
        curr_idx : curr_idx
    }
}

function expressionStatement(curr_idx) {
    const value = expression(curr_idx);
    curr_idx = value.curr_idx;
    if (!isAtEnd(curr_idx))
        curr_idx = consume(tokenType.SEMICOLON, "Expected ';' after expression.", curr_idx);
    return {
        statement: {
            statementType: statementsTypes.STATEMENT_EXPR,
            exprValue: value.expr
        },
        curr_idx: curr_idx,
    }
}

function forStatement(curr_idx){
    curr_idx = consume(tokenType.LEFT_PAREN, "Expect '(' after 'for'." , curr_idx);

    let initializer;
    if (match([tokenType.SEMICOLON], curr_idx)) {
        curr_idx = consume(tokenType.SEMICOLON, "", curr_idx);
        initializer = null;
    } else if (match([tokenType.VAR], curr_idx)) {
        curr_idx = consume(tokenType.VAR, "", curr_idx);
        initializer = varDeclaration(curr_idx);
        curr_idx = initializer.curr_idx;

    } else {
        initializer = expressionStatement(curr_idx);
        curr_idx = initializer.curr_idx;
    }

    let condition_expr = null;
    if (!check(tokenType.SEMICOLON, curr_idx)) {
        condition_expr = expression(curr_idx);
        curr_idx = condition_expr.curr_idx;
    }

    curr_idx = consume(tokenType.SEMICOLON, "Expect ';' after loop condition.", curr_idx);

    let increment_expr = null;
    if (!check(tokenType.RIGHT_PAREN, curr_idx)) {
        increment_expr = expression(curr_idx);
        curr_idx = increment_expr.curr_idx;
    }

    curr_idx = consume(tokenType.RIGHT_PAREN, "Expect ')' after for clauses.", curr_idx);
    let body = statement(curr_idx);
    curr_idx = body.curr_idx;

    if (increment_expr !== null) {
        body = {
            statement: {
                statementType: statementsTypes.STATEMENT_BLOCK,
                statements: [body.statement,
                    {
                    statementType : statementsTypes.STATEMENT_EXPR,
                    exprValue : increment_expr.expr,
                    }
                ],
            },
            curr_idx : curr_idx
        };
    }

    if (condition_expr === null) {
        condition_expr = {
            name : "literal",
            value : true,
        };
    }

    body = {
        statement: {
            statementType: statementsTypes.STATEMENT_WHILE,
            condition_expr: condition_expr,
            body: body,
        } ,
        curr_idx : curr_idx
    };

    if (initializer !== null){
        body = {
            statement: {
                statementType: statementsTypes.STATEMENT_BLOCK,
                statements: [initializer.statement, body.statement],
            },
            curr_idx: curr_idx
        }
    }

    return body;

}

function synchronize(curr_idx) {
    if (isAtEnd(curr_idx)) {
        return curr_idx;
    }

    curr_idx++;

    while (!isAtEnd(curr_idx)) {
        if (previous(curr_idx).type === tokenType.SEMICOLON) return curr_idx;

        switch (peek(curr_idx).type) {
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
    return assignment(curr_idx);
}

function assignment(curr_idx) {
    const expression = or(curr_idx);
    curr_idx = expression.curr_idx;

    if (match([tokenType.EQUAL], curr_idx)) {
        const equals_idx = curr_idx;
        curr_idx = consume(tokenType.EQUAL, "", curr_idx);

        const value = assignment(curr_idx);
        curr_idx = value.curr_idx;

        if (expression?.expr?.name === 'variable'){
            return {
                expr: {
                    name: "assignment",
                    valueExpr : value.expr,
                    nameExpr : expression.expr,
                },
                curr_idx : curr_idx
            };
        }

        error(tokens[equals_idx].line, errorType.INVALID_ASSIGNMENT_TARGET);
    }
    return expression;
}

function or(curr_idx){
    let expression = and(curr_idx);
    curr_idx = expression.curr_idx;

    while(match([tokenType.OR], curr_idx)){
        curr_idx = consume(tokenType.OR, "OR", curr_idx);
        const operator = previous(curr_idx);
        const right = and(curr_idx);
        curr_idx = right.curr_idx;
        expression = {
            expr : {
                    name : "logical",
                    expression : expression.expr,
                    operator : operator,
                    right : right.expr,
            },
            curr_idx : curr_idx
        }
    }

    return expression;
}

function and(curr_idx){
    let expression = equality(curr_idx);
    curr_idx = expression.curr_idx;

    while(match([tokenType.AND], curr_idx)){
        curr_idx = consume(tokenType.AND, "AND", curr_idx);
        const operator = previous(curr_idx);
        const right = equality(curr_idx);
        curr_idx = right.curr_idx;
        expression = {
            expr : {
                name : "logical",
                expression : expression.expr,
                operator : operator,
                right : right.expr,
            },
            curr_idx: curr_idx
        }
    }
    return expression;
}


function equality(curr_idx) {
    try {
        let {expr, curr_idx: newIdx} = comparison(curr_idx);
        curr_idx = newIdx;

        while (match([tokenType.BANG_EQUAL, tokenType.EQUAL_EQUAL], curr_idx)) {
            curr_idx++;
            const operator = previous(curr_idx);

            try {
                const {expr: right, curr_idx: next_idx} = comparison(curr_idx);
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

        return {expr, curr_idx};
    } catch (e) {
        if (e instanceof ParseError) {
            if (!isAtEnd(curr_idx))
                curr_idx = synchronize(curr_idx);
            return {
                expr: {name: "error", value: null, message: e.message},
                curr_idx
            };
        }
        throw e;
    }
}

function comparison(curr_idx) {
    try {
        let {expr, curr_idx: new_idx} = term(curr_idx);
        curr_idx = new_idx;

        while (match([tokenType.GREATER, tokenType.GREATER_EQUAL, tokenType.LESS, tokenType.LESS_EQUAL,], curr_idx)) {
            curr_idx++;
            const operator = previous(curr_idx);

            try {
                const {expr: right, curr_idx: next_idx} = term(curr_idx);
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

        return {expr, curr_idx};
    } catch (e) {
        if (e instanceof ParseError) {
            curr_idx = synchronize(curr_idx);
            return {
                expr: {name: "error", value: null, message: e.message},
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

        while (match([tokenType.MINUS, tokenType.PLUS], curr_idx)) {
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
                expr: {name: "error", value: null, message: e.message},
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

        while (match([tokenType.SLASH, tokenType.STAR], curr_idx)) {
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
                expr: {name: "error", value: null, message: e.message},
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

function primary(curr_idx) {
    if (match([tokenType.FALSE], curr_idx)) {
        curr_idx++;
        let expr = {
            name: "literal",
            value: false
        };
        return {expr, curr_idx};
    }
    if (match([tokenType.TRUE], curr_idx)) {
        curr_idx++;
        let expr = {
            name: "literal",
            value: true
        };
        return {expr, curr_idx};
    }
    if (match([tokenType.NIL], curr_idx)) {
        curr_idx++;
        let expr = {
            name: "literal",
            value: null
        };
        return {expr, curr_idx};
    }

    if (match([tokenType.NUMBER, tokenType.STRING], curr_idx)) {
        curr_idx++;
        let expr = {
            name: "literal",
            value: previous(curr_idx).value,
        };
        return {expr, curr_idx};
    }

    if (match([tokenType.IDENTIFIER], curr_idx)) {
        curr_idx++;
        let expr = {
            name: "variable",
            value: previous(curr_idx).text
        }
        return {expr, curr_idx};
    }

    if (match([tokenType.LEFT_PAREN], curr_idx)) {
        curr_idx++;
        let {expr, curr_idx: next_idx} = expression(curr_idx);
        curr_idx = next_idx;
        try {
            curr_idx = consume(tokenType.RIGHT_PAREN, "Expect ')' after expression.", curr_idx);
            expr = {name: "grouping", expression: expr};
            return {expr, curr_idx};
        } catch (e) {
            if (e instanceof ParseError) {
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