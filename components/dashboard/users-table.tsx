"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { ExportTable } from "@/components/dashboard/export-table"
import type { Column } from "@/components/dashboard/data-table"
import type { UserRow } from "@/lib/data/users"
import { formatDate } from "@/utils/firestore"

const columns: Column<UserRow>[] = [
  {
    header: "Utilisateur",
    cell: (row) => (
      <div className="flex items-center gap-3">
        {row.photoURL ? (
          <Image
            src={row.photoURL}
            alt={row.displayName}
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
            {row.displayName.charAt(0)}
          </span>
        )}
        <span className="font-medium">{row.displayName}</span>
      </div>
    ),
  },
  {
    header: "Email",
    cell: (row) => <span className="text-muted-foreground">{row.email}</span>,
  },
  {
    header: "UID",
    className: "hidden lg:table-cell",
    cell: (row) => (
      <span className="font-mono text-xs text-muted-foreground">{row.id}</span>
    ),
  },
  {
    header: "Inscrit le",
    className: "text-right",
    cell: (row) => (
      <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
    ),
  },
]

export function UsersTable({ data }: { data: UserRow[] }) {
  const router = useRouter()

  const handleDelete = async (ids: string[]) => {
    const res = await fetch("/api/users/delete", {
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
      exportFilename="users"
      emptyMessage="Aucun utilisateur."
      onDelete={handleDelete}
      entityLabel={{ singular: "utilisateur", plural: "utilisateurs" }}
    />
  )
}
