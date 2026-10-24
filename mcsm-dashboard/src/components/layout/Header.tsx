"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, LogOut } from "lucide-react";
import logo from "@/app/micro-clean-logo.png";
import Sidebar from "@/components/layout/Sidebar";

type HeaderProps = {
  adminLogin: boolean;
};

export default function Header({ adminLogin }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex h-header items-center gap-4 border-b border-border bg-card px-[max(5vw,1.5rem)]">
      {adminLogin && (
        <>
          <button
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="admin-sidebar"
            className="cursor-pointer rounded-md border-2 border-primary p-2 text-primary"
          >
            <Menu
              size={30}
              aria-hidden="true"
              className={`transition-transform duration-200 ${
                open ? "-rotate-90" : "rotate-0"
              }`}
            />
          </button>
          <Sidebar open={open} onClose={() => setOpen(false)} />
        </>
      )}
      <Link className="brand" href="/" aria-label="Home">
        <Image
          loading="eager"
          src={logo}
          alt="Micro Clean Cleaning Services"
          className={`h-28 w-auto ${adminLogin ? "ml-12" : ""}`}
        />
      </Link>
      <div className="header-note ml-auto text-muted-foreground">
        Logged in as a{adminLogin ? "n Admin" : " Staff"}
      </div>
      {/**TODO: make the logout button functional */}
      <button
        aria-label="Log out"
        className="ml-6 cursor-pointer rounded-md border-2 border-destructive p-2 text-destructive"
      >
        <LogOut size={30} aria-hidden="true" />
      </button>
    </header>
  );
}
