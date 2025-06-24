import {tokenType} from "../constants/token-type.js";
import {ParseError} from "../utils/error-handler.js";
import {error, parseError} from "../utils/logger.js";
import {statementsTypes} from "../constants/statements-types.js";
import {errorType} from "../constants/error-type.js";
import {define} from "../utils/enviroment.js";


export function parseCommand(tokens) {

    // Initial state
    const initialState = {
        tokens: tokens,
        currentIdx : 0,
        errors: [],
    }

    addNativeFunctions();
    const { statements, finalState } = parseAllStatements(initialState);

    return {
        statements: statements,
        errors : finalState.errors,
    };
}

function parseAllStatements(state) {
    const statements = [];
    let currentState = state;

    // Recursive loop
    function loop() {
        if (isAtEnd(currentState)) {
            return; // Base case: end of tokens
        }

        const result = declaration(currentState);
        if (result && result.statement) {
            statements.push(result.statement);
        }
        currentState = result.nextState;
        loop(); // Recursive step
    }

    loop();
    return { statements, finalState: currentState };
}


function declaration(state) {
    let currentState = state;

    let funMatch = match([tokenType.FUN], currentState);
    if (funMatch.success) {
        let consumeFunToken = consume(tokenType.FUN, "Expecting 'fun' token.", currentState);

        if (!consumeFunToken.success)
            return {
                statement: null,
                nextState: consumeFunToken.nextState,
            };

        currentState = consumeFunToken.nextState;
        let tryFunctionDeclaration = functionDeclaration("function", currentState);

        if (tryFunctionDeclaration.nextState.errors.length > 0) {
            return {
                statement: null,
                nextState: {...synchronize(tryFunctionDeclaration.nextState).nextState},
            };
        }
        return tryFunctionDeclaration;
    }

    let varDeclarationMatch = match([tokenType.VAR], currentState);
    if (varDeclarationMatch.success) {
        let consumeVarToken = consume(tokenType.VAR, "Expecting 'var' token.", currentState);

        if (!consumeVarToken.success)
            return {
                statement: null,
                nextState: consumeVarToken.nextState,
            };

        currentState = consumeVarToken.nextState;
        let tryVariableDeclaration = varDeclaration(currentState);

        if (tryVariableDeclaration.nextState.errors.length > 0) {
            return synchronize(currentState);
        }
        return tryVariableDeclaration;
    }

    return statement(currentState);
}

function functionDeclaration(kind ,state) {
    let currentState = state;
    let consumeIdentifier = consume(tokenType.IDENTIFIER, "Expect " + kind + " name.", currentState);
    if (!consumeIdentifier.success){
        return {
            statement: null,
            nextState: consumeIdentifier.nextState,
        };
    }
    currentState = consumeIdentifier.nextState;

    let nameToken = previous(currentState);
    let consumeLeftParen = consume(tokenType.LEFT_PAREN, "Expect '(' after " + kind + " name.", currentState);
    if (!consumeLeftParen.success){
        return {
            statement: null,
            nextState: consumeLeftParen.nextState
        };
    }
    currentState = consumeLeftParen.nextState;

    let parameters = [];

    if (!check(tokenType.RIGHT_PAREN, currentState)){
        do {
            if (parameters.length >= 255){
                let curr_token = peek(currentState);
                error(curr_token.line, "ParseError", "Can't have more than 255 parameters.");
            }

            let consumeIdentifier = consume(tokenType.IDENTIFIER, "Expect parameter name.", currentState);
            if (!consumeIdentifier.success){
                return {
                    statement: null,
                    nextState: consumeIdentifier.nextState,
                };
            }
            currentState = consumeIdentifier.nextState;

            parameters.push(previous(currentState));
            if (!match([tokenType.COMMA], currentState).success){
                break;
            }
            currentState = consume(tokenType.COMMA, "", currentState).nextState;
        } while(true);
    }

    let consumeRightParen = consume(tokenType.RIGHT_PAREN, "Expect ')' after parameters.", currentState);
    if (!consumeRightParen.success){
        return {
            statement: null,
            nextState: consumeRightParen.nextState,
        };
    }
    currentState = consumeRightParen.nextState;

    let consumeLeftBrace = consume(tokenType.LEFT_BRACE, "Expect '{' before " + kind + " body." ,currentState);
    if (!consumeLeftBrace.success){
        return {
            statement: null,
            nextState: consumeLeftBrace.nextState,
        };
    }
    currentState = consumeLeftBrace.nextState;

    let body = blockStatement(currentState);
    currentState = body.nextState;
    return {
        statement: {
            statementType: statementsTypes.STATEMENT_FUNC,
            nameToken: nameToken,
            parameters: parameters,
            body: body.statement,
        },
        nextState : currentState,
    }
}


function varDeclaration(state) {
    let currentState = state;
    let identifierMatch = match([tokenType.IDENTIFIER], currentState);
    if (!identifierMatch.success) {
        currentState = {...currentState, errors: [...currentState.errors, new ParseError(peek(currentState), "Expected IDENTIFIER to be identifiable.")]}
        return {statement: null, currentState};
    }

    let name = currentState.tokens[currentState.currentIdx];
    currentState = consume(tokenType.IDENTIFIER, "" ,currentState).nextState;

    let initializer = null;
    let equalMatch = match([tokenType.EQUAL], currentState);
    if (equalMatch.success) {
        currentState = consume(tokenType.EQUAL, "" , currentState).nextState;
        initializer = expression(currentState);
        currentState = initializer.nextState;
    }

    let consumeSemicolon = consume(tokenType.SEMICOLON, "Expect ';' after variable declaration.", currentState);
    if (!consumeSemicolon.success){
        return {
            statement: null,
            nextState: consumeSemicolon.nextState,
        };
    }
    currentState = consumeSemicolon.nextState;

    return {
        statement : {
            statementType : statementsTypes.STATEMENT_VAR_DEC,
            exprValue : initializer?.expr ?? null,
            nameToken : name,
        },
        nextState : currentState
    }
}


function statement(state) {
    let currentState = state;

    let printMatch = match([tokenType.PRINT], currentState);
    if (printMatch.success) {
        currentState = consume(tokenType.PRINT, "Expected Print statement.", currentState).nextState;
        return printStatement(currentState);
    }

    let  returnMatch = match([tokenType.RETURN], currentState);
    if (returnMatch.success){
        currentState = consume(tokenType.RETURN, "Expected Return statement.", currentState).nextState;
        return returnStatement(currentState);
    }

    let leftBMatch = match([tokenType.LEFT_BRACE], currentState);
    if (leftBMatch.success){
        currentState = consume(tokenType.LEFT_BRACE, "Expected beginning of a block.", currentState).nextState;
        return blockStatement(currentState);
    }

    let ifMatch = match([tokenType.IF], currentState);
    if (ifMatch.success) {
        currentState = consume(tokenType.IF, "Expected if statement.", currentState).nextState;
        return ifStatement(currentState);
    }

    let whileMatch = match([tokenType.WHILE], currentState);
    if (whileMatch.success){
        currentState = consume(tokenType.WHILE, "Expected while statement.", currentState).nextState;
        return whileStatement(currentState);
    }

    let forMatch = match([tokenType.FOR], currentState);
    if (forMatch.success){
        currentState = consume(tokenType.FOR, "Expect for statement.", currentState).nextState;
        return forStatement(currentState);
    }
    return expressionStatement(currentState);
}

function printStatement(state) {
    let currentState = state;
    const value = expression(currentState);
    currentState = value.nextState;
    if (!isAtEnd(currentState)) {
        let consumeSemicolon = consume(tokenType.SEMICOLON, "Expected ';' after expression.", currentState);
        if (!consumeSemicolon.success){
            return {
                statement: null,
                nextState: consumeSemicolon.nextState,
            };
        }
        currentState = consumeSemicolon.nextState;
    }
    return {
        statement: {
            statementType: statementsTypes.STATEMENT_PRINT,
            exprValue: value.expr,
        },
        nextState: currentState,
    }
}

function returnStatement(state){
    let currentState = state;
    let keyword = previous(currentState);
    let value = null;

    if (!check(tokenType.SEMICOLON, currentState)){
        value = expression(currentState);
        currentState = value.nextState;
    }

    let consumeSemicolon = consume(tokenType.SEMICOLON, "Expect ';' after return value." ,currentState);
    if (!consumeSemicolon.success){
        return {
            statement: null,
            nextState: consumeSemicolon.nextState,
        };
    }
    currentState = consumeSemicolon.nextState;

    return {
        statement: {
            statementType : statementsTypes.STATEMENT_RETURN,
            exprValue : value?.expr ?? null,
        },
        nextState: currentState,
    }
}


function blockStatement(state){
    let currentState = state;
    const statements = [];
    while(!check(tokenType.RIGHT_BRACE, currentState) && !isAtEnd(currentState)) {
        const current_statement = declaration(currentState);
        statements.push(current_statement.statement);
        currentState = current_statement.nextState;
    }

    let consumeRightBrace = consume(tokenType.RIGHT_BRACE, "Expect '}' after block." , currentState);
    if (!consumeRightBrace.success){
        return {
            statement: null,
            nextState: consumeRightBrace.nextState,
        };
    }
    currentState = consumeRightBrace.nextState;

    return {
        statement: {
            statementType: statementsTypes.STATEMENT_BLOCK,
            statements: statements,
        },
        nextState : currentState
    };
}

function ifStatement(state){
    let currentState = state;

    let consumeLeftParen = consume(tokenType.LEFT_PAREN, "Expect '(' after 'if'." , currentState);
    if (!consumeLeftParen.success){
        return {
            statement: null,
            nextState: consumeLeftParen.nextState,
        };
    }
    currentState = consumeLeftParen.nextState;

    const condition_expr = expression(currentState);
    currentState = condition_expr.nextState;

    let consumeRightParen = consume(tokenType.RIGHT_PAREN, "Expect ')' after if condition.",currentState);
    if (!consumeRightParen.success){
        return {
            statement: null,
            nextState: consumeRightParen.nextState,
        };
    }
    currentState = consumeRightParen.nextState;

    const thenBranch = statement(currentState);
    currentState = thenBranch.nextState;
    let elseBranch = null;
    if (match([tokenType.ELSE], currentState).success) {
        currentState = consume(tokenType.ELSE, "Expect else branch.", currentState).nextState;
        elseBranch = statement(currentState);
        currentState = elseBranch.nextState;
    }

    return {
        statement : {
            statementType: statementsTypes.STATEMENT_IF,
            condition_expr : condition_expr,
            thenBranch : thenBranch,
            elseBranch : elseBranch,
        },
        nextState : currentState
    }
}

function whileStatement(state){
    let currentState = state;

    let consumeLeftParen = consume(tokenType.LEFT_PAREN, "Expect '(' after 'if'." , currentState);
    if (!consumeLeftParen.success){
        return {
            statement: null,
            nextState: consumeLeftParen.nextState,
        };
    }
    currentState = consumeLeftParen.nextState;

    const condition_expr = expression(currentState);
    currentState = condition_expr.nextState;

    let consumeRightParen = consume(tokenType.RIGHT_PAREN, "Expect ')' after if condition.",currentState);
    if (!consumeRightParen.success){
        return {
            statement: null,
            nextState: consumeRightParen.nextState,
        };
    }
    currentState = consumeRightParen.nextState;

    const body = statement(currentState);
    currentState = body.nextState;
    return {
        statement : {
            statementType: statementsTypes.STATEMENT_WHILE,
            condition_expr : condition_expr,
            body : body,
        },
        nextState : currentState
    }
}

function expressionStatement(state) {
    let currentState = state;
    const value = expression(currentState);
    currentState = value.nextState;
    if (!isAtEnd(currentState))
        currentState = consume(tokenType.SEMICOLON, "Expected ';' after expression.", currentState).nextState;
    return {
        statement: {
            statementType: statementsTypes.STATEMENT_EXPR,
            exprValue: value.expr
        },
        nextState: currentState,
    }
}

function forStatement(state){
    let currentState = state;

    let consumeLeftParen = consume(tokenType.LEFT_PAREN, "Expect '(' after 'for'." , currentState);
    if (!consumeLeftParen.success){
        return {
            statement: null,
            nextState: consumeLeftParen.nextState,
        };
    }
    currentState = consumeLeftParen.nextState;

    let initializer;
    let semicolonMatch = match([tokenType.SEMICOLON], currentState);
    let varMatch = match([tokenType.VAR], currentState);
    if (semicolonMatch.success) {
        currentState = consume(tokenType.SEMICOLON, "", currentState).nextState;
        initializer = null;
    } else if (varMatch.success) {
        currentState = consume(tokenType.VAR, "", currentState).nextState;
        initializer = varDeclaration(currentState);
        currentState = initializer.nextState;

    } else {
        initializer = expressionStatement(currentState);
        currentState = initializer.nextState;
    }

    let condition_expr = null;
    if (!check(tokenType.SEMICOLON, currentState)) {
        condition_expr = expression(currentState);
        currentState = condition_expr.nextState;
    }

    let consumeSemicolon = consume(tokenType.SEMICOLON, "Expect ';' after loop condition.", currentState);
    if (!consumeSemicolon.success){
        return {
            statement: null,
            nextState: consumeSemicolon.nextState,
        };
    }
    currentState = consumeSemicolon.nextState;

    let increment_expr = null;
    if (!check(tokenType.RIGHT_PAREN, currentState)) {
        increment_expr = expression(currentState);
        currentState = increment_expr.nextState;
    }

    let consumeRightParen = consume(tokenType.RIGHT_PAREN, "Expect ')' after for clauses.", currentState);
    if (!consumeRightParen.success){
        return {
            statement: null,
            nextState: consumeRightParen.nextState
        };
    }
    currentState = consumeRightParen.nextState;

    let body = statement(currentState);
    currentState = body.nextState;

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
            nextState : currentState
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
        nextState : currentState
    };

    if (initializer !== null){
        body = {
            statement: {
                statementType: statementsTypes.STATEMENT_BLOCK,
                statements: [initializer.statement, body.statement],
            },
            nextState: currentState
        }
    }

    return body;
}

function synchronize(state) {
    let currentState = state;
    if (isAtEnd(currentState)) {
        return {nextState: currentState};
    }

    currentState.currentIdx++;

    while (!isAtEnd(currentState)) {
        if (previous(currentState).type === tokenType.SEMICOLON) return {nextState: currentState};

        switch (peek(currentState).type) {
            case tokenType.CLASS:
            case tokenType.FUNCTION:
            case tokenType.VAR:
            case tokenType.FOR:
            case tokenType.IF:
            case tokenType.WHILE:
            case tokenType.PRINT:
            case tokenType.RETURN:
                return {nextState: currentState};
        }

        currentState.currentIdx++;
    }

    return {nextState: currentState};
}

function expression(state) {
    return assignment(state);
}

function assignment(state) {
    let currentState = state;
    const expression = or(currentState);
    currentState = expression.nextState;

    let equalMatch = match([tokenType.EQUAL], currentState);
    if (equalMatch.success) {
        const equals_idx = currentState.currentIdx;
        currentState = consume(tokenType.EQUAL, "", currentState).nextState;

        const value = assignment(currentState);
        currentState = value.nextState;

        if (expression?.expr?.name === 'variable'){
            return {
                expr: {
                    name: "assignment",
                    valueExpr : value.expr,
                    nameExpr : expression.expr,
                },
                nextState : currentState
            };
        }

        error(currentState.tokens[equals_idx].line, errorType.INVALID_ASSIGNMENT_TARGET);
    }
    return expression;
}

function or(state){
    let currentState = state;
    let expression = and(currentState);
    currentState = expression.nextState;

    while(true){
        let orMatch = match([tokenType.OR], currentState);
        if (!orMatch.success)
            break;
        currentState = consume(tokenType.OR, "OR", currentState).nextState;
        const operator = previous(currentState);
        const right = and(currentState);
        currentState = right.nextState;
        expression = {
            expr : {
                    name : "logical",
                    expression : expression.expr,
                    operator : operator,
                    right : right.expr,
            },
            nextState : currentState
        }
    }

    return expression;
}

function and(state){
    let currentState = state;
    let expression = equality(currentState);
    currentState = expression.nextState;

    while(true){
        let andMatch = match([tokenType.AND], currentState);
        if (!andMatch.success)
            break;
        currentState = consume(tokenType.AND, "AND", currentState).nextState;
        const operator = previous(currentState);
        const right = equality(currentState);
        currentState = right.nextState;
        expression = {
            expr : {
                name : "logical",
                expression : expression.expr,
                operator : operator,
                right : right.expr,
            },
            nextState: currentState
        }
    }
    return expression;
}


function equality(state) {
    let currentState = state;
    let leftComparisonExpr = comparison(currentState);
    currentState = leftComparisonExpr.nextState;


    while(true) {
        let bangEqual_equalEqual_match = match([tokenType.BANG_EQUAL, tokenType.EQUAL_EQUAL], currentState);
        if (!bangEqual_equalEqual_match.success)
            break;

        currentState.currentIdx++;
        const operator = previous(currentState);


        let rightComparisonExpr = comparison(currentState);
        currentState = rightComparisonExpr.nextState;
        leftComparisonExpr.expr = {
            name: "binary",
            operator: operator,
            leftExpression: leftComparisonExpr.expr,
            rightExpression: rightComparisonExpr.expr,
        };

        if (currentState.errors.length) {
            if (!isAtEnd(currentState))
                currentState = synchronize(currentState).nextState;
            if (leftComparisonExpr.expr.name !== "error") {
                leftComparisonExpr.expr = {
                    name: "error",
                    value: null,
                    expression: leftComparisonExpr.expr,
                    message: `Missing right operand for '${operator.text}' operator`
                };
            }
            currentState.errors = [...currentState.errors, {name: "error", value: null, expression: leftComparisonExpr.expr, message: `Missing right operand for '${operator.text}' operator`}];
            break;
        }
    }
    let returnExpr = leftComparisonExpr.expr;
    return {expr: returnExpr, nextState: currentState};
}

function comparison(state) {
    let currentState = state;

    let leftTermExpr = term(currentState);
    currentState = leftTermExpr.nextState;

    if (currentState.errors.length) {
        currentState = synchronize(currentState).nextState;
        if (leftTermExpr.expr.name !== "error") {
            leftTermExpr.expr = {
                name: "error",
                value: null,
                expression: leftTermExpr.expr,
                message: `Missing left operand`
            };
        }
        currentState.errors = [...currentState.errors, {name: "error", value: null, expression: leftTermExpr.expr, message: `Missing left operand`}];
        return {expr: leftTermExpr.expr, nextState: currentState};
    }

    while (match([tokenType.GREATER, tokenType.GREATER_EQUAL, tokenType.LESS, tokenType.LESS_EQUAL,], currentState).success) {
        currentState.currentIdx++;
        const operator = previous(currentState);

        let rightTermExpr = term(currentState);
        currentState = rightTermExpr.nextState;
        leftTermExpr.expr = {
            name: "binary",
            operator: operator,
            leftExpression: leftTermExpr.expr,
            rightExpression: rightTermExpr.expr,
        };

        if (currentState.errors.length) {
            currentState = synchronize(currentState).nextState;
            if (leftTermExpr.expr.name !== "error") {
                leftTermExpr.expr = {
                    name: "error",
                    value: null,
                    expression: leftTermExpr.expr,
                    message: `Missing right operand for '${operator.text}' operator`
                };
            }
            currentState.errors = [...currentState.errors, {name: "error", value: null, expression: leftTermExpr.expr, message: `Missing right operand for '${operator.text}' operator`}];
            break;
        }
    }
    let returnExpr = leftTermExpr.expr;
    return {expr: returnExpr, nextState: currentState};
}

function term(state) {
    let currentState = state;

    let leftFactorExpr = factor(currentState);
    currentState = leftFactorExpr.nextState;

    if (currentState.errors.length) {
        currentState = synchronize(currentState).nextState;
        const lastError = currentState.errors[currentState.errors.length - 1];
        if (leftFactorExpr.expr?.name !== "error") {
            leftFactorExpr.expr = {
                name: "error",
                value: null,
                expression: leftFactorExpr.expr,
                message: lastError.message
            };
        }
        return {expr: leftFactorExpr.expr, nextState: currentState};
    }

    while (match([tokenType.MINUS, tokenType.PLUS], currentState).success) {
        currentState.currentIdx++;
        const operator = previous(currentState);


        let rightFactorExpr = factor(currentState);
        currentState = rightFactorExpr.nextState;
        leftFactorExpr.expr = {
            name: "binary",
            operator: operator,
            leftExpression: leftFactorExpr.expr,
            rightExpression: rightFactorExpr.expr,
        };

        if (currentState.errors.length) {
            // Missing right operand - create error node and synchronize
            currentState = synchronize(currentState).nextState;
            if (leftFactorExpr.expr?.name !== "error") {
                leftFactorExpr.expr = {
                    name: "error",
                    value: null,
                    expression: leftFactorExpr.expr,
                    message: `Missing right operand for '${operator.text}' operator`
                };
            }
            currentState.errors = [...currentState.errors, {name: "error", value: null, expression: leftFactorExpr.expr, message: `Missing right operand for '${operator.text}' operator`}];
            break; // Exit the loop since we're in an error state
        }
    }
    return {expr: leftFactorExpr.expr, nextState: currentState};
}

function factor(state) {
    let currentState = state;

    let leftUnaryExpr = unary(currentState);
    currentState = leftUnaryExpr.nextState;

    if (currentState.errors.length) {
        currentState = synchronize(currentState).nextState;
        const lastError = currentState.errors[currentState.errors.length - 1];
        if (leftUnaryExpr.expr?.name !== "error") {
            leftUnaryExpr.expr = {
                name: "error",
                value: null,
                expression: leftUnaryExpr.expr,
                message: lastError.message
            };
        }
        return {expr: leftUnaryExpr.expr, nextState: currentState};
    }

    while (match([tokenType.SLASH, tokenType.STAR], currentState).success) {
        currentState.currentIdx++;
        const operator = previous(currentState);


        let rightUnaryExpr = unary(currentState);
        currentState = rightUnaryExpr.nextState;
        leftUnaryExpr.expr = {
            name: "binary",
            operator: operator,
            leftExpression: leftUnaryExpr.expr,
            rightExpression: rightUnaryExpr.expr,
        };

        if (currentState.errors.length) {
            currentState = synchronize(currentState).nextState;
            if (leftUnaryExpr.expr?.name !== "error") {
                leftUnaryExpr.expr = {
                    name: "error",
                    value: null,
                    expression: leftUnaryExpr.expr,
                    message: `Missing right operand for '${operator.text}' operator`
                };
            }
            currentState.errors = [...currentState.errors, {name: "error", value: null, expression: leftUnaryExpr.expr, message: `Missing right operand for '${operator.text}' operator`}];
            break; // Exit the loop since we're in an error state
        }
    }

    return {expr: leftUnaryExpr.expr, nextState: currentState};
}

function unary(state) {
    let currentState = state;
    if (match([tokenType.BANG, tokenType.MINUS], currentState).success) {
        currentState.currentIdx++;
        const operator = previous(currentState);


        let rightUnaryExpr= unary(currentState);
        currentState = rightUnaryExpr.nextState;

        if (currentState.errors.length) {
            currentState = synchronize(currentState).nextState;
            return {
                expr: {
                    name: "error",
                    value: null,
                    expression: currentState.errors[currentState.errors.length - 1].expression,
                    message: `Missing operand for ${operator.text} operator`
                },
                nextState: currentState
            };
        }

        rightUnaryExpr.expr = {
            name: "unary",
            operator: operator,
            expression: rightUnaryExpr.expr,
        };
        return {expr: rightUnaryExpr.expr, nextState: currentState};
    }
    return call(currentState);
}

function call(state) {
    let currentState = state;
    let expr = primary(currentState);
    currentState = expr.nextState;

    while(true){
        if (match([tokenType.LEFT_PAREN], currentState).success){
            currentState = consume(tokenType.LEFT_PAREN, "", currentState).nextState;
            expr = finishCall(expr.expr ,currentState);
            currentState = expr.nextState;
        } else {
            break;
        }
    }

    return expr;
}

function finishCall(callee, state){
    let currentState = state;
    let callee_arguments = [];
    if (!(check(tokenType.RIGHT_PAREN, currentState))){
        do {
            if (callee_arguments.length >= 255){
                let curr_token = currentState.tokens[currentState.currentIdx];
                error(curr_token.line, "RunTimeError", "Can't have more than 255 arguments.");
            }
            let argument = expression(currentState);
            currentState = argument.nextState;
            callee_arguments.push(argument.expr);
            if (!match([tokenType.COMMA], currentState).success) {
                break;
            }
            currentState = consume(tokenType.COMMA, "", currentState).nextState;
        } while(true);
    }


    currentState = consume(tokenType.RIGHT_PAREN, "Expect ')' after arguments.", currentState).nextState;
    let paren = previous(currentState);

    return {
      expr: {
          name: "call",
          callee: callee,
          paren: paren,
          callee_arguments: callee_arguments
      },
      nextState : currentState
    };
}


function primary(state) {
    let currentState = state;
    if (match([tokenType.FALSE], currentState).success) {
        currentState.currentIdx++;
        let expr = {
            name: "literal",
            value: false
        };
        return {expr, nextState: currentState};
    }
    if (match([tokenType.TRUE], currentState).success) {
        currentState.currentIdx++;
        let expr = {
            name: "literal",
            value: true
        };
        return {expr, nextState: currentState};
    }
    if (match([tokenType.NIL], currentState).success) {
        currentState.currentIdx++;
        let expr = {
            name: "literal",
            value: null
        };
        return {expr, nextState: currentState};
    }

    if (match([tokenType.NUMBER, tokenType.STRING], currentState).success) {
        currentState.currentIdx++;
        let expr = {
            name: "literal",
            value: previous(currentState).value,
        };
        return {expr, nextState: currentState};
    }

    if (match([tokenType.IDENTIFIER], currentState).success) {
        currentState.currentIdx++;
        let expr = {
            name: "variable",
            value: previous(currentState).text
        }
        return {expr, nextState: currentState};
    }

    if (match([tokenType.LEFT_PAREN], currentState).success) {
        currentState.currentIdx++;
        let expr = expression(currentState);
        currentState = expr.nextState;

        currentState = consume(tokenType.RIGHT_PAREN, "Expect ')' after expression.", currentState).nextState;

        if (currentState.errors.length) {
            // synchronize after error.
            currentState = synchronize(currentState).nextState;
            return {
                expr: {
                    name: "error",
                    value: null,
                    expression: expr,
                    message: "Missing closing parenthesis"
                },
                nextState: currentState
            };
        }

        expr = {name: "grouping", expression: expr.expr};
        return {expr: expr, nextState: currentState};
    }

    // didn't match any expression syntax.
    const errorMessage = isAtEnd(currentState)
        ? "Unexpected end of input."
        : `Unexpected token '${peek(currentState).text}'.`;

    const token = isAtEnd(currentState) ? previous(currentState) : peek(currentState);
    currentState.errors = [...currentState.errors, {name: "error", value: null, expression: token, message: `Error at line: ['${token.line}'] at token '${token.text}'`}]

    currentState = synchronize(currentState).nextState;
    return {
        expr: {
            name: "error",
            value: null,
            expression: token,
            message: errorMessage
        },
        nextState: currentState
    };
}

function addNativeFunctions(){
    define("clock", {
        arity: () => { return 0; },
        toString: () => {return "<native fn>";},
        call: (args) => {
            return Math.floor(Date.now() / 1000);
        },
    });
}

function consume(type, message, state) {
    if (check(type, state)) {
        const nextState = { ...state, currentIdx: state.currentIdx + 1 };
        return { success: true, nextState: nextState };
    }

    // Failure case: return an error object.
    const token = peek(state);
    const error = { name: "error", value: null, expression: token, message: message };
    const nextState = { ...state, errors: [...state.errors, error] };
    return { success: false, nextState: nextState, error };
}

function match(types, state) {
    for (let type of types) { //TODO: change loop to recursion.
        if (check(type, state)) {
            return {success: true, nextState: state};
        }
    }
    return {success: false, nextState: state};
}

function check(type, state) {
    if (isAtEnd(state)) return false;
    return peek(state).type === type;
}

function isAtEnd(state) {
    return peek(state)?.type === tokenType.EOF;
}

function previous(state) {
    return state.tokens[state.currentIdx - 1];
}

function peek(state) {
    return state.tokens[state.currentIdx];
}