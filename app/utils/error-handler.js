export class ParseError extends Error {
    constructor(token, message) {
        super(message);
        this.token = token;
        this.name = "ParseError";
    }
}

export class TokenizationError extends Error {
    constructor(line, message) {
        super(message);
        this.line = line;
        this.name = "TokenizationError";
    }
}

// change this to run time error?
export class EvaluationError extends Error {
    constructor(line, message) {
        super(message);
        this.line = line;
        this.name = "EvaluationError";
    }
}

export class Return extends Error {
    constructor(value) {
        super();
        this.value = value;
    }
}