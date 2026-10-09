/* Original, dependency-free motion. Native scrolling remains the source of truth. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const hero = document.querySelector(".hero");
  const band = document.querySelector(".name-band");
  const track = document.querySelector(".name-track");
  const stars = [...document.querySelectorAll(".hero-star")];
  const ambients = [...document.querySelectorAll(".ambient")];
  const poster = document.querySelector(".poster-art");
  const footer = document.querySelector(".contact");
  const curve = document.querySelector(".footer-curve");
  const arrow = document.querySelector(".footer-arrow");
  const preview = document.querySelector(".project-preview");
  const previewTrack = document.querySelector(".preview-track");
  const cursor = document.querySelector(".preview-cursor");
  const toggle = document.querySelector(".motion-toggle");
  const menuButton = document.querySelector(".menu-toggle");
  const dialog = document.querySelector("#navigation");
  const panel = dialog.querySelector(".menu-panel");
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  const magnets = [...document.querySelectorAll(".magnetic")].map((el) => ({
    el,
    surface: el.querySelector(".magnet-surface"),
    label: el.querySelector(".magnet-label"),
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    rect: null,
  }));
  let paused = false;
  try {
    paused = sessionStorage.getItem("mads-motion-paused") === "true";
  } catch {
    /* Storage is optional. */
  }
  let motion = !reduced.matches && !paused;
  let raf = 0;
  let previousTime = 0;
  let elapsed = 0;
  let scroll = window.scrollY;
  let direction = 1;
  let speed = 1;
  let phase = 0;
  let needsPaint = true;
  let heroVisible = true;
  let bandVisible = true;
  let posterVisible = false;
  let previewActive = false;
  let menuTimer = 0;
  let menuPhase = "closed";
  let menuOpeningFrame = 0;
  let menuScrollY = 0;
  let menuDestination = null;
  let menuOpener = null;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const follower = { x: 0, y: 0, cx: 0, cy: 0, tx: 0, ty: 0 };
  const layout = {
    width: innerWidth,
    height: innerHeight,
    heroHeight: 800,
    footerTop: 0,
    posterTop: 0,
    nameWidth: 1,
    previewWidth: 360,
    previewHeight: 270,
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  const translate = (el, x, y, extra = "") => {
    el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) ${extra}`;
  };

  function wake() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function measure() {
    // Layout is read on resize/font load, never inside the animation loop.
    layout.width = innerWidth;
    layout.height = innerHeight;
    layout.heroHeight = hero.offsetHeight;
    const pageScroll = dialog.open ? menuScrollY : window.scrollY;
    layout.footerTop = footer.getBoundingClientRect().top + pageScroll;
    layout.posterTop =
      poster.closest(".poster").getBoundingClientRect().top + pageScroll;
    layout.nameWidth =
      track.firstElementChild.getBoundingClientRect().width || 1;
    layout.previewWidth = preview.offsetWidth;
    layout.previewHeight = preview.offsetHeight;
    magnets.forEach((m) => {
      m.rect = null;
    });
    needsPaint = true;
    wake();
  }

  function frame(time) {
    raf = 0;
    const dt = previousTime
      ? Math.min((time - previousTime) / 1000, 0.032)
      : 1 / 60;
    previousTime = time;
    elapsed += dt;
    let moving = false;
    if (motion && !dialog.open) {
      pointer.x = damp(pointer.x, pointer.tx, 4, dt);
      pointer.y = damp(pointer.y, pointer.ty, 4, dt);
      if (heroVisible) {
        const drift = Math.sin(elapsed * 0.35);
        stars.forEach((star, i) =>
          translate(
            star,
            pointer.x * (i ? -12 : 28),
            pointer.y * (i ? -10 : 22) + drift * (i ? 3 : 8),
            `rotate(${(pointer.x * 10 + elapsed * (i ? -3 : 2)).toFixed(2)}deg)`,
          ),
        );
        ambients.forEach((ambient, i) =>
          translate(
            ambient,
            pointer.x * (i ? -30 : 40),
            pointer.y * 25 + drift * 12,
          ),
        );
        moving = true;
      }
      if (bandVisible) {
        speed = damp(speed, direction, 2.6, dt);
        phase =
          (phase + ((dt * layout.nameWidth) / 24) * speed + layout.nameWidth) %
          layout.nameWidth;
        translate(track, -phase, 0);
        moving = true;
      }
      if (posterVisible && needsPaint) {
        const progress = clamp(
          (scroll + layout.height / 2 - layout.posterTop) / layout.height,
          -0.7,
          0.7,
        );
        translate(poster, 0, progress * 27);
      }
      magnets.forEach((m) => {
        const unsettled =
          Math.abs(m.x - m.tx) +
            Math.abs(m.y - m.ty) +
            Math.abs(m.vx) +
            Math.abs(m.vy) >
          0.03;
        if (!unsettled) return;
        // A damped spring creates a soft release; the anchor's hit area stays fixed.
        m.vx += ((m.tx - m.x) * 130 - m.vx * 19) * dt;
        m.vy += ((m.ty - m.y) * 130 - m.vy * 19) * dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        translate(m.surface, m.x, m.y);
        translate(m.label, m.x * 0.3, m.y * 0.3);
        moving = true;
      });
      if (previewActive) {
        follower.x = damp(follower.x, follower.tx, 7, dt);
        follower.y = damp(follower.y, follower.ty, 7, dt);
        follower.cx = damp(follower.cx, follower.tx, 12, dt);
        follower.cy = damp(follower.cy, follower.ty, 12, dt);
        translate(
          preview,
          follower.x - layout.previewWidth / 2,
          follower.y - layout.previewHeight / 2,
        );
        translate(cursor, follower.cx - 45, follower.cy - 45);
        moving =
          Math.abs(follower.x - follower.tx) +
            Math.abs(follower.y - follower.ty) +
            Math.abs(follower.cx - follower.tx) +
            Math.abs(follower.cy - follower.ty) >
            0.05 || moving;
      }
    }
    if (needsPaint) {
      const footerProgress = clamp(
        (scroll + layout.height - layout.footerTop) / (layout.height * 0.9),
        0,
        1,
      );
      curve.style.transform = `scaleY(${motion ? (1 - footerProgress).toFixed(4) : "0"})`;
      arrow.style.transform = `rotate(${motion ? (-15 * (1 - footerProgress)).toFixed(2) : "0"}deg)`;
      needsPaint = false;
    }
    if (moving && motion) wake();
    else previousTime = 0;
  }

  function hidePreview() {
    previewActive = false;
    preview.classList.remove("is-active");
    cursor.classList.remove("is-active");
  }

  function updatePreference() {
    motion = !reduced.matches && !paused;
    root.classList.toggle("motion-off", !motion);
    root.classList.toggle("motion-ready", motion);
    toggle.setAttribute("aria-pressed", String(!motion));
    toggle.querySelector(".motion-label").textContent = reduced.matches
      ? "Reduced motion"
      : paused
        ? "Resume motion"
        : "Pause motion";
    toggle.disabled = reduced.matches;
    if (!motion) {
      hidePreview();
      [track, poster, ...stars, ...ambients].forEach((el) => {
        el.style.transform = "";
      });
      magnets.forEach((m) => {
        m.x = m.y = m.vx = m.vy = m.tx = m.ty = 0;
        m.surface.style.transform = m.label.style.transform = "";
      });
      reveals.forEach((el) => el.classList.add("is-visible"));
    }
    needsPaint = true;
    wake();
  }

  const revealObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.06, rootMargin: "0px 0px -30px 0px" },
        )
      : null;
  reveals.forEach((el) => {
    // Keep above-the-fold and hash destinations readable, including without JS.
    if (
      motion &&
      revealObserver &&
      el.getBoundingClientRect().top > innerHeight &&
      !(location.hash && el.closest(location.hash))
    ) {
      el.classList.add("will-reveal");
      revealObserver.observe(el);
    } else el.classList.add("is-visible");
  });
  if ("IntersectionObserver" in window) {
    const visibility = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === hero) heroVisible = entry.isIntersecting;
        if (entry.target === band) bandVisible = entry.isIntersecting;
        if (entry.target === poster.closest(".poster"))
          posterVisible = entry.isIntersecting;
      });
      needsPaint = true;
      wake();
    });
    [hero, band, poster.closest(".poster")].forEach((el) =>
      visibility.observe(el),
    );
  }

  hero.addEventListener(
    "pointermove",
    (event) => {
      if (!motion || !fine.matches) return;
      pointer.tx = clamp((event.clientX / layout.width) * 2 - 1, -1, 1);
      pointer.ty = clamp((event.clientY / layout.height) * 2 - 1, -1, 1);
      wake();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    pointer.tx = pointer.ty = 0;
  });
  magnets.forEach((m) => {
    m.el.addEventListener("pointerenter", () => {
      m.rect = m.el.getBoundingClientRect();
    });
    m.el.addEventListener(
      "pointermove",
      (event) => {
        if (!motion || !fine.matches) return;
        m.rect ??= m.el.getBoundingClientRect();
        const strength = m.el.classList.contains("circle") ? 30 : 12;
        m.tx =
          clamp((event.clientX - m.rect.left) / m.rect.width - 0.5, -0.5, 0.5) *
          strength;
        m.ty =
          clamp((event.clientY - m.rect.top) / m.rect.height - 0.5, -0.5, 0.5) *
          strength;
        wake();
      },
      { passive: true },
    );
    m.el.addEventListener("pointerleave", () => {
      m.tx = m.ty = 0;
      wake();
    });
  });

  function aimPreview(event) {
    follower.tx = clamp(
      event.clientX,
      layout.previewWidth / 2 + 24,
      layout.width - layout.previewWidth / 2 - 24,
    );
    follower.ty = clamp(
      event.clientY,
      layout.previewHeight / 2 + 24,
      layout.height - layout.previewHeight / 2 - 24,
    );
    wake();
  }
  document.querySelectorAll(".project").forEach((project) => {
    project.addEventListener("pointerenter", (event) => {
      if (!motion || !fine.matches || layout.width <= 760) return;
      aimPreview(event);
      if (!previewActive) {
        follower.x = follower.cx = follower.tx;
        follower.y = follower.cy = follower.ty;
        translate(
          preview,
          follower.x - layout.previewWidth / 2,
          follower.y - layout.previewHeight / 2,
        );
        translate(cursor, follower.cx - 45, follower.cy - 45);
      }
      previewActive = true;
      previewTrack.style.transform = `translateY(-${Number(project.dataset.project) * 25}%)`;
      preview.classList.add("is-active");
      cursor.classList.add("is-active");
      wake();
    });
    project.addEventListener(
      "pointermove",
      (event) => {
        if (previewActive) aimPreview(event);
      },
      { passive: true },
    );
    project.addEventListener("pointerleave", hidePreview);
  });
  fine.addEventListener("change", () => {
    if (!fine.matches) hidePreview();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (dialog.open) return;
      const next = window.scrollY;
      if (Math.abs(next - scroll) > 2) direction = next > scroll ? 1 : -1;
      scroll = next;
      needsPaint = true;
      hidePreview();
      wake();
    },
    { passive: true },
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      previousTime = 0;
      hidePreview();
    } else wake();
  });
  window.addEventListener("resize", measure, { passive: true });
  document.fonts?.ready.then(measure);
  window.addEventListener("load", measure, { once: true });
  document.addEventListener("focusin", (event) => {
    event.target.closest("[data-reveal]")?.classList.add("is-visible");
  });
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      document
        .querySelector(link.hash)
        ?.querySelectorAll("[data-reveal]")
        .forEach((el) => el.classList.add("is-visible"));
    });
  });
  toggle.addEventListener("click", () => {
    paused = !paused;
    try {
      sessionStorage.setItem("mads-motion-paused", String(paused));
    } catch {
      /* Optional. */
    }
    updatePreference();
  });
  reduced.addEventListener("change", updatePreference);
  window.addEventListener("beforeprint", () =>
    reveals.forEach((el) => el.classList.add("is-visible")),
  );

  function finishClose() {
    if (menuPhase === "closed") return;
    clearTimeout(menuTimer);
    cancelAnimationFrame(menuOpeningFrame);
    menuOpeningFrame = 0;
    menuPhase = "closed";
    dialog.classList.remove("is-open");
    if (dialog.open) dialog.close();
    document.body.classList.remove("menu-is-open");
    root.style.removeProperty("--menu-scroll-top");
    // Restore the page before navigating or restoring focus, including on iOS.
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, menuScrollY);
    root.style.scrollBehavior = previousBehavior;
    scroll = window.scrollY;
    menuButton.setAttribute("aria-expanded", "false");
    const destination = menuDestination;
    menuDestination = null;
    if (destination) {
      if (!destination.startsWith("#")) {
        location.assign(destination);
        return;
      }
      const target = document.querySelector(destination);
      target
        ?.querySelectorAll("[data-reveal]")
        .forEach((el) => el.classList.add("is-visible"));
      if (target) {
        if (location.hash !== destination)
          history.pushState(null, "", destination);
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
        target.scrollIntoView({
          behavior: motion ? "smooth" : "auto",
          block: "start",
        });
      }
    } else menuOpener?.focus({ preventScroll: true });
    needsPaint = true;
    wake();
  }
  function closeMenu(destination = null) {
    if (menuPhase === "closed" || menuPhase === "closing") return;
    const hasOpened = dialog.classList.contains("is-open");
    cancelAnimationFrame(menuOpeningFrame);
    menuOpeningFrame = 0;
    menuDestination = typeof destination === "string" ? destination : null;
    menuPhase = "closing";
    dialog.classList.remove("is-open");
    if (!motion || !hasOpened) finishClose();
    else menuTimer = setTimeout(finishClose, 750);
  }
  menuButton.addEventListener("click", () => {
    if (menuPhase !== "closed") return;
    menuOpener = document.activeElement;
    menuScrollY = window.scrollY;
    hidePreview();
    root.style.setProperty("--menu-scroll-top", `${-menuScrollY}px`);
    document.body.classList.add("menu-is-open");
    menuPhase = "opening";
    dialog.showModal();
    menuButton.setAttribute("aria-expanded", "true");
    // Commit the starting position once. The fixed close button owns autofocus,
    // so the browser never scrolls the offscreen animated panel into view.
    panel.getBoundingClientRect();
    menuOpeningFrame = requestAnimationFrame(() => {
      menuOpeningFrame = 0;
      if (menuPhase !== "opening") return;
      dialog.classList.add("is-open");
      menuPhase = "open";
    });
  });
  dialog.querySelector(".menu-close").addEventListener("click", closeMenu);
  dialog.querySelector(".menu-backdrop").addEventListener("click", closeMenu);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeMenu();
  });
  panel.addEventListener("transitionend", (event) => {
    if (
      menuPhase === "closing" &&
      event.target === panel &&
      !event.pseudoElement &&
      event.propertyName === "transform"
    )
      finishClose();
  });
  dialog.addEventListener("close", () => {
    if (menuPhase !== "closed") finishClose();
  });
  dialog.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      closeMenu(link.getAttribute("href"));
    });
  });
  menuButton.hidden = false;
  toggle.hidden = false;
  updatePreference();
  measure();
})();
