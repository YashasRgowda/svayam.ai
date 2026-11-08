"use client";

import { useEffect, useState } from "react";

// Placeholder routes — point these at real pages as they get built.
const links = [
  { label: "Work", href: "#work" },
  { label: "Websites", href: "#websites" },
  { label: "Admin Panels", href: "#admin-panels" },
  { label: "Meta Ads", href: "#meta-ads" },
  { label: "AI Automations", href: "#ai-automations" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function useClock(running: boolean) {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(clockFormat.format(new Date()).replace(",", "").toUpperCase());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

type Props = { open: boolean; onClose: () => void };

export function MenuPanel({ open, onClose }: Props) {
  const clock = useClock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      id="menu-panel"
      className={`menu-panel${open ? " is-open" : ""}`}
      aria-hidden={!open}
      inert={!open}
    >
      <button className="menu-panel__close" onClick={onClose} aria-label="Close menu">
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <line x1="5" y1="5" x2="15" y2="15" />
          <line x1="15" y1="5" x2="5" y2="15" />
        </svg>
      </button>
      <nav className="menu-panel__links" aria-label="Site menu">
        {links.map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            className={i === 0 ? "is-active" : undefined}
            aria-current={i === 0 ? "page" : undefined}
            onClick={onClose}
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="menu-panel__meta">
        BLR / IST
        <br />
        <span suppressHydrationWarning>{clock}</span>
      </div>
    </div>
  );
}
