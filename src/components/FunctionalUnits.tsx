import { FunctionalUnit } from "@/types/simulator";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface FunctionalUnitsProps {
  units: FunctionalUnit[];
}

export function FunctionalUnits({ units }: FunctionalUnitsProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="border-b border-border bg-secondary px-4 py-2">
        <h3 className="font-semibold text-foreground">Functional Units</h3>
      </div>
      <div className="p-4 space-y-3">
        {units.map((unit) => (
          <div
            key={unit.name}
            className={cn(
              "border border-border rounded-lg p-3 transition-all",
              unit.busy ? "bg-state-executing/10 border-state-executing" : "bg-secondary/50"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-semibold text-primary">{unit.name}</span>
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full",
                  unit.busy
                    ? "bg-state-executing text-primary-foreground"
                    : "bg-state-idle text-foreground"
                )}
              >
                {unit.busy ? "BUSY" : "IDLE"}
              </span>
            </div>
            
            {unit.busy && (
              <>
                <div className="text-sm text-muted-foreground mb-2">
                  Instruction #{unit.instructionId}
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={((unit.totalCycles - unit.cyclesRemaining) / unit.totalCycles) * 100}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {unit.cyclesRemaining}/{unit.totalCycles}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
