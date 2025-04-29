import fs from "fs";
import {tokenizeCommand, errorsCountTokenize} from "./commands/tokenize-command.js"
import {error, plainError, printTokens} from "./utils/logger.js";
import {astPrint} from "./utils/ast-printer.js";
import {errorsCountParse, parseCommand} from "./commands/parse-command.js";
import {ParseError, TokenizationError} from "./utils/error-handler.js";
import {commands} from "./constants/commands.js";
import {evaluateCommand} from "./commands/evaluate-command.js";

const args = process.argv.slice(2); // Skip the first two arguments (node path and script path)

//let args = ["evaluate", "C:\\Repos\\LoxInterpreter\\codecrafters-interpreter-javascript\\test.lox"];


if (args.length < 2) {
  console.error("Usage: ./your_program.sh tokenize|parse|evaluate <filename>");
  process.exit(1);
}

const command = args[0];
const filename = args[1];
const fileContent = fs.readFileSync(filename, "utf8");

if (command === commands.TOKENIZE) {
  try {
    const tokenizeResult = tokenizeCommand(fileContent);
    printTokens(tokenizeResult.tokens);
    if (tokenizeResult.hasErrors){
      process.exit(65);
    }
    process.exit(0);
  } catch (e){
    if (e instanceof TokenizationError) {
        error(e.line, e.message, "Tokenization error");
    }
    process.exit(65);
  }
}

if (command === commands.PARSE){
  try {
    let parseResult = parseCommand(fileContent);

    if (parseResult.hasErrors) {
      // Errors were already reported by the parser
      process.exit(65);
    }

    astPrint(parseResult.expr);
    process.exit(0);
  } catch (e) {
    // Handle any unexpected errors not caught by the parser
    if (e instanceof TokenizationError) {
      error(e.line, e.message, "Tokenization error");
    }
    if (e instanceof ParseError)
      plainError(`Unexpected error during parsing: ${e.message}`);

    process.exit(65);  // Different exit code for runtime errors
  }
}


if (command === commands.EVALUATE){
  let evaluateResult = evaluateCommand(fileContent);
  console.log(evaluateResult === null ? "nil" : evaluateResult);
  process.exit(0);
}



console.error(`Usage: Unknown command: ${command}`);
process.exit(1);