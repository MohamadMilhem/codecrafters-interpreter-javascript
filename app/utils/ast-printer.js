const expMap = {
    error: (obj) => `error ${obj.name} : ${obj.value}`,
    binary: (obj) => `(${obj.operator.text} ${expMap[obj.leftExpression.name](obj.leftExpression)} ${expMap[obj.rightExpression.name](obj.rightExpression)})`,
    grouping: (obj) => `(group ${expMap[obj.expression.name](obj.expression)})`,
    literal: (obj) => `${obj.value === null ? "nil" : typeof obj.value === "number" ? `${printAsFloat(obj.value)}` : obj.value }`,
    unary: (obj) => `(${obj.operator.text} ${expMap[obj.expression.name](obj.expression)})`,
}


export function astPrint(expression){
    if (expression.name === "error" && expression.value === null)
        return;
    console.log(expMap[expression.name](expression));
}

function printAsFloat(value){
    return (value % 1 === 0 ? value.toFixed(1) : value);
}