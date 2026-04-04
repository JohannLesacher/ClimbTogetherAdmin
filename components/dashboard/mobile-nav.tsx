"use client"

import { useState } from "react"
import { Menu, X, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { Dialog as DialogPrimitive } from "radix-ui"
import { NavLinks } from "@/components/dashboard/nav-links"

function SignOutDrawerButton() {
  const router = useRouter()
  const handleSignOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" })
    router.push("/login")
    router.refresh()
  }
  return (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <LogOut className="size-4 shrink-0" />
      Se déconnecter
    </button>
  )
}

export function MobileNav({ email }: { email: string }) {
  const [open, setOpen] = useState(false)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-card shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>

          {/* Brand + close */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold select-none">
                CT
              </span>
              <span className="font-semibold text-sm">Admin</span>
            </div>
            <DialogPrimitive.Close className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <X className="size-4" />
              <span className="sr-only">Fermer</span>
            </DialogPrimitive.Close>
          </div>

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>

          {/* Footer : email + déconnexion */}
          <div className="shrink-0 border-t p-3">
            <p className="mb-2 truncate px-3 text-xs text-muted-foreground">{email}</p>
            <SignOutDrawerButton />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
