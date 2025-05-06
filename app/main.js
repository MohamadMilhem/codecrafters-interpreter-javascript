import fs from "fs";
import {tokenizeCommand} from "./commands/tokenize-command.js";
import {parseCommand} from "./commands/parse-command.js";
import {evaluate, evaluateCommand} from "./commands/evaluate-command.js";
import {error, plainError, printTokens} from "./utils/logger.js";
import {astPrint} from "./utils/ast-printer.js";
import {EvaluationError, ParseError, TokenizationError} from "./utils/error-handler.js";
import {commands} from "./constants/commands.js";
import {EXIT_CODE} from "./constants/exit-code.js";
import {statementsTypes} from "./constants/statements-types.js";
import {define} from "./utils/enviroment.js";


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
  const tokenizeResult = runTokenizer(fileContent);

  // For tokenize command, we're done
  if (command === commands.TOKENIZE) {
    printTokens(tokenizeResult.tokens);
    if (tokenizeResult.hasErrors) {
      process.exit(EXIT_CODE.SYNTAX_ERROR);
    }
    process.exit(EXIT_CODE.SUCCESS);
  }

  // Parse the tokens if needed
  const parseResult = runParser(tokenizeResult.tokens);

  if (parseResult.hasErrors) {
    process.exit(EXIT_CODE.SYNTAX_ERROR);
  }

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
  try {
    return parseCommand(tokens);
  } catch (e) {
    if (e instanceof ParseError) {
      plainError(`Unexpected error during parsing: ${e.message}`);
    } else {
      plainError(`Unexpected error: ${e.message}`);
    }
    process.exit(EXIT_CODE.SYNTAX_ERROR);
  }
}

// Start the program
main();