/**
 * Parser for MIPS Assembly
 * Parses tokens into structured instructions
 */

import { Token, TokenType } from "./lexer";
import { OperationType } from "@/types/simulator";

export interface AssemblerError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export interface Operand {
  type: "register" | "immediate" | "label" | "offset";
  value: string | number;
  register?: string; // For offset addressing: 8(R0)
}

export interface ParsedInstruction {
  line: number;
  opcode: OperationType;
  operands: Operand[];
}

export interface ParseResult {
  instructions: ParsedInstruction[];
  labels: Map<string, number>; // label → instruction index
  errors: AssemblerError[];
}

class Parser {
  private tokens: Token[];
  private current: number = 0;
  private instructions: ParsedInstruction[] = [];
  private labels: Map<string, number> = new Map();
  private errors: AssemblerError[] = [];
  private instructionIndex: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ParseResult {
    while (!this.isAtEnd()) {
      this.parseLine();
    }

    return {
      instructions: this.instructions,
      labels: this.labels,
      errors: this.errors,
    };
  }

  private parseLine(): void {
    // Skip empty lines
    if (this.match(TokenType.NEWLINE)) {
      return;
    }

    // Check for label
    if (this.check(TokenType.LABEL)) {
      const label = this.advance();
      this.labels.set(label.value, this.instructionIndex);
      // Labels can be on same line as instruction
    }

    // Check for instruction
    if (this.check(TokenType.OPCODE)) {
      this.parseInstruction();
    }

    // Consume newline or EOF
    if (!this.isAtEnd()) {
      this.match(TokenType.NEWLINE, TokenType.EOF);
    }
  }

  private parseInstruction(): void {
    const opcodeToken = this.advance();
    const opcode = opcodeToken.value as OperationType;
    const line = opcodeToken.line;

    try {
      let operands: Operand[] = [];

      switch (opcode) {
        case "ADD":
        case "SUB":
        case "MUL":
        case "DIV":
          // Format: OPCODE Rd, Rs1, Rs2
          operands = this.parseArithmeticOperands();
          break;

        case "LOAD":
          // Format: LOAD Rd, immediate or LOAD Rd, offset(Rs)
          operands = this.parseLoadOperands();
          break;

        case "STORE":
          // Format: STORE Rs, immediate or STORE Rs, offset(Rd)
          operands = this.parseStoreOperands();
          break;

        case "BEQ":
        case "BNE":
          // Format: BEQ Rs1, Rs2, label
          operands = this.parseBranchOperands();
          break;

        case "NOP":
          // No operands
          operands = [];
          break;

        default:
          this.addError(`Unknown opcode: ${opcode}`, opcodeToken);
      }

      this.instructions.push({
        line,
        opcode,
        operands,
      });

      this.instructionIndex++;
    } catch (error) {
      // Error already added, skip this instruction
      // Consume rest of line
      while (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
        this.advance();
      }
    }
  }

  private parseArithmeticOperands(): Operand[] {
    // Rd, Rs1, Rs2
    const rd = this.consumeRegister("destination");
    this.consume(TokenType.COMMA, "Expected ',' after destination register");
    const rs1 = this.consumeRegister("source 1");
    this.consume(TokenType.COMMA, "Expected ',' after source register");
    const rs2 = this.consumeRegister("source 2");

    return [
      { type: "register", value: rd },
      { type: "register", value: rs1 },
      { type: "register", value: rs2 },
    ];
  }

  private parseLoadOperands(): Operand[] {
    // Rd, immediate or Rd, offset(Rs)
    const rd = this.consumeRegister("destination");
    this.consume(TokenType.COMMA, "Expected ',' after destination register");

    // Check for offset(Rs) format
    if (this.check(TokenType.IMMEDIATE)) {
      const immediate = this.advance();
      const offset = parseInt(immediate.value);

      // Check for (Rs)
      if (this.match(TokenType.LPAREN)) {
        const rs = this.consumeRegister("base");
        this.consume(TokenType.RPAREN, "Expected ')' after base register");

        return [
          { type: "register", value: rd },
          { type: "offset", value: offset, register: rs },
        ];
      }

      // Simple immediate
      return [
        { type: "register", value: rd },
        { type: "immediate", value: offset },
      ];
    }

    throw this.addError("Expected immediate value for LOAD", this.peek());
  }

  private parseStoreOperands(): Operand[] {
    // Rs, immediate or Rs, offset(Rd)
    const rs = this.consumeRegister("source");
    this.consume(TokenType.COMMA, "Expected ',' after source register");

    // Check for offset(Rd) format
    if (this.check(TokenType.IMMEDIATE)) {
      const immediate = this.advance();
      const offset = parseInt(immediate.value);

      // Check for (Rd)
      if (this.match(TokenType.LPAREN)) {
        const rd = this.consumeRegister("base");
        this.consume(TokenType.RPAREN, "Expected ')' after base register");

        return [
          { type: "register", value: rs },
          { type: "offset", value: offset, register: rd },
        ];
      }

      // Simple immediate
      return [
        { type: "register", value: rs },
        { type: "immediate", value: offset },
      ];
    }

    throw this.addError("Expected immediate value for STORE", this.peek());
  }

  private parseBranchOperands(): Operand[] {
    // Rs1, Rs2, label
    const rs1 = this.consumeRegister("source 1");
    this.consume(TokenType.COMMA, "Expected ',' after first register");
    const rs2 = this.consumeRegister("source 2");
    this.consume(TokenType.COMMA, "Expected ',' after second register");

    const labelToken = this.consume(
      TokenType.LABEL_REF,
      "Expected label reference for branch target"
    );

    return [
      { type: "register", value: rs1 },
      { type: "register", value: rs2 },
      { type: "label", value: labelToken.value },
    ];
  }

  private consumeRegister(purpose: string): string {
    if (!this.check(TokenType.REGISTER)) {
      throw this.addError(`Expected register for ${purpose}`, this.peek());
    }
    return this.advance().value;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.addError(message, this.peek());
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private addError(message: string, token: Token): Error {
    this.errors.push({
      line: token.line,
      column: token.column,
      message,
      severity: "error",
    });
    return new Error(message);
  }
}

/**
 * Parse tokens into instructions and labels
 * @param tokens - Array of tokens from lexer
 * @returns Parse result with instructions, labels, and errors
 */
export function parse(tokens: Token[]): ParseResult {
  const parser = new Parser(tokens);
  return parser.parse();
}
