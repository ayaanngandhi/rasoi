"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, CalendarDays, ShoppingBasket, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/", label: "Recipes", icon: BookOpenText },
  { href: "/menu", label: "Menu", icon: CalendarDays },
  { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/recipes");
  return pathname.startsWith(href);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-page/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" aria-label="Rasoi home">
          <Wordmark compact />
        </Link>
        <ThemeToggle />
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-card px-5 py-6 lg:flex">
        <Link href="/" className="mb-10 block px-2">
          <Wordmark />
        </Link>
        <nav className="flex flex-col gap-1.5">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                  active ? "text-on-primary" : "text-ink-soft hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-2xl bg-primary shadow-warm-sm"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
                  />
                )}
                <Icon className="relative z-10 size-5" />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
          <Link
            href="/recipes/new"
            className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-dashed border-line px-4 py-3 text-[15px] font-semibold text-ink-soft transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-5" />
            New recipe
          </Link>
        </nav>
        <div className="mt-auto flex items-center justify-between px-1">
          <p className="text-xs text-ink-soft">Rasoi — My Kitchen</p>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-3">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${
                  active ? "text-primary" : "text-ink-soft"
                }`}
              >
                <Icon className="size-6" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
