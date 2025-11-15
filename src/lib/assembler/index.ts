/**
 * MIPS Assembler - Main API
 * Converts MIPS assembly source code into simulator instructions
 */

import { Instruction } from "@/types/simulator";
import { tokenize } from "./lexer";
import { parse, AssemblerError } from "./parser";
import { generateIR } from "./semantic";

export interface AssembleResult {
  success: boolean;
  instructions?: Instruction[];
  labels?: Map<string, number>;
  errors?: AssemblerError[];
}

/**
 * Assemble MIPS assembly source code into simulator instructions
 * @param sourceCode - MIPS assembly source code
 * @returns Assemble result with instructions or errors
 */
export function assemble(sourceCode: string): AssembleResult {
  try {
    // Step 1: Tokenize
    const tokens = tokenize(sourceCode);

    // Step 2: Parse
    const parsed = parse(tokens);

    // Check for parse errors
    if (parsed.errors.length > 0) {
      return {
        success: false,
        errors: parsed.errors,
      };
    }

    // Step 3: Semantic analysis & IR generation
    const instructions = generateIR(parsed);

    return {
      success: true,
      instructions,
      labels: parsed.labels,
    };
  } catch (error) {
    // Handle unexpected errors
    return {
      success: false,
      errors: [
        {
          line: 0,
          column: 0,
          message: error instanceof Error ? error.message : "Unknown error occurred",
          severity: "error",
        },
      ],
    };
  }
}

/**
 * Validate assembly source code without generating instructions
 * Useful for syntax checking while typing
 * @param sourceCode - MIPS assembly source code
 * @returns Array of errors (empty if valid)
 */
export function validate(sourceCode: string): AssemblerError[] {
  try {
    const tokens = tokenize(sourceCode);
    const parsed = parse(tokens);

    if (parsed.errors.length > 0) {
      return parsed.errors;
    }

    // Try to generate IR to catch semantic errors
    try {
      generateIR(parsed);
      return [];
    } catch (error) {
      return [
        {
          line: 0,
          column: 0,
          message: error instanceof Error ? error.message : "Semantic error",
          severity: "error",
        },
      ];
    }
  } catch (error) {
    return [
      {
        line: 0,
        column: 0,
        message: error instanceof Error ? error.message : "Unknown error",
        severity: "error",
      },
    ];
  }
}

// Re-export types and utilities
export type { AssemblerError } from "./parser";
export { getPresetKeys, getPreset, getDefaultPreset, PRESET_PROGRAMS } from "./presets";
export type { PresetProgram } from "./presets";
