"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  Users,
  UserRound,
  CreditCard,
  Calendar,
  Bell,
} from "lucide-react";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/quotations", label: "Quotations", icon: FileText },
  { href: "/admin/staff", label: "Staff", icon: Users },
  { href: "/admin/customers", label: "Customers", icon: UserRound },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside
      id="admin-sidebar"
      aria-label="Admin navigation"
      className={`fixed bottom-0 left-0 top-[var(--header-height)] z-40 w-64 overflow-y-auto border-r border-border bg-card text-card-foreground shadow-lg transition-transform ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      inert={!open}
    >
      <nav className="py-3">
        <ul className="flex flex-col gap-1 px-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
