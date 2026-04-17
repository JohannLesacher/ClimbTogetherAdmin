"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, ShieldCheck, ChevronDown } from "lucide-react"
import { ExportTable } from "@/components/dashboard/export-table"
import type { Column } from "@/components/dashboard/data-table"
import type { TeamRow, TeamMember } from "@/lib/data/teams"
import { formatDate } from "@/utils/firestore"
import { Dialog, Select } from "radix-ui"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

// ─── Change Admin Dialog ────────────────────────────────────────────────────

function ChangeAdminDialog({
  teamId,
  teamName,
  adminUid,
  members,
}: {
  teamId: string
  teamName: string
  adminUid: string
  members: TeamMember[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(adminUid)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentAdmin = members.find((m) => m.uid === adminUid)

  const handleSubmit = async () => {
    if (selected === adminUid) { setOpen(false); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/teams/set-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, newAdminUid: selected }),
      })
      if (!res.ok) {
        const { error: msg } = await res.json() as { error: string }
        throw new Error(msg ?? "Erreur serveur")
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur serveur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="flex items-center gap-1.5 group cursor-pointer hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ShieldCheck className="size-3.5 text-primary shrink-0" />
          <span className="truncate max-w-[120px]">
            {(currentAdmin?.name ?? adminUid) || "—"}
          </span>
          <ChevronDown className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background border rounded-lg shadow-lg p-6 w-full max-w-sm flex flex-col gap-4">
          <Dialog.Title className="text-base font-semibold">
            Changer l&apos;admin — {teamName}
          </Dialog.Title>

          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-select" className="text-sm font-medium">
              Nouvel admin
            </Label>
            <Select.Root value={selected} onValueChange={setSelected}>
              <Select.Trigger
                id="admin-select"
                className="flex h-9 w-full items-center justify-between rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <Select.Value />
                <Select.Icon>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  className="z-[60] w-[--radix-select-trigger-width] rounded-md border bg-popover shadow-md"
                >
                  <Select.Viewport className="p-1">
                    {members.map((m) => (
                      <Select.Item
                        key={m.uid}
                        value={m.uid}
                        className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none hover:bg-accent data-[highlighted]:bg-accent"
                      >
                        <Select.ItemText>
                          {m.name}
                          {m.uid === adminUid && (
                            <span className="ml-2 text-xs text-muted-foreground">(actuel)</span>
                          )}
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" disabled={loading}>
                Annuler
              </Button>
            </Dialog.Close>
            <Button
              size="sm"
              disabled={loading || selected === adminUid}
              onClick={handleSubmit}
            >
              {loading ? "Enregistrement…" : "Confirmer"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Columns ────────────────────────────────────────────────────────────────

const columns: Column<TeamRow>[] = [
  {
    header: "Équipe",
    cell: (row) => <span className="font-medium">{row.name}</span>,
  },
  {
    header: "Admin",
    cell: (row) => (
      <ChangeAdminDialog
        teamId={row.id}
        teamName={row.name}
        adminUid={row.adminUid}
        members={row.members}
      />
    ),
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

// ─── Table ───────────────────────────────────────────────────────────────────

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
