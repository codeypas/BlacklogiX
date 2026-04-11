"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";

import { AUTH_STATE_EVENT, isAuthenticated, logout } from "@/lib/auth";
import { navigateTo } from "@/lib/navigation";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const baseNavItems = [
  { label: "Platform", href: "#top" },
  { label: "Ledger Proof", href: "#components" },
  { label: "Analyst Proof", href: "#documentation" },
  { label: "Pricing", href: "/pricing" },
];

export default function SiteHeader({ homeMode = false }: { homeMode?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const navLinkClass =
    "theme-nav-link text-[19px] font-medium text-zinc-500 transition-colors hover:text-white";

  React.useEffect(() => {
    const syncAuth = () => setLoggedIn(isAuthenticated());

    syncAuth();
    window.addEventListener(AUTH_STATE_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const navItems = React.useMemo(
    () =>
      baseNavItems.map((item) =>
        item.label === "Ledger Proof"
          ? {
              label: loggedIn ? "Analyst Dashboard" : item.label,
              href: loggedIn ? "/dashboard" : item.href,
            }
          : item,
      ),
    [loggedIn],
  );

  const handleAuthAction = React.useCallback(() => {
    if (loggedIn) {
      logout();
      navigateTo("/");
      return;
    }

    navigateTo("/analyst-login");
  }, [loggedIn]);

  const handleNav = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href.startsWith("/")) {
        event.preventDefault();
        navigateTo(href);
        return;
      }

      if (!homeMode) {
        event.preventDefault();
        navigateTo("/");
      }
    },
    [homeMode],
  );

  return (
    <header className="theme-nav fixed top-0 z-50 w-full border-b border-white/8 bg-black/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-7 py-6">
        <a
          href={homeMode ? "#top" : "/"}
          onClick={(event) => {
            if (!homeMode) {
              event.preventDefault();
              navigateTo("/");
            }
          }}
          className="theme-logo text-[30px] font-semibold tracking-[-0.04em] text-white"
        >
          BlackLogix
        </a>

        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-10 md:flex xl:gap-14">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(event) => handleNav(event, item.href)}
              className={navLinkClass}
            >
              {item.label}
            </a>
          ))}

          <button
            type="button"
            onClick={handleAuthAction}
            className={cx(
              navLinkClass,
              "cursor-pointer appearance-none border-0 bg-transparent p-0 font-inherit leading-inherit",
            )}
          >
            {loggedIn ? "Logout" : "Login"}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="theme-menu-button inline-flex flex-shrink-0 items-center justify-center text-white md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen ? (
        <div className="animate-[slideDown_0.3s_ease-out] border-t border-white/8 bg-black/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-4 px-6 py-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => {
                  handleNav(event, item.href);
                  setMobileMenuOpen(false);
                }}
                className="theme-nav-link py-2 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleAuthAction();
              }}
              className="theme-back-link inline-flex justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              {loggedIn ? "Logout" : "Login"}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
