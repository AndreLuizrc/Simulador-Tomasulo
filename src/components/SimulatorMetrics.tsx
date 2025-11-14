import { type SimulatorMetrics as Metrics } from "@/types/simulator";

interface SimulatorMetricsProps {
  metrics: Metrics;
}

export function SimulatorMetrics({ metrics }: SimulatorMetricsProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="border-b border-border bg-secondary px-4 py-2">
        <h3 className="font-semibold text-foreground">Performance Metrics</h3>
      </div>
      <div className="grid grid-cols-3 gap-4 p-4">
        <MetricCard
          label="Current Cycle"
          value={metrics.cycle}
          color="text-primary"
        />
        <MetricCard
          label="Instructions Committed"
          value={metrics.instructionsCommitted}
          color="text-state-ready"
        />
        <MetricCard
          label="IPC"
          value={metrics.ipc.toFixed(2)}
          color="text-state-executing"
        />
        <MetricCard
          label="Stall Cycles"
          value={metrics.stallCycles}
          color="text-muted-foreground"
        />
        <MetricCard
          label="Flushes"
          value={metrics.flushCount}
          color="text-state-flushed"
        />
        <MetricCard
          label="Branch Accuracy"
          value={`${(metrics.branchAccuracy * 100).toFixed(1)}%`}
          color="text-state-speculative"
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  color: string;
}

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <div className="p-3 rounded-lg bg-secondary">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-2xl font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}
