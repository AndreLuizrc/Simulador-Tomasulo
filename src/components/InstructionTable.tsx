import { Instruction, InstructionState } from "@/types/simulator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InstructionTableProps {
  instructions: Instruction[];
  currentCycle: number;
}

const stateColors: Record<InstructionState, string> = {
  idle: "bg-state-idle text-foreground",
  issued: "bg-state-issued text-primary-foreground",
  executing: "bg-state-executing text-primary-foreground",
  ready: "bg-state-ready text-primary-foreground",
  writeback: "bg-state-ready text-primary-foreground",
  committed: "bg-state-committed text-primary-foreground",
  flushed: "bg-state-flushed text-destructive-foreground",
  speculative: "bg-state-speculative text-primary-foreground",
};

export function InstructionTable({ instructions, currentCycle }: InstructionTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="border-b border-border bg-secondary px-4 py-2">
        <h3 className="font-semibold text-foreground">Instructions</h3>
      </div>
      <div className="overflow-auto max-h-[300px]">
        <table className="w-full text-sm">
          <thead className="bg-secondary sticky top-0">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-mono">#</th>
              <th className="px-3 py-2 text-left font-mono">Instruction</th>
              <th className="px-3 py-2 text-left">State</th>
              <th className="px-3 py-2 text-left font-mono">Issue</th>
              <th className="px-3 py-2 text-left font-mono">Exec</th>
              <th className="px-3 py-2 text-left font-mono">WB</th>
              <th className="px-3 py-2 text-left font-mono">Commit</th>
            </tr>
          </thead>
          <tbody>
            {instructions.map((inst) => (
              <tr
                key={inst.id}
                className={cn(
                  "border-b border-border transition-colors",
                  inst.state === "executing" && "bg-state-executing/10",
                  inst.isSpeculative && "opacity-70"
                )}
              >
                <td className="px-3 py-2 font-mono text-muted-foreground">{inst.id}</td>
                <td className="px-3 py-2 font-mono">{inst.text}</td>
                <td className="px-3 py-2">
                  <Badge className={cn("text-xs", stateColors[inst.state])}>
                    {inst.state}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {inst.issueTime ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {inst.execStartTime ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {inst.writebackTime ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {inst.commitTime ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
