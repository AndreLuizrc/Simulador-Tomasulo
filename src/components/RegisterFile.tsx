import { RegisterRenaming } from "@/types/simulator";

interface RegisterFileProps {
  registers: Map<string, number>;
  renaming: RegisterRenaming[];
}

export function RegisterFile({ registers, renaming }: RegisterFileProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="border-b border-border bg-secondary px-4 py-2">
        <h3 className="font-semibold text-foreground">Register File</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {Array.from(registers.entries()).map(([reg, value]) => {
          const renamed = renaming.find(r => r.register === reg);
          return (
            <div
              key={reg}
              className="flex items-center justify-between p-2 rounded bg-secondary"
            >
              <span className="font-mono font-semibold text-primary">{reg}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-foreground">{value}</span>
                {renamed?.robEntry !== undefined && (
                  <span className="text-xs font-mono text-state-speculative">
                    →ROB{renamed.robEntry}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
