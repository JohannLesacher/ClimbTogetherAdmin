"use client"

import * as React from "react"
import { Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type UploadResponse = {
  uploaded?: Array<{ permanentUrl: string }>
  error?: string
}

type Props = {
  /** Appelé avec l'URL permanente Firebase Storage après un upload réussi. */
  onUploaded: (permanentUrl: string) => void
  disabled?: boolean
}

/**
 * Bouton d'import rapide d'une photo vers Firebase Storage.
 * Retourne l'URL permanente (token-based) pour stockage en base.
 */
export function PhotoUploadButton({ onUploaded, disabled }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleFile = async (file: File) => {
    setLoading(true)
    setError("")

    const formData = new FormData()
    formData.append("files", file)

    try {
      const res = await fetch("/api/photos/upload", { method: "POST", body: formData })
      const data = await res.json() as UploadResponse

      if (!res.ok || !data.uploaded?.length) {
        throw new Error(data.error ?? "Erreur upload")
      }

      onUploaded(data.uploaded[0].permanentUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        disabled={loading || disabled}
        onClick={() => inputRef.current?.click()}
      >
        {loading
          ? <Loader2 className="size-3.5 animate-spin" />
          : <Upload className="size-3.5" />
        }
        {loading ? "Upload…" : "Importer"}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
