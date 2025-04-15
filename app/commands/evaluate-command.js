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
        default:
            return null;
    }


}

function evaluatingLiterals(literalExpr) {
    return literalExpr.value;
}

function evaluatingUnaryExpr(unaryExpr) {
    let right = evaluate(unaryExpr.expression);

    switch (right.operator.type) {
        case tokenType.MINUS:
            return -right;
    }
    // unreachable (maybe return the same right).
    return right;
}

function evaluatingGrouping(groupingExpr) {
    return evaluate(groupingExpr.expression);
}

