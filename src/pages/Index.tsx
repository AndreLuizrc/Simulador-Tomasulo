import { useEffect, useState } from "react";
import { InstructionTable } from "@/components/InstructionTable";
import { ExecutionControls } from "@/components/ExecutionControls";
import { ReservationStations } from "@/components/ReservationStations";
import { FunctionalUnits } from "@/components/FunctionalUnits";
import { ReorderBuffer } from "@/components/ReorderBuffer";
import { RegisterFile } from "@/components/RegisterFile";
import { SimulatorMetrics } from "@/components/SimulatorMetrics";
import { ProgramEditor } from "@/components/ProgramEditor";
import { createInitialState, stepCycle, resetSimulator } from "@/lib/simulator-engine";
import { SimulatorState, Instruction } from "@/types/simulator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const Index = () => {
  const [state, setState] = useState<SimulatorState>(createInitialState());
  const [isRunning, setIsRunning] = useState(false);
  const [showProgramEditor, setShowProgramEditor] = useState(false);
  const [speed, setSpeed] = useState<number>(3); // cycles per second

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

  // Continuous execution effect
  useEffect(() => {
    if (!isRunning) return;

    const id = window.setInterval(() => {
      setState((prev) => {
        // Completion condition: all committed OR pipeline fully idle
        const allCommitted =
          prev.instructions.length > 0 &&
          prev.instructionsCommitted >= prev.instructions.length;
        const pipelineIdle =
          prev.reservationStations.every((rs) => !rs.busy) &&
          prev.functionalUnits.every((fu) => !fu.busy) &&
          prev.rob.every((e) => !e.busy) &&
          prev.cycle > 0;

        if (allCommitted || pipelineIdle) {
          clearInterval(id);
          setIsRunning(false);
          toast.success("Program completed");
          return prev;
        }

        return stepCycle(prev);
      });
    }, Math.max(50, Math.floor(1000 / Math.max(1, speed))));

    return () => clearInterval(id);
  }, [isRunning, speed]);

  const handleLoadProgram = () => {
    setShowProgramEditor(true);
  };

  const handleProgramLoaded = (instructions: Instruction[]) => {
    // Reset simulator with new instructions
    const newState = resetSimulator();
    setState({
      ...newState,
      instructions: instructions.map((inst) => ({
        ...inst,
        state: "idle" as const,
        isSpeculative: false,
      })),
    });
    setShowProgramEditor(false);
    setIsRunning(false);
    toast.success(`Loaded ${instructions.length} instructions`);
  };

  const handleToggleSpeculation = (enabled: boolean) => {
    setState(prev => ({ ...prev, speculationEnabled: enabled }));
    toast.info(`Branch speculation ${enabled ? "enabled" : "disabled"}`);
  };

  const handleChangePredictorType = (type: 'static-taken' | 'static-not-taken' | '2-bit') => {
    setState(prev => ({
      ...prev,
      branchPredictor: {
        type,
        table: type === '2-bit' ? new Map() : undefined,
      },
    }));
    const typeLabels = {
      'static-taken': 'Static Always Taken',
      'static-not-taken': 'Static Not Taken',
      '2-bit': '2-Bit Saturating Counter'
    };
    toast.info(`Branch predictor changed to ${typeLabels[type]}`);
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
              branchPredictorType={state.branchPredictor.type}
              speed={speed}
              onRun={handleRun}
              onPause={handlePause}
              onStep={handleStep}
              onReset={handleReset}
              onLoadProgram={handleLoadProgram}
              onToggleSpeculation={handleToggleSpeculation}
              onChangePredictorType={handleChangePredictorType}
              onChangeSpeed={setSpeed}
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

      {/* Program Editor Dialog */}
      <Dialog open={showProgramEditor} onOpenChange={setShowProgramEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load Program</DialogTitle>
            <DialogDescription>
              Write your own MIPS assembly program or select from presets
            </DialogDescription>
          </DialogHeader>
          <ProgramEditor onProgramLoaded={handleProgramLoaded} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
