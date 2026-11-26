/* Bilingual switch (Indonesian ↔ English).
   Indonesian stays in the HTML; English is applied from js/i18n-dict.js. */
(function () {
  "use strict";

  const LANG_KEY = "aldo-lang";
  const DICT = window.ALDO_I18N_TEXT;

  if (!DICT) return;

  const normalize = (value) =>
    String(value)
      .replace(/[‐-―−]/g, "-")
      .replace(/·/g, "|")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/\s+/g, " ")
      .trim();

  const dictionary = new Map();
  Object.keys(DICT).forEach((key) => {
    dictionary.set(normalize(key), DICT[key]);
  });

  const prefixKeys = Array.from(dictionary.keys()).sort(
    (a, b) => b.length - a.length
  );

  const label = (value) => {
    const key = normalize(value);
    return dictionary.has(key) ? dictionary.get(key) : value;
  };

  const countLabel = (count, singular, plural) =>
    `${count} ${Number(count) === 1 ? singular : plural}`;

  const PATTERNS = [
    [
      /^Tampilkan tangkapan layar (\d+): (.+)$/,
      (m) => `Show screenshot ${m[1]}: ${label(m[2])}`,
    ],
    [
      /^(\d+) dari (\d+): (.+)$/,
      (m) => `${m[1]} of ${m[2]}: ${label(m[3])}`,
    ],
    [
      /^Buka pratinjau (.+) ukuran penuh$/,
      (m) => `Open ${label(m[1])} full-size preview`,
    ],
    [
      /^Galeri tangkapan layar (.+)$/,
      (m) => `${label(m[1])} screenshot gallery`,
    ],
    [
      /^Tangkapan layar (.+)\. Gunakan tombol panah kiri dan kanan untuk berpindah\.$/,
      (m) =>
        `Screenshots of ${label(
          m[1]
        )}. Use the left and right arrow keys to navigate.`,
    ],
    [/^Buka (.+) ukuran penuh$/, (m) => `Open ${label(m[1])} full size`],
    [/^Tangkapan layar (\d+)$/, (m) => `Screenshot ${m[1]}`],
    [/^(\d+) tangkapan layar$/, (m) => countLabel(m[1], "screenshot", "screenshots")],
    [/^(\d+) gambar$/, (m) => countLabel(m[1], "image", "images")],
    [/^Proyek (\d+) \/ (\d+)$/, (m) => `Project ${m[1]} / ${m[2]}`],
    [/^Proyek (\d+)$/, (m) => `Project ${m[1]}`],
    [/^(\d+) proyek$/, (m) => countLabel(m[1], "project", "projects")],
    [/^(.+) - kembali ke atas$/, (m) => `${m[1]} - back to top`],
    [
      /^(.+) - kembali ke portofolio$/,
      (m) => `${m[1]} - back to portfolio`,
    ],
    [/^Hubungi (.+)$/, (m) => `Contact via ${label(m[1])}`],
  ];

  const translateKey = (key) => {
    if (dictionary.has(key)) return dictionary.get(key);

    for (let i = 0; i < PATTERNS.length; i += 1) {
      const match = key.match(PATTERNS[i][0]);
      if (match) return PATTERNS[i][1](match);
    }

    for (let i = 0; i < prefixKeys.length; i += 1) {
      const prefix = prefixKeys[i];
      if (key.startsWith(prefix + " - ") || key.startsWith(prefix + " | ")) {
        return dictionary.get(prefix) + key.slice(prefix.length);
      }
    }

    return null;
  };

  const translate = (raw) => {
    const key = normalize(raw);
    return key ? translateKey(key) : null;
  };

  const SKIP_SELECTOR = ["[data-i18n-skip]", "[data-gallery-current]"].join(",");

  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "SVG",
    "CANVAS",
  ]);

  const titleEl = document.querySelector("title");
  const metaDescription = document.querySelector('meta[name="description"]');
  const originalTitle = document.title;
  const originalDescription = metaDescription
    ? metaDescription.getAttribute("content")
    : null;

  const textRecords = [];
  const attrRecords = [];
  let recordsReady = false;
  let current = "id";

  const collect = () => {
    if (recordsReady) return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || !node.nodeValue.trim()) {
            return NodeFilter.FILTER_REJECT;
          }
          if (SKIP_TAGS.has(parent.nodeName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.closest(SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let node = walker.nextNode();
    while (node) {
      const keyElement =
        node.parentElement &&
        node.parentElement.closest("[data-i18n-key]");
      textRecords.push({
        node,
        raw: node.nodeValue,
        key: keyElement ? keyElement.getAttribute("data-i18n-key") : null,
      });
      node = walker.nextNode();
    }

    const attrNames = ["aria-label", "alt", "title", "placeholder"];
    document
      .querySelectorAll("[aria-label], [alt], [title], [placeholder]")
      .forEach((element) => {
        attrNames.forEach((name) => {
          const raw = element.getAttribute(name);
          if (!raw || !raw.trim()) return;
          attrRecords.push({ element, name, raw });
        });
      });

    recordsReady = true;
  };

  const applyEnglish = () => {
    collect();

    textRecords.forEach(({ node, raw, key }) => {
      let value = null;
      if (key) {
        const normalizedKey = normalize(key);
        value = dictionary.has(normalizedKey)
          ? dictionary.get(normalizedKey)
          : null;
      } else {
        value = translate(raw);
      }
      if (value === null) return;
      const lead = raw.match(/^\s*/)[0];
      const trail = raw.match(/\s*$/)[0];
      node.nodeValue = lead + value + trail;
    });

    attrRecords.forEach(({ element, name, raw }) => {
      const value = translate(raw);
      if (value === null) return;
      element.setAttribute(name, value);
    });

    if (titleEl) {
      const title = translate(originalTitle);
      if (title !== null) document.title = title;
    }

    if (metaDescription && originalDescription) {
      const description = translate(originalDescription);
      if (description !== null) {
        metaDescription.setAttribute("content", description);
      }
    }
  };

  const restoreIndonesian = () => {
    textRecords.forEach(({ node, raw }) => {
      node.nodeValue = raw;
    });

    attrRecords.forEach(({ element, name, raw }) => {
      element.setAttribute(name, raw);
    });

    if (titleEl) document.title = originalTitle;

    if (metaDescription && originalDescription !== null) {
      metaDescription.setAttribute("content", originalDescription);
    }
  };

  const updateButtons = () => {
    document.querySelectorAll("[data-lang]").forEach((button) => {
      const active = button.getAttribute("data-lang") === current;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  const setLanguage = (value, persist) => {
    current = value === "en" ? "en" : "id";

    if (current === "en") {
      applyEnglish();
    } else {
      restoreIndonesian();
    }

    document.documentElement.lang = current;
    updateButtons();

    if (persist) {
      try {
        localStorage.setItem(LANG_KEY, current);
      } catch (error) {
        /* Storage can be unavailable in private browsing. */
      }
    }

    window.dispatchEvent(
      new CustomEvent("i18n:change", { detail: { lang: current } })
    );
  };

  window.AltoI18n = {
    text(raw) {
      if (current !== "en") return raw;
      const value = translate(raw);
      return value === null ? raw : value;
    },
    get lang() {
      return current;
    },
  };

  /* Initial language: ?lang= override, then saved choice, then Indonesian. */
  let saved = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch (error) {
    saved = null;
  }

  let initial = "id";
  try {
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (requested === "en" || requested === "id") {
      initial = requested;
    } else if (saved === "en") {
      initial = "en";
    }
  } catch (error) {
    initial = saved === "en" ? "en" : "id";
  }

  setLanguage(initial, false);

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-lang");
      if (value && value !== current) setLanguage(value, true);
    });
  });
})();
