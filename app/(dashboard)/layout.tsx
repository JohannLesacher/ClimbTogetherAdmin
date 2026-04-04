import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase-admin";
import { NavLinks } from "@/components/dashboard/nav-links";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { MobileNav } from "@/components/dashboard/mobile-nav";

async function verifySession(): Promise<string> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value;
  if (!sessionCookie) redirect("/login");

  const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  return decoded.email ?? "";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await verifySession();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop uniquement */}
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-card lg:flex sticky top-0 h-screen">
        <div className="flex h-14 items-center gap-2.5 border-b px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold select-none">
            CT
          </span>
          <span className="font-semibold text-sm">Admin</span>
        </div>
        <NavLinks />
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 sm:px-6">
          {/* Hamburger mobile (lg:hidden géré dans le composant) */}
          <MobileNav email={email} />

          {/* Email — desktop seulement (sur mobile il est dans le drawer) */}
          <span className="hidden lg:block flex-1 text-sm text-muted-foreground truncate">
            {email}
          </span>

          {/* Spacer mobile pour pousser le bouton à droite */}
          <span className="flex-1 lg:hidden" aria-hidden />

          <SignOutButton />
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
