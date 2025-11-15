/**
 * Preset MIPS Assembly Programs
 * Ready-to-use example programs demonstrating different scenarios
 */

export interface PresetProgram {
  name: string;
  description: string;
  code: string;
}

export const PRESET_PROGRAMS: Record<string, PresetProgram> = {
  basic_arithmetic: {
    name: "Basic Arithmetic",
    description: "Simple ADD, SUB, MUL operations",
    code: `; Basic arithmetic operations
LOAD R1, 0
LOAD R2, 4
ADD R3, R1, R2
MUL R4, R3, R1
SUB R5, R4, R2
STORE R5, 8`,
  },

  raw_hazard: {
    name: "RAW Hazard Demo",
    description: "Demonstrates Read-After-Write dependency",
    code: `; RAW Hazard demonstration
; R4 must wait for R1 from first instruction
; R6 must wait for both R4 and R1
LOAD R2, 0
LOAD R3, 4
ADD R1, R2, R3
SUB R4, R1, R5
MUL R6, R4, R1`,
  },

  waw_hazard: {
    name: "WAW Hazard (Resolved by RAT)",
    description: "Write-After-Write to same register",
    code: `; WAW Hazard (register renaming resolves this)
; Both instructions write to R1
; Register renaming prevents false dependency
LOAD R2, 0
LOAD R3, 4
LOAD R5, 8
ADD R1, R2, R3
MUL R1, R4, R5
SUB R6, R1, R7`,
  },

  load_use: {
    name: "Load-Use Hazard",
    description: "Using value immediately after LOAD",
    code: `; Load-Use hazard
; LOAD takes 3 cycles
; ADD must wait for R1 to be loaded
; MUL depends on R2 from ADD
LOAD R1, 0
ADD R2, R1, R3
MUL R4, R2, R5`,
  },

  parallel_execution: {
    name: "Parallel Execution",
    description: "Independent instructions executing in parallel",
    code: `; Independent operations (high ILP)
; All LOADs can execute in parallel
; All arithmetic ops are independent
LOAD R1, 0
LOAD R2, 4
LOAD R3, 8
ADD R4, R1, R2
MUL R5, R3, R1
SUB R6, R2, R3`,
  },

  branch_example: {
    name: "Branch with Loop",
    description: "Simple loop with BNE (requires Phase 3)",
    code: `; Loop example (requires speculation - Phase 3)
; This demonstrates branch prediction
      LOAD R1, 0
      LOAD R2, 4
LOOP: ADD R1, R1, R2
      SUB R2, R2, R1
      BNE R2, R0, LOOP
      STORE R1, 8`,
  },

  complex_program: {
    name: "Complex Program",
    description: "Mix of all instruction types",
    code: `; Complex program with multiple hazards
; Initialize values
LOAD R1, 0
LOAD R2, 4
LOAD R3, 8

; Arithmetic operations with dependencies
ADD R4, R1, R2
SUB R5, R3, R1
MUL R6, R4, R5
DIV R7, R6, R2

; Store results
STORE R7, 12
STORE R6, 16`,
  },

  fibonacci_start: {
    name: "Fibonacci Start",
    description: "First few Fibonacci numbers",
    code: `; Calculate first few Fibonacci numbers
; F(0) = 0, F(1) = 1
; F(n) = F(n-1) + F(n-2)

LOAD R1, 0     ; F(0) = 0
LOAD R2, 4     ; F(1) = 1
ADD R3, R1, R2 ; F(2) = F(0) + F(1) = 1
ADD R4, R2, R3 ; F(3) = F(1) + F(2) = 2
ADD R5, R3, R4 ; F(4) = F(2) + F(3) = 3
STORE R5, 8`,
  },
};

/**
 * Get array of preset program keys
 */
export function getPresetKeys(): string[] {
  return Object.keys(PRESET_PROGRAMS);
}

/**
 * Get a preset program by key
 */
export function getPreset(key: string): PresetProgram | undefined {
  return PRESET_PROGRAMS[key];
}

/**
 * Get default preset program
 */
export function getDefaultPreset(): PresetProgram {
  return PRESET_PROGRAMS.basic_arithmetic;
}
