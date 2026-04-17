import { getSpotNames } from "@/lib/data/spots"
import { getTeamNames } from "@/lib/data/teams"
import { ScraperTool } from "@/components/dashboard/scraper-tool"

export default async function ScraperPage() {
  const [spots, teams] = await Promise.all([
    getSpotNames(),
    getTeamNames(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scraper</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Donnez une URL, récupérez automatiquement les données d&apos;un spot ou d&apos;un secteur prêtes à importer.
        </p>
      </div>

      <ScraperTool spots={spots} teams={teams} />
    </div>
  )
}
