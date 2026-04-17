"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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

const STYLES = [
  { value: "sport", label: "Sportive" },
  { value: "trad", label: "Trad" },
  { value: "boulder", label: "Bloc" },
]

const ORIENTATIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

type Props = {
  open: boolean
  onClose: () => void
  spotId: string
  spotName: string
  teamId: string
  onAdded: () => void
}

export function SectorAddDialog({ open, onClose, spotId, spotName, teamId, onAdded }: Props) {
  const [name, setName] = React.useState("")
  const [style, setStyle] = React.useState<string[]>([])
  const [gradeMin, setGradeMin] = React.useState("")
  const [gradeMax, setGradeMax] = React.useState("")
  const [orientation, setOrientation] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const reset = () => {
    setName("")
    setStyle([])
    setGradeMin("")
    setGradeMax("")
    setOrientation("")
    setError("")
  }

  const handleClose = () => { reset(); onClose() }

  const toggleStyle = (s: string) =>
    setStyle((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Le nom est requis."); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/sectors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId,
          teamId,
          data: {
            name: name.trim(),
            style,
            grades: { min: gradeMin.trim(), max: gradeMax.trim() },
            ...(orientation ? { orientation } : {}),
            addedBy: "admin",
          },
        }),
      })
      if (!res.ok) {
        const { error: e } = await res.json() as { error: string }
        throw new Error(e)
      }
      onAdded()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un secteur</DialogTitle>
          <DialogDescription className="truncate">
            Spot : <span className="font-medium text-foreground">{spotName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sector-name">Nom *</Label>
            <Input
              id="sector-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Secteur principal"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
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
              <Label htmlFor="grade-min">Grade min</Label>
              <Input
                id="grade-min"
                value={gradeMin}
                onChange={(e) => setGradeMin(e.target.value)}
                placeholder="6a"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grade-max">Grade max</Label>
              <Input
                id="grade-max"
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
                {ORIENTATIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
