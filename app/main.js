import fs from "fs";
import { tokenizeCommand } from "./tokenize-command.js"

const args = process.argv.slice(2); // Skip the first two arguments (node path and script path)

if (args.length < 2) {
  console.error("Usage: ./your_program.sh tokenize <filename>");
  process.exit(1);
}

const command = args[0];

if (command !== "tokenize") {
  console.error(`Usage: Unknown command: ${command}`);
  process.exit(1);
}

const filename = args[1];

const fileContent = fs.readFileSync(filename, "utf8");
const tokens = tokenizeCommand(fileContent);

for (let token of tokens) {
  console.log(token.type.toString() + " " + token.text + " " + token.value);
}