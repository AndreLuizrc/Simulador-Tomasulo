import { Button } from "@/components/ui/button";
import { Play, Pause, SkipForward, RotateCcw, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface ExecutionControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  speculationEnabled: boolean;
  branchPredictorType: 'static-taken' | 'static-not-taken' | '2-bit';
  speed: number;
  onRun: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onLoadProgram: () => void;
  onToggleSpeculation: (enabled: boolean) => void;
  onChangePredictorType: (type: 'static-taken' | 'static-not-taken' | '2-bit') => void;
  onChangeSpeed: (speed: number) => void;
}

export function ExecutionControls({
  isRunning,
  isPaused,
  speculationEnabled,
  branchPredictorType,
  speed,
  onRun,
  onPause,
  onStep,
  onReset,
  onLoadProgram,
  onToggleSpeculation,
  onChangePredictorType,
  onChangeSpeed,
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="speed" className="text-sm">
              Execution Speed (cycles/sec)
            </Label>
            <span className="text-xs text-muted-foreground">{speed}x</span>
          </div>
          <Slider
            id="speed"
            min={1}
            max={20}
            step={1}
            value={[speed]}
            onValueChange={(val) => onChangeSpeed(val[0] ?? 1)}
          />
        </div>

        {speculationEnabled && (
          <div className="space-y-2 pt-2">
            <Label htmlFor="predictor" className="text-sm">
              Branch Predictor
            </Label>
            <Select
              value={branchPredictorType}
              onValueChange={(value) => onChangePredictorType(value as 'static-taken' | 'static-not-taken' | '2-bit')}
            >
              <SelectTrigger id="predictor" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static-taken">Static Always Taken</SelectItem>
                <SelectItem value="static-not-taken">Static Not Taken</SelectItem>
                <SelectItem value="2-bit">2-Bit Saturating Counter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
