import { getTeams } from "@/lib/data/teams"
import { TeamsTable } from "@/components/dashboard/teams-table"

export default async function TeamsPage() {
  const teams = await getTeams()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Équipes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {teams.length} équipe{teams.length !== 1 ? "s" : ""} active
          {teams.length !== 1 ? "s" : ""}
        </p>
      </div>

      <TeamsTable data={teams} />
    </div>
  )
}
