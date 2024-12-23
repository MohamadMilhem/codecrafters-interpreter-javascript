import { tokenizeCommand } from "./tokenize-command.js";
import { tokenType } from "../constants/token-type.js";
import {error} from "../utils/logger.js";

export let errorsCount = 0;
let tokens = [];

export function parseCommand(fileContent) {
    tokens = tokenizeCommand(fileContent);
    const result = expression(0);
    return result.expr;
}

function expression(curr_idx) {
    return equality(curr_idx);
}


function equality(curr_idx) {
    let { expr, curr_idx: newIdx } = comparison(curr_idx);
    curr_idx = newIdx;

    while (match([tokenType.BANG_EQUAL, tokenType.EQUAL_EQUAL], curr_idx)) {
        curr_idx++;
        const operator = previous(curr_idx);
        const { expr: right, curr_idx: next_idx } = comparison(curr_idx);
        curr_idx = next_idx;
        expr = {
            name: "binary",
            operator: operator,
            leftExpression: expr,
            rightExpression: right,
        };
    }

    return { expr, curr_idx };
}

function comparison(curr_idx) {
    let { expr, curr_idx: new_idx } = term(curr_idx);
    curr_idx = new_idx;

    while (match([tokenType.GREATER, tokenType.GREATER_EQUAL, tokenType.LESS, tokenType.LESS_EQUAL,], curr_idx)) {
        curr_idx++;
        const operator = previous(curr_idx);
        const { expr: right, curr_idx: next_idx } = term(curr_idx);
        curr_idx = next_idx;
        expr = {
            name: "binary",
            operator: operator,
            leftExpression: expr,
            rightExpression: right,
        };
    }

    return { expr, curr_idx };
}


function term(curr_idx) {
    let {expr, curr_idx: new_idx} = factor(curr_idx);
    curr_idx = new_idx;

    while(match([tokenType.MINUS, tokenType.PLUS], curr_idx)) {
        curr_idx++;
        const operator = previous(curr_idx);
        let {expr: right, curr_idx: new_idx} = factor(curr_idx);
        curr_idx = new_idx;
        expr = {
            name: "binary",
            operator: operator,
            leftExpression: expr,
            rightExpression: right,
        };
    }

    return {expr, curr_idx};
}

function factor(curr_idx) {
    let {expr, curr_idx: new_idx} = unary(curr_idx);
    curr_idx = new_idx;

    while(match([tokenType.SLASH, tokenType.STAR], curr_idx)) {
        curr_idx++;
        const operator = previous(curr_idx);
        let {expr: right, curr_idx: new_idx} = unary(curr_idx);
        curr_idx = new_idx;
        expr = {
            name: "binary",
            operator: operator,
            leftExpression: expr,
            rightExpression: right,
        }
    }

    return {expr, curr_idx};
}

function unary(curr_idx) {
    if (match([tokenType.BANG, tokenType.MINUS], curr_idx)) {
        curr_idx++;
        const operator = previous(curr_idx);
        let {expr: right, curr_idx: new_idx} = unary(curr_idx);
        curr_idx = new_idx;
        let expr = {
            name: "unary",
            operator: operator,
            expression: right,
        }
        return {expr, curr_idx};
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
        curr_idx = consume(tokenType.RIGHT_PAREN, "Expect ')' after expression.", curr_idx);
        expr = {
            name: "grouping",
            expression: expr
        };
        return {expr, curr_idx};
    }
}

function consume(type, message, curr_idx) {
    if (check(type, curr_idx)) {
        curr_idx++;
        return curr_idx;
    }
    throw error("1", "1", "1");
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
