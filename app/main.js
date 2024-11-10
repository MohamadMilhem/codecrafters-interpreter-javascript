import fs from "fs";

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

if (fileContent.length !== 0) {
  let lines = fileContent.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    for (let j = 0; j < line.length; j++) {
      if (line[j] === ')'){
        console.log("RIGHT_PAREN ) null");
      }
      else if (line[j] === '('){
        console.log("LEFT_PAREN ( null");
      }
      else if (line[j] === '}'){
        console.log("RIGHT_BRACE } null");
      }
      else if (line[j] === '{'){
        console.log("LEFT_BRACE { null");
      }
    }
  }
  console.log("EOF  null");
} else {
  console.log("EOF  null");
}
