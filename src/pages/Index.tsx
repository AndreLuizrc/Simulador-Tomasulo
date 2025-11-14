import { useState } from "react";
import { InstructionTable } from "@/components/InstructionTable";
import { ExecutionControls } from "@/components/ExecutionControls";
import { ReservationStations } from "@/components/ReservationStations";
import { FunctionalUnits } from "@/components/FunctionalUnits";
import { ReorderBuffer } from "@/components/ReorderBuffer";
import { RegisterFile } from "@/components/RegisterFile";
import { SimulatorMetrics } from "@/components/SimulatorMetrics";
import { createInitialState, stepCycle, resetSimulator } from "@/lib/simulator-engine";
import { SimulatorState } from "@/types/simulator";
import { toast } from "sonner";

const Index = () => {
  const [state, setState] = useState<SimulatorState>(createInitialState());
  const [isRunning, setIsRunning] = useState(false);

  const metrics = {
    cycle: state.cycle,
    instructionsCommitted: state.instructionsCommitted,
    ipc: state.cycle > 0 ? state.instructionsCommitted / state.cycle : 0,
    stallCycles: 0,
    flushCount: 0,
    branchAccuracy: 1.0,
  };

  const handleStep = () => {
    setState(prevState => stepCycle(prevState));
  };

  const handleRun = () => {
    setIsRunning(true);
    toast.info("Continuous execution started");
  };

  const handlePause = () => {
    setIsRunning(false);
    toast.info("Execution paused");
  };

  const handleReset = () => {
    setState(resetSimulator());
    setIsRunning(false);
    toast.success("Simulator reset");
  };

  const handleLoadProgram = () => {
    toast.info("Load program feature coming soon");
  };

  const handleToggleSpeculation = (enabled: boolean) => {
    setState(prev => ({ ...prev, speculationEnabled: enabled }));
    toast.info(`Branch speculation ${enabled ? "enabled" : "disabled"}`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <header className="border-b border-border pb-4">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Tomasulo Algorithm Simulator
          </h1>
          <p className="text-muted-foreground">
            Out-of-order execution with Reorder Buffer and Branch Speculation
          </p>
        </header>

        {/* Top Section: Instructions + Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InstructionTable
              instructions={state.instructions}
              currentCycle={state.cycle}
            />
          </div>
          <div>
            <ExecutionControls
              isRunning={isRunning}
              isPaused={state.isPaused}
              speculationEnabled={state.speculationEnabled}
              onRun={handleRun}
              onPause={handlePause}
              onStep={handleStep}
              onReset={handleReset}
              onLoadProgram={handleLoadProgram}
              onToggleSpeculation={handleToggleSpeculation}
            />
          </div>
        </div>

        {/* Middle Section: RS/FU + ROB */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ReservationStations stations={state.reservationStations} />
            <FunctionalUnits units={state.functionalUnits} />
          </div>
          <div>
            <ReorderBuffer
              entries={state.rob}
              head={state.robHead}
              tail={state.robTail}
            />
          </div>
        </div>

        {/* Bottom Section: Registers + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RegisterFile
            registers={state.registerFile}
            renaming={state.registerRenaming}
          />
          <SimulatorMetrics metrics={metrics} />
        </div>
      </div>
    </div>
  );
};

export default Index;
