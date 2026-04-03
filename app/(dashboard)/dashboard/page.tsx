import { Users, Mountain, UsersRound, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/data/stats";

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Utilisateurs", value: stats.userCount, icon: Users, href: "/dashboard/users" },
    { label: "Spots", value: stats.spotCount, icon: Mountain, href: "/dashboard/spots" },
    { label: "Équipes", value: stats.teamCount, icon: UsersRound, href: "/dashboard/teams" },
    { label: "Sorties", value: stats.tripCount, icon: MapPin, href: "/dashboard/trips" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Statistiques de l&apos;application ClimbTogether.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
