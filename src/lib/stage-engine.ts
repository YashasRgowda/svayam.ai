/**
 * Imperative animation engine for the home stage.
 *
 * One set of `.case` elements plays both roles: during the intro they are the
 * tiny cards that spin out of a 3D ring, and once the ring settles they become
 * the interactive gallery (showcase cylinder, vertical list, horizontal slider).
 * Everything runs in a single rAF loop that writes transforms straight to the
 * DOM, so React never re-renders at 60fps.
 */

export type ViewMode = "showcase" | "list" | "slider";

export type StageElements = {
  root: HTMLElement;
  gallery: HTMLElement;
  cases: HTMLElement[];
  listItems: HTMLElement[];
  pct: HTMLElement;
  video: HTMLVideoElement | null;
};

export type StageOptions = {
  centerIndex: number;
  skipIntro: boolean;
  onActiveChange: (index: number) => void;
  onReveal: () => void;
};

const CASE = 270;
const STEP = CASE + 2;
const LIST_LINE = 14;
const MAX_TILT = 10;

const INTRO = {
  counter: 8100,
  fill: 900,
  showCard: 1650,
  spinDelay: 2100,
  spin: 6000,
  videoAt: 5000,
  cleanup: 1300,
};

const IGNORE_POINTER =
  "button, a, input, textarea, select, label, .menu, .menu-panel, .lets-talk";
const IGNORE_WHEEL = ".menu-panel.is-open, .lets-talk.is-open";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Wraps x into [-n/2, n/2] — the shortest signed distance on a loop of length n. */
const wrap = (x: number, n: number) => x - n * Math.round(x / n);
const mod = (x: number, n: number) => ((x % n) + n) % n;

function ringConfig(w: number, h: number) {
  const mobile = w <= 640 || (w <= 780 && h > w);
  let radius = 720;
  let scale = 1;
  if (mobile) {
    radius = 338.4;
    scale = clamp(w / 628, 0.44, 0.7);
  } else if (w <= 1200 && h > w) {
    radius = 432;
    scale = 0.85;
  } else if (h <= 500) {
    radius = 518.4;
    scale = clamp(h / 600, 0.4, 1);
  } else if (w <= 950) {
    radius = 518.4;
    scale = clamp(w / 1100, 0.45, 0.92);
  } else if (w <= 1200) {
    scale = 0.92;
  }
  scale = Math.min(scale, (1.02 * w) / (1.08 * radius + CASE), (0.85 * h) / CASE);
  return { radius, scale };
}

export class StageEngine {
  private els: StageElements;
  private opts: StageOptions;
  private n: number;

  private phase: "intro" | "live" = "intro";
  private mode: ViewMode = "showcase";
  private introStart = 0;
  private introFlags = { filled: false, card: false, video: false };

  private radius = 720;
  private scale = 1;

  /** Current position in card units; integer = a card is centred. */
  private pos: number;
  /** Where list/slider ease towards. */
  private target: number;
  /** Showcase inertia, in card units per frame. */
  private vel = 0;
  /** Showcase destination for keyboard / click navigation. */
  private seek: number | null = null;
  private tilt = 0;
  private prevPos: number;
  private smoothDelta = 0;
  private active = -1;
  private dirty = true;

  private drag: {
    x: number;
    y: number;
    pos: number;
    tilt: number;
    moved: number;
    lastVel: number;
    lastMove: number;
    caseIndex: number;
  } | null = null;

  private raf = 0;
  private snapTimer: ReturnType<typeof setTimeout> | undefined;
  private snapBase: number | null = null;
  private cleanupTimer: ReturnType<typeof setTimeout> | undefined;
  private paused = false;

  constructor(els: StageElements, opts: StageOptions) {
    this.els = els;
    this.opts = opts;
    this.n = els.cases.length;
    this.pos = this.target = this.prevPos = opts.centerIndex;
  }

  start() {
    this.measure();
    window.addEventListener("resize", this.measure);
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);

    if (this.opts.skipIntro) {
      this.finishIntro();
    } else {
      this.renderIntroStart();
      this.els.root.classList.add("intro-counting");
      this.introStart = performance.now();
    }
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.snapTimer);
    clearTimeout(this.cleanupTimer);
    window.removeEventListener("resize", this.measure);
    window.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
  }

  setMode(mode: ViewMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    this.vel = 0;
    this.seek = null;
    this.pos = this.target = Math.round(this.pos);
    this.dirty = true;
  }

  /** Stops wheel/drag/keys from moving the gallery (e.g. while an overlay is open). */
  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.endDrag();
  }

  goTo(index: number) {
    if (this.phase !== "live") return;
    if (this.mode === "showcase") {
      this.vel = 0;
      this.seek = this.pos + wrap(index - this.pos, this.n);
    } else {
      this.target = this.target + wrap(index - this.target, this.n);
    }
  }

  step(delta: number) {
    if (this.phase !== "live") return;
    if (this.mode === "showcase") {
      this.vel = 0;
      this.seek = (this.seek ?? Math.round(this.pos)) + delta;
    } else {
      this.target = Math.round(this.target) + delta;
    }
  }

  // ---------------------------------------------------------------- intro

  private renderIntroStart() {
    const { gallery, cases } = this.els;
    gallery.style.transform = "translateZ(0px) rotateY(0deg)";
    cases.forEach((el, i) => {
      el.style.width = el.style.height = "8px";
      el.style.transform = "translate(-50%, -50%) rotateY(0deg) translateZ(0px)";
      el.style.opacity = i === this.opts.centerIndex ? "1" : "0";
    });
  }

  private renderIntro(now: number) {
    const { root, gallery, cases, pct, video } = this.els;
    const t = now - this.introStart;
    const n = this.n;
    const center = this.opts.centerIndex;

    pct.textContent = `${Math.round(100 * Math.min(1, t / INTRO.counter))}%`;

    if (!this.introFlags.filled && t >= INTRO.fill) {
      this.introFlags.filled = true;
      root.classList.add("intro-filled");
    }
    if (!this.introFlags.card && t >= INTRO.showCard) {
      this.introFlags.card = true;
      root.classList.add("intro-card");
    }

    const raw = (t - INTRO.spinDelay) / INTRO.spin;
    if (raw < 0) return;
    const r = Math.min(1, raw);

    if (!this.introFlags.video && r >= INTRO.videoAt / INTRO.spin) {
      this.introFlags.video = true;
      video?.play().catch(() => {});
    }

    // The ring spins one full turn while pulling back to the gallery radius;
    // each card fans out to its slot on a staggered curve, then all grow to size.
    const ringRot = -360 * smoothstep(0.16, 1, r);
    const depth = this.radius * smoothstep(0.05, 1, r);
    const size = 8 + (CASE - 8) * smoothstep(0.55, 1, r);

    gallery.style.transform = `translateZ(${-depth}px) rotateY(${ringRot}deg)`;
    cases.forEach((el, i) => {
      const slot = ((i - center) * 360) / n;
      const order = i / (n - 1);
      const spread = smoothstep(0.1 + 0.24 * order, 0.46 + 0.24 * order, r);
      const angle = slot * spread;
      const facing = Math.abs(wrap(ringRot + angle, 360)) > 90;
      el.style.width = el.style.height = `${size}px`;
      el.style.transform = `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${depth * spread}px)${facing ? " scaleX(-1)" : ""}`;
      if (i !== center) {
        el.style.opacity = smoothstep(0.1 * order, 0.12 + 0.1 * order, r).toFixed(3);
      }
    });

    if (r >= 1) this.finishIntro();
  }

  private finishIntro() {
    const { root, cases, pct, video } = this.els;
    this.phase = "live";
    this.dirty = true;
    pct.textContent = "100%";
    cases.forEach((el) => {
      el.style.width = el.style.height = "";
      el.style.opacity = "1";
    });
    if (!this.introFlags.video) video?.play().catch(() => {});
    root.classList.add("intro-reveal");
    this.opts.onReveal();
    this.cleanupTimer = setTimeout(() => {
      root.classList.remove("is-intro");
      root.classList.add("intro-done");
    }, INTRO.cleanup);
  }

  // ----------------------------------------------------------------- live

  private renderLive() {
    const { gallery, cases, listItems } = this.els;
    const n = this.n;

    if (this.mode === "showcase") {
      if (!this.drag) {
        if (this.seek !== null) {
          const d = this.seek - this.pos;
          this.pos += d * 0.12;
          if (Math.abs(d) < 5e-4) {
            this.pos = this.seek;
            this.seek = null;
          }
        } else if (this.vel !== 0 || this.pos !== Math.round(this.pos)) {
          this.pos += this.vel;
          this.vel *= 0.93;
          if (Math.abs(this.vel) < 0.02) {
            const snap = Math.round(this.pos) - this.pos;
            this.pos += snap * 0.05;
            if (Math.abs(snap) < 5e-4) this.pos = Math.round(this.pos);
            if (Math.abs(this.vel) < 3e-5) this.vel = 0;
          }
        }
        this.tilt *= 0.92;
        if (Math.abs(this.tilt) < 1e-3) this.tilt = 0;
      }
      this.target = this.pos;
    } else {
      const d = this.target - this.pos;
      this.pos += d * (this.drag ? 0.35 : 0.075);
      if (Math.abs(d) < 5e-4) this.pos = this.target;
    }

    const delta = this.pos - this.prevPos;
    this.prevPos = this.pos;
    this.smoothDelta += (delta - this.smoothDelta) * 0.25;
    if (Math.abs(this.smoothDelta) < 1e-6) this.smoothDelta = 0;

    const idle = delta === 0 && this.smoothDelta === 0 && (this.mode !== "showcase" || this.tilt === 0 || !!this.drag);
    if (idle && !this.dirty && !this.drag) return;
    this.dirty = false;

    gallery.style.transform =
      this.mode === "showcase" ? `translateZ(${-this.radius}px) rotateX(${this.tilt}deg)` : "";

    // Fast spins squash and lean the cards, like they're being dragged through air.
    const skew = clamp(this.smoothDelta * 55, -22, 22);
    const squash = 1 - Math.min(Math.abs(this.smoothDelta) * 1.4, 0.14);

    for (let i = 0; i < n; i++) {
      const el = cases[i];
      const media = el.querySelector<HTMLElement>(".case__media");
      const d = wrap(i - this.pos, n);

      if (this.mode === "showcase") {
        const angle = (d * 360) / n;
        el.style.transform = `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${this.radius}px) scale(${squash}) skewX(${skew}deg)${Math.abs(angle) > 90 ? " scaleX(-1)" : ""}`;
        el.style.opacity = "1";
        el.style.zIndex = "";
        if (media) media.style.transform = "";
      } else if (this.mode === "slider") {
        const x = d * STEP;
        el.style.transform = `translate(-50%, -50%) translateX(${x}px)`;
        el.style.opacity = "1";
        el.style.zIndex = "";
        if (media) media.style.transform = `translateX(${clamp(-x * 0.08, -10, 10).toFixed(1)}px)`;
      } else {
        const y = d * STEP;
        const far = Math.abs(d);
        el.style.transform = `translate(-50%, -50%) translateY(${y}px)`;
        el.style.opacity = clamp(1 - Math.max(0, far - 2.4) * 0.55, 0.12, 1).toFixed(3);
        el.style.zIndex = String(100 - Math.round(far * 10));
        if (media) media.style.transform = `translateY(${clamp(-y * 0.08, -10, 10).toFixed(1)}px)`;
      }

      const li = listItems[i];
      if (li) {
        const y = d * LIST_LINE;
        const u = Math.abs(y);
        const focus = clamp(1 - u / (LIST_LINE / 2), 0, 1);
        const edge = clamp(((n * LIST_LINE) / 2 - u) / (LIST_LINE / 2), 0, 1);
        li.style.transform = `translateY(${y}px)`;
        li.style.opacity = ((0.32 + 0.68 * focus) * edge).toFixed(3);
      }
    }

    const active = mod(Math.round(this.pos), n);
    if (active !== this.active) {
      this.active = active;
      this.opts.onActiveChange(active);
    }
  }

  private tick = (now: number) => {
    if (this.phase === "intro") this.renderIntro(now);
    else this.renderLive();
    this.raf = requestAnimationFrame(this.tick);
  };

  // --------------------------------------------------------------- input

  private measure = () => {
    const { radius, scale } = ringConfig(window.innerWidth, window.innerHeight);
    this.radius = radius;
    this.scale = scale;
    this.els.root.style.setProperty("--ring-scale", String(scale));
    this.dirty = true;
  };

  private scheduleSnap(delay = 140) {
    if (this.snapBase === null) this.snapBase = Math.round(this.target);
    clearTimeout(this.snapTimer);
    this.snapTimer = setTimeout(() => {
      // A short flick of a notched mouse wheel still advances one card.
      const moved = this.target - (this.snapBase ?? this.target);
      this.target =
        Math.abs(moved) > 0.12 && Math.abs(moved) < 0.5
          ? (this.snapBase ?? 0) + Math.sign(moved)
          : Math.round(this.target);
      this.snapBase = null;
    }, delay);
  }

  private onWheel = (e: WheelEvent) => {
    if ((e.target as Element | null)?.closest?.(IGNORE_WHEEL)) return;
    e.preventDefault();
    if (this.phase !== "live" || this.paused) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const px = e.deltaMode === 1 ? d * 16 : d;
    if (this.mode === "showcase") {
      this.seek = null;
      this.vel += px * 0.00028;
      return;
    }
    this.target += px * 0.0016;
    this.scheduleSnap();
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.phase !== "live" || this.paused || e.button !== 0) return;
    const target = e.target as Element;
    if (target.closest(IGNORE_POINTER)) return;
    const caseEl = target.closest<HTMLElement>(".case");
    this.drag = {
      x: e.clientX,
      y: e.clientY,
      pos: this.mode === "showcase" ? this.pos : this.target,
      tilt: this.tilt,
      moved: 0,
      lastVel: 0,
      lastMove: e.timeStamp,
      caseIndex: caseEl ? this.els.cases.indexOf(caseEl) : -1,
    };
    this.vel = 0;
    this.seek = null;
    this.els.root.classList.add("is-dragging");
  };

  private onPointerMove = (e: PointerEvent) => {
    const drag = this.drag;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
    drag.lastMove = e.timeStamp;

    if (this.mode === "showcase") {
      const next = drag.pos - dx / (STEP * this.scale);
      this.vel = next - this.pos;
      this.pos = next;
      this.tilt = clamp(drag.tilt + (dy / this.scale) * 0.18, -MAX_TILT, MAX_TILT);
    } else {
      const axis = this.mode === "slider" ? dx : dy;
      const next = drag.pos - axis / (STEP * this.scale);
      drag.lastVel = next - this.target;
      this.target = next;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const drag = this.drag;
    if (!drag) return;
    this.endDrag();
    // Held still before letting go: no fling.
    if (e.timeStamp - drag.lastMove > 80) {
      this.vel = 0;
      drag.lastVel = 0;
    }
    if (drag.moved < 6) {
      // A tap, not a drag: bring the tapped card to the front.
      this.vel = 0;
      if (drag.caseIndex >= 0) this.goTo(drag.caseIndex);
      return;
    }
    if (this.mode !== "showcase") {
      this.target = Math.round(this.target + clamp(drag.lastVel * 6, -2, 2));
    }
  };

  private endDrag() {
    this.drag = null;
    this.els.root.classList.remove("is-dragging");
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.phase !== "live" || this.paused || e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.target as Element | null)?.closest?.("input, textarea, select")) return;
    const map: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      PageDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
      PageUp: -1,
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    this.step(d);
  };
}
