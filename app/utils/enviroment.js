import {EvaluationError} from './error-handler.js';


export const nested_envs = [new Map()];


export function createInnerEnv(){
    nested_envs.push(new Map());
}

export function destroyInnerEnv() {
    nested_envs.pop();
}

export function define(var_name, var_value){
    nested_envs[nested_envs.length - 1].set(var_name, var_value);
}

export function assign(var_name, var_value){
    for (let i = nested_envs.length - 1; i >= 0; i--) {
        if (nested_envs[i].has(var_name)) {
            nested_envs[i].set(var_name, var_value);
            return;
        }
    }
    throw new EvaluationError("", "Undefined variable '" + var_name  + "'.");
}

export function get(variable_name){
    for (let i = nested_envs.length - 1; i >= 0; i--) {
        if (nested_envs[i].has(variable_name)) {
            return nested_envs[i].get(variable_name);
        }
    }
    throw new EvaluationError("", "Undefined variable '" + variable_name  + "'.");
}