/* Original case-study interactions. Native scrolling and readable HTML first. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  const hero = document.querySelector(".case-hero");
  const heroImage = document.querySelector(".case-visual-inner");
  const star = document.querySelector(".case-star");
  const progress = document.querySelector(".reading-progress");
  const chapterLinks = [...document.querySelectorAll(".chapter-nav a")];
  const chapters = chapterLinks.map((link) =>
    document.querySelector(link.hash),
  );
  const toggle = document.querySelector(".motion-toggle");
  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#navigation");
  const menuPanel = menu.querySelector(".menu-panel");
  const imageView = document.querySelector("#image-view");
  const imageDetail = imageView.querySelector("img");
  const sizeButton = imageView.querySelector(".image-size");
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  let paused = false;
  try {
    paused = sessionStorage.getItem("mads-motion-paused") === "true";
  } catch {
    /* Optional. */
  }
  let motion = !reduced.matches && !paused;
  let raf = 0;
  let previousTime = 0;
  let elapsed = 0;
  let heroVisible = true;
  let scroll = window.scrollY;
  let pageHeight = 1;
  let chapterTops = [];
  let pointerX = 0;
  let targetX = 0;
  let menuPhase = "closed";
  let openingFrame = 0;
  let closeTimer = 0;
  let menuCurveAnimation = null;
  let menuDestination = null;
  let lockedY = 0;
  let modalOpener = null;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function wake() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(paint);
  }
  function measure() {
    const pageScroll = menu.open || imageView.open ? lockedY : window.scrollY;
    chapterTops = chapters.map(
      (chapter) => chapter.getBoundingClientRect().top + pageScroll,
    );
    pageHeight = Math.max(1, document.body.scrollHeight - innerHeight);
    document
      .querySelector(".design-tabs")
      ?.setAttribute(
        "aria-orientation",
        innerWidth > 760 ? "vertical" : "horizontal",
      );
    wake();
  }
  function paint(time) {
    raf = 0;
    const dt = previousTime
      ? Math.min((time - previousTime) / 1000, 0.032)
      : 1 / 60;
    previousTime = time;
    elapsed += dt;
    progress.style.transform = `scaleX(${clamp(scroll / pageHeight, 0, 1).toFixed(4)})`;
    let active = 0;
    chapterTops.forEach((top, index) => {
      if (scroll + innerHeight * 0.34 >= top) active = index;
    });
    chapterLinks.forEach((link, index) => {
      if (index === active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    if (motion && heroVisible && !menu.open && !imageView.open) {
      pointerX += (targetX - pointerX) * (1 - Math.exp(-4 * dt));
      star.style.transform = `rotate(${(Math.sin(elapsed * 0.3) * 8 + pointerX * 18).toFixed(2)}deg)`;
      if (heroImage) heroImage.style.transform = `translate3d(0,${clamp(scroll * 0.025, 0, 22).toFixed(2)}px,0)`;
      wake();
    } else previousTime = 0;
  }
  function updateMotion() {
    motion = !reduced.matches && !paused;
    root.classList.toggle("motion-ready", motion);
    root.classList.toggle("motion-off", !motion);
    toggle.setAttribute("aria-pressed", String(!motion));
    toggle.querySelector(".motion-label").textContent = reduced.matches
      ? "Reduced motion"
      : paused
        ? "Resume motion"
        : "Pause motion";
    toggle.disabled = reduced.matches;
    if (!motion) {
      star.style.transform = "";
      if (heroImage) heroImage.style.transform = "";
      reveals.forEach((el) => el.classList.add("is-visible"));
    }
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
          { threshold: 0.06, rootMargin: "0px 0px -25px 0px" },
        )
      : null;
  reveals.forEach((el) => {
    const atDestination = location.hash && el.closest(location.hash);
    if (
      motion &&
      revealObserver &&
      el.getBoundingClientRect().top > innerHeight &&
      !atDestination
    ) {
      el.classList.add("will-reveal");
      revealObserver.observe(el);
    } else el.classList.add("is-visible");
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
      wake();
    }).observe(hero);
  }
  hero.addEventListener(
    "pointermove",
    (event) => {
      if (!motion || !fine.matches) return;
      targetX = clamp((event.clientX / innerWidth) * 2 - 1, -1, 1);
      wake();
    },
    { passive: true },
  );
  hero.addEventListener("pointerleave", () => {
    targetX = 0;
    wake();
  });
  window.addEventListener(
    "scroll",
    () => {
      if (menu.open || imageView.open) return;
      scroll = window.scrollY;
      wake();
    },
    { passive: true },
  );
  window.addEventListener("resize", measure, { passive: true });
  document.fonts?.ready.then(measure);
  window.addEventListener("load", measure, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      previousTime = 0;
    } else wake();
  });
  document.addEventListener("focusin", (event) =>
    event.target.closest("[data-reveal]")?.classList.add("is-visible"),
  );
  document.querySelectorAll('a[href^="#"]').forEach((link) =>
    link.addEventListener("click", () => {
      document
        .querySelector(link.hash)
        ?.querySelectorAll("[data-reveal]")
        .forEach((el) => el.classList.add("is-visible"));
    }),
  );
  toggle.addEventListener("click", () => {
    paused = !paused;
    try {
      sessionStorage.setItem("mads-motion-paused", String(paused));
    } catch {
      /* Optional. */
    }
    updateMotion();
  });
  reduced.addEventListener("change", updateMotion);

  // Without JS, all gallery panels and comparison versions remain visible.
  const explorer = document.querySelector(".design-explorer");
  if (explorer) {
    const tabs = [...document.querySelectorAll('.design-tabs [role="tab"]')];
    const panels = [...document.querySelectorAll(".design-panel")];
    const versionButtons = [
      ...document.querySelectorAll(".comparison-controls button"),
    ];
    let selectedPanel = 0;
    let version = "after";
    let explorerWarmed = false;
    function warmExplorer() {
      if (explorerWarmed) return;
      explorerWarmed = true;
      explorer.querySelectorAll("img").forEach((img) => {
        img.loading = "eager";
        img.decode?.().catch(() => {
          /* A native image load can still succeed. */
        });
      });
    }
    if ("IntersectionObserver" in window) {
      const warmObserver = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          warmExplorer();
          warmObserver.disconnect();
        },
        { rootMargin: "700px 0px" },
      );
      warmObserver.observe(explorer);
    } else warmExplorer();
    function activate(index, focus = false) {
      selectedPanel = index;
      tabs.forEach((tab, i) => {
        tab.setAttribute("aria-selected", String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      panels.forEach((panel, i) => {
        panel.hidden = i !== index;
        panel.classList.toggle("is-entering", i === index);
        panel.querySelectorAll("figure").forEach((figure) => {
          figure.hidden =
            Boolean(figure.dataset.version) &&
            figure.dataset.version !== version;
        });
      });
      if (focus) tabs[index].focus({ preventScroll: true });
      measure();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(index));
      tab.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
          next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
          next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        activate(next, true);
      });
    });
    versionButtons.forEach((button) =>
      button.addEventListener("click", () => {
        warmExplorer();
        version = button.dataset.version;
        versionButtons.forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
        activate(selectedPanel);
      }),
    );
    explorer.classList.add("is-enhanced");
    explorer.querySelector(".design-tabs").hidden = false;
    const comparisons = explorer.querySelector(".comparison-controls");
    if (comparisons) comparisons.hidden = false;
    activate(0);
  }

  function lockPage() {
    modalOpener = document.activeElement;
    lockedY = window.scrollY;
    root.style.setProperty("--menu-scroll-top", `${-lockedY}px`);
    document.body.classList.add("menu-is-open");
  }
  function unlockPage() {
    document.body.classList.remove("menu-is-open");
    root.style.removeProperty("--menu-scroll-top");
    const behavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, lockedY);
    root.style.scrollBehavior = behavior;
    scroll = window.scrollY;
    modalOpener?.focus({ preventScroll: true });
    measure();
  }
  function finishMenu() {
    if (menuPhase === "closed") return;
    clearTimeout(closeTimer);
    cancelAnimationFrame(openingFrame);
    openingFrame = 0;
    menuPhase = "closed";
    menuCurveAnimation?.cancel();
    menuCurveAnimation = null;
    menu.classList.remove("is-open", "is-closing");
    if (menu.open) menu.close();
    menuButton.setAttribute("aria-expanded", "false");
    unlockPage();
    if (menuDestination) {
      const destination = menuDestination;
      menuDestination = null;
      location.assign(destination);
    }
  }
  function closeMenu(destination = null) {
    if (menuPhase === "closed" || menuPhase === "closing") return;
    const entered = menu.classList.contains("is-open");
    cancelAnimationFrame(openingFrame);
    openingFrame = 0;
    menuDestination = typeof destination === "string" ? destination : null;
    menuPhase = "closing";
    menu.classList.add("is-closing");
    menu.classList.remove("is-open");
    if (!motion || !entered) finishMenu();
    else {
      menuCurveAnimation = animateMenuExit(menuPanel);
      closeTimer = setTimeout(finishMenu, 750);
    }
  }
  function animateMenuExit(surface) {
    const bend = Math.min(innerWidth * 0.14, 140) / surface.getBoundingClientRect().width * 100;
    const outline = (inset) => {
      const points = ["0% 0%", "100% 0%", "100% 100%", "0% 100%"];
      for (let i = 1; i <= 48; i++) {
        const y = 1 - i / 48;
        const x = inset * Math.sqrt(Math.max(0, 1 - (2 * y - 1) ** 2));
        points.push(`${x.toFixed(3)}% ${(y * 100).toFixed(3)}%`);
      }
      return `polygon(${points.join(",")})`;
    };
    return surface.animate([
      { clipPath: outline(0), offset: 0 },
      { clipPath: outline(bend), offset: 0.42 },
      { clipPath: outline(bend * 0.55), offset: 1 },
    ], { duration: 650, easing: "cubic-bezier(0.7, 0, 0.2, 1)", fill: "both" });
  }
  menuButton.addEventListener("click", () => {
    if (menuPhase !== "closed" || imageView.open) return;
    lockPage();
    menuPhase = "opening";
    menu.showModal();
    menuButton.setAttribute("aria-expanded", "true");
    menuPanel.getBoundingClientRect();
    openingFrame = requestAnimationFrame(() => {
      openingFrame = 0;
      if (menuPhase !== "opening") return;
      menu.classList.add("is-open");
      menuPhase = "open";
    });
  });
  menu.querySelector(".menu-close").addEventListener("click", closeMenu);
  menu.querySelector(".menu-backdrop").addEventListener("click", closeMenu);
  menu.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeMenu();
  });
  menu.addEventListener("close", () => {
    if (menuPhase !== "closed") finishMenu();
  });
  menuPanel.addEventListener("transitionend", (event) => {
    if (
      menuPhase === "closing" &&
      event.target === menuPanel &&
      !event.pseudoElement &&
      event.propertyName === "transform"
    )
      finishMenu();
  });
  menu.querySelectorAll("nav a").forEach((link) =>
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
        return;
      event.preventDefault();
      closeMenu(link.href);
    }),
  );
  menuButton.hidden = false;

  function closeImage() {
    if (!imageView.open) return;
    imageView.close();
    unlockPage();
  }
  document.querySelectorAll(".image-open").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => {
      if (menu.open || imageView.open) return;
      imageDetail.src = button.dataset.image;
      imageDetail.alt = button.closest("figure").querySelector("img").alt;
      imageView.querySelector("h2").textContent = button.dataset.title;
      imageView.classList.remove("is-actual-size");
      sizeButton.setAttribute("aria-pressed", "false");
      sizeButton.textContent = "Actual size";
      lockPage();
      imageView.showModal();
      const imageScroll = imageView.querySelector(".image-view-scroll");
      imageScroll.scrollTop = imageScroll.scrollLeft = 0;
    });
  });
  sizeButton.addEventListener("click", () => {
    const actual = imageView.classList.toggle("is-actual-size");
    sizeButton.setAttribute("aria-pressed", String(actual));
    sizeButton.textContent = actual ? "Fit image" : "Actual size";
    if (!actual) {
      const imageScroll = imageView.querySelector(".image-view-scroll");
      imageScroll.scrollTop = imageScroll.scrollLeft = 0;
    }
  });
  imageView
    .querySelector(".image-view-close")
    .addEventListener("click", closeImage);
  imageView.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeImage();
  });
  window.addEventListener("beforeprint", () =>
    reveals.forEach((el) => el.classList.add("is-visible")),
  );
  updateMotion();
  measure();
})();
