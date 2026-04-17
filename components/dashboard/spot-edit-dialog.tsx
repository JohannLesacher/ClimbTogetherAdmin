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
import type { SpotRow } from "@/lib/data/spots"
import type { TeamName } from "@/lib/data/teams"

// ─── Types ────────────────────────────────────────────────────────────────────

type SpotStyle = "sport" | "trad" | "boulder"

const STYLE_OPTIONS: { value: SpotStyle; label: string }[] = [
  { value: "sport", label: "Sportive" },
  { value: "trad", label: "Trad" },
  { value: "boulder", label: "Bloc" },
]

type Props = {
  open: boolean
  onClose: () => void
  spot: SpotRow
  teams: TeamName[]
  onSaved: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SpotEditDialog({ open, onClose, spot, teams, onSaved }: Props) {
  // Formulaire initialisé avec les données existantes
  const [name, setName] = React.useState(spot.name)
  const [description, setDescription] = React.useState(spot.description)
  const [address, setAddress] = React.useState(spot.address)
  const [country, setCountry] = React.useState(spot.country)
  const [lat, setLat] = React.useState(String(spot.lat))
  const [lng, setLng] = React.useState(String(spot.lng))
  const [styles, setStyles] = React.useState<SpotStyle[]>(spot.styles as SpotStyle[])
  const [teamId, setTeamId] = React.useState(spot.teamId)
  const [parkingLat, setParkingLat] = React.useState(String(spot.parking?.lat ?? ""))
  const [parkingLng, setParkingLng] = React.useState(String(spot.parking?.lng ?? ""))
  const [parkingNote, setParkingNote] = React.useState(spot.parking?.note ?? "")
  const [photoUrl, setPhotoUrl] = React.useState(spot.photoUrl ?? "")
  const [imgError, setImgError] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  // Re-sync si le spot change (ouverture sur un spot différent)
  React.useEffect(() => {
    setName(spot.name)
    setDescription(spot.description)
    setAddress(spot.address)
    setCountry(spot.country)
    setLat(String(spot.lat))
    setLng(String(spot.lng))
    setStyles(spot.styles as SpotStyle[])
    setTeamId(spot.teamId)
    setParkingLat(String(spot.parking?.lat ?? ""))
    setParkingLng(String(spot.parking?.lng ?? ""))
    setParkingNote(spot.parking?.note ?? "")
    setPhotoUrl(spot.photoUrl ?? "")
    setImgError(false)
    setError("")
  }, [spot])

  const toggleStyle = (s: SpotStyle) =>
    setStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const parsedLat = parseFloat(lat)
    const parsedLng = parseFloat(lng)
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setError("Les coordonnées GPS doivent être des nombres valides.")
      return
    }

    if (!teamId) {
      setError("L'équipe est requise.")
      return
    }

    const hasParking = parkingLat !== "" || parkingLng !== ""
    const parsedParkingLat = parseFloat(parkingLat)
    const parsedParkingLng = parseFloat(parkingLng)
    if (hasParking && (isNaN(parsedParkingLat) || isNaN(parsedParkingLng))) {
      setError("Les coordonnées GPS du parking doivent être des nombres valides.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/spots/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotId: spot.id,
          data: {
            name: name.trim(),
            description: description.trim(),
            location: {
              lat: parsedLat,
              lng: parsedLng,
              address: address.trim(),
              country: country.trim(),
            },
            styles,
            teamId,
            // null si le parking a été vidé alors qu'il existait, pour supprimer le champ
            parking: hasParking
              ? { lat: parsedParkingLat, lng: parsedParkingLng, note: parkingNote.trim() || undefined }
              : spot.parking
                ? null
                : undefined,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le spot</DialogTitle>
          <DialogDescription className="truncate">
            ID : <span className="font-mono text-xs">{spot.id}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Infos générales */}
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold mb-1">Informations générales</legend>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">Nom *</Label>
              <Input
                id="edit-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fontainebleau"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du site…"
                className="min-h-[80px]"
              />
            </div>
          </fieldset>

          {/* Localisation */}
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold mb-1">Localisation</legend>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-address">Adresse</Label>
              <Input
                id="edit-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Forêt de Fontainebleau, 77"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-country">Pays</Label>
              <Input
                id="edit-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="France"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-lat">Latitude</Label>
                <Input
                  id="edit-lat"
                  type="number"
                  step="any"
                  required
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="48.4167"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-lng">Longitude</Label>
                <Input
                  id="edit-lng"
                  type="number"
                  step="any"
                  required
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="2.6833"
                />
              </div>
            </div>
          </fieldset>

          {/* Styles */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-semibold mb-1">Styles d'escalade</legend>
            <div className="flex gap-5">
              {STYLE_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={styles.includes(value)}
                    onCheckedChange={() => toggleStyle(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Équipe */}
          <div className="grid gap-1.5">
            <Label htmlFor="edit-team">Équipe *</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger id="edit-team">
                <SelectValue placeholder="Sélectionner une équipe" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parking */}
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold mb-1">
              Parking{" "}
              <span className="font-normal text-muted-foreground">(optionnel — vider les coords pour supprimer)</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-parking-lat">Latitude</Label>
                <Input
                  id="edit-parking-lat"
                  type="number"
                  step="any"
                  value={parkingLat}
                  onChange={(e) => setParkingLat(e.target.value)}
                  placeholder="48.4200"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-parking-lng">Longitude</Label>
                <Input
                  id="edit-parking-lng"
                  type="number"
                  step="any"
                  value={parkingLng}
                  onChange={(e) => setParkingLng(e.target.value)}
                  placeholder="2.6850"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-parking-note">Note</Label>
              <Input
                id="edit-parking-note"
                value={parkingNote}
                onChange={(e) => setParkingNote(e.target.value)}
                placeholder="Parking gratuit, 20 places"
              />
            </div>
          </fieldset>

          {/* Photo */}
          <div className="grid gap-1.5">
            <Label htmlFor="edit-photo">
              URL de la photo{" "}
              <span className="font-normal text-muted-foreground">(optionnel)</span>
            </Label>
            {photoUrl && !imgError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Aperçu"
                onError={() => setImgError(true)}
                className="h-32 w-full rounded-md border object-cover"
              />
            )}
            <div className="flex gap-2">
              <Input
                id="edit-photo"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
