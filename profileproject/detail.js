(function () {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const t = (value) => (window.AltoI18n ? window.AltoI18n.text(value) : value);

  /* ---------- Screenshot gallery ---------- */

  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const viewport = gallery.querySelector(".gallery-viewport");
    const slides = Array.from(gallery.querySelectorAll(".gallery-slide"));
    if (!viewport || !slides.length) return;

    const captionEl = gallery.querySelector("[data-gallery-caption]");
    const currentEl = gallery.querySelector("[data-gallery-current]");
    const dotsWrap = gallery.querySelector("[data-gallery-dots]");
    const prevBtn = gallery.querySelector("[data-gallery-prev]");
    const nextBtn = gallery.querySelector("[data-gallery-next]");
    const total = slides.length;
    let index = 0;
    let frame = 0;

    const pad = (value) => String(value).padStart(2, "0");
    const captions = slides.map(
      (slide, i) =>
        slide.getAttribute("data-caption") ||
        `Tangkapan layar ${pad(i + 1)}`
    );

    const dots = [];
    const dotLabel = (i) =>
      t(`Tampilkan tangkapan layar ${i + 1}: ${captions[i]}`);

    if (dotsWrap) {
      captions.forEach((caption, i) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "gallery-dot";
        dot.setAttribute("aria-label", dotLabel(i));
        dot.setAttribute("aria-current", i === 0 ? "true" : "false");
        dot.addEventListener("click", () => goTo(i));
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    const update = (nextIndex) => {
      index = ((nextIndex % total) + total) % total;

      if (captionEl) captionEl.textContent = t(captions[index]);
      if (currentEl) currentEl.textContent = pad(index + 1);

      dots.forEach((dot, i) => {
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });

      slides.forEach((slide, i) => {
        const active = i === index;
        slide.setAttribute("aria-hidden", active ? "false" : "true");
        const link = slide.querySelector("a");
        if (link) link.tabIndex = active ? 0 : -1;
      });
    };

    const goTo = (nextIndex, smooth) => {
      update(nextIndex);
      viewport.scrollTo({
        left: index * viewport.clientWidth,
        behavior: smooth !== false && !reduceMotion ? "smooth" : "auto",
      });
    };

    const indexFromScroll = () =>
      Math.round(viewport.scrollLeft / Math.max(1, viewport.clientWidth));

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nextIndex = Math.min(
          total - 1,
          Math.max(0, indexFromScroll())
        );
        if (nextIndex !== index) update(nextIndex);
      });
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });

    if (prevBtn) prevBtn.addEventListener("click", () => goTo(index - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(index + 1));

    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index - 1);
      }
    });

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        viewport.scrollTo({
          left: index * viewport.clientWidth,
          behavior: "auto",
        });
      }, 160);
    });

    window.addEventListener("i18n:change", () => {
      if (captionEl) captionEl.textContent = t(captions[index]);
      dots.forEach((dot, i) => dot.setAttribute("aria-label", dotLabel(i)));
    });

    update(0);
  });

  /* ---------- Preview tilt ---------- */

  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((target) => {
      const card = target.querySelector(".preview-card") || target;
      let frame = 0;

      target.addEventListener("pointermove", (event) => {
        const rect = target.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;

        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          card.style.setProperty(
            "--tiltX",
            `${((0.5 - py) * 6).toFixed(2)}deg`
          );
          card.style.setProperty(
            "--tiltY",
            `${((px - 0.5) * 8).toFixed(2)}deg`
          );
        });
      });

      target.addEventListener("pointerleave", () => {
        cancelAnimationFrame(frame);
        card.style.setProperty("--tiltX", "0deg");
        card.style.setProperty("--tiltY", "0deg");
      });
    });
  }
})();
