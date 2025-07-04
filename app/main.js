import fs from "fs";
import {tokenizeCommand} from "./commands/tokenize-command.js";
import {parseCommand} from "./commands/parse-command.js";
import {evaluate, evaluateCommand, isTruthy} from "./commands/evaluate-command.js";
import {error, plainError, printTokens} from "./utils/logger.js";
import {astPrint} from "./utils/ast-printer.js";
import {EvaluationError, ParseError, Return, TokenizationError} from "./utils/error-handler.js";
import {commands} from "./constants/commands.js";
import {EXIT_CODE} from "./constants/exit-code.js";
import {statementsTypes} from "./constants/statements-types.js";
import {
  createEnvironmentWithParent,
  createInnerEnv,
  define,
  destroyInnerEnv, getCurrentEnv,
  globals,
  withEnvironment
} from "./utils/enviroment.js";


function main() {
  const args = process.argv.slice(2);
  //let args = ["run", "C:\\Repos\\LoxInterpreter\\codecrafters-interpreter-javascript\\test.lox"];

  if (args.length < 2) {
    console.error("Usage: ./your_program.sh tokenize|parse|evaluate <filename>");
    process.exit(EXIT_CODE.USAGE_ERROR);
  }

  const command = args[0];
  const filename = args[1];

  try {
    const fileContent = fs.readFileSync(filename, "utf8");
    executeCommand(command, fileContent);
  } catch (err) {
    plainError(`Error reading file: ${err.message}`);
    process.exit(EXIT_CODE.USAGE_ERROR);
  }
}

/**
 * Execute the requested command on the given content
 * @param {string} command - The command to execute (tokenize, parse, evaluate)
 * @param {string} fileContent - The content to process
 */
function executeCommand(command, fileContent) {
  // Always tokenize first regardless of command
  const { tokens, errors: tokenizeErrors } = runTokenizer(fileContent);

  // For tokenize command, we're done
  if (command === commands.TOKENIZE) {
    printTokens(tokens);
  }

  if (tokenizeErrors.length > 0) {
    tokenizeErrors.forEach(err => error(err.line, err.type, err.text));
    process.exit(EXIT_CODE.SYNTAX_ERROR);
  }

  if (command === commands.TOKENIZE){
    process.exit(EXIT_CODE.SUCCESS);
  }


  // Parse the tokens if needed
  const parseResult = runParser(tokens);

  // For parse command, we're done
  if (command === commands.PARSE) {
    for (let statement of parseResult.statements) {
      astPrint(statement.exprValue);
    }
    process.exit(EXIT_CODE.SUCCESS);
  }

  if (command === commands.EVALUATE){
    let evaluateResult = evaluateCommand(parseResult.statements.at(0).exprValue);
    console.log(evaluateResult);
    process.exit(EXIT_CODE.SUCCESS);
  }

  // run program
  if (command === commands.RUN) {
    interpret(parseResult.statements);
    process.exit(EXIT_CODE.SUCCESS);
  }

  // Unknown command
  console.error(`Usage: Unknown command: ${command}`);
  process.exit(EXIT_CODE.USAGE_ERROR);
}

function interpret(statements) {
  try {
    for (let statement of statements) {
      executeStatement(statement);
    }
  } catch (e) {
    if (e instanceof EvaluationError)
      error(e.line, e.name, e.message);
    process.exit(EXIT_CODE.RUNTIME_ERROR);
  }
}


function executeStatement(statement){
  if (statement.statementType === statementsTypes.STATEMENT_PRINT){
    let value = evaluateCommand(statement.exprValue);
    console.log(value.toString());
    return null;
  }
  else if (statement.statementType === statementsTypes.STATEMENT_EXPR){
    evaluateCommand(statement.exprValue);
    return null;
  }
  else if (statement.statementType === statementsTypes.STATEMENT_VAR_DEC){
    let value = null;
    if (statement.exprValue !== null){
      value = evaluateCommand(statement.exprValue);
    }

    define(statement.nameToken.text, value);
    return null;
  }
  else if (statement.statementType === statementsTypes.STATEMENT_BLOCK){
    let statements = statement.statements;
    createInnerEnv();
    for (let statement of statements) {
      executeStatement(statement);
    }
    destroyInnerEnv();
    return null;
  }
  else if (statement.statementType === statementsTypes.STATEMENT_IF){
    if (isTruthy(evaluate(statement.condition_expr.expr))){
      executeStatement(statement.thenBranch.statement);
    } else if (statement.elseBranch !== null){
      executeStatement(statement.elseBranch.statement);
    }
    return null;
  }
  else if (statement.statementType === statementsTypes.STATEMENT_WHILE){
    while(isTruthy(evaluate(statement.condition_expr.expr))){
      executeStatement(statement.body.statement);
    }
    return null;
  }
  else if (statement.statementType === statementsTypes.STATEMENT_FUNC){
    define(statement.nameToken.text, {
      closure: getCurrentEnv(),
      arity: () => {return statement.parameters.length;},
      toString: () => {return "<fn " + statement.nameToken.text + ">";},
      call(args) {
        const environment = createEnvironmentWithParent(this.closure);
        for (let i = 0 ; i < statement.parameters.length ; i++){
          environment.define(statement.parameters[i].text, args[i]);
        }
        try {
          withEnvironment(environment, () => {
            return executeStatement(statement.body);
          });
        } catch (e){
          if (e instanceof Return){
            return e.value;
          }
        }
        return null;
      }
    });
    return null;
  }
  else if (statement.statementType === statementsTypes.STATEMENT_RETURN){
    let value = null;
    if (statement.exprValue !== null){
      value = evaluateCommand(statement.exprValue);
    }

    throw new Return(value);
  }
}

/**
 * Run the tokenizer on the input content
 * @param {string} fileContent - The content to tokenize
 * @returns {Object} The tokenization result
 */
function runTokenizer(fileContent) {
  try {
    return tokenizeCommand(fileContent);
  } catch (e) {
    if (e instanceof TokenizationError) {
      error(e.line, e.message, "Tokenization Error");
    } else {
      plainError(`Unexpected error during tokenization: ${e.message}`);
    }
    process.exit(EXIT_CODE.SYNTAX_ERROR);
  }
}

/**
 * Run the parser on the provided tokens
 * @param {Array} tokens - The tokens to parse
 * @returns {Object} The parsing result
 */
function runParser(tokens) {
  let parseResult = parseCommand(tokens);

  if (parseResult.errors.length) {
    for (let parseError of parseResult.errors) {
      error(parseError.expression.line, "ParseError", parseError.message);
    }
    process.exit(EXIT_CODE.SYNTAX_ERROR);
  }

  return parseResult;
}

// Start the program
main();