import {EvaluationError} from './error-handler.js';

export const variable_values = new Map();


export function define(var_name, var_value){
    variable_values.set(var_name, var_value);
}

export function get(variable_name){
    if (variable_values.has(variable_name)){
        return variable_values.get(variable_name);
    }
    throw new EvaluationError("", "Undefined variable '" + variable_name  + "'.");
}