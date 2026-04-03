"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2, ScanSearch, Upload, Copy, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ScrapedSpot, ScrapedSector } from "@/lib/scraper/parser"

type SpotOption = { id: string; name: string }

type ParseResponse = {
  spot: ScrapedSpot
  sector: ScrapedSector
  sourceUrl: string
  error?: string
}

type Mode = "spot" | "sector"

export function ScraperTool({ spots }: { spots: SpotOption[] }) {
  const router = useRouter()

  const [url, setUrl] = React.useState("")
  const [mode, setMode] = React.useState<Mode>("spot")
  const [spotId, setSpotId] = React.useState("")
  const [spotSearch, setSpotSearch] = React.useState("")

  const [parsed, setParsed] = React.useState<ParseResponse | null>(null)
  const [jsonValue, setJsonValue] = React.useState("")

  const [analyzing, setAnalyzing] = React.useState(false)
  const [importing, setImporting] = React.useState(false)
  const [analyzeError, setAnalyzeError] = React.useState("")
  const [importError, setImportError] = React.useState("")
  const [importSuccess, setImportSuccess] = React.useState("")
  const [copied, setCopied] = React.useState(false)

  const filteredSpots = spots.filter((s) =>
    s.name.toLowerCase().includes(spotSearch.toLowerCase())
  )

  // When mode changes after a parse, refresh the JSON editor
  React.useEffect(() => {
    if (!parsed) return
    const data = mode === "spot" ? parsed.spot : parsed.sector
    setJsonValue(JSON.stringify(data, null, 2))
    setImportError("")
    setImportSuccess("")
  }, [mode, parsed])

  const handleAnalyze = async () => {
    if (!url.trim()) return
    setAnalyzing(true)
    setAnalyzeError("")
    setImportError("")
    setImportSuccess("")
    setParsed(null)
    setJsonValue("")

    try {
      const res = await fetch("/api/scraper/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json() as ParseResponse
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue")
      setParsed(data)
      const initial = mode === "spot" ? data.spot : data.sector
      setJsonValue(JSON.stringify(initial, null, 2))
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleImport = async () => {
    setImportError("")
    setImportSuccess("")

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(jsonValue)
    } catch {
      setImportError("JSON invalide — vérifiez la syntaxe avant d'importer.")
      return
    }

    if (mode === "sector" && !spotId) {
      setImportError("Sélectionnez un spot cible pour importer ce secteur.")
      return
    }

    setImporting(true)
    try {
      const body =
        mode === "spot"
          ? { type: "spot", data: parsedJson }
          : { type: "sector", spotId, data: parsedJson }

      const res = await fetch("/api/scraper/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const result = await res.json() as { id?: string; error?: string }
      if (!res.ok) throw new Error(result.error ?? "Erreur inconnue")

      setImportSuccess(
        mode === "spot"
          ? `Spot créé avec succès (ID : ${result.id})`
          : `Secteur ajouté avec succès (ID : ${result.id})`
      )
      router.refresh()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setImporting(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Input section ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-5 rounded-xl border p-5">
        {/* URL */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scraper-url">URL de la page</Label>
          <div className="flex gap-2">
            <Input
              id="scraper-url"
              type="url"
              placeholder="https://www.grimper.com/fr/site-escalade/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={analyzing || !url.trim()}>
              {analyzing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ScanSearch className="size-4" />
              )}
              Analyser
            </Button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex flex-col gap-1.5">
          <Label>Type de données</Label>
          <div className="flex rounded-lg border overflow-hidden w-fit">
            {(["spot", "sector"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/60"
                }`}
              >
                {m === "spot" ? "🏔 Spot" : "📍 Secteur"}
              </button>
            ))}
          </div>
        </div>

        {/* Spot selector (sector mode only) */}
        {mode === "sector" && (
          <div className="flex flex-col gap-2">
            <Label>Spot cible</Label>
            <Input
              placeholder="Rechercher un spot..."
              value={spotSearch}
              onChange={(e) => setSpotSearch(e.target.value)}
              className="max-w-sm"
            />
            {filteredSpots.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                {filteredSpots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSpotId(s.id)}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/60 ${
                      spotId === s.id ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {s.name}
                    {spotId === s.id && (
                      <span className="ml-2 text-xs text-muted-foreground">{s.id}</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun spot trouvé.</p>
            )}
            {spotId && (
              <p className="text-xs text-muted-foreground">
                Spot sélectionné :{" "}
                <span className="font-medium text-foreground">
                  {spots.find((s) => s.id === spotId)?.name}
                </span>
              </p>
            )}
          </div>
        )}

        {/* Analyze error */}
        {analyzeError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {analyzeError}
          </div>
        )}
      </div>

      {/* ── Result section ─────────────────────────────────────────────── */}
      {parsed && (
        <div className="flex flex-col gap-4">
          {/* Preview summary card */}
          <ParsedPreview
            mode={mode}
            spot={parsed.spot}
            sector={parsed.sector}
            sourceUrl={parsed.sourceUrl}
          />

          {/* JSON editor */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>JSON à importer</Label>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
                {copied ? "Copié !" : "Copier"}
              </Button>
            </div>
            <Textarea
              value={jsonValue}
              onChange={(e) => setJsonValue(e.target.value)}
              className="font-mono text-xs min-h-[320px] resize-y"
              spellCheck={false}
            />
          </div>

          {/* Feedback */}
          {importError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {importError}
            </div>
          )}
          {importSuccess && (
            <div className="rounded-md border border-green-600/30 bg-green-50 dark:bg-green-950/20 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              ✅ {importSuccess}
            </div>
          )}

          <Button onClick={handleImport} disabled={importing} className="self-start">
            {importing && <Loader2 className="size-4 animate-spin" />}
            <Upload className="size-4" />
            Importer directement
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Preview card ─────────────────────────────────────────────────────────────

function ParsedPreview({
  mode,
  spot,
  sector,
  sourceUrl,
}: {
  mode: Mode
  spot: ScrapedSpot
  sector: ScrapedSector
  sourceUrl: string
}) {
  const rows: [string, string][] =
    mode === "spot"
      ? [
          ["Nom", spot.name],
          ["Pays", spot.location.country],
          ["Adresse", spot.location.address],
          ["Coordonnées", `${spot.location.lat.toFixed(5)}, ${spot.location.lng.toFixed(5)}`],
          ["Styles", spot.styles.join(", ")],
          ["Parking", spot.parking ? `${spot.parking.lat.toFixed(5)}, ${spot.parking.lng.toFixed(5)}${spot.parking.note ? ` — ${spot.parking.note}` : ""}` : "—"],
          ["Description", spot.description.slice(0, 140) + (spot.description.length > 140 ? "…" : "")],
        ]
      : [
          ["Nom", sector.name],
          ["Style", sector.style.join(", ")],
          ["Grade min", sector.grades.min || "—"],
          ["Grade max", sector.grades.max || "—"],
          ["Orientation", sector.orientation ?? "—"],
          ["Description", sector.description.slice(0, 140) + (sector.description.length > 140 ? "…" : "")],
        ]

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">
          {mode === "spot" ? "🏔 Spot extrait" : "📍 Secteur extrait"}
        </p>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Source ↗
        </a>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="text-muted-foreground whitespace-nowrap">{label}</dt>
            <dd className="truncate">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  )
}
