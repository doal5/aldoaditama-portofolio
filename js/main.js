(function () {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Header state ---------- */

  const header = document.querySelector(".site-header");
  const setHeaderState = () => {
    if (!header) return;
    header.classList.toggle("is-stuck", window.scrollY > 24);
  };
  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  /* ---------- Mobile navigation ---------- */

  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.getElementById("navMenu");

  const closeNav = () => {
    if (!navMenu || !navToggle) return;
    navMenu.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });

    document.addEventListener("click", (event) => {
      if (nav && !nav.contains(event.target)) closeNav();
    });
  }

  /* ---------- Scroll reveal ---------- */

  const revealItems = document.querySelectorAll("[data-reveal]");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ---------- Active navigation link ---------- */

  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = navLinks
    .map((link) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#") || href.length < 2) return null;
      return document.querySelector(href);
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const hash = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            link.classList.toggle(
              "is-active",
              link.getAttribute("href") === hash
            );
          });
        });
      },
      { rootMargin: "-42% 0px -52% 0px" }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* ---------- Hero pointer parallax ---------- */

  const deck = document.getElementById("heroDeck");
  const stage = document.querySelector(".hero-stage");

  if (deck && stage && finePointer && !reduceMotion) {
    let frame = 0;

    stage.addEventListener("pointermove", (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        deck.style.setProperty("--deck-ry", `${(-13 + x * 14).toFixed(2)}deg`);
        deck.style.setProperty("--deck-rx", `${(3 - y * 12).toFixed(2)}deg`);
      });
    });

    stage.addEventListener("pointerleave", () => {
      cancelAnimationFrame(frame);
      deck.style.setProperty("--deck-ry", "-13deg");
      deck.style.setProperty("--deck-rx", "3deg");
    });
  }
})();
