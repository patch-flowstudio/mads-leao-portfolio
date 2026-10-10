/* A small, finite canvas sequence: idea → star → flow → signature. */
(() => {
  const root = document.documentElement;
  const screen = document.querySelector(".arrival");
  if (!screen) return;
  if (!root.classList.contains("intro-pending")) {
    screen.remove();
    return;
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const canvas = screen.querySelector("canvas");
  const context = canvas.getContext("2d");
  const blueSurface = screen.querySelector(".arrival-blue");
  const copies = [...screen.querySelectorAll(".arrival-copy > span")];
  const credit = screen.querySelector(".arrival-credit");
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = 360 * ratio;
  canvas.height = 180 * ratio;
  let raf = 0;
  let timeout = 0;
  let started = 0;
  let leaving = false;
  let complete = false;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
  const mix = (a, b, p) => a + (b - a) * p;
  const ramp = (t, start, duration) => ease((t - start) / duration);
  // Stable positions make the particles read as a designed transformation.
  const particles = Array.from({ length: 72 }, (_, i) => {
    const angle = i * 2.399963;
    const distance = 22 + Math.sqrt((i + 1) / 72) * 62;
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance * 0.75 };
  });

  function finish() {
    if (complete) return;
    complete = true;
    cancelAnimationFrame(raf);
    clearTimeout(timeout);
    root.classList.remove("intro-pending");
    screen.remove();
    try { sessionStorage.setItem("mads-arrival-seen", "true"); } catch { /* Optional. */ }
    document.removeEventListener("keydown", skip);
    document.removeEventListener("pointerdown", finish);
    window.removeEventListener("wheel", finish);
    document.removeEventListener("visibilitychange", onVisibility);
    reduced.removeEventListener("change", finish);
  }
  function skip(event) { if (event.key === "Escape" || event.key === "Tab") finish(); }
  function onVisibility() { if (document.hidden) finish(); }
  function star(radius, shape) {
    const a = mix(radius * 0.552285, 0, shape);
    const b = mix(radius, radius * 0.2, shape);
    context.beginPath();
    context.moveTo(0, -radius);
    context.bezierCurveTo(a, -b, b, -a, radius, 0);
    context.bezierCurveTo(b, a, a, b, 0, radius);
    context.bezierCurveTo(-a, b, -b, a, -radius, 0);
    context.bezierCurveTo(-b, -a, -a, -b, 0, -radius);
    context.fill();
  }
  function paint(time) {
    if (complete) return;
    started ||= time;
    const t = (time - started) / 1000;
    const signature = ramp(t, 1.92, 0.36);
    const ink = `rgb(${Math.round(mix(41, 252, signature))},${Math.round(mix(62, 251, signature))},${Math.round(mix(253, 246, signature))})`;
    blueSurface.style.opacity = signature.toFixed(3);
    credit.style.color = ink;
    const ideaOut = ramp(t, 0.92, 0.22);
    const simpleOut = ramp(t, 1.88, 0.22);
    copies[0].style.opacity = (1 - ideaOut).toFixed(3);
    copies[0].style.transform = `translateY(${-ideaOut * 8}px)`;
    copies[1].style.opacity = (ideaOut * (1 - simpleOut)).toFixed(3);
    copies[1].style.transform = `translateY(${(1 - ideaOut - simpleOut) * 8}px)`;
    copies[2].style.opacity = signature.toFixed(3);
    copies[2].style.transform = `translateY(${(1 - signature) * 8}px)`;
    context.setTransform(ratio, 0, 0, ratio, 180 * ratio, 90 * ratio);
    context.clearRect(-180, -90, 360, 180);
    context.fillStyle = context.strokeStyle = ink;
    const dissolve = ramp(t, 0.7, 0.3);
    const gather = ramp(t, 1.07, 0.63);
    const resolve = ramp(t, 1.82, 0.36);
    context.globalAlpha = 1 - dissolve;
    star(mix(15, 43, ramp(t, 0.22, 0.48)), ramp(t, 0.22, 0.48));
    context.globalAlpha = dissolve * (1 - resolve) * (1 - ramp(t, 1.5, 0.25));
    particles.forEach((particle, i) => {
      const row = Math.floor(i / 24) - 1;
      const x = -132 + (i % 24) * (264 / 23);
      const y = row * 25 + Math.sin(x / 46 + t * 2) * 9;
      const spread = ramp(t, 0.65, 0.42);
      context.beginPath();
      context.arc(mix(particle.x * spread, x, gather), mix(particle.y * spread, y, gather), mix(1.7, 1.1, gather), 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = ramp(t, 1.45, 0.27) * (1 - resolve);
    context.lineWidth = 1.25;
    for (let row = -1; row <= 1; row++) {
      context.beginPath();
      for (let x = -132; x <= 132; x += 4) {
        const y = row * 25 + Math.sin(x / 46 + t * 2) * 9;
        if (x === -132) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    }
    context.globalAlpha = resolve;
    star(mix(23, 36, resolve), 1);
    context.globalAlpha = 1;
    if (t >= 2.42 && !leaving) {
      leaving = true;
      screen.classList.add("is-leaving");
    }
    if (t >= 3.15) finish();
    else raf = requestAnimationFrame(paint);
  }
  if (!context || reduced.matches) { finish(); return; }
  document.addEventListener("keydown", skip);
  document.addEventListener("pointerdown", finish, { passive: true });
  window.addEventListener("wheel", finish, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  reduced.addEventListener("change", finish);
  timeout = setTimeout(finish, 3600);
  raf = requestAnimationFrame(paint);
})();
