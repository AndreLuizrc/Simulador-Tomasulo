/**
 * Lexer for MIPS Assembly
 * Tokenizes source code into tokens for parsing
 */

export enum TokenType {
  OPCODE = "OPCODE",
  REGISTER = "REGISTER",
  IMMEDIATE = "IMMEDIATE",
  LABEL = "LABEL",
  LABEL_REF = "LABEL_REF",
  COMMA = "COMMA",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  NEWLINE = "NEWLINE",
  COMMENT = "COMMENT",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const OPCODES = new Set([
  "ADD",
  "SUB",
  "MUL",
  "DIV",
  "LOAD",
  "STORE",
  "BEQ",
  "BNE",
  "NOP",
]);

/**
 * Tokenize MIPS assembly source code
 * @param source - Assembly source code
 * @returns Array of tokens
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const lines = source.split("\n");

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let column = 0;

    while (column < line.length) {
      const char = line[column];

      // Skip whitespace (except newlines)
      if (char === " " || char === "\t") {
        column++;
        continue;
      }

      // Comments (;  or #)
      if (char === ";" || char === "#") {
        // Skip rest of line
        break;
      }

      // Comma
      if (char === ",") {
        tokens.push({
          type: TokenType.COMMA,
          value: ",",
          line: lineNum + 1,
          column: column + 1,
        });
        column++;
        continue;
      }

      // Left parenthesis
      if (char === "(") {
        tokens.push({
          type: TokenType.LPAREN,
          value: "(",
          line: lineNum + 1,
          column: column + 1,
        });
        column++;
        continue;
      }

      // Right parenthesis
      if (char === ")") {
        tokens.push({
          type: TokenType.RPAREN,
          value: ")",
          line: lineNum + 1,
          column: column + 1,
        });
        column++;
        continue;
      }

      // Numbers (immediate values)
      if (char === "-" || (char >= "0" && char <= "9")) {
        const start = column;
        if (char === "-") {
          column++;
        }
        while (column < line.length && line[column] >= "0" && line[column] <= "9") {
          column++;
        }
        const value = line.substring(start, column);
        tokens.push({
          type: TokenType.IMMEDIATE,
          value,
          line: lineNum + 1,
          column: start + 1,
        });
        continue;
      }

      // Identifiers (opcodes, registers, labels)
      if (
        (char >= "A" && char <= "Z") ||
        (char >= "a" && char <= "z") ||
        char === "_"
      ) {
        const start = column;
        while (
          column < line.length &&
          ((line[column] >= "A" && line[column] <= "Z") ||
            (line[column] >= "a" && line[column] <= "z") ||
            (line[column] >= "0" && line[column] <= "9") ||
            line[column] === "_")
        ) {
          column++;
        }

        const value = line.substring(start, column).toUpperCase();

        // Check if followed by colon (label definition)
        if (column < line.length && line[column] === ":") {
          tokens.push({
            type: TokenType.LABEL,
            value: value,
            line: lineNum + 1,
            column: start + 1,
          });
          column++; // Skip the colon
          continue;
        }

        // Check if it's an opcode
        if (OPCODES.has(value)) {
          tokens.push({
            type: TokenType.OPCODE,
            value,
            line: lineNum + 1,
            column: start + 1,
          });
          continue;
        }

        // Check if it's a register (R0-R31)
        if (value.startsWith("R") && value.length > 1) {
          const regNum = value.substring(1);
          if (/^\d+$/.test(regNum) && parseInt(regNum) >= 0 && parseInt(regNum) <= 31) {
            tokens.push({
              type: TokenType.REGISTER,
              value,
              line: lineNum + 1,
              column: start + 1,
            });
            continue;
          }
        }

        // Otherwise, it's a label reference
        tokens.push({
          type: TokenType.LABEL_REF,
          value,
          line: lineNum + 1,
          column: start + 1,
        });
        continue;
      }

      // Unknown character - skip it
      column++;
    }

    // Add newline token at end of each line (except last empty line)
    if (lineNum < lines.length - 1 || line.trim().length > 0) {
      tokens.push({
        type: TokenType.NEWLINE,
        value: "\\n",
        line: lineNum + 1,
        column: line.length + 1,
      });
    }
  }

  // Add EOF token
  tokens.push({
    type: TokenType.EOF,
    value: "",
    line: lines.length,
    column: 0,
  });

  return tokens;
}
