"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { ExportTable } from "@/components/dashboard/export-table"
import type { Column } from "@/components/dashboard/data-table"
import type { TripRow, TripStatus } from "@/lib/data/trips"
import { formatDate } from "@/utils/firestore"

const STATUS_CONFIG: Record<
  TripStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  planning: { label: "Planification", variant: "secondary" },
  confirmed: { label: "Confirmée", variant: "default" },
  done: { label: "Terminée", variant: "outline" },
  cancelled: { label: "Annulée", variant: "destructive" },
}

const columns: Column<TripRow>[] = [
  {
    header: "Sortie",
    cell: (row) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.title}</span>
      </div>
    ),
  },
  {
    header: "Statut",
    cell: (row) => {
      const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.planning
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>
    },
  },
  {
    header: "Durée",
    cell: (row) => (
      <span className="text-muted-foreground tabular-nums">
        {row.durationDays === 1 ? "Journée" : `${row.durationDays}j`}
      </span>
    ),
  },
  {
    header: "Participants",
    className: "text-center hidden sm:table-cell",
    cell: (row) => <span className="tabular-nums">{row.participantCount}</span>,
  },
  {
    header: "Voies",
    className: "text-center hidden sm:table-cell",
    cell: (row) => <span className="tabular-nums">{row.routeCount}</span>,
  },
  {
    header: "Dépenses",
    className: "text-center hidden md:table-cell",
    cell: (row) => <span className="tabular-nums">{row.expenseCount}</span>,
  },
  {
    header: "Créée le",
    className: "text-right hidden lg:table-cell",
    cell: (row) => (
      <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
    ),
  },
]

export function TripsTable({ data }: { data: TripRow[] }) {
  const router = useRouter()

  const handleDelete = async (ids: string[]) => {
    const res = await fetch("/api/trips/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) {
      const { error } = await res.json() as { error: string }
      throw new Error(error ?? "Erreur serveur")
    }
    router.refresh()
  }

  return (
    <ExportTable
      columns={columns}
      data={data}
      exportFilename="trips"
      emptyMessage="Aucune sortie."
      onDelete={handleDelete}
      entityLabel={{ singular: "sortie", plural: "sorties" }}
    />
  )
}
