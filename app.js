const TEAL = "#00a8b5";
const RED = "#e53935";
const LAUNCH = new Date("2026-10-01T12:00:00-04:00");

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

function $(sel, root = document) {
  return root.querySelector(sel);
}

function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

/* ── Canvas architectural hero (DIKER-inspired) ────────────── */
function setupHeroCanvas() {
  const canvas = $("[data-hero-canvas]");
  if (!canvas) return { flash: () => {} };

  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let dpr = 1;
  let t0 = performance.now();
  let pointer = { x: 0, y: 0 };
  let flashUntil = 0;

  const ROWS = 7;
  const COLS = 4;

  /** @type {{side:'L'|'R', row:number, col:number, accent:null|'teal'|'red', pulse:number}[]} */
  let windows = [];

  const accentPlan = [
    { side: "L", row: 2, col: 1, accent: "teal" },
    { side: "R", row: 1, col: 2, accent: "teal" },
    { side: "R", row: 3, col: 0, accent: "red" },
  ];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildWindowGrid();
  }

  function buildWindowGrid() {
    windows = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        for (const side of /** @type {const} */ (["L", "R"])) {
          const match = accentPlan.find((a) => a.side === side && a.row === row && a.col === col);
          windows.push({
            side,
            row,
            col,
            accent: match ? match.accent : null,
            pulse: Math.random() * Math.PI * 2,
          });
        }
      }
    }
  }

  /** Map face UV (u across, v down) → screen point on a triangular facade */
  function facePoint(side, u, v, peakX, peakY, leftX, rightX, baseY) {
    const edgeX = side === "L" ? leftX : rightX;
    // At depth v, the face spans from peakX to edge along the base line
    const xAtEdge = peakX + (edgeX - peakX) * v;
    const y = peakY + (baseY - peakY) * v;
    // u=0 at corner seam, u=1 at outer edge
    const x = peakX + (xAtEdge - peakX) * u;
    return { x, y };
  }

  function drawArchAt(cx, cy, ww, hh, fill, reveal, skew) {
    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.translate(cx, cy);
    ctx.transform(1, 0, skew, 1, 0, 0);

    const x = -ww / 2;
    const y = -hh * 0.15;
    const r = ww * 0.5;

    // Recess lip
    ctx.beginPath();
    ctx.moveTo(x - 3, y + hh + 3);
    ctx.lineTo(x - 3, y + r);
    ctx.arc(0, y + r, ww / 2 + 3, Math.PI, 0, false);
    ctx.lineTo(x + ww + 3, y + hh + 3);
    ctx.closePath();
    ctx.fillStyle = "rgba(200,206,216,0.7)";
    ctx.fill();

    // Opening
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x, y + r);
    ctx.arc(0, y + r, ww / 2, Math.PI, 0, false);
    ctx.lineTo(x + ww, y + hh);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    const shade = ctx.createLinearGradient(x, y, x + ww, y + hh);
    shade.addColorStop(0, "rgba(255,255,255,0.1)");
    shade.addColorStop(0.5, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.restore();
  }

  function draw(now) {
    const elapsed = (now - t0) / 1000;
    const intro = prefersReduced ? 1 : Math.min(1, elapsed / 1.4);
    const ease = 1 - Math.pow(1 - intro, 3);
    const flashing = now < flashUntil;

    ctx.clearRect(0, 0, w, h);

    // Overcast sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#b9c1cd");
    sky.addColorStop(0.45, "#c5ccd6");
    sky.addColorStop(1, "#aeb7c4");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const peakX = w * 0.5 + pointer.x * 12;
    const peakY = h * (0.1 + (1 - ease) * 0.1) + pointer.y * 8;
    const leftX = -w * 0.08;
    const rightX = w * 1.08;
    const baseY = h * 1.05;

    ctx.save();
    ctx.translate(0, (1 - ease) * h * 0.1);

    // Left face
    const leftGrad = ctx.createLinearGradient(leftX, peakY, peakX, baseY);
    leftGrad.addColorStop(0, "#ffffff");
    leftGrad.addColorStop(1, "#f2f3f6");
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(leftX, baseY);
    ctx.lineTo(peakX, baseY);
    ctx.closePath();
    ctx.fillStyle = leftGrad;
    ctx.fill();

    // Right face
    const rightGrad = ctx.createLinearGradient(peakX, peakY, rightX, baseY);
    rightGrad.addColorStop(0, "#f5f6f8");
    rightGrad.addColorStop(1, "#d9dee6");
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(rightX, baseY);
    ctx.lineTo(peakX, baseY);
    ctx.closePath();
    ctx.fillStyle = rightGrad;
    ctx.fill();

    // Floor joints
    for (const side of /** @type {const} */ (["L", "R"])) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(side === "L" ? leftX : rightX, baseY);
      ctx.lineTo(peakX, baseY);
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = side === "L" ? "rgba(180,186,196,0.45)" : "rgba(160,168,180,0.4)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= ROWS + 1; i++) {
        const v = i / (ROWS + 1.2);
        const a = facePoint(side, 0, v, peakX, peakY, leftX, rightX, baseY);
        const b = facePoint(side, 1, v, peakX, peakY, leftX, rightX, baseY);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Corner
    ctx.beginPath();
    ctx.moveTo(peakX, peakY);
    ctx.lineTo(peakX, baseY);
    ctx.strokeStyle = "rgba(140,148,160,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Large arched recesses — packed toward the corner like the reference
    windows.forEach((win) => {
      const vCenter = (win.row + 1.05) / (ROWS + 1.15);
      // Start near the seam (u≈0.1) and step outward
      const uCenter = 0.1 + (win.col + 0.5) * (0.78 / COLS);
      const p = facePoint(win.side, uCenter, vCenter, peakX, peakY, leftX, rightX, baseY);

      const faceWidth = Math.abs(
        facePoint(win.side, 1, vCenter, peakX, peakY, leftX, rightX, baseY).x -
          facePoint(win.side, 0, vCenter, peakX, peakY, leftX, rightX, baseY).x
      );
      const ww = (faceWidth * 0.78) / COLS;
      const hh = ww * 1.5;
      if (ww < 14 || vCenter < 0.16 || uCenter > 0.9) return;

      const appear = prefersReduced
        ? 1
        : Math.max(0, Math.min(1, (elapsed - 0.28 - win.row * 0.06) / 0.55));

      let fill = "#14171c";
      if (win.accent === "teal") {
        const a = prefersReduced ? 1 : Math.max(0, Math.min(1, (elapsed - 1.05) / 0.45));
        fill = mixColor("#14171c", flashing ? "#2ad4e0" : TEAL, a);
      } else if (win.accent === "red") {
        const a = prefersReduced ? 1 : Math.max(0, Math.min(1, (elapsed - 1.25) / 0.45));
        fill = mixColor("#14171c", flashing ? "#ff5a55" : RED, a);
      } else {
        const live = 0.5 + 0.5 * Math.sin(elapsed * 0.65 + win.pulse);
        if (live > 0.93) fill = "#262c34";
      }

      const skew = win.side === "L" ? -0.08 * uCenter : 0.08 * uCenter;
      drawArchAt(p.x, p.y, ww, hh, fill, appear, skew);
    });

    ctx.restore();

    if (!prefersReduced) requestAnimationFrame(draw);
  }

  function mixColor(a, b, t) {
    const pa = hexToRgb(a);
    const pb = hexToRgb(b);
    return `rgb(${Math.round(pa.r + (pb.r - pa.r) * t)},${Math.round(pa.g + (pb.g - pa.g) * t)},${Math.round(
      pa.b + (pb.b - pa.b) * t
    )})`;
  }

  function hexToRgb(hex) {
    const raw = hex.replace("#", "");
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
    };
  }

  function flash() {
    flashUntil = performance.now() + 700;
    if (prefersReduced) requestAnimationFrame(draw);
  }

  resize();
  requestAnimationFrame(draw);

  window.addEventListener("resize", () => {
    resize();
    if (prefersReduced) requestAnimationFrame(draw);
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true }
  );

  return { flash };
}

/* ── Reveal on scroll ──────────────────────────────────────── */
function setupReveals() {
  const nodes = $$("[data-reveal]");
  if (prefersReduced) {
    nodes.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
  );

  nodes.forEach((el) => io.observe(el));
}

/* ── Active section nav ────────────────────────────────────── */
function setupNavSpy() {
  const links = $$("[data-nav]");
  const sections = ["soon", "about", "vision", "notify", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const setActive = (id) => {
    links.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const active = id ? href === `#${id}` || (id === "soon" && href === "#top") : href === "#top";
      link.classList.toggle("is-active", active);
    });
  };

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id === "soon" ? null : visible.target.id);
    },
    { threshold: [0.35, 0.55], rootMargin: "-20% 0px -45% 0px" }
  );

  sections.forEach((s) => io.observe(s));

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const panel = $("[data-mobile-nav]");
      const toggle = $("[data-menu-toggle]");
      panel?.classList.remove("is-open");
      if (panel) panel.hidden = true;
      toggle?.setAttribute("aria-expanded", "false");
      document.body.classList.remove("is-locked");
    });
  });

  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY < 80) setActive(null);
      $(".site-header")?.classList.toggle("is-scrolled", window.scrollY > 8);
    },
    { passive: true }
  );
}

/* ── Parallax + cursor glow ────────────────────────────────── */
function setupMotion() {
  const stage = $("[data-parallax]");
  const glow = $(".cursor-glow");
  if (!stage) return;

  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;
  let scrollY = 0;

  if (hasFinePointer) document.body.classList.add("has-pointer");

  window.addEventListener(
    "pointermove",
    (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      mx = nx * 14;
      my = ny * 10;
      if (glow) glow.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      scrollY = window.scrollY;
    },
    { passive: true }
  );

  if (prefersReduced) return;

  const tick = () => {
    tx += (mx - tx) * 0.06;
    ty += (my - ty) * 0.06;
    const y = Math.min(scrollY * 0.22, 140);
    stage.style.transform = `translate3d(${tx}px, ${ty + y}px, 0) scale(${1.04 + Math.min(scrollY, 500) * 0.00005})`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ── Magnetic buttons ──────────────────────────────────────── */
function setupMagnetic() {
  if (!hasFinePointer || prefersReduced) return;

  $$("[data-magnetic]").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
    });
  });
}

/* ── Waitlist ──────────────────────────────────────────────── */
function setupWaitlist(hero) {
  const form = $("#waitlist-form");
  const status = $("[data-waitlist-status]");
  if (!form || !status) return;

  const saved = localStorage.getItem("rah-waitlist");
  if (saved) {
    status.textContent = `You're on the list as ${saved}.`;
    status.classList.add("is-ok");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input[type=email]");
    const email = (input?.value || "").trim().toLowerCase();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    status.classList.remove("is-ok", "is-err");

    if (!ok) {
      status.textContent = "That email doesn’t look right — try again.";
      status.classList.add("is-err");
      input?.focus();
      return;
    }

    localStorage.setItem("rah-waitlist", email);
    status.textContent = `Locked in. We’ll ping ${email} when it’s time.`;
    status.classList.add("is-ok");
    form.reset();
    hero?.flash?.();
  });
}

/* ── Countdown ─────────────────────────────────────────────── */
function setupCountdown() {
  const cells = {
    days: $('[data-count="days"]'),
    hours: $('[data-count="hours"]'),
    mins: $('[data-count="mins"]'),
    secs: $('[data-count="secs"]'),
  };
  if (!cells.days) return;

  const pad = (n) => String(Math.max(0, n)).padStart(2, "0");

  const tick = () => {
    const diff = LAUNCH.getTime() - Date.now();
    if (diff <= 0) {
      cells.days.textContent = "00";
      cells.hours.textContent = "00";
      cells.mins.textContent = "00";
      cells.secs.textContent = "00";
      return;
    }
    const secs = Math.floor(diff / 1000);
    cells.days.textContent = pad(Math.floor(secs / 86400));
    cells.hours.textContent = pad(Math.floor((secs % 86400) / 3600));
    cells.mins.textContent = pad(Math.floor((secs % 3600) / 60));
    cells.secs.textContent = pad(secs % 60);
  };

  tick();
  window.setInterval(tick, 1000);
}

/* ── Search overlay ────────────────────────────────────────── */
function setupSearch() {
  const overlay = $("[data-search-overlay]");
  const openBtn = $("[data-search-open]");
  const closeBtn = $("[data-search-close]");
  const form = $("[data-search-form]");
  const input = $("#site-search");
  if (!overlay || !openBtn || !form || !input) return;

  const map = {
    home: "#top",
    about: "#about",
    vision: "#vision",
    notify: "#notify",
    contact: "#contact",
    waitlist: "#notify",
    soon: "#soon",
  };

  const open = () => {
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    document.body.classList.add("is-locked");
    input.value = "";
    input.focus();
  };

  const close = () => {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-locked");
    window.setTimeout(() => {
      overlay.hidden = true;
    }, 280);
  };

  openBtn.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim().toLowerCase();
    const key = Object.keys(map).find((k) => q.includes(k));
    if (key) {
      close();
      $(map[key])?.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    } else {
      input.style.borderBottomColor = RED;
      window.setTimeout(() => {
        input.style.borderBottomColor = "";
      }, 600);
    }
  });

  window.addEventListener("keydown", (e) => {
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && document.activeElement?.tagName !== "INPUT")) {
      e.preventDefault();
      open();
    }
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });
}

/* ── Mobile menu ───────────────────────────────────────────── */
function setupMenu() {
  const toggle = $("[data-menu-toggle]");
  const panel = $("[data-mobile-nav]");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add("is-open"));
    } else {
      panel.classList.remove("is-open");
      window.setTimeout(() => {
        panel.hidden = true;
      }, 280);
    }
    document.body.classList.toggle("is-locked", open);
  });
}

/* ── Boot ──────────────────────────────────────────────────── */
function boot() {
  const year = $("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const hero = setupHeroCanvas();
  setupReveals();
  setupNavSpy();
  setupMotion();
  setupMagnetic();
  setupWaitlist(hero);
  setupCountdown();
  setupSearch();
  setupMenu();
}

boot();
