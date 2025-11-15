/**
 * Semantic Analysis & IR Generation
 * Converts parsed instructions into simulator IR format
 */

import { Instruction } from "@/types/simulator";
import { ParseResult, ParsedInstruction, Operand, AssemblerError } from "./parser";

/**
 * Generate simulator instructions from parsed result
 * @param parsed - Parse result from parser
 * @returns Array of instructions ready for simulator
 */
export function generateIR(parsed: ParseResult): Instruction[] {
  const errors: AssemblerError[] = [...parsed.errors];
  const instructions: Instruction[] = [];

  for (let i = 0; i < parsed.instructions.length; i++) {
    const parsedInst = parsed.instructions[i];

    try {
      const instruction = convertInstruction(parsedInst, parsed.labels, i);
      instructions.push(instruction);
    } catch (error) {
      errors.push({
        line: parsedInst.line,
        column: 0,
        message: error instanceof Error ? error.message : "Unknown error",
        severity: "error",
      });
    }
  }

  if (errors.length > 0) {
    throw new Error(`Semantic errors found:\n${errors.map(e => `Line ${e.line}: ${e.message}`).join("\n")}`);
  }

  return instructions;
}

/**
 * Convert a single parsed instruction to simulator format
 */
function convertInstruction(
  parsed: ParsedInstruction,
  labels: Map<string, number>,
  id: number
): Instruction {
  const { opcode, operands } = parsed;

  // Generate instruction text
  const text = generateInstructionText(opcode, operands);

  // Base instruction
  const instruction: Instruction = {
    id,
    text,
    operation: opcode,
    dest: "",
    src1: "",
    src2: "",
    state: "idle",
    isSpeculative: false,
  };

  // Fill in operands based on instruction type
  switch (opcode) {
    case "ADD":
    case "SUB":
    case "MUL":
    case "DIV":
      // Format: OPCODE Rd, Rs1, Rs2
      if (operands.length !== 3) {
        throw new Error(`${opcode} requires 3 operands`);
      }
      validateRegister(operands[0]);
      validateRegister(operands[1]);
      validateRegister(operands[2]);

      instruction.dest = operands[0].value as string;
      instruction.src1 = operands[1].value as string;
      instruction.src2 = operands[2].value as string;
      break;

    case "LOAD":
      // Format: LOAD Rd, immediate or LOAD Rd, offset(Rs)
      if (operands.length < 2) {
        throw new Error("LOAD requires at least 2 operands");
      }
      validateRegister(operands[0]);

      instruction.dest = operands[0].value as string;

      if (operands[1].type === "offset") {
        // LOAD Rd, offset(Rs)
        instruction.immediate = operands[1].value as number;
        instruction.src1 = operands[1].register || "";
      } else {
        // LOAD Rd, immediate
        instruction.immediate = operands[1].value as number;
        instruction.src1 = "";
      }
      break;

    case "STORE":
      // Format: STORE Rs, immediate or STORE Rs, offset(Rd)
      if (operands.length < 2) {
        throw new Error("STORE requires at least 2 operands");
      }
      validateRegister(operands[0]);

      instruction.src1 = operands[0].value as string;

      if (operands[1].type === "offset") {
        // STORE Rs, offset(Rd)
        instruction.immediate = operands[1].value as number;
        instruction.dest = operands[1].register || "";
      } else {
        // STORE Rs, immediate
        instruction.immediate = operands[1].value as number;
      }
      break;

    case "BEQ":
    case "BNE":
      // Format: BEQ Rs1, Rs2, label
      if (operands.length !== 3) {
        throw new Error(`${opcode} requires 3 operands`);
      }
      validateRegister(operands[0]);
      validateRegister(operands[1]);

      instruction.src1 = operands[0].value as string;
      instruction.src2 = operands[1].value as string;

      // Resolve label to instruction index
      const labelName = operands[2].value as string;
      const targetIndex = labels.get(labelName);
      if (targetIndex === undefined) {
        throw new Error(`Undefined label: ${labelName}`);
      }
      instruction.immediate = targetIndex;
      break;

    case "NOP":
      // No operands needed
      break;

    default:
      throw new Error(`Unsupported opcode: ${opcode}`);
  }

  // Validate no writing to R0 (optional check)
  if (instruction.dest === "R0" && opcode !== "STORE") {
    // Warning: writing to R0 (could be enforced as error)
    console.warn(`Warning: Instruction ${id} writes to R0 (zero register)`);
  }

  return instruction;
}

/**
 * Validate that an operand is a register
 */
function validateRegister(operand: Operand): void {
  if (operand.type !== "register") {
    throw new Error(`Expected register, got ${operand.type}`);
  }

  const reg = operand.value as string;
  if (!reg.startsWith("R")) {
    throw new Error(`Invalid register format: ${reg}`);
  }

  const regNum = parseInt(reg.substring(1));
  if (isNaN(regNum) || regNum < 0 || regNum > 31) {
    throw new Error(`Invalid register number: ${reg} (must be R0-R31)`);
  }
}

/**
 * Generate human-readable instruction text
 */
function generateInstructionText(opcode: string, operands: Operand[]): string {
  const parts = [opcode];

  for (let i = 0; i < operands.length; i++) {
    const op = operands[i];

    if (op.type === "offset") {
      // Format as offset(register)
      parts.push(`${op.value}(${op.register})`);
    } else if (op.type === "register") {
      parts.push(op.value as string);
    } else if (op.type === "immediate") {
      parts.push(op.value.toString());
    } else if (op.type === "label") {
      parts.push(op.value as string);
    }
  }

  return parts.join(" ");
}
