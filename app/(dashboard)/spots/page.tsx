import { getSpotsWithSectors } from "@/lib/data/spots"
import { getTeamNames } from "@/lib/data/teams"
import { SpotsTable } from "@/components/dashboard/spots-table"
import { SpotImportDialog } from "@/components/dashboard/spot-import-dialog"

export default async function SpotsPage() {
  const [spots, teams] = await Promise.all([
    getSpotsWithSectors(),
    getTeamNames(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Spots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {spots.length} spot{spots.length !== 1 ? "s" : ""} référencé
            {spots.length !== 1 ? "s" : ""}
          </p>
        </div>
        <SpotImportDialog teams={teams} />
      </div>

      <SpotsTable data={spots} teams={teams} />
    </div>
  )
}
