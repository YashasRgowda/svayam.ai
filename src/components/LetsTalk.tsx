"use client";

import { FormEvent, useEffect, useState } from "react";
import { services } from "@/data/work";

// Placeholder inbox — replace with the real address or a form backend.
const CONTACT_EMAIL = "hello@svayam.ai";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function LetsTalk({ open, onOpenChange }: Props) {
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const toggle = (service: string) =>
    setPicked((list) =>
      list.includes(service) ? list.filter((s) => s !== service) : [...list, service],
    );

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Interested in: ${picked.join(", ") || "—"}`,
      "",
      String(data.get("message") ?? ""),
    ].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      "New project enquiry",
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div
      className={`lets-talk${open ? " is-open" : ""}`}
      role={open ? "dialog" : "button"}
      aria-label={open ? "Start a project" : "Let's talk"}
      aria-expanded={open}
      tabIndex={open ? -1 : 0}
      onClick={() => !open && onOpenChange(true)}
      onKeyDown={(e) => {
        if (!open && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpenChange(true);
        }
      }}
    >
      <span className="lets-talk__label">Let&apos;s talk?</span>
      <span className="lets-talk__mark" aria-hidden="true" />
      <button
        type="button"
        className="lets-talk__close"
        aria-label="Close"
        tabIndex={open ? 0 : -1}
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(false);
        }}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <line x1="5" y1="5" x2="15" y2="15" />
          <line x1="15" y1="5" x2="5" y2="15" />
        </svg>
      </button>

      <div className="lets-talk__body" inert={!open}>
        <p className="lets-talk__eyebrow">New project</p>
        <h2 className="lets-talk__title">
          Tell us what you&apos;re building.
          <br />
          We reply within a day.
        </h2>

        <form className="lets-talk__form" onSubmit={submit}>
          <fieldset className="lets-talk__chips">
            <legend>I need help with</legend>
            {services.map((service) => (
              <button
                key={service}
                type="button"
                className={picked.includes(service) ? "is-on" : undefined}
                aria-pressed={picked.includes(service)}
                onClick={() => toggle(service)}
              >
                {service}
              </button>
            ))}
          </fieldset>
          <label>
            <span>Name</span>
            <input name="name" required autoComplete="name" />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            <span>Project</span>
            <textarea name="message" rows={4} placeholder="Goals, timeline, budget…" />
          </label>
          <button type="submit" className="lets-talk__submit">
            Send enquiry <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="lets-talk__alt">
          Or write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </div>
    </div>
  );
}
