import { ReservationStation } from "@/types/simulator";
import { cn } from "@/lib/utils";

interface ReservationStationsProps {
  stations: ReservationStation[];
}

export function ReservationStations({ stations }: ReservationStationsProps) {

  console.log(stations)
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="border-b border-border bg-secondary px-4 py-2">
        <h3 className="font-semibold text-foreground">Reservation Stations</h3>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-mono">Name</th>
              <th className="px-3 py-2 text-left">Busy</th>
              <th className="px-3 py-2 text-left font-mono">Op</th>
              <th className="px-3 py-2 text-left font-mono">Vj</th>
              <th className="px-3 py-2 text-left font-mono">Vk</th>
              <th className="px-3 py-2 text-left font-mono">Qj</th>
              <th className="px-3 py-2 text-left font-mono">Qk</th>
              <th className="px-3 py-2 text-left font-mono">Dest</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => (
              <tr
                key={station.name}
                className={cn(
                  "border-b border-border transition-colors",
                  station.busy && "bg-state-executing/10"
                )}
              >
                <td className="px-3 py-2 font-mono text-primary">{station.name}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-block w-2 h-2 rounded-full",
                      station.busy ? "bg-state-executing" : "bg-state-idle"
                    )}
                  />
                </td>
                <td className="px-3 py-2 font-mono">{station.op ?? "-"}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {station.vj ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {station.vk ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-state-speculative">
                  {station.qj ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-state-speculative">
                  {station.qk ?? "-"}
                </td>
                <td className="px-3 py-2 font-mono text-state-ready">
                  {station.dest ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
