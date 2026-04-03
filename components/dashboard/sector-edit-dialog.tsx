"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PhotoUploadButton } from "@/components/dashboard/photo-upload-button"
import type { SectorRow } from "@/lib/data/spots"

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLES = [
  { value: "sport", label: "Sportive" },
  { value: "trad", label: "Trad" },
  { value: "boulder", label: "Bloc" },
]

const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

// Valeur de select qui représente "aucune orientation"
const NO_ORIENTATION = "__none__"

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean
  onClose: () => void
  spotId: string
  spotName: string
  sector: SectorRow
  onSaved: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SectorEditDialog({ open, onClose, spotId, spotName, sector, onSaved }: Props) {
  const [name, setName] = React.useState(sector.name)
  const [description, setDescription] = React.useState(sector.description)
  const [style, setStyle] = React.useState<string[]>(sector.style)
  const [gradeMin, setGradeMin] = React.useState(sector.grades.min)
  const [gradeMax, setGradeMax] = React.useState(sector.grades.max)
  const [orientation, setOrientation] = React.useState(sector.orientation ?? NO_ORIENTATION)
  const [photoUrl, setPhotoUrl] = React.useState(sector.photoUrl ?? "")
  const [imgError, setImgError] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  // Re-sync si le secteur change
  React.useEffect(() => {
    setName(sector.name)
    setDescription(sector.description)
    setStyle(sector.style)
    setGradeMin(sector.grades.min)
    setGradeMax(sector.grades.max)
    setOrientation(sector.orientation ?? NO_ORIENTATION)
    setPhotoUrl(sector.photoUrl ?? "")
    setImgError(false)
    setError("")
  }, [sector])

  const toggleStyle = (s: string) =>
    setStyle((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Le nom est requis."); return }
    setLoading(true)
    setError("")

    const selectedOrientation = orientation === NO_ORIENTATION ? null : orientation

    try {
      const res = await fetch("/api/sectors/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId,
          sectorId: sector.id,
          data: {
            name: name.trim(),
            description: description.trim(),
            style,
            grades: { min: gradeMin.trim(), max: gradeMax.trim() },
            orientation: selectedOrientation,
            photoUrl: photoUrl.trim() || null,
          },
        }),
      })

      if (!res.ok) {
        const { error: e } = await res.json() as { error: string }
        throw new Error(e)
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le secteur</DialogTitle>
          <DialogDescription className="truncate">
            Spot : <span className="font-medium text-foreground">{spotName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sector-edit-name">Nom *</Label>
            <Input
              id="sector-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Secteur principal"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sector-edit-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            <Textarea
              id="sector-edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du secteur…"
              className="min-h-[72px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Style</Label>
            <div className="flex gap-5">
              {STYLES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={style.includes(value)}
                    onCheckedChange={() => toggleStyle(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sector-edit-grade-min">Grade min</Label>
              <Input
                id="sector-edit-grade-min"
                value={gradeMin}
                onChange={(e) => setGradeMin(e.target.value)}
                placeholder="6a"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sector-edit-grade-max">Grade max</Label>
              <Input
                id="sector-edit-grade-max"
                value={gradeMax}
                onChange={(e) => setGradeMax(e.target.value)}
                placeholder="7b"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Orientation</Label>
            <Select value={orientation} onValueChange={setOrientation}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ORIENTATION}>
                  <span className="text-muted-foreground">Aucune</span>
                </SelectItem>
                {ORIENTATIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Photo */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sector-edit-photo">
              URL de la photo{" "}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            {photoUrl && !imgError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Aperçu"
                onError={() => setImgError(true)}
                className="h-24 w-full rounded-md border object-cover"
              />
            )}
            <div className="flex gap-2">
              <Input
                id="sector-edit-photo"
                type="url"
                value={photoUrl}
                onChange={(e) => { setPhotoUrl(e.target.value); setImgError(false) }}
                placeholder="https://…"
              />
              <PhotoUploadButton
                disabled={loading}
                onUploaded={(url) => { setPhotoUrl(url); setImgError(false) }}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
