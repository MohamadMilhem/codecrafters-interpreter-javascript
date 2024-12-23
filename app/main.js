import fs from "fs";
import { tokenizeCommand, errorsCount } from "./commands/tokenize-command.js"
import {tokenType} from "./constants/token-type.js";
import {printNumbers, printTokens} from "./utils/logger.js";
import {astPrint} from "./utils/ast-printer.js";
import {parseCommand} from "./commands/parse-command.js";

const args = process.argv.slice(2); // Skip the first two arguments (node path and script path)

if (args.length < 2) {
  console.error("Usage: ./your_program.sh tokenize|parse <filename>");
  process.exit(1);
}

const command = args[0];
const filename = args[1];
const fileContent = fs.readFileSync(filename, "utf8");

if (command === "tokenize") {
  const tokens = tokenizeCommand(fileContent);
  printTokens(tokens);
  if (errorsCount > 0) {
    process.exit(65);
  }
  process.exit(0);
}

if (command === "parse"){
  let exp = parseCommand(fileContent);
  astPrint(exp);
  if (errorsCount > 0) {
    process.exit(65);
  }
  process.exit(0);
}



console.error(`Usage: Unknown command: ${command}`);
process.exit(1);