import { getTrips, type TripStatus } from "@/lib/data/trips"
import { TripsTable } from "@/components/dashboard/trips-table"
import { Badge } from "@/components/ui/badge"

const STATUS_CONFIG: Record<
  TripStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  planning: { label: "Planification", variant: "secondary" },
  confirmed: { label: "Confirmée", variant: "default" },
  done: { label: "Terminée", variant: "outline" },
  cancelled: { label: "Annulée", variant: "destructive" },
}

export default async function TripsPage() {
  const trips = await getTrips()

  const byStatus = trips.reduce<Record<TripStatus, number>>(
    (acc, t) => ({ ...acc, [t.status]: (acc[t.status] ?? 0) + 1 }),
    {} as Record<TripStatus, number>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sorties</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {trips.length} sortie{trips.length !== 1 ? "s" : ""} au total
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CONFIG) as TripStatus[])
            .filter((s) => byStatus[s] > 0)
            .map((s) => {
              const cfg = STATUS_CONFIG[s]
              return (
                <Badge key={s} variant={cfg.variant}>
                  {byStatus[s]} {cfg.label.toLowerCase()}
                </Badge>
              )
            })}
        </div>
      </div>

      <TripsTable data={trips} />
    </div>
  )
}
