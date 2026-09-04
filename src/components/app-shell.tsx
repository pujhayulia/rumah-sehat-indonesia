"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BranchSwitcher } from "@/components/branch-switcher";
import type { Branch, UserRole } from "@/types/database";

function NavIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px] shrink-0">
      <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  dashboard: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  kunjungan: "M8 4.5h8a1 1 0 0 1 1 1V5H7v-.5a1 1 0 0 1 1-1ZM5.5 6h13v14h-13zM9 10.5h6M9 14.5h6",
  kas: "M3.5 7A2 2 0 0 1 5.5 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2V7ZM3.5 10h17M15.5 14h2.5",
  laporan: "M4 20V11M10 20V4M16 20v-8M22 20H2",
  terapis: "M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20a6 6 0 0 1 12 0M16.5 11a3 3 0 1 0 0-6M14.5 14.5A6 6 0 0 1 21 20h-3.5",
  layanan: "M3 11.5V3.5h8L21.5 14 14 21.5 3 11.5ZM7.5 7.5h.01",
  cabang:
    "M12 21s7-6.4 7-11.5A7 7 0 1 0 5 9.5C5 14.6 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  tim: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M22 11h-6",
  booking: "M7 3v3M17 3v3M4.5 8h15M5.5 6h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM8 13h2M11.5 13h2M15 13h2M8 16.5h2M11.5 16.5h2",
};

const MENU_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { href: "/booking", label: "Booking", icon: ICONS.booking },
  { href: "/kunjungan", label: "Kunjungan", icon: ICONS.kunjungan },
  { href: "/kas", label: "Kas", icon: ICONS.kas },
  { href: "/laporan", label: "Laporan", icon: ICONS.laporan },
];

const SETTINGS_LINKS = [
  { href: "/master/terapis", label: "Terapis", icon: ICONS.terapis },
  { href: "/master/layanan", label: "Layanan", icon: ICONS.layanan },
  { href: "/master/cabang", label: "Cabang", icon: ICONS.cabang },
  { href: "/master/tim", label: "Tim", icon: ICONS.tim },
];

function MenuButtonIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
      <path
        d={direction === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px] shrink-0">
      <path
        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavSection({
  title,
  links,
  pathname,
  onNavigate,
  collapsed,
}: {
  title: string;
  links: { href: string; label: string; icon: string }[];
  pathname: string;
  onNavigate: () => void;
  collapsed: boolean;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
      )}
      <div className="flex flex-col gap-0.5">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              title={collapsed ? link.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-orange-600 text-white shadow-sm shadow-orange-600/30"
                  : "text-zinc-600 hover:bg-orange-50 hover:text-orange-700 dark:text-zinc-400 dark:hover:bg-orange-950/40 dark:hover:text-orange-300"
              }`}
            >
              <NavIcon d={link.icon} />
              {!collapsed && link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SidebarContent({
  role,
  fullName,
  branchName,
  branches,
  pathname,
  onNavigate,
  onSignOut,
  onClose,
  collapsed,
}: {
  role: UserRole;
  fullName: string;
  branchName: string | null;
  branches: Branch[];
  pathname: string;
  onNavigate: () => void;
  onSignOut: () => void;
  onClose?: () => void;
  collapsed: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center px-4 py-4 ${collapsed ? "justify-center" : "justify-between"}`}>
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          <Image src="/logo-mark.png" alt="Rumah Sehat Indonesia" width={30} height={23} className="h-8 w-auto" />
          {!collapsed && "Rumah Sehat"}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950/40"
          >
            <MenuButtonIcon open />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <NavSection title="Menu" links={MENU_LINKS} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
        {role === "owner" && (
          <NavSection
            title="Pengaturan"
            links={SETTINGS_LINKS}
            pathname={pathname}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        )}
      </nav>

      <div className="border-t border-orange-100 px-4 py-4 dark:border-zinc-800">
        {!collapsed && (
          <>
            <div className="mb-3">
              {role === "owner" ? (
                <BranchSwitcher branches={branches} />
              ) : (
                branchName && <span className="badge badge-active">{branchName}</span>
              )}
            </div>
            <p className="mb-2 truncate text-sm text-zinc-500">{fullName}</p>
          </>
        )}
        <button
          onClick={onSignOut}
          title={collapsed ? "Keluar" : undefined}
          className={`btn-secondary flex items-center gap-2 ${collapsed ? "w-full justify-center px-0" : "w-full"}`}
        >
          {collapsed && <LogoutIcon />}
          {!collapsed && "Keluar"}
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  role,
  fullName,
  branchName,
  branches,
  children,
}: {
  role: UserRole;
  fullName: string;
  branchName: string | null;
  branches: Branch[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-1">
      {/* Sidebar — desktop, bisa diciutkan */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-orange-100 bg-white transition-[width] duration-200 md:flex dark:border-zinc-800 dark:bg-black ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        <SidebarContent
          role={role}
          fullName={fullName}
          branchName={branchName}
          branches={branches}
          pathname={pathname}
          onNavigate={() => {}}
          onSignOut={handleSignOut}
          collapsed={collapsed}
        />
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          className="absolute -right-3 top-7 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-orange-200 bg-white text-zinc-500 shadow-sm transition-colors hover:text-orange-700 md:flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        >
          <ChevronIcon direction={collapsed ? "right" : "left"} />
        </button>
      </aside>

      {/* Sidebar — drawer mobile (selalu penuh, tidak ikut mode ciut) */}
      {open && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-xl dark:bg-black">
            <SidebarContent
              role={role}
              fullName={fullName}
              branchName={branchName}
              branches={branches}
              pathname={pathname}
              onNavigate={() => setOpen(false)}
              onSignOut={handleSignOut}
              onClose={() => setOpen(false)}
              collapsed={false}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — mobile only */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-orange-100 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-black/90">
          <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            <Image src="/logo-mark.png" alt="Rumah Sehat Indonesia" width={28} height={22} className="h-7 w-auto" />
            Rumah Sehat
          </span>
          <button
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-orange-50 hover:text-orange-700 dark:text-zinc-400 dark:hover:bg-orange-950/40"
          >
            <MenuButtonIcon open={false} />
          </button>
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
