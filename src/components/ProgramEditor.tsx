import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Code2, Play } from "lucide-react";
import { assemble, getPresetKeys, getPreset, getDefaultPreset, AssemblerError } from "@/lib/assembler";
import { Instruction } from "@/types/simulator";
import { toast } from "sonner";

interface ProgramEditorProps {
  onProgramLoaded: (instructions: Instruction[]) => void;
}

export function ProgramEditor({ onProgramLoaded }: ProgramEditorProps) {
  const [code, setCode] = useState<string>(getDefaultPreset().code);
  const [errors, setErrors] = useState<AssemblerError[]>([]);
  const [isAssembling, setIsAssembling] = useState(false);

  const handlePresetChange = (presetKey: string) => {
    const preset = getPreset(presetKey);
    if (preset) {
      setCode(preset.code);
      setErrors([]);
      toast.info(`Loaded preset: ${preset.name}`);
    }
  };

  const handleAssemble = () => {
    setIsAssembling(true);
    setErrors([]);

    try {
      const result = assemble(code);

      if (result.success && result.instructions) {
        toast.success(`Successfully assembled ${result.instructions.length} instructions`);
        onProgramLoaded(result.instructions);
        setErrors([]);
      } else if (result.errors) {
        setErrors(result.errors);
        toast.error(`Assembly failed with ${result.errors.length} error(s)`);
      }
    } catch (error) {
      toast.error("Unexpected error during assembly");
      setErrors([
        {
          line: 0,
          column: 0,
          message: error instanceof Error ? error.message : "Unknown error",
          severity: "error",
        },
      ]);
    } finally {
      setIsAssembling(false);
    }
  };

  const handleClear = () => {
    setCode("");
    setErrors([]);
    toast.info("Editor cleared");
  };

  const lineNumbers = code.split("\n").length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Program Editor
            </CardTitle>
            <CardDescription>Write or select a MIPS assembly program</CardDescription>
          </div>
          <Select onValueChange={handlePresetChange} defaultValue="basic_arithmetic">
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a preset" />
            </SelectTrigger>
            <SelectContent>
              {getPresetKeys().map((key) => {
                const preset = getPreset(key);
                return preset ? (
                  <SelectItem key={key} value={key}>
                    {preset.name}
                  </SelectItem>
                ) : null;
              })}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Editor Area */}
        <div className="relative border rounded-md bg-muted/30">
          {/* Line Numbers */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted/50 border-r border-border flex flex-col items-end py-3 px-2 text-xs text-muted-foreground font-mono select-none">
            {Array.from({ length: lineNumbers }, (_, i) => (
              <div key={i} className="h-6 leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Editor */}
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-sm pl-16 min-h-[300px] resize-none border-0 focus-visible:ring-0 bg-transparent"
            placeholder="Enter MIPS assembly code here..."
            spellCheck={false}
          />
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Assembly Errors:</div>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-sm">
                    {err.line > 0 && (
                      <span className="font-mono">Line {err.line}: </span>
                    )}
                    {err.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Success indicator */}
        {errors.length === 0 && code.trim().length > 0 && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Code ready to assemble
            </AlertDescription>
          </Alert>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-semibold">Supported Instructions:</div>
          <div className="grid grid-cols-2 gap-1 font-mono">
            <div>ADD, SUB, MUL, DIV</div>
            <div>LOAD, STORE</div>
            <div>BEQ, BNE</div>
            <div>NOP</div>
          </div>
          <div className="mt-2">
            <span className="font-semibold">Example:</span>{" "}
            <code className="text-xs">LOAD R1, 0</code> or{" "}
            <code className="text-xs">ADD R3, R1, R2</code>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between gap-2">
        <Button variant="outline" onClick={handleClear} disabled={isAssembling}>
          Clear
        </Button>
        <Button onClick={handleAssemble} disabled={isAssembling || code.trim().length === 0}>
          <Play className="w-4 h-4 mr-2" />
          {isAssembling ? "Assembling..." : "Assemble & Load"}
        </Button>
      </CardFooter>
    </Card>
  );
}
