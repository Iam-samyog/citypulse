"use client";

import { usePathname, useRouter } from "next/navigation";

export function DemoSignOut() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/login") return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/demo-logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
      className="fixed right-4 top-4 z-[70] rounded-lg border border-[#b98a4a]/50 bg-[#071b23]/90 px-3 py-2 text-xs text-[#f6e6c4] backdrop-blur hover:bg-[#102a32]"
    >
      Sign out
    </button>
  );
}
