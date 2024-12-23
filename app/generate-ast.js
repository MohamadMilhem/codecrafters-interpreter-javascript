import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration: Define the DTOs to be generated
const expressions = [
    {
        name: "Binary",
        properties: [
            { name: "leftExpression", type: "expression" },
            { name: "operator", type: "token" },
            { name: "rightExpression", type: "expression" },
        ],
    },
    {
        name: "Grouping",
        properties: [
            { name: "expression", type: "expression" },
        ]
    },
    {
        name: "Literal",
        properties: [
            { name: "value", type: "object" },
        ]
    },
    {
        name: "Unary",
        properties: [
            { name: "operator", type: "token" },
            { name: "rightExpression", type: "expression" },
        ]
    }
    // Add more DTOs as needed
];

// Path to the models directory
const modelsDir = path.join(__dirname, 'models');

// Ensure the models directory exists
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

// Helper function to generate class content
function generateClassContent(dto) {
    const { name, properties } = dto;
    const classProperties = properties.map(p => `    \tthis.${p.name} = ${p.name};`).join('\n');
    const constructorParams = properties.map(p => p.name).join(', ');
    const jsDocParams = properties.map(p => ` * @param {${p.type}} ${p.name}`).join('\n');

    return `/**
 * Auto-generated class ${name}Expression
${jsDocParams}
 */
class ${name}Expression {
    constructor(${constructorParams}) {
${classProperties ? `\n${classProperties}\n` : ''}
    }
}

module.exports = ${name}Expression;
`;
}

// Generate each DTO file
expressions.forEach(exp => {
    const filePath = path.join(modelsDir, `${exp.name.toLowerCase()}-expression.js`);
    const content = generateClassContent(exp);

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Generated: ${filePath}`);
});

console.log("DTO generation completed!");
