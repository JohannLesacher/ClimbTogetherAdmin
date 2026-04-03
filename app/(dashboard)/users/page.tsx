import { getUsers } from "@/lib/data/users"
import { UsersTable } from "@/components/dashboard/users-table"

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {users.length} compte{users.length !== 1 ? "s" : ""} enregistré
          {users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <UsersTable data={users} />
    </div>
  )
}
