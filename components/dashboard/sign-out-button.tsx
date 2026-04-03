"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <Button variant="ghost" size="icon-sm" onClick={handleSignOut} title="Se déconnecter">
      <LogOut />
    </Button>
  );
}
