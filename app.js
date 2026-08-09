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

/* ── Canvas logo hero ──────────────────────────────────────── */
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
  /** @type {HTMLImageElement | null} */
  let logo = null;
  let logoReady = false;

  function loadLogo() {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      logo = img;
      logoReady = true;
      if (prefersReduced) requestAnimationFrame(draw);
    };
    img.src = "assets/logo-mark.png";
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(now) {
    const elapsed = (now - t0) / 1000;
    const intro = prefersReduced ? 1 : Math.min(1, elapsed / 1.4);
    const ease = 1 - Math.pow(1 - intro, 3);
    const flashing = now < flashUntil;
    const flashT = flashing ? Math.max(0, (flashUntil - now) / 700) : 0;

    ctx.clearRect(0, 0, w, h);

    // Overcast sky (same atmosphere as before)
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#b9c1cd");
    sky.addColorStop(0.45, "#c5ccd6");
    sky.addColorStop(1, "#aeb7c4");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    if (!logoReady || !logo) {
      if (!prefersReduced) requestAnimationFrame(draw);
      return;
    }

    const float = prefersReduced ? 0 : Math.sin(elapsed * 0.9) * 6;
    const markH = Math.min(h * 0.72, w * 0.62);
    const markW = markH * (logo.naturalWidth / logo.naturalHeight);
    const cx = w * 0.5 + pointer.x * 18;
    const cy = h * 0.5 + pointer.y * 12 + (1 - ease) * h * 0.12 + float;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = ease;
    const scale = 0.88 + ease * 0.12 + (flashing ? flashT * 0.03 : 0);
    ctx.scale(scale, scale);

    // Soft ground shadow
    ctx.save();
    ctx.globalAlpha = ease * 0.22;
    ctx.fillStyle = "rgba(28, 31, 36, 0.4)";
    ctx.beginPath();
    ctx.ellipse(0, markH * 0.48, markW * 0.4, markH * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bright plate so teal strokes read on the overcast sky
    const plate = ctx.createRadialGradient(0, -markH * 0.02, markW * 0.08, 0, 0, markW * 0.78);
    plate.addColorStop(0, "rgba(255, 255, 255, 0.92)");
    plate.addColorStop(0.45, "rgba(255, 255, 255, 0.55)");
    plate.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = plate;
    ctx.beginPath();
    ctx.arc(0, 0, markW * 0.78, 0, Math.PI * 2);
    ctx.fill();

    // Ambient teal bloom
    const bloom = ctx.createRadialGradient(0, -markH * 0.05, markW * 0.1, 0, 0, markW * 0.72);
    bloom.addColorStop(0, flashing ? "rgba(42, 212, 224, 0.32)" : "rgba(0, 168, 181, 0.2)");
    bloom.addColorStop(0.55, "rgba(0, 168, 181, 0.06)");
    bloom.addColorStop(1, "rgba(0, 168, 181, 0)");
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(0, 0, markW * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Logo
    ctx.drawImage(logo, -markW / 2, -markH / 2, markW, markH);

    // Chimney accent pulse (upper-right of mark, matching logo chimney)
    const pulse = prefersReduced ? 0.55 : 0.5 + 0.5 * Math.sin(elapsed * 2.2);
    const chimneyX = markW * 0.18;
    const chimneyY = -markH * 0.34;
    const glowR = markW * (0.06 + pulse * 0.04) * (flashing ? 1 + flashT * 1.4 : 1);
    const chimneyGlow = ctx.createRadialGradient(chimneyX, chimneyY, 0, chimneyX, chimneyY, glowR);
    chimneyGlow.addColorStop(0, flashing ? `rgba(255, 90, 85, ${0.55 * pulse})` : `rgba(229, 57, 53, ${0.35 * pulse})`);
    chimneyGlow.addColorStop(1, "rgba(229, 57, 53, 0)");
    ctx.fillStyle = chimneyGlow;
    ctx.beginPath();
    ctx.arc(chimneyX, chimneyY, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Flash wash
    if (flashing && flashT > 0) {
      ctx.globalAlpha = flashT * 0.22;
      ctx.fillStyle = TEAL;
      ctx.fillRect(-markW / 2, -markH / 2, markW, markH);
    }

    ctx.restore();

    if (!prefersReduced) requestAnimationFrame(draw);
  }

  function flash() {
    flashUntil = performance.now() + 700;
    if (prefersReduced) requestAnimationFrame(draw);
  }

  loadLogo();
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
