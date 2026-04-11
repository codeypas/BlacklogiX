import { ArrowUpRight, Bot, Github, Mail, ShieldCheck } from "lucide-react";

import { navigateTo } from "@/lib/navigation";

const footerGroups = [
  {
    title: "Platform",
    links: [
      { label: "Home", href: "/" },
      { label: "Pricing", href: "/pricing" },
      { label: "Analyst Proof", href: "#documentation" },
    ],
  },
  {
    title: "Use Cases",
    links: [
      { label: "Immutable Logs", href: "#components" },
      { label: "Threat Detection", href: "#top" },
      { label: "Contact", href: "mailto:hello@blacklogix.dev" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="theme-footer relative border-t border-white/8 bg-[#040404] px-5 pb-28 pt-16 md:px-7 md:pb-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/25 to-transparent" />

      <div className="mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="theme-surface-muted inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-300">
            <Bot className="h-4 w-4 text-sky-300" />
            Built for security teams that need evidence they can trust
          </div>

          <h3 className="theme-page-title mt-6 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
            BlackLogix turns log data into tamper-proof evidence and actionable alerts.
          </h3>

          <p className="theme-page-copy mt-4 max-w-2xl text-base leading-7 text-zinc-400">
            Hash every server, network, and application event on-chain while AI
            surfaces suspicious behavior before an attacker can erase the trail.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo("/pricing")}
              className="theme-primary-button inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Compare Plans
              <ArrowUpRight className="h-4 w-4" />
            </button>

            <a
              href="mailto:hello@blacklogix.dev"
              className="theme-surface-muted inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4" />
              hello@blacklogix.dev
            </a>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h4 className="theme-faint-text text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">
                {group.title}
              </h4>
              <ul className="mt-5 space-y-4">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(event) => {
                        if (link.href.startsWith("/")) {
                          event.preventDefault();
                          navigateTo(link.href);
                        }
                      }}
                      className="theme-page-copy text-sm text-zinc-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="theme-card-surface rounded-[24px] border border-white/8 bg-white/[0.03] p-5 sm:col-span-2">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />
              <div>
                <p className="theme-page-copy text-sm leading-6 text-zinc-400">
                  Prove that security evidence is intact, investigate anomalies
                  faster, and walk executives through incidents with cryptographic proof.
                </p>
              </div>
            </div>

            <div className="theme-faint-text mt-5 flex items-center gap-3 text-zinc-500">
              <Github className="h-4 w-4" />
              <span className="text-sm">Immutable logs. AI detections. Verifiable evidence.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="theme-faint-text mx-auto mt-14 flex max-w-[1500px] flex-col gap-3 border-t border-white/8 pt-6 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 BlackLogix. All rights reserved.</p>
        <p>Blockchain-backed audit trails for modern security operations.</p>
      </div>
    </footer>
  );
}
