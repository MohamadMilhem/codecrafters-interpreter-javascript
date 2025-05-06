import fs from "fs";
import {tokenizeCommand} from "./commands/tokenize-command.js";
import {parseCommand} from "./commands/parse-command.js";
import {evaluateCommand} from "./commands/evaluate-command.js";
import {error, plainError, printTokens} from "./utils/logger.js";
import {astPrint} from "./utils/ast-printer.js";
import {ParseError, TokenizationError} from "./utils/error-handler.js";
import {commands} from "./constants/commands.js";
import {EXIT_CODE} from "./constants/exit-code.js";


function main() {
  const args = process.argv.slice(2);
  //let args = ["evaluate", "C:\\Repos\\LoxInterpreter\\codecrafters-interpreter-javascript\\test.lox"];

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

  if (tokenizeResult.hasErrors) {
    process.exit(EXIT_CODE.SYNTAX_ERROR);
  }

  // For tokenize command, we're done
  if (command === commands.TOKENIZE) {
    printTokens(tokenizeResult.tokens);
    process.exit(EXIT_CODE.SUCCESS);
  }

  // Parse the tokens if needed
  const parseResult = runParser(tokenizeResult.tokens);

  if (parseResult.hasErrors) {
    process.exit(EXIT_CODE.SYNTAX_ERROR);
  }

  // For parse command, we're done
  if (command === commands.PARSE) {
    astPrint(parseResult.expr);
    process.exit(EXIT_CODE.SUCCESS);
  }

  // Evaluate the expression
  if (command === commands.EVALUATE) {
    const evaluateResult = evaluateCommand(parseResult.expr);
    console.log(evaluateResult === null ? "nil" : evaluateResult);
    process.exit(EXIT_CODE.SUCCESS);
  }

  // Unknown command
  console.error(`Usage: Unknown command: ${command}`);
  process.exit(EXIT_CODE.USAGE_ERROR);
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