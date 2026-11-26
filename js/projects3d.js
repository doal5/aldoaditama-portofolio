/* =========================================================
   Aldo Aditama — Portofolio
   Projects 3D gallery (Three.js): a calm coverflow of the
   project screens.

   Interaction:
   - Drag / swipe to rotate.
   - Arrow keys rotate, Enter opens the front project.
   - Tap a side screen to bring it forward; tap the front
     screen to open its case study.

   Progressive enhancement:
   - The stage is hidden until WebGL is ready, so no empty
     frame is left behind when 3D is unavailable.
   ========================================================= */

import * as THREE from "./vendor/three.module.min.js";

const PROJECTS = [
  {
    url: "profileproject/maleekatrans.html",
    title: "Maleeka Trans",
    subtitle: "Rental armada & kalkulator trip",
    index: "01",
    src: "profileproject/maleekatrans/1.png",
  },
  {
    url: "profileproject/naiklevelagency.html",
    title: "Naik Level Agency",
    subtitle: "Kelas online & pembayaran Midtrans",
    index: "02",
    src: "profileproject/nlaecommerce/1.png",
  },
  {
    url: "profileproject/kolab.html",
    title: "KOLAB+",
    subtitle: "Workspace & manajemen tugas",
    index: "03",
    src: "profileproject/kolab/kolab2.png",
  },
  {
    url: "profileproject/jadwalpengiriman.html",
    title: "Jadwal Pengiriman",
    subtitle: "Sistem penjadwalan pengiriman",
    index: "04",
    src: "profileproject/jadwalpengiriman/inputjadwal-jadwalpengiriman.png",
  },
  {
    url: "profileproject/penyewaan-fifadventure.html",
    title: "Penyewaan Alat Outdoor",
    subtitle: "Platform penyewaan",
    index: "05",
    src: "profileproject/fifadventure/halaman-utama.png",
  },
  {
    url: "profileproject/pos-tokokomputer.html",
    title: "Point of sales toko komputer",
    subtitle: "Aplikasi kasir & stok",
    index: "06",
    src: "profileproject/pos-lsp/uidashboard.png",
  },
  {
    url: "profileproject/studio-foto.html",
    title: "Foto Studio",
    subtitle: "Manajemen studio foto",
    index: "07",
    src: "profileproject/studiofoto/halamanutama.png",
  },
  {
    url: "profileproject/e-commerce.html",
    title: "E-commerce",
    subtitle: "Toko online",
    index: "08",
    src: "profileproject/e-commerce/utama.png",
  },
  {
    url: "profileproject/kamus.html",
    title: "Kamus",
    subtitle: "Aplikasi kamus",
    index: "09",
    src: "profileproject/kamus/utama.png",
  },
  {
    url: "profileproject/companyprofile.html",
    title: "Company Profile",
    subtitle: "Website profil perusahaan",
    index: "10",
    src: "profileproject/company-profile/1.png",
  },
  {
    url: "profileproject/pastiprestasi.html",
    title: "Pasti Prestasi",
    subtitle: "Platform e-learning",
    index: "11",
    src: "profileproject/pastiprestasi/pp3.png",
  },
  {
    url: "profileproject/salesuniversity.html",
    title: "Sales University",
    subtitle: "Learning management system",
    index: "12",
    src: "profileproject/salesuniversity/su5.png",
  },
  {
    url: "profileproject/blastwhatsapp.html",
    title: "Blast WhatsApp",
    subtitle: "Broadcast group & penjadwalan",
    index: "13",
    src: "profileproject/blastwhatsapp/1.png",
  },
];

const stageEl = document.querySelector("[data-projects-stage]");
const viewportEl = document.querySelector("[data-projects-viewport]");
const canvasHost = document.querySelector("[data-projects-canvas]");
const linkEl = document.querySelector("[data-projects-link]");
const indexEl = document.querySelector("[data-projects-index]");
const subEl = document.querySelector("[data-projects-sub]");
const t = (value) => (window.AltoI18n ? window.AltoI18n.text(value) : value);

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const coarsePointer = window.matchMedia(
  "(hover: none), (pointer: coarse)"
).matches;

const TAU = Math.PI * 2;
const GALLERY_ZOOM = 1.8;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mod = (value, divisor) =>
  ((value % divisor) + divisor) % divisor;
const wrap = (value, count) => {
  const half = count / 2;
  return mod(value + half, count) - half;
};

if (stageEl && viewportEl && canvasHost && supportsWebGL()) {
  try {
    start(PROJECTS);
  } catch (error) {
    console.warn("[3D] Projects gallery unavailable:", error);
    stageEl.classList.remove("is-ready", "is-shown");
    const canvas = canvasHost.querySelector("canvas");
    if (canvas) canvas.remove();
  }
}

function supportsWebGL() {
  try {
    const probe = document.createElement("canvas");
    return Boolean(
      window.WebGL2RenderingContext && probe.getContext("webgl2")
    );
  } catch (error) {
    return false;
  }
}

function start(projects) {
  /* ---------- Card textures ---------- */

  const CARD_W = 560;
  const CARD_H = 350;
  const CARD_SCALE = 1.5;

  const roundedPath = (ctx, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  };

  const paintCard = (ctx, project, image) => {
    const width = CARD_W;
    const height = CARD_H;
    const pad = 8;
    const radius = 26;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    roundedPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
    ctx.clip();

    const shell = ctx.createLinearGradient(0, 0, 0, height);
    shell.addColorStop(0, "#16203a");
    shell.addColorStop(1, "#0a101d");
    ctx.fillStyle = shell;
    ctx.fillRect(0, 0, width, height);

    // Browser chrome
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(0, 0, width, 54);
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(0, 53, width, 1);

    ["#ff5f57", "#febc2e", "#28c840"].forEach((color, i) => {
      ctx.beginPath();
      ctx.arc(28 + i * 19, 27, 5.5, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
    });

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = "500 16px 'Source Code Pro', ui-monospace, monospace";
    ctx.fillStyle = "rgba(226, 232, 250, 0.48)";
    ctx.fillText(project.index, 96, 27);

    ctx.fillStyle = "rgba(226, 232, 250, 0.68)";
    ctx.fillText(project.title, 134, 27);

    // Screenshot
    const insetX = 16;
    const insetY = 66;
    const insetW = width - insetX * 2;
    const insetH = height - insetY - 16;

    ctx.save();
    roundedPath(ctx, insetX, insetY, insetW, insetH, 14);
    ctx.clip();

    if (image && image.naturalWidth) {
      const scale = Math.max(
        insetW / image.naturalWidth,
        insetH / image.naturalHeight
      );
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      ctx.drawImage(
        image,
        insetX + (insetW - drawW) / 2,
        insetY,
        drawW,
        drawH
      );
    } else {
      const placeholder = ctx.createLinearGradient(
        insetX,
        insetY,
        insetX + insetW,
        insetY + insetH
      );
      placeholder.addColorStop(0, "#1b2744");
      placeholder.addColorStop(1, "#0d1526");
      ctx.fillStyle = placeholder;
      ctx.fillRect(insetX, insetY, insetW, insetH);
      ctx.textAlign = "center";
      ctx.font = "400 30px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillStyle = "rgba(226, 232, 250, 0.55)";
      ctx.fillText(
        project.title,
        insetX + insetW / 2,
        insetY + insetH / 2
      );
    }

    const sheen = ctx.createLinearGradient(
      insetX,
      insetY,
      insetX,
      insetY + insetH * 0.6
    );
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.1)");
    sheen.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(insetX, insetY, insetW, insetH);
    ctx.restore();

    // Accent tick
    ctx.fillStyle = "rgba(152, 162, 255, 0.85)";
    ctx.fillRect(pad, height - pad - 3, 64, 3);

    ctx.restore();

    roundedPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(233, 238, 255, 0.18)";
    ctx.stroke();
  };

  /* ---------- Renderer & scene ---------- */

  stageEl.classList.add("is-ready");

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "group");
  canvas.setAttribute(
    "aria-label",
    "Galeri proyek 3D. Geser atau gunakan tombol panah kiri dan kanan untuk memutar. Tekan Enter untuk membuka proyek di depan."
  );
  canvas.style.touchAction = "pan-y";
  canvasHost.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  const lookAt = new THREE.Vector3(0, 1.15, 0);

  /* ---------- Soft backdrop ---------- */

  const makeRadialTexture = (inner, mid, outer) => {
    const size = 256;
    const surface = document.createElement("canvas");
    surface.width = size;
    surface.height = size;
    const ctx = surface.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, inner);
    if (mid) gradient.addColorStop(0.5, mid);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const makeGridTexture = () => {
    const size = 1024;
    const cell = 74;
    const surface = document.createElement("canvas");
    surface.width = size;
    surface.height = size;
    const ctx = surface.getContext("2d");

    ctx.strokeStyle = "rgba(152, 162, 255, 0.5)";
    ctx.lineWidth = 2;

    for (let i = 0; i <= size; i += cell) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "destination-in";
    const fade = ctx.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.06,
      size / 2,
      size / 2,
      size * 0.5
    );
    fade.addColorStop(0, "rgba(0, 0, 0, 1)");
    fade.addColorStop(0.62, "rgba(0, 0, 0, 0.55)");
    fade.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const glowTexture = makeRadialTexture(
    "rgba(140, 152, 255, 0.55)",
    "rgba(140, 152, 255, 0.16)",
    "rgba(140, 152, 255, 0)"
  );

  const backdropGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x7f8bff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.42,
    })
  );
  backdropGlow.scale.set(7.2, 4.4, 1);
  backdropGlow.position.set(0, 1.45, -2.7);
  backdropGlow.renderOrder = -10;
  scene.add(backdropGlow);

  const floorGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(8.5, 5.2),
    new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: 0x5c6bff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.25,
    })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0, 0.005, 0.35);
  floorGlow.renderOrder = -9;
  scene.add(floorGlow);

  const floorGrid = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 11),
    new THREE.MeshBasicMaterial({
      map: makeGridTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.1,
    })
  );
  floorGrid.rotation.x = -Math.PI / 2;
  floorGrid.position.set(0, -0.005, 0.2);
  floorGrid.renderOrder = -8;
  scene.add(floorGrid);

  /* ---------- Cards ---------- */

  const geometry = new THREE.PlaneGeometry(1.6, 1.0);
  const items = projects.map((project, index) => {
    const surface = document.createElement("canvas");
    surface.width = CARD_W * CARD_SCALE;
    surface.height = CARD_H * CARD_SCALE;
    const ctx = surface.getContext("2d");
    ctx.scale(CARD_SCALE, CARD_SCALE);
    paintCard(ctx, project, null);

    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(
      4,
      renderer.capabilities.getMaxAnisotropy()
    );

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      side: THREE.FrontSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 100;
    scene.add(mesh);

    return {
      project,
      ctx,
      texture,
      material,
      mesh,
      image: null,
      index,
      phase: index * 1.31,
      hover: 0,
    };
  });

  const meshes = items.map((item) => item.mesh);
  const count = items.length;

  /* ---------- Load screenshots when the stage approaches ---------- */

  let imagesQueued = false;

  const loadProjectImage = (item) => {
    if (!item.project.src) return;

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      item.image = image;
      paintCard(item.ctx, item.project, image);
      item.texture.needsUpdate = true;
    };
    image.src = item.project.src;
  };

  const queueImages = () => {
    if (imagesQueued) return;
    imagesQueued = true;
    items.forEach((item, index) => {
      window.setTimeout(() => loadProjectImage(item), index * 45);
    });
  };

  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          queueImages();
          imageObserver.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    imageObserver.observe(stageEl);
  } else {
    queueImages();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready
      .then(() => {
        items.forEach((item) => {
          paintCard(item.ctx, item.project, item.image);
          item.texture.needsUpdate = true;
        });
      })
      .catch(() => {
        /* System fonts are a fine fallback. */
      });
  }

  /* ---------- State ---------- */

  const state = {
    position: 0,
    target: 0,
    spacing: 1.18,
    distance: 4,
    visible: true,
    dragging: false,
    hovering: false,
    focused: false,
    userInteracted: false,
    time: 0,
    lastInteraction: performance.now(),
    lastFront: -1,
    startX: 0,
    startTarget: 0,
    lastMoveX: 0,
    lastMoveTime: 0,
    velocity: 0,
    moved: 0,
    downAt: 0,
    hovered: null,
    pointerDirty: false,
    ndc: new THREE.Vector2(),
  };

  /* ---------- Sizing ---------- */

  const resize = () => {
    const width = Math.max(viewportEl.clientWidth, 1);
    const height = Math.max(viewportEl.clientHeight, 1);

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, width < 700 ? 1.7 : 2)
    );
    renderer.setSize(width, height, false);

    const aspect = width / height;
    camera.aspect = aspect;

    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfWidthTarget = clamp(
      1.35 + (aspect - 1.26) * 1.25,
      1.35,
      2.85
    );
    const halfHeightTarget = 0.9;
    const baseDistance =
      Math.max(
        halfWidthTarget / (tan * aspect),
        halfHeightTarget / tan
      ) + 0.35;
    const distance = Math.max(2, baseDistance / GALLERY_ZOOM);

    state.distance = distance;
    state.spacing = aspect < 1.55 ? 0.94 : 1.16;

    camera.position.set(0, 1.78, distance);
    camera.lookAt(lookAt);
    camera.updateProjectionMatrix();
  };

  resize();

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(viewportEl);
  }
  window.addEventListener("resize", resize, { passive: true });

  /* ---------- Pointer interaction ---------- */

  const raycaster = new THREE.Raycaster();

  const setNdc = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    state.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
    state.pointerDirty = true;
  };

  const pick = () => {
    raycaster.setFromCamera(state.ndc, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    for (const hit of hits) {
      const item = items.find((entry) => entry.mesh === hit.object);
      if (item && item.mesh.visible) return item;
    }
    return null;
  };

  const updateHover = () => {
    if (state.dragging) return;
    const item = pick();
    state.hovered = item ? item.mesh : null;
    canvas.style.cursor = item ? "pointer" : "grab";
  };

  const snapTo = (value) => {
    state.target = Math.round(value);
    state.lastInteraction = performance.now();
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    state.dragging = true;
    state.userInteracted = true;
    state.startX = event.clientX;
    state.startTarget = state.target;
    state.lastMoveX = event.clientX;
    state.lastMoveTime = performance.now();
    state.velocity = 0;
    state.moved = 0;
    state.downAt = performance.now();
    state.lastInteraction = state.downAt;
    canvas.style.cursor = "grabbing";
    setNdc(event.clientX, event.clientY);
  };

  const onPointerMove = (event) => {
    if (!state.dragging) {
      if (state.hovering) setNdc(event.clientX, event.clientY);
      return;
    }

    const deltaX = event.clientX - state.startX;
    state.moved = Math.max(state.moved, Math.abs(deltaX));

    const now = performance.now();
    const elapsed = Math.max(now - state.lastMoveTime, 1);
    state.velocity = (event.clientX - state.lastMoveX) / elapsed;
    state.lastMoveX = event.clientX;
    state.lastMoveTime = now;

    const sensitivity = coarsePointer ? 0.0072 : 0.0058;
    state.target = state.startTarget - deltaX * sensitivity;
    state.lastInteraction = now;
  };

  const onPointerUp = (event) => {
    if (!state.dragging) return;

    state.dragging = false;
    canvas.style.cursor = "grab";

    const isTap =
      state.moved < 9 && performance.now() - state.downAt < 650;
    setNdc(event.clientX, event.clientY);

    if (isTap) {
      const item = pick();
      if (item) {
        const offset = wrap(item.index - state.position, count);

        if (Math.abs(offset) < 0.5) {
          window.location.href = item.project.url;
          return;
        }

        snapTo(state.target + Math.round(offset));
        return;
      }

      snapTo(state.target);
      return;
    }

    const fling = clamp(-state.velocity * 0.55, -2.2, 2.2);
    snapTo(state.target + fling);
  };

  const onPointerCancel = () => {
    if (!state.dragging) return;
    state.dragging = false;
    canvas.style.cursor = "grab";
    snapTo(state.target);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    state.hovering = true;
    state.userInteracted = true;
  });
  canvas.addEventListener("pointerleave", () => {
    state.hovering = false;
    if (!state.dragging) {
      state.hovered = null;
      canvas.style.cursor = "grab";
    }
  });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);

  canvas.addEventListener("focus", () => {
    state.focused = true;
    state.userInteracted = true;
    state.lastInteraction = performance.now();
  });
  canvas.addEventListener("blur", () => {
    state.focused = false;
  });

  canvas.addEventListener("keydown", (event) => {
    state.userInteracted = true;

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      snapTo(Math.round(state.target) + direction);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const front = items[mod(Math.round(state.target), count)];
      if (front) window.location.href = front.project.url;
    }
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stageEl.classList.remove("is-ready", "is-shown");
  });

  canvas.addEventListener("webglcontextrestored", () => {
    stageEl.classList.add("is-ready");
    resize();
    renderer.render(scene, camera);
    stageEl.classList.add("is-shown");
  });

  /* ---------- Visibility ---------- */

  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          state.visible = entry.isIntersecting;
          if (entry.isIntersecting) {
            state.lastInteraction = performance.now();
          }
        });
      },
      { rootMargin: "120px 0px" }
    );
    visibilityObserver.observe(stageEl);
  }

  /* ---------- Animation ---------- */

  const easeCamera = () => {
    camera.position.set(0, 1.78, state.distance);
    camera.lookAt(lookAt);
  };

  const updateScene = (delta) => {
    const rate = state.dragging ? 24 : 7;
    const ease = 1 - Math.exp(-delta * rate);
    state.position += (state.target - state.position) * ease;

    items.forEach((item) => {
      const offset = wrap(item.index - state.position, count);
      const absOffset = Math.abs(offset);
      const inRange = absOffset < 4.6;

      item.mesh.visible = inRange;
      if (!inRange) return;

      const bob = reduceMotion
        ? 0
        : Math.sin(state.time * 0.8 + item.phase) * 0.02;
      const lift = Math.max(0, 1 - absOffset) * 0.06;

      item.mesh.position.set(
        offset * state.spacing,
        1.12 + bob + lift,
        -Math.min(absOffset, 5) * 0.62
      );
      item.mesh.rotation.y = clamp(-offset * 0.25, -0.85, 0.85);
      item.mesh.rotation.z = reduceMotion
        ? 0
        : Math.sin(state.time * 0.55 + item.phase) * 0.006;

      const hoverTarget = state.hovered === item.mesh ? 1 : 0;
      item.hover +=
        (hoverTarget - item.hover) * Math.min(1, delta * 10);

      const baseScale = 1 - Math.min(absOffset, 5) * 0.07;
      item.mesh.scale.setScalar(
        baseScale * (1 + item.hover * 0.035)
      );
      item.material.opacity = clamp(1 - absOffset * 0.26, 0.1, 1);
      item.mesh.renderOrder = 100 - Math.round(absOffset * 10);
    });

    const front = mod(Math.round(state.position), count);
    if (front !== state.lastFront) {
      state.lastFront = front;
      const project = items[front].project;
      if (linkEl) {
        linkEl.textContent = t(project.title);
        linkEl.href = project.url;
      }
      if (indexEl) indexEl.textContent = project.index;
      if (subEl) subEl.textContent = t(project.subtitle);
    }

    if (state.pointerDirty) {
      state.pointerDirty = false;
      updateHover();
    }

    renderer.render(scene, camera);
  };

  window.addEventListener("i18n:change", () => {
    const project = items[mod(Math.round(state.position), count)].project;
    if (linkEl) linkEl.textContent = t(project.title);
    if (subEl) subEl.textContent = t(project.subtitle);
  });

  /* ---------- Auto-advance ---------- */

  const maybeAdvance = () => {
    if (reduceMotion || state.userInteracted) return;
    if (state.dragging || state.hovering || state.focused) return;
    if (!state.visible || document.hidden) return;
    if (performance.now() - state.lastInteraction < 6500) return;

    snapTo(Math.round(state.target) + 1);
  };

  const clock = new THREE.Clock();

  const frame = () => {
    requestAnimationFrame(frame);

    const delta = Math.min(clock.getDelta(), 0.05);
    if (!state.visible || document.hidden) return;

    state.time += delta;
    maybeAdvance();
    easeCamera();
    updateScene(delta);
  };

  /* ---------- Go ---------- */

  easeCamera();
  updateScene(0);
  stageEl.classList.add("is-shown");
  requestAnimationFrame(frame);
}
