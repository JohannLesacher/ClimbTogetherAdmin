"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  LayoutGrid,
  List,
  Trash2,
  Upload,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
} from "lucide-react"
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
import type { PhotoFile } from "@/app/api/photos/route"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(ms: number): string {
  if (!ms) return "—"
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ms))
}

// ─── Upload zone ─────────────────────────────────────────────────────────────

type UploadState =
  | { status: "idle" }
  | { status: "processing"; progress: number; total: number }
  | { status: "done"; count: number; savedKB: number }
  | { status: "error"; message: string }

function UploadZone({ onUploaded }: { onUploaded: () => void }) {
  const [dragging, setDragging] = React.useState(false)
  const [uploadState, setUploadState] = React.useState<UploadState>({ status: "idle" })
  const inputRef = React.useRef<HTMLInputElement>(null)

  const processFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"))
    if (imageFiles.length === 0) return

    setUploadState({ status: "processing", progress: 0, total: imageFiles.length })

    const formData = new FormData()
    imageFiles.forEach((f) => formData.append("files", f))

    try {
      const res = await fetch("/api/photos/upload", { method: "POST", body: formData })
      const data = await res.json() as {
        uploaded?: Array<{ originalSize: number; compressedSize: number }>
        error?: string
      }

      if (!res.ok) throw new Error(data.error ?? "Erreur upload")

      const saved = (data.uploaded ?? []).reduce(
        (acc, f) => acc + (f.originalSize - f.compressedSize),
        0
      )
      setUploadState({ status: "done", count: imageFiles.length, savedKB: Math.round(saved / 1024) })
      onUploaded()
      setTimeout(() => setUploadState({ status: "idle" }), 3000)
    } catch (err) {
      setUploadState({
        status: "error",
        message: err instanceof Error ? err.message : "Erreur inconnue",
      })
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => uploadState.status === "idle" && inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer ${
        dragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files && processFiles(e.target.files)}
      />

      {uploadState.status === "idle" && (
        <>
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Glissez des images ici ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Redimensionnement auto ≤ 1280px · JPEG quality 75
            </p>
          </div>
        </>
      )}

      {uploadState.status === "processing" && (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium">
            Traitement et upload en cours…
          </p>
        </div>
      )}

      {uploadState.status === "done" && (
        <div className="flex flex-col items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-8" />
          <p className="text-sm font-medium">
            {uploadState.count} photo{uploadState.count > 1 ? "s" : ""} importée
            {uploadState.count > 1 ? "s" : ""}
          </p>
          <p className="text-xs opacity-75">
            {uploadState.savedKB > 0 ? `−${uploadState.savedKB} KB sauvegardés` : "Aucune réduction (images déjà optimisées)"}
          </p>
        </div>
      )}

      {uploadState.status === "error" && (
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="size-8" />
          <p className="text-sm font-medium">{uploadState.message}</p>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type ViewMode = "grid" | "list"

export function PhotosManager({ initialPhotos }: { initialPhotos: PhotoFile[] }) {
  const router = useRouter()
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState("")
  const [lightbox, setLightbox] = React.useState<PhotoFile | null>(null)

  const allSelected = initialPhotos.length > 0 && selected.size === initialPhotos.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(initialPhotos.map((p) => p.path)))

  const toggleItem = (path: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })

  const deleteTargets = selected.size > 0
    ? [...selected]
    : initialPhotos.map((p) => p.path)

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    setDeleteError("")
    try {
      const res = await fetch("/api/photos/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: deleteTargets }),
      })
      if (!res.ok) {
        const { error } = await res.json() as { error: string }
        throw new Error(error)
      }
      setSelected(new Set())
      setConfirmOpen(false)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Upload zone */}
        <UploadZone onUploaded={() => router.refresh()} />

        {/* Toolbar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {selected.size > 0 ? (
              <>
                <span className="font-medium text-foreground">{selected.size}</span>{" "}
                sélectionnée{selected.size > 1 ? "s" : ""}
                {" · "}
                <button
                  onClick={() => setSelected(new Set())}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Tout désélectionner
                </button>
              </>
            ) : (
              `${initialPhotos.length} photo${initialPhotos.length > 1 ? "s" : ""}`
            )}
          </p>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-md border overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-muted" : "hover:bg-muted/50"}`}
                aria-label="Vue grille"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-muted" : "hover:bg-muted/50"}`}
                aria-label="Vue liste"
              >
                <List className="size-4" />
              </button>
            </div>

            <Button
              variant="destructive"
              size="sm"
              disabled={initialPhotos.length === 0}
              onClick={() => { setDeleteError(""); setConfirmOpen(true) }}
            >
              <Trash2 className="size-3.5" />
              {selected.size > 0
                ? `Supprimer (${selected.size})`
                : `Supprimer tout (${initialPhotos.length})`}
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {initialPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border py-16 text-muted-foreground">
            <ImageIcon className="size-10 opacity-30" />
            <p className="text-sm">Aucune photo dans le bucket</p>
          </div>
        )}

        {/* Grid view */}
        {viewMode === "grid" && initialPhotos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {initialPhotos.map((photo) => (
              <div
                key={photo.path}
                className={`group relative aspect-square overflow-hidden rounded-lg border cursor-pointer transition-all ${
                  selected.has(photo.path) ? "ring-2 ring-primary ring-offset-1" : ""
                }`}
                onClick={() => toggleItem(photo.path)}
              >
                <Image
                  src={photo.url}
                  alt={photo.filename}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform group-hover:scale-105"
                  unoptimized // signed URLs change every render; skip Next.js optimization cache
                />

                {/* Selection overlay */}
                <div className={`absolute inset-0 bg-black/30 transition-opacity ${
                  selected.has(photo.path) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`} />

                {/* Checkbox */}
                <div
                  className="absolute left-2 top-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selected.has(photo.path)}
                    onCheckedChange={() => toggleItem(photo.path)}
                    className="bg-white/90 border-white"
                  />
                </div>

                {/* Enlarge button */}
                <button
                  className="absolute right-2 top-2 rounded-md bg-black/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setLightbox(photo) }}
                  aria-label="Agrandir"
                >
                  <ImageIcon className="size-3.5 text-white" />
                </button>

                {/* Filename */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] text-white truncate">{photo.filename}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {viewMode === "list" && initialPhotos.length > 0 && (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="w-10 p-2">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label="Sélectionner tout"
                    />
                  </th>
                  <th className="w-12 p-2" />
                  <th className="p-2 text-left font-medium text-foreground">Fichier</th>
                  <th className="p-2 text-left font-medium text-foreground hidden sm:table-cell">Dossier</th>
                  <th className="p-2 text-right font-medium text-foreground hidden md:table-cell">Taille</th>
                  <th className="p-2 text-right font-medium text-foreground hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {initialPhotos.map((photo) => (
                  <tr
                    key={photo.path}
                    className={`border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selected.has(photo.path) ? "bg-muted" : ""
                    }`}
                    onClick={() => toggleItem(photo.path)}
                  >
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(photo.path)}
                        onCheckedChange={() => toggleItem(photo.path)}
                      />
                    </td>
                    <td className="p-2">
                      <div
                        className="relative size-10 overflow-hidden rounded-md bg-muted cursor-zoom-in"
                        onClick={(e) => { e.stopPropagation(); setLightbox(photo) }}
                      >
                        <Image
                          src={photo.url}
                          alt={photo.filename}
                          fill
                          sizes="40px"
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </td>
                    <td className="p-2 font-medium max-w-[200px] truncate">{photo.filename}</td>
                    <td className="p-2 text-muted-foreground hidden sm:table-cell">
                      {photo.folder || <span className="italic opacity-50">racine</span>}
                    </td>
                    <td className="p-2 text-right text-muted-foreground hidden md:table-cell tabular-nums">
                      {formatBytes(photo.size)}
                    </td>
                    <td className="p-2 text-right text-muted-foreground hidden lg:table-cell">
                      {formatDate(photo.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!deleting) setConfirmOpen(o) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Supprimer {deleteTargets.length} photo{deleteTargets.length > 1 ? "s" : ""} ?
            </DialogTitle>
            <DialogDescription>
              Cette action est <strong>irréversible</strong>. Les fichiers seront
              supprimés définitivement de Firebase Storage.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="size-5" />
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.filename}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
            <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 px-4 py-2 text-sm text-white">
              <p className="font-medium">{lightbox.filename}</p>
              <p className="text-xs opacity-75">
                {formatBytes(lightbox.size)} · {lightbox.folder || "racine"} · {formatDate(lightbox.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
