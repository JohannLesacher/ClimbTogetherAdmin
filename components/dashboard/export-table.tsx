"use client"

import * as React from "react"
import { Download, Loader2, Trash2 } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Column } from "@/components/dashboard/data-table"

type ExportTableProps<T extends { id: string }> = {
  columns: Column<T>[]
  data: T[]
  exportFilename: string
  emptyMessage?: string
  /** Override default client-side export. Receives the IDs to export (all if nothing selected). */
  onExport?: (ids: string[]) => Promise<void>
  /** Provide to enable deletion. Receives the IDs to delete (all if nothing selected). */
  onDelete?: (ids: string[]) => Promise<void>
  entityLabel?: { singular: string; plural: string }
}

export function ExportTable<T extends { id: string }>({
  columns,
  data,
  exportFilename,
  emptyMessage = "Aucune donnée.",
  onExport,
  onDelete,
  entityLabel = { singular: "élément", plural: "éléments" },
}: ExportTableProps<T>) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [exporting, setExporting] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState("")

  const allSelected = data.length > 0 && selected.size === data.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(data.map((r) => r.id)))

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  // ── Export ──────────────────────────────────────────────────────────────────

  const triggerDownload = (json: string, filename: string) => {
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    const ids = selected.size > 0 ? [...selected] : data.map((r) => r.id)
    setExporting(true)
    try {
      if (onExport) {
        await onExport(ids)
      } else {
        const rows = data.filter((r) => ids.includes(r.id))
        triggerDownload(
          JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, data: rows }, null, 2),
          `${exportFilename}_${new Date().toISOString().slice(0, 10)}.json`
        )
      }
    } finally {
      setExporting(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  const deleteIds = selected.size > 0 ? [...selected] : data.map((r) => r.id)
  const deleteCount = deleteIds.length

  const handleDeleteConfirm = async () => {
    if (!onDelete) return
    setDeleting(true)
    setDeleteError("")
    try {
      await onDelete(deleteIds)
      setSelected(new Set())
      setConfirmOpen(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Une erreur est survenue.")
    } finally {
      setDeleting(false)
    }
  }

  const exportCount = selected.size > 0 ? selected.size : data.length

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {selected.size > 0 ? (
              <>
                <span className="font-medium text-foreground">{selected.size}</span>{" "}
                sélectionné{selected.size > 1 ? "s" : ""}
                {" · "}
                <button
                  onClick={() => setSelected(new Set())}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  Tout désélectionner
                </button>
              </>
            ) : (
              `${data.length} ${data.length > 1 ? entityLabel.plural : entityLabel.singular}`
            )}
          </p>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={data.length === 0 || exporting}
            >
              {exporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              {exportCount < data.length
                ? `Exporter (${exportCount})`
                : `Exporter tout (${exportCount})`}
            </Button>

            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { setDeleteError(""); setConfirmOpen(true) }}
                disabled={data.length === 0}
              >
                <Trash2 className="size-3.5" />
                {selected.size > 0
                  ? `Supprimer (${selected.size})`
                  : `Supprimer tout (${data.length})`}
              </Button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Sélectionner tout"
                  />
                </TableHead>
                {columns.map((col, i) => (
                  <TableHead key={i} className={col.className}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={selected.has(row.id) ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => toggleRow(row.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                        aria-label="Sélectionner la ligne"
                      />
                    </TableCell>
                    {columns.map((col, j) => (
                      <TableCell key={j} className={col.className}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Confirmation dialog ── */}
      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!deleting) setConfirmOpen(o) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Supprimer {deleteCount}{" "}
              {deleteCount > 1 ? entityLabel.plural : entityLabel.singular} ?
            </DialogTitle>
            <DialogDescription>
              Cette action est <strong>irréversible</strong>. Les données supprimées
              ne pourront pas être récupérées.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
