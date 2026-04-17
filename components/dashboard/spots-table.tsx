"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Download,
  Loader2,
  Pencil,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { SectorAddDialog } from "@/components/dashboard/sector-add-dialog"
import { SpotEditDialog } from "@/components/dashboard/spot-edit-dialog"
import { SectorEditDialog } from "@/components/dashboard/sector-edit-dialog"
import type { SpotWithSectors, SectorRow } from "@/lib/data/spots"
import type { TeamName } from "@/lib/data/teams"
import { formatDate } from "@/utils/firestore"

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLE_LABELS: Record<string, string> = {
  sport: "Sportive",
  trad: "Trad",
  boulder: "Bloc",
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SectorTarget = { spotId: string; sectorId: string; name: string }
type SectorEditTarget = { spotId: string; spotName: string; sector: SectorRow }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StyleBadges({ styles }: { styles: string[] }) {
  if (!styles.length) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {styles.map((s) => (
        <Badge key={s} variant="secondary" className="text-xs">
          {STYLE_LABELS[s] ?? s}
        </Badge>
      ))}
    </div>
  )
}

function GradesCell({ grades, orientation }: { grades: SectorRow["grades"]; orientation?: string }) {
  const range = [grades.min, grades.max].filter(Boolean).join(" → ")
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {range && <span className="font-medium text-foreground tabular-nums">{range}</span>}
      {orientation && <span className="text-muted-foreground">{orientation}</span>}
      {!range && !orientation && <span>—</span>}
    </div>
  )
}

// ─── Export helper ────────────────────────────────────────────────────────────

async function exportSpots(ids: string[]) {
  const res = await fetch("/api/spots/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error("Échec de l'export")
  const payload = await res.json() as unknown
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `spots_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SpotsTable({ data, teams }: { data: SpotWithSectors[]; teams: TeamName[] }) {
  const teamById = React.useMemo(
    () => new Map(teams.map((t) => [t.id, t.name])),
    [teams]
  )
  const router = useRouter()

  // Spot-level selection & expansion
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())

  // Spot deletion dialog
  const [spotDeleteIds, setSpotDeleteIds] = React.useState<string[]>([])
  const [spotDeleting, setSpotDeleting] = React.useState(false)
  const [spotDeleteError, setSpotDeleteError] = React.useState("")

  // Sector deletion dialog
  const [sectorTarget, setSectorTarget] = React.useState<SectorTarget | null>(null)
  const [sectorDeleting, setSectorDeleting] = React.useState(false)
  const [sectorDeleteError, setSectorDeleteError] = React.useState("")

  // Sector add dialog
  const [addSectorFor, setAddSectorFor] = React.useState<{ id: string; name: string; teamId: string } | null>(null)

  // Edit dialogs
  const [spotEditTarget, setSpotEditTarget] = React.useState<SpotWithSectors | null>(null)
  const [sectorEditTarget, setSectorEditTarget] = React.useState<SectorEditTarget | null>(null)

  // Exporting
  const [exporting, setExporting] = React.useState(false)

  const allSelected = data.length > 0 && selected.size === data.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(data.map((s) => s.id)))

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ── Spot delete ──────────────────────────────────────────────────────────

  const handleSpotDeleteConfirm = async () => {
    setSpotDeleting(true)
    setSpotDeleteError("")
    try {
      const res = await fetch("/api/spots/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: spotDeleteIds }),
      })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error)
      }
      setSelected(new Set())
      setSpotDeleteIds([])
      router.refresh()
    } catch (err) {
      setSpotDeleteError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setSpotDeleting(false)
    }
  }

  // ── Sector delete ────────────────────────────────────────────────────────

  const handleSectorDeleteConfirm = async () => {
    if (!sectorTarget) return
    setSectorDeleting(true)
    setSectorDeleteError("")
    try {
      const res = await fetch("/api/sectors/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId: sectorTarget.spotId,
          sectorIds: [sectorTarget.sectorId],
        }),
      })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error)
      }
      setSectorTarget(null)
      router.refresh()
    } catch (err) {
      setSectorDeleteError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setSectorDeleting(false)
    }
  }

  // ── Export ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    const ids = selected.size ? [...selected] : data.map((s) => s.id)
    setExporting(true)
    try {
      await exportSpots(ids)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const exportLabel = selected.size
    ? `Exporter (${selected.size})`
    : `Exporter tout (${data.length})`

  const deleteTargets = selected.size ? [...selected] : data.map((s) => s.id)

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.size > 0 ? (
            <>
              <span className="font-medium text-foreground">{selected.size}</span> sélectionné
              {selected.size > 1 ? "s" : ""}
              {" · "}
              <button
                onClick={() => setSelected(new Set())}
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Tout désélectionner
              </button>
            </>
          ) : (
            `${data.length} spot${data.length > 1 ? "s" : ""}`
          )}
        </p>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exporting || data.length === 0}
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            {exportLabel}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { setSpotDeleteError(""); setSpotDeleteIds(deleteTargets) }}
            disabled={data.length === 0}
          >
            <Trash2 className="size-3.5" />
            {selected.size > 0
              ? `Supprimer (${selected.size})`
              : `Supprimer tout (${data.length})`}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 p-2">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Sélectionner tout"
                />
              </th>
              <th className="w-8 p-2" />
              <th className="p-2 text-left font-medium text-foreground">Spot / Secteur</th>
              <th className="p-2 text-left font-medium text-foreground hidden md:table-cell">
                Localisation
              </th>
              <th className="p-2 text-left font-medium text-foreground hidden xl:table-cell">
                Équipe
              </th>
              <th className="p-2 text-left font-medium text-foreground hidden sm:table-cell">
                Styles
              </th>
              <th className="p-2 text-left font-medium text-foreground hidden lg:table-cell">
                Grades
              </th>
              <th className="p-2 text-right font-medium text-foreground hidden lg:table-cell">
                Date
              </th>
              <th className="w-10 p-2" />
            </tr>
          </thead>

          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                  Aucun spot.
                </td>
              </tr>
            )}

            {data.map((spot) => {
              const isExpanded = expanded.has(spot.id)
              const isSelected = selected.has(spot.id)

              return (
                <React.Fragment key={spot.id}>
                  {/* ── Spot row ── */}
                  <tr
                    className={`border-b transition-colors hover:bg-muted/30 cursor-pointer ${
                      isSelected ? "bg-muted/50" : ""
                    }`}
                    onClick={() => toggleSelect(spot.id)}
                  >
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(spot.id)}
                      />
                    </td>

                    {/* Expand toggle */}
                    <td
                      className="p-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(spot.id)
                      }}
                    >
                      <button
                        className="flex items-center justify-center size-6 rounded hover:bg-muted transition-colors text-muted-foreground"
                        aria-label={isExpanded ? "Réduire" : "Développer"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                    </td>

                    {/* Name + sector count badge */}
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{spot.name}</span>
                        {spot.sectorCount > 0 && (
                          <Badge variant="outline" className="text-xs tabular-nums">
                            {spot.sectorCount} secteur{spot.sectorCount > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="p-2 hidden md:table-cell">
                      <div className="flex flex-col">
                        <span>{spot.address}</span>
                        <span className="text-xs text-muted-foreground">{spot.country}</span>
                      </div>
                    </td>

                    <td className="p-2 hidden xl:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {teamById.get(spot.teamId) ?? (
                          <span className="font-mono text-xs">{spot.teamId || "—"}</span>
                        )}
                      </span>
                    </td>

                    <td className="p-2 hidden sm:table-cell">
                      <StyleBadges styles={spot.styles} />
                    </td>

                    <td className="p-2 hidden lg:table-cell" />

                    <td className="p-2 text-right text-muted-foreground hidden lg:table-cell">
                      {formatDate(spot.createdAt)}
                    </td>

                    {/* Éditer le spot */}
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSpotEditTarget(spot)}
                        className="flex items-center justify-center size-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={`Modifier ${spot.name}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </td>
                  </tr>

                  {/* ── Sector sub-rows (when expanded) ── */}
                  {isExpanded && (
                    <>
                      {spot.sectors.length === 0 && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={2} />
                          <td
                            colSpan={7}
                            className="px-4 py-2 text-xs text-muted-foreground italic"
                          >
                            Aucun secteur pour ce spot.
                          </td>
                        </tr>
                      )}

                      {spot.sectors.map((sector) => (
                        <tr
                          key={sector.id}
                          className="border-b bg-muted/10 hover:bg-muted/20 transition-colors"
                        >
                          {/* Indent */}
                          <td colSpan={2} className="p-2">
                            <div className="flex justify-end pr-1">
                              <div className="w-4 h-4 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-sm" />
                            </div>
                          </td>

                          {/* Sector name */}
                          <td className="p-2">
                            <span className="text-sm">{sector.name}</span>
                          </td>

                          {/* Address col: style badges for sectors */}
                          <td className="p-2 hidden md:table-cell">
                            <StyleBadges styles={sector.style} />
                          </td>

                          {/* Équipe col: empty for sectors */}
                          <td className="p-2 hidden xl:table-cell" />

                          {/* Styles col: style badges (mobile) */}
                          <td className="p-2 hidden sm:table-cell md:hidden">
                            <StyleBadges styles={sector.style} />
                          </td>

                          {/* Grades + orientation */}
                          <td className="p-2 hidden lg:table-cell" colSpan={2}>
                            <GradesCell grades={sector.grades} orientation={sector.orientation} />
                          </td>

                          {/* Visible on sm, hidden sm already handled above */}
                          <td className="p-2 hidden sm:table-cell md:hidden lg:table-cell" />

                          {/* Éditer / supprimer le secteur */}
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setSectorEditTarget({
                                    spotId: spot.id,
                                    spotName: spot.name,
                                    sector,
                                  })
                                }
                                className="flex items-center justify-center size-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                aria-label={`Modifier ${sector.name}`}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSectorDeleteError("")
                                  setSectorTarget({
                                    spotId: spot.id,
                                    sectorId: sector.id,
                                    name: sector.name,
                                  })
                                }}
                                className="flex items-center justify-center size-7 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                aria-label={`Supprimer ${sector.name}`}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Add sector row */}
                      <tr className="border-b bg-muted/10">
                        <td colSpan={2} />
                        <td colSpan={7} className="p-2">
                          <button
                            onClick={() => setAddSectorFor({ id: spot.id, name: spot.name, teamId: spot.teamId })}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded"
                          >
                            <Plus className="size-3.5" />
                            Ajouter un secteur
                          </button>
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Spot delete confirmation dialog ── */}
      <Dialog
        open={spotDeleteIds.length > 0}
        onOpenChange={(o) => { if (!o && !spotDeleting) setSpotDeleteIds([]) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Supprimer {spotDeleteIds.length} spot{spotDeleteIds.length > 1 ? "s" : ""} ?
            </DialogTitle>
            <DialogDescription>
              Cette action est <strong>irréversible</strong>. Les spots et tous leurs secteurs
              seront supprimés définitivement.
            </DialogDescription>
          </DialogHeader>
          {spotDeleteError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {spotDeleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSpotDeleteIds([])}
              disabled={spotDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleSpotDeleteConfirm}
              disabled={spotDeleting}
            >
              {spotDeleting && <Loader2 className="size-4 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sector delete confirmation dialog ── */}
      <Dialog
        open={!!sectorTarget}
        onOpenChange={(o) => { if (!o && !sectorDeleting) setSectorTarget(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce secteur ?</DialogTitle>
            <DialogDescription>
              Le secteur <strong>{sectorTarget?.name}</strong> sera supprimé définitivement.
            </DialogDescription>
          </DialogHeader>
          {sectorDeleteError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {sectorDeleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSectorTarget(null)}
              disabled={sectorDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleSectorDeleteConfirm}
              disabled={sectorDeleting}
            >
              {sectorDeleting && <Loader2 className="size-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add sector dialog ── */}
      {addSectorFor && (
        <SectorAddDialog
          open={!!addSectorFor}
          onClose={() => setAddSectorFor(null)}
          spotId={addSectorFor.id}
          spotName={addSectorFor.name}
          teamId={addSectorFor.teamId}
          onAdded={() => { setAddSectorFor(null); router.refresh() }}
        />
      )}

      {/* ── Spot edit dialog ── */}
      {spotEditTarget && (
        <SpotEditDialog
          open={!!spotEditTarget}
          onClose={() => setSpotEditTarget(null)}
          spot={spotEditTarget}
          teams={teams}
          onSaved={() => { setSpotEditTarget(null); router.refresh() }}
        />
      )}

      {/* ── Sector edit dialog ── */}
      {sectorEditTarget && (
        <SectorEditDialog
          open={!!sectorEditTarget}
          onClose={() => setSectorEditTarget(null)}
          spotId={sectorEditTarget.spotId}
          spotName={sectorEditTarget.spotName}
          sector={sectorEditTarget.sector}
          onSaved={() => { setSectorEditTarget(null); router.refresh() }}
        />
      )}
    </>
  )
}
