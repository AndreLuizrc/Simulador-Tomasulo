import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, RotateCcw, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ExecutionControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  speculationEnabled: boolean;
  onRun: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onLoadProgram: () => void;
  onToggleSpeculation: (enabled: boolean) => void;
}

export function ExecutionControls({
  isRunning,
  isPaused,
  speculationEnabled,
  onRun,
  onPause,
  onStep,
  onReset,
  onLoadProgram,
  onToggleSpeculation,
}: ExecutionControlsProps) {
  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <h3 className="font-semibold text-foreground mb-4">Execution Controls</h3>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={onLoadProgram}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            Load
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="flex gap-2">
          {!isRunning || isPaused ? (
            <Button
              onClick={onRun}
              size="sm"
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          ) : (
            <Button
              onClick={onPause}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          
          <Button
            onClick={onStep}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Step
          </Button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Label htmlFor="speculation" className="text-sm">
            Branch Speculation
          </Label>
          <Switch
            id="speculation"
            checked={speculationEnabled}
            onCheckedChange={onToggleSpeculation}
          />
        </div>
      </div>
    </div>
  );
}
