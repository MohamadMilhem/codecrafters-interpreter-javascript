import {parseCommand} from "./parse-command.js";
import {error} from "../utils/logger.js";
import {EvaluationError} from "../utils/error-handler.js";
import {tokenType} from "../constants/token-type.js";

export function evaluateCommand(fileContent) {
    try {
        let parseResult = parseCommand(fileContent);

        if (parseResult.hasErrors){
            // Errors were reported by the parser.
            process.exit(65);
        }

        return evaluate(parseResult.expr);
    } catch (e) {
        if (e instanceof EvaluationError){
            error(e.line, e.message, "Evaluation error");
        }
        process.exit(65);
    }
}


function evaluate(expr) {
    switch (expr.name) {
        case "literal":
            return evaluatingLiterals(expr);
        case "unary":
            return evaluatingUnaryExpr(expr);
        case "grouping":
            return evaluatingGrouping(expr);
        case "binary":
            return evaluatingBinaryExpr(expr);
        default:
            return null;
    }


}

function evaluatingLiterals(literalExpr) {
    return literalExpr.value;
}

function evaluatingUnaryExpr(unaryExpr) {
    let right = evaluate(unaryExpr.expression);

    switch (unaryExpr.operator.type) {
        case tokenType.BANG:
            return !isTruthy(right);
        case tokenType.MINUS:
            return -right;
    }
    // unreachable (maybe return the same right).
    return right;
}

function isTruthy(expression) {
    if (expression === null)
        return false;
    if (typeof expression === "boolean")
        return expression;
    return true;
}

function evaluatingGrouping(groupingExpr) {
    return evaluate(groupingExpr.expression);
}

function evaluatingBinaryExpr(binaryExpr) {
    let right = evaluate(binaryExpr.rightExpression);
    let left = evaluate(binaryExpr.leftExpression);

    switch (binaryExpr.operator.type) {
        case tokenType.BANG_EQUAL:
            return left !== right;
        case tokenType.GREATER:
            return left > right;
        case tokenType.EQUAL_EQUAL:
            return left === right;
        case tokenType.GREATER_EQUAL:
            return left >= right;
        case tokenType.LESS_EQUAL:
            return left <= right;
        case tokenType.LESS:
            return left < right;
        case tokenType.MINUS:
            return left - right;
        case tokenType.PLUS:
            return left + right;
        case tokenType.SLASH:
            return left / right;
        case tokenType.STAR:
            return left * right;
    }

    return null;
}
