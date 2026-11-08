"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CENTER_INDEX, work } from "@/data/work";
import { StageEngine, type ViewMode } from "@/lib/stage-engine";
import { LetsTalk } from "./LetsTalk";
import { Logo } from "./Logo";
import { MenuPanel } from "./MenuPanel";

const views: { id: ViewMode; label: string }[] = [
  { id: "showcase", label: "Showcase" },
  { id: "list", label: "List" },
  { id: "slider", label: "Slider" },
];

const introLines = [
  "Svayam is an AI-first digital studio.",
  "We design and build websites, admin panels,",
  "Meta ad engines and AI automations —",
  "from first idea to measurable growth.",
];

const SWITCH_MS = 900;

export function HomeStage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const caseRefs = useRef<HTMLDivElement[]>([]);
  const listRefs = useRef<HTMLLIElement[]>([]);
  const engineRef = useRef<StageEngine | null>(null);
  const switchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [mode, setMode] = useState<ViewMode>("showcase");
  const [switching, setSwitching] = useState(false);
  const [active, setActive] = useState(CENTER_INDEX);
  const [revealed, setRevealed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);

  useEffect(() => {
    const engine = new StageEngine(
      {
        root: rootRef.current!,
        gallery: galleryRef.current!,
        cases: caseRefs.current,
        listItems: listRefs.current,
        pct: pctRef.current!,
        video: videoRef.current,
      },
      {
        centerIndex: CENTER_INDEX,
        skipIntro: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onActiveChange: setActive,
        onReveal: () => setRevealed(true),
      },
    );
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      clearTimeout(switchTimer.current);
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(menuOpen || talkOpen);
    if (!menuOpen && !talkOpen) return;
    // Clicking anywhere outside an open panel closes it.
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (menuOpen && !target.closest(".menu-panel, .menu-item--end")) setMenuOpen(false);
      if (talkOpen && !target.closest(".lets-talk")) setTalkOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuOpen, talkOpen]);

  const changeMode = (next: ViewMode) => {
    if (!revealed || next === mode) return;
    setMode(next);
    engineRef.current?.setMode(next);
    setSwitching(true);
    clearTimeout(switchTimer.current);
    switchTimer.current = setTimeout(() => setSwitching(false), SWITCH_MS);
  };

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const current = work[active];

  return (
    <div ref={rootRef} className="site is-intro">
      <main className={`stage is-${mode}${switching ? " is-switching" : ""}`} aria-label="Svayam AI home">
        <h1 className="sr-only">Svayam AI — websites, admin panels, Meta ads and AI automation studio</h1>

        <Link className="logo" href="/" aria-label="Svayam AI">
          <Logo />
        </Link>

        <nav className="menu" aria-label="Gallery view">
          {views.map((view) => (
            <button
              key={view.id}
              className={`menu-item menu-item--${view.id}${mode === view.id ? " is-active" : ""}`}
              aria-pressed={mode === view.id}
              onClick={() => changeMode(view.id)}
            >
              {view.label}
            </button>
          ))}
          <button
            className="menu-item menu-item--end"
            aria-expanded={menuOpen}
            aria-controls="menu-panel"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
        </nav>
        <MenuPanel open={menuOpen} onClose={closeMenu} />

        <p className="intro">
          {introLines.map((line, i) => (
            <span key={line} className="iline">
              <span className="iline-inner" style={{ transitionDelay: `${i * 0.09}s` }}>
                {line}
              </span>
            </span>
          ))}
        </p>

        <ul className="company-list" aria-label="Projects">
          {work.map((item, i) => (
            <li
              key={item.slug}
              ref={(el) => {
                if (el) listRefs.current[i] = el;
              }}
              className={i === active ? "is-active" : undefined}
              onClick={() => engineRef.current?.goTo(i)}
            >
              <span className="li-in">{item.name}</span>
            </li>
          ))}
        </ul>

        <div className="meta meta--category">
          <span className="m-in" key={`c${active}`}>{current.category}</span>
        </div>
        <div className="meta meta--service">
          <span className="m-in" key={`s${active}`}>{current.service}</span>
        </div>
        <div className="meta meta--index">
          <span className="m-in" key={`i${active}`}>{current.code}</span>
        </div>

        <div className="slider-label" aria-hidden="true">
          <span>{current.code}</span>
          <span>{current.name}</span>
        </div>

        <div className="gallery-scale">
          <div className="gallery-frame">
            <div ref={galleryRef} className="gallery" aria-roledescription="carousel">
              {work.map((item, i) => (
                <div
                  key={item.slug}
                  ref={(el) => {
                    if (el) caseRefs.current[i] = el;
                  }}
                  className={`case${i === CENTER_INDEX ? " is-center" : ""}${i === active ? " is-active" : ""}`}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${item.name} — ${item.service}`}
                >
                  <div className="case__media">
                    {item.media.type === "video" ? (
                      <video
                        ref={videoRef}
                        src={item.media.src}
                        poster={item.media.poster}
                        muted
                        loop
                        playsInline
                        preload="auto"
                      />
                    ) : (
                      <Image
                        src={item.media.src}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 200px, 270px"
                        loading="eager"
                        draggable={false}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div ref={pctRef} className="loader-pct" aria-hidden="true">
          0%
        </div>

        <LetsTalk open={talkOpen} onOpenChange={setTalkOpen} />

        <p className="footnote">
          <span className="footnote__wide">
            {mode === "showcase" ? "© 2026 Svayam AI. All rights reserved" : "Scroll to explore"}
          </span>
          <span className="footnote__phone">Swipe to explore</span>
        </p>
      </main>
    </div>
  );
}
