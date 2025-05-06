import {parseCommand} from "./parse-command.js";
import {error, plainError} from "../utils/logger.js";
import {EvaluationError} from "../utils/error-handler.js";
import {tokenType} from "../constants/token-type.js";
import {EXIT_CODE} from "../constants/exit-code.js";
import {define, get} from "../utils/enviroment.js";

export function evaluateCommand(expr) {
    try {
        let result = evaluate(expr);
        return (result !== null ? result : "nil");
    } catch (e) {
        if (e instanceof EvaluationError) {
            error(e.line, e.message, "Evaluation error");
        }
        process.exit(EXIT_CODE.RUNTIME_ERROR);
    }
}

export function evaluate(expr) {
    switch (expr.name) {
        case "literal":
            return evaluatingLiterals(expr);
        case "unary":
            return evaluatingUnaryExpr(expr);
        case "grouping":
            return evaluatingGrouping(expr);
        case "binary":
            return evaluatingBinaryExpr(expr);
        case "variable":
            return evaluateVariable(expr);
        default:
            return null;
    }


}

function evaluateVariable(expr) {
    return get(expr.value);
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
            if (isNumber(right)) return -right; else {
                plainError("Operand must be a number.");
                process.exit(EXIT_CODE.RUNTIME_ERROR);
            }
    }
    // unreachable (maybe return the same right).
    return right;
}

function evaluatingGrouping(groupingExpr) {
    return evaluate(groupingExpr.expression);
}

function evaluatingBinaryExpr(binaryExpr) {
    let right = evaluate(binaryExpr.rightExpression);
    let left = evaluate(binaryExpr.leftExpression);
    try {
        switch (binaryExpr.operator.type) {
            case tokenType.EQUAL_EQUAL:
                return left === right;

            case tokenType.BANG_EQUAL:
                return left !== right;

            case tokenType.GREATER:
                if (checkOperatorAvailabity(binaryExpr.operator, left, right)) return left > right;
                throw new EvaluationError("Both operands must be numbers or strings.");

            case tokenType.GREATER_EQUAL:
                if (checkOperatorAvailabity(binaryExpr.operator, left, right)) return left >= right;
                throw new EvaluationError("Both operands must be numbers or strings.");

            case tokenType.LESS_EQUAL:
                if (checkOperatorAvailabity(binaryExpr.operator, left, right)) return left <= right;
                throw new EvaluationError("Both operands must be numbers or strings.");

            case tokenType.LESS:
                if (checkOperatorAvailabity(binaryExpr.operator, left, right)) return left < right;
                throw new EvaluationError("Both operands must be numbers or strings.");

            case tokenType.PLUS:
                if (checkOperatorAvailabity(binaryExpr.operator, left, right)) return left + right;
                throw new EvaluationError("Both operands must be numbers or strings.");

            case tokenType.MINUS:
                if (checkOperatorAvailabity(binaryExpr.operator, left, right)) return left - right;
                throw new EvaluationError("Both operands must be numbers.");

            case tokenType.SLASH:
                if (checkOperatorAvailabity(binaryExpr.operator, left, right)) return left / right;
                throw new EvaluationError("Both operands must be numbers.");

            case tokenType.STAR:
                if (checkOperatorAvailabity(binaryExpr.operator, left, right)) return left * right;
                throw new EvaluationError("Both operands must be numbers.");
        }
    } catch (e) {
        plainError(e.line);
        process.exit(EXIT_CODE.RUNTIME_ERROR);
    }
    return null;
}


function checkOperatorAvailabity(operator, left, right) {
    switch (operator.type) {
        case tokenType.BANG_EQUAL:
            return true;
        case tokenType.GREATER:
            return (isNumber(left) && isNumber(right) || isString(left) && isString(right));

        case tokenType.EQUAL_EQUAL:
            return true;

        case tokenType.GREATER_EQUAL:
            return (isNumber(left) && isNumber(right) || isString(left) && isString(right));

        case tokenType.LESS_EQUAL:
            return (isNumber(left) && isNumber(right) || isString(left) && isString(right));

        case tokenType.LESS:
            return (isNumber(left) && isNumber(right) || isString(left) && isString(right));

        case tokenType.MINUS:
            return (isNumber(left) && isNumber(right));

        case tokenType.PLUS:
            return (isNumber(left) && isNumber(right) || isString(left) && isString(right));

        case tokenType.SLASH:
            return (isNumber(left) && isNumber(right));

        case tokenType.STAR:
            return (isNumber(left) && isNumber(right));
    }
}


function isTruthy(expression) {
    if (expression === null) return false;
    if (typeof expression === "boolean") return expression;
    return true;
}

function isNumber(expression) {
    return typeof expression == "number";
}

function isString(expression) {
    return typeof expression == "string";
}