import {EvaluationError} from './error-handler.js';

class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.bindings = new Map();
    }

    define(name, value) {
        this.bindings.set(name, value);
    }

    assign(name, value) {
        if (this.bindings.has(name)) {
            this.bindings.set(name, value);
            return;
        }

        if (this.parent) {
            this.parent.assign(name, value);
            return;
        }

        throw new EvaluationError("", "Undefined variable '" + name + "'.");
    }

    get(name) {
        if (this.bindings.has(name)) {
            return this.bindings.get(name);
        }

        if (this.parent) {
            return this.parent.get(name);
        }

        throw new EvaluationError("", "Undefined variable '" + name + "'.");
    }

    has(name) {
        return this.bindings.has(name) || (this.parent && this.parent.has(name));
    }
}

// Global environment
export const globals = new Environment();

// Current environment being used for evaluation
let currentEnv = globals;

// Stack to keep track of current environment for nested scopes
const envStack = [globals];

export function createInnerEnv() {
    const newEnv = new Environment(currentEnv);
    envStack.push(newEnv);
    currentEnv = newEnv;
    return newEnv;
}

export function destroyInnerEnv() {
    if (envStack.length <= 1) {
        throw new Error("Cannot destroy global environment");
    }
    envStack.pop();
    currentEnv = envStack[envStack.length - 1];
}

export function getCurrentEnv() {
    return currentEnv;
}

export function withEnvironment(env, callback) {
    const oldEnv = currentEnv;
    const oldStack = [...envStack];

    currentEnv = env;
    envStack.length = 0;

    // Rebuild stack from root to current env
    const path = [];
    let curr = env;
    while (curr) {
        path.unshift(curr);
        curr = curr.parent;
    }
    envStack.push(...path);

    try {
        return callback();
    } finally {
        currentEnv = oldEnv;
        envStack.length = 0;
        envStack.push(...oldStack);
    }
}

// Convenience functions that operate on current environment
export function define(varName, varValue) {
    currentEnv.define(varName, varValue);
}

export function assign(varName, varValue) {
    currentEnv.assign(varName, varValue);
}

export function get(variableName) {
    return currentEnv.get(variableName);
}

export function has(variableName) {
    return currentEnv.has(variableName);
}

// For function closures - capture the current environment
export function captureEnvironment() {
    return currentEnv;
}

// Create a new environment with a specific parent (for closures)
export function createEnvironmentWithParent(parent) {
    return new Environment(parent);
}