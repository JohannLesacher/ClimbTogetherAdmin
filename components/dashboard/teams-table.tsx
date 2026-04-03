"use client"

import { useRouter } from "next/navigation"
import { Users } from "lucide-react"
import { ExportTable } from "@/components/dashboard/export-table"
import type { Column } from "@/components/dashboard/data-table"
import type { TeamRow } from "@/lib/data/teams"
import { formatDate } from "@/utils/firestore"

const columns: Column<TeamRow>[] = [
  {
    header: "Équipe",
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    header: "Membres",
    cell: (row) => (
      <div className="flex items-center gap-1.5">
        <Users className="size-3.5 text-muted-foreground" />
        <span className="tabular-nums">{row.memberCount}</span>
      </div>
    ),
  },
  {
    header: "Code d'invitation",
    cell: (row) => (
      <span className="font-mono tracking-widest text-sm bg-muted px-2 py-0.5 rounded">
        {row.inviteCode}
      </span>
    ),
  },
  {
    header: "Créée le",
    className: "text-right hidden sm:table-cell",
    cell: (row) => (
      <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
    ),
  },
]

export function TeamsTable({ data }: { data: TeamRow[] }) {
  const router = useRouter()

  const handleDelete = async (ids: string[]) => {
    const res = await fetch("/api/teams/delete", {
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
      exportFilename="teams"
      emptyMessage="Aucune équipe."
      onDelete={handleDelete}
      entityLabel={{ singular: "équipe", plural: "équipes" }}
    />
  )
}
