"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileJson,
  FormInput,
  Upload,
} from "lucide-react"
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

import { type FormState, type ParsedPreview, type SpotStyle, parseImportJson, buildFormPayload } from "@/lib/import-utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportMode = "form" | "json"
type Status = "idle" | "loading" | "success" | "error"

// ─── Form mode ───────────────────────────────────────────────────────────────

const STYLE_OPTIONS: { value: SpotStyle; label: string }[] = [
  { value: "sport", label: "Sportive" },
  { value: "trad", label: "Trad" },
  { value: "boulder", label: "Bloc" },
]

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  address: "",
  country: "",
  lat: "",
  lng: "",
  styles: [],
  parkingLat: "",
  parkingLng: "",
  parkingNote: "",
  photoUrl: "",
  addedBy: "admin",
}

// ─── JSON mode ───────────────────────────────────────────────────────────────

// ─── Main component ───────────────────────────────────────────────────────────

export function SpotImportDialog({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<ImportMode>("json")

  // Form state
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM)

  // JSON state
  const [jsonText, setJsonText] = React.useState("")
  const [preview, setPreview] = React.useState<ParsedPreview | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Shared
  const [status, setStatus] = React.useState<Status>("idle")
  const [errorMsg, setErrorMsg] = React.useState("")
  const [successMsg, setSuccessMsg] = React.useState("")

  const reset = () => {
    setForm(INITIAL_FORM)
    setJsonText("")
    setPreview(null)
    setStatus("idle")
    setErrorMsg("")
    setSuccessMsg("")
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    setOpen(next)
  }

  const setFormField = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleStyle = (style: SpotStyle) =>
    setForm((prev) => ({
      ...prev,
      styles: prev.styles.includes(style)
        ? prev.styles.filter((s) => s !== style)
        : [...prev.styles, style],
    }))

  const handleJsonChange = (text: string) => {
    setJsonText(text)
    setPreview(text.trim() ? parseImportJson(text) : null)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? ""
      setJsonText(text)
      setPreview(parseImportJson(text))
    }
    reader.readAsText(file)
    // Reset file input so the same file can be re-selected
    e.target.value = ""
  }

  const submit = async (payload: unknown) => {
    setStatus("loading")
    setErrorMsg("")
    try {
      const res = await fetch("/api/spots/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      type ApiResponse = { imported?: number; error?: string; issues?: { path: string; message: string }[] }
      const data = await res.json() as ApiResponse

      if (!res.ok) {
        setStatus("error")
        const detail = data.issues?.map((i) => `${i.path || "racine"}: ${i.message}`).join("\n")
        setErrorMsg(detail ?? data.error ?? "Une erreur est survenue.")
        return
      }

      setSuccessMsg(
        `${data.imported} spot${(data.imported ?? 0) > 1 ? "s" : ""} importé${(data.imported ?? 0) > 1 ? "s" : ""} avec succès !`
      )
      setStatus("success")
      router.refresh()
      onSuccess?.()
      setTimeout(() => handleOpenChange(false), 1800)
    } catch {
      setStatus("error")
      setErrorMsg("Impossible de contacter le serveur.")
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.styles.length === 0) {
      setStatus("error")
      setErrorMsg("Sélectionnez au moins un style d'escalade.")
      return
    }
    const payload = buildFormPayload(form)
    if (!payload) {
      setStatus("error")
      setErrorMsg("Les coordonnées GPS doivent être des nombres valides.")
      return
    }
    await submit(payload)
  }

  const handleJsonSubmit = async () => {
    if (!preview?.ok) return
    await submit(preview.raw)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Importer un spot
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importer un spot</DialogTitle>
            <DialogDescription>
              Via le formulaire pour un spot manuel, ou via JSON pour importer
              plusieurs spots avec leurs secteurs.
            </DialogDescription>
          </DialogHeader>

          {/* Success screen */}
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <CheckCircle2 className="size-12 text-green-500" />
              <p className="font-medium">{successMsg}</p>
            </div>
          ) : (
            <>
              {/* Mode switcher */}
              <div className="flex gap-1 rounded-lg border p-1 bg-muted/40">
                <button
                  type="button"
                  onClick={() => { setMode("json"); reset() }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === "json"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileJson className="size-4" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("form"); reset() }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === "form"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FormInput className="size-4" />
                  Formulaire
                </button>
              </div>

              {/* ── JSON mode ── */}
              {mode === "json" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Collez ou chargez un fichier JSON au format{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs">
                        {"{ data: [...] }"}
                      </code>
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-3.5" />
                      Charger un fichier
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  <Textarea
                    value={jsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    placeholder={'{\n  "data": [\n    {\n      "name": "Mon Spot",\n      "description": "...",\n      "location": { "lat": 48.4, "lng": 2.6, "address": "...", "country": "France" },\n      "styles": ["sport"],\n      "sectors": []\n    }\n  ]\n}'}
                    className="min-h-[200px] font-mono text-xs"
                  />

                  {/* Preview */}
                  {preview && (
                    <div
                      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                        preview.ok
                          ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
                          : "border-destructive/30 bg-destructive/5 text-destructive"
                      }`}
                    >
                      {preview.ok ? (
                        <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="size-4 mt-0.5 shrink-0" />
                      )}
                      <span>
                        {preview.ok
                          ? `${preview.count} spot${preview.count > 1 ? "s" : ""} détecté${preview.count > 1 ? "s" : ""} · ${preview.sectorCount} secteur${preview.sectorCount > 1 ? "s" : ""}`
                          : preview.error}
                      </span>
                    </div>
                  )}

                  {/* Error */}
                  {status === "error" && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="size-4 mt-0.5 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      disabled={status === "loading"}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      onClick={handleJsonSubmit}
                      disabled={!preview?.ok || status === "loading"}
                    >
                      {status === "loading" && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Importer{preview?.ok ? ` (${preview.count})` : ""}
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {/* ── Form mode ── */}
              {mode === "form" && (
                <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
                  <fieldset className="flex flex-col gap-3">
                    <legend className="text-sm font-semibold mb-1">
                      Informations générales
                    </legend>
                    <div className="grid gap-1.5">
                      <Label htmlFor="name">Nom *</Label>
                      <Input
                        id="name"
                        required
                        minLength={2}
                        placeholder="Fontainebleau"
                        value={form.name}
                        onChange={(e) => setFormField("name", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        required
                        placeholder="Description du site d'escalade…"
                        value={form.description}
                        onChange={(e) => setFormField("description", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="addedBy">Ajouté par</Label>
                      <Input
                        id="addedBy"
                        placeholder="admin"
                        value={form.addedBy}
                        onChange={(e) => setFormField("addedBy", e.target.value)}
                      />
                    </div>
                  </fieldset>

                  <fieldset className="flex flex-col gap-3">
                    <legend className="text-sm font-semibold mb-1">
                      Localisation *
                    </legend>
                    <div className="grid gap-1.5">
                      <Label htmlFor="address">Adresse</Label>
                      <Input
                        id="address"
                        required
                        placeholder="Forêt de Fontainebleau, 77"
                        value={form.address}
                        onChange={(e) => setFormField("address", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="country">Pays</Label>
                      <Input
                        id="country"
                        required
                        placeholder="France"
                        value={form.country}
                        onChange={(e) => setFormField("country", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="lat">Latitude</Label>
                        <Input
                          id="lat"
                          required
                          type="number"
                          step="any"
                          placeholder="48.4167"
                          value={form.lat}
                          onChange={(e) => setFormField("lat", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="lng">Longitude</Label>
                        <Input
                          id="lng"
                          required
                          type="number"
                          step="any"
                          placeholder="2.6833"
                          value={form.lng}
                          onChange={(e) => setFormField("lng", e.target.value)}
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="flex flex-col gap-2">
                    <legend className="text-sm font-semibold mb-1">
                      Styles d'escalade *
                    </legend>
                    <div className="flex gap-4">
                      {STYLE_OPTIONS.map(({ value, label }) => (
                        <label
                          key={value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={form.styles.includes(value)}
                            onCheckedChange={() => toggleStyle(value)}
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="flex flex-col gap-3">
                    <legend className="text-sm font-semibold mb-1">
                      Parking{" "}
                      <span className="font-normal text-muted-foreground">
                        (optionnel)
                      </span>
                    </legend>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="parkingLat">Latitude</Label>
                        <Input
                          id="parkingLat"
                          type="number"
                          step="any"
                          placeholder="48.4200"
                          value={form.parkingLat}
                          onChange={(e) => setFormField("parkingLat", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="parkingLng">Longitude</Label>
                        <Input
                          id="parkingLng"
                          type="number"
                          step="any"
                          placeholder="2.6850"
                          value={form.parkingLng}
                          onChange={(e) => setFormField("parkingLng", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="parkingNote">Note</Label>
                      <Input
                        id="parkingNote"
                        placeholder="Parking gratuit, 20 places"
                        value={form.parkingNote}
                        onChange={(e) => setFormField("parkingNote", e.target.value)}
                      />
                    </div>
                  </fieldset>

                  <div className="grid gap-1.5">
                    <Label htmlFor="photoUrl">
                      URL de la photo{" "}
                      <span className="font-normal text-muted-foreground">
                        (optionnel)
                      </span>
                    </Label>
                    <Input
                      id="photoUrl"
                      type="url"
                      placeholder="https://…"
                      value={form.photoUrl}
                      onChange={(e) => setFormField("photoUrl", e.target.value)}
                    />
                  </div>

                  {status === "error" && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      <AlertCircle className="size-4 mt-0.5 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      disabled={status === "loading"}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={status === "loading"}>
                      {status === "loading" && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Importer le spot
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
