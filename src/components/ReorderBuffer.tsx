import { ROBEntry } from "@/types/simulator";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReorderBufferProps {
  entries: ROBEntry[];
  head: number;
  tail: number;
}

export function ReorderBuffer({ entries, head, tail }: ReorderBufferProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="border-b border-border bg-secondary px-4 py-2 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Reorder Buffer (ROB)</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Head:</span>
            <span className="font-mono text-primary">ROB{head}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Tail:</span>
            <span className="font-mono text-primary">ROB{tail}</span>
          </div>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-mono">Index</th>
              <th className="px-3 py-2 text-left">Busy</th>
              <th className="px-3 py-2 text-left font-mono">Instr</th>
              <th className="px-3 py-2 text-left font-mono">Type</th>
              <th className="px-3 py-2 text-left font-mono">Dest</th>
              <th className="px-3 py-2 text-left font-mono">Value</th>
              <th className="px-3 py-2 text-left">Ready</th>
              <th className="px-3 py-2 text-left">Spec</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.index}
                className={cn(
                  "border-b border-border transition-colors",
                  entry.busy && "bg-state-executing/10",
                  entry.index === head && "border-l-4 border-l-state-ready",
                  entry.index === tail && "border-r-4 border-r-state-issued",
                  entry.isSpeculative && "opacity-70"
                )}
              >
                <td className="px-3 py-2 font-mono text-primary">
                  ROB{entry.index}
                  {entry.index === head && (
                    <ArrowRight className="inline w-3 h-3 ml-1 text-state-ready" />
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-block w-2 h-2 rounded-full",
                      entry.busy ? "bg-state-executing" : "bg-state-idle"
                    )}
                  />
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {entry.instructionId !== undefined ? `#${entry.instructionId}` : "-"}
                </td>
                <td className="px-3 py-2 font-mono">{entry.type ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-state-ready">
                  {entry.destination ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {entry.value ?? "-"}
                </td>
                <td className="px-3 py-2">
                  {entry.ready ? (
                    <span className="text-state-ready">✓</span>
                  ) : (
                    <span className="text-muted-foreground">○</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {entry.isSpeculative ? (
                    <Badge variant="outline" className="text-xs bg-state-speculative/20 text-state-speculative border-state-speculative">
                      S
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
