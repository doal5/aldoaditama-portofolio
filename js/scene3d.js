/* =========================================================
   Aldo Aditama — Portofolio
   Hero 3D scene (Three.js): an interactive floating workspace.

   Progressive enhancement:
   - The CSS deck stays visible when WebGL is unavailable,
     when the user prefers reduced motion, or if this module
     fails to run.
   - Interaction: pointer drives the camera, drag turns the
     workspace, and project screens can be clicked.
   ========================================================= */

import * as THREE from "./vendor/three.module.min.js";

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const hasFinePointer = window.matchMedia(
  "(hover: hover) and (pointer: fine)"
).matches;

const stageEl = document.querySelector("[data-stage-canvas]");
const heroStage = document.querySelector(".hero-stage");
const heroSection = document.querySelector(".hero");

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

if (
  stageEl &&
  heroStage &&
  heroSection &&
  !prefersReducedMotion &&
  supportsWebGL()
) {
  try {
    startScene();
  } catch (error) {
    console.warn("[3D] Hero scene unavailable:", error);
    stageEl.replaceChildren();
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

function startScene() {
  /* ---------- Renderer ---------- */

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    stencil: false,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const canvas = renderer.domElement;
  canvas.style.touchAction = "pan-y";
  canvas.style.cursor = "grab";
  stageEl.appendChild(canvas);

  /* ---------- Scene & camera ---------- */

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeef1f7, 13, 32);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  const lookAt = new THREE.Vector3(0, 1.62, 0);

  const world = new THREE.Group();
  scene.add(world);

  /* ---------- Shared helpers ---------- */

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

  const makeTexture = (source) => {
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;
    return texture;
  };

  const createCanvas = (width, height) => {
    const surface = document.createElement("canvas");
    surface.width = width;
    surface.height = height;
    return surface;
  };

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

  const readCssVar = (name, fallback) => {
    const value = getComputedStyle(document.body)
      .getPropertyValue(name)
      .trim();
    return value || fallback;
  };

  const loadImage = (source) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });

  /* ---------- Radial / grid textures ---------- */

  const makeRadialTexture = (inner, mid, outer, size = 256) => {
    const surface = createCanvas(size, size);
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
    if (mid) gradient.addColorStop(0.45, mid);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return makeTexture(surface);
  };

  const makeGridTexture = (size, cell, fade) => {
    const surface = createCanvas(size, size);
    const ctx = surface.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(139, 150, 255, 0.55)";
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

    if (fade) {
      ctx.globalCompositeOperation = "destination-in";
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        size * 0.1,
        size / 2,
        size / 2,
        size * 0.5
      );
      gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
      gradient.addColorStop(0.68, "rgba(0, 0, 0, 0.55)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }

    return makeTexture(surface);
  };

  const windowGlowTexture = makeRadialTexture(
    "rgba(255, 255, 255, 0.85)",
    "rgba(255, 255, 255, 0.28)",
    "rgba(255, 255, 255, 0)"
  );

  const backdropGlowTexture = makeRadialTexture(
    "rgba(120, 132, 255, 0.6)",
    "rgba(120, 132, 255, 0.18)",
    "rgba(120, 132, 255, 0)"
  );

  const shadowTexture = makeRadialTexture(
    "rgba(4, 7, 15, 0.9)",
    "rgba(4, 7, 15, 0.45)",
    "rgba(4, 7, 15, 0)"
  );

  /* ---------- Canvas painters ---------- */

  const drawBrowserWindow = (surface, def) => {
    const ctx = surface.getContext("2d");
    const width = surface.width;
    const height = surface.height;
    const pad = 10;
    const radius = 30;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    roundedPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
    ctx.clip();

    const backdrop = ctx.createLinearGradient(0, 0, 0, height);
    backdrop.addColorStop(0, "#121b2f");
    backdrop.addColorStop(1, "#0a101d");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    // Browser bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
    ctx.fillRect(0, 0, width, 78);
    ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
    ctx.fillRect(0, 77, width, 1);

    ["#ff5f57", "#febc2e", "#28c840"].forEach((color, index) => {
      ctx.beginPath();
      ctx.arc(40 + index * 28, 39, 7.5, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
    });

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "500 21px 'Source Code Pro', ui-monospace, monospace";
    ctx.fillStyle = "rgba(228, 234, 250, 0.52)";
    ctx.fillText(def.label, 150, 40);

    // Address pill
    const pillWidth = 210;
    roundedPath(ctx, width - pad - 28 - pillWidth, 24, pillWidth, 30, 15);
    ctx.fillStyle = "rgba(255, 255, 255, 0.055)";
    ctx.fill();
    ctx.font = "500 15px 'Source Code Pro', ui-monospace, monospace";
    ctx.fillStyle = "rgba(228, 234, 250, 0.32)";
    ctx.fillText(def.host, width - pad - 48 - pillWidth + 20, 40);

    // Screenshot
    const insetX = 26;
    const insetY = 100;
    const insetW = width - 52;
    const insetH = height - insetY - 26;

    ctx.save();
    roundedPath(ctx, insetX, insetY, insetW, insetH, 16);
    ctx.clip();

    if (def.image) {
      const image = def.image;
      const scale = Math.max(
        insetW / image.naturalWidth,
        insetH / image.naturalHeight
      );
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      const drawX = insetX + (insetW - drawW) / 2;
      const drawY = insetY + Math.min(0, (insetH - drawH) / 2);
      ctx.drawImage(image, drawX, drawY, drawW, drawH);
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
      ctx.fillStyle = "rgba(228, 234, 250, 0.5)";
      ctx.font = "500 30px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(
        def.name,
        insetX + insetW / 2,
        insetY + insetH / 2
      );
      ctx.textAlign = "left";
    }

    const sheen = ctx.createLinearGradient(
      insetX,
      insetY,
      insetX + insetW * 0.7,
      insetY + insetH
    );
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.10)");
    sheen.addColorStop(0.5, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(insetX, insetY, insetW, insetH);
    ctx.restore();

    ctx.fillStyle = "rgba(127, 139, 255, 0.85)";
    ctx.fillRect(pad, height - pad - 4, 92, 4);

    ctx.restore();

    roundedPath(
      ctx,
      pad,
      pad,
      width - pad * 2,
      height - pad * 2,
      radius
    );
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(233, 238, 255, 0.20)";
    ctx.stroke();
  };

  const drawIdCard = (surface, def) => {
    const ctx = surface.getContext("2d");
    const width = surface.width;
    const height = surface.height;
    const pad = 12;
    const radius = 40;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    roundedPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
    ctx.clip();

    const backdrop = ctx.createLinearGradient(0, 0, width, height);
    backdrop.addColorStop(0, "#1c2745");
    backdrop.addColorStop(1, "#0b1120");
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    const wash = ctx.createRadialGradient(
      width * 0.9,
      0,
      0,
      width * 0.9,
      0,
      width * 0.95
    );
    wash.addColorStop(0, "rgba(127, 139, 255, 0.30)");
    wash.addColorStop(1, "rgba(127, 139, 255, 0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    const x = 56;
    const contentWidth = width - x * 2;

    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.letterSpacing = "4px";
    ctx.font = "500 20px 'Source Code Pro', monospace";
    ctx.fillStyle = "rgba(233, 238, 252, 0.55)";
    ctx.fillText("PORTOFOLIO", x, 74);

    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(170, 184, 255, 0.9)";
    ctx.fillText("11 PROYEK", width - x - 26, 74);
    ctx.beginPath();
    ctx.arc(width - x - 10, 74, 6, 0, TAU);
    ctx.fillStyle = "#7f8bff";
    ctx.fill();
    ctx.letterSpacing = "0px";

    // Photo
    const photoY = 108;
    const photoHeight = 400;

    if (def.photo) {
      ctx.save();
      roundedPath(ctx, x, photoY, contentWidth, photoHeight, 26);
      ctx.clip();
      const image = def.photo;
      const scale = Math.max(
        contentWidth / image.naturalWidth,
        photoHeight / image.naturalHeight
      );
      const drawW = image.naturalWidth * scale;
      const drawH = image.naturalHeight * scale;
      const drawX = x + (contentWidth - drawW) / 2;
      const drawY = photoY + (photoHeight - drawH) * 0.18;
      ctx.drawImage(image, drawX, drawY, drawW, drawH);

      const fade = ctx.createLinearGradient(
        0,
        photoY + photoHeight * 0.55,
        0,
        photoY + photoHeight
      );
      fade.addColorStop(0, "rgba(13, 19, 34, 0)");
      fade.addColorStop(1, "rgba(13, 19, 34, 0.85)");
      ctx.fillStyle = fade;
      ctx.fillRect(x, photoY, contentWidth, photoHeight);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1b2744";
      ctx.fillRect(x, photoY, contentWidth, photoHeight);
    }

    // Name & role
    ctx.textAlign = "left";
    ctx.font = "400 86px 'Source Serif 4', Georgia, serif";
    ctx.fillStyle = "#f2f5ff";
    ctx.fillText("Aldo Aditama", x, photoY + photoHeight + 84);

    ctx.font = "400 27px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillStyle = "rgba(226, 232, 250, 0.62)";
    ctx.fillText("Web Developer", x, photoY + photoHeight + 130);

    // Tags
    let tagX = x;
    const tagY = photoY + photoHeight + 196;
    ["PHP", "MySQL", "Laravel"].forEach((tag) => {
      ctx.font = "500 20px 'Source Code Pro', monospace";
      const tagWidth = ctx.measureText(tag).width + 40;
      roundedPath(ctx, tagX, tagY, tagWidth, 46, 23);
      ctx.strokeStyle = "rgba(233, 238, 255, 0.22)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(233, 238, 255, 0.75)";
      ctx.textAlign = "center";
      ctx.fillText(tag, tagX + tagWidth / 2, tagY + 24);
      tagX += tagWidth + 12;
    });

    // Footer
    const footY = height - 96;
    ctx.strokeStyle = "rgba(233, 238, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, footY - 30);
    ctx.lineTo(width - x, footY - 30);
    ctx.stroke();

    ctx.font = "500 18px 'Source Code Pro', monospace";
    ctx.fillStyle = "rgba(233, 238, 255, 0.4)";
    ctx.textAlign = "left";
    ctx.fillText("WEB APP", x, footY);
    ctx.textAlign = "right";
    ctx.fillText("INTEGRASI", width - x, footY);

    ctx.restore();

    roundedPath(ctx, pad, pad, width - pad * 2, height - pad * 2, radius);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.stroke();
  };

  const drawChip = (surface, label) => {
    const ctx = surface.getContext("2d");
    const width = surface.width;
    const height = surface.height;

    ctx.clearRect(0, 0, width, height);
    roundedPath(ctx, 5, 5, width - 10, height - 10, (height - 10) / 2);
    ctx.fillStyle = "rgba(12, 18, 33, 0.92)";
    ctx.fill();
    ctx.strokeStyle = "rgba(233, 238, 255, 0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(58, height / 2, 7, 0, TAU);
    ctx.fillStyle = "#7f8bff";
    ctx.fill();

    ctx.font = "500 44px 'Source Code Pro', monospace";
    ctx.letterSpacing = "6px";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e8edff";
    ctx.fillText(label, width / 2 + 22, height / 2 + 2);
    ctx.letterSpacing = "0px";
  };

  const drawKeyboard = (surface) => {
    const ctx = surface.getContext("2d");
    const width = surface.width;
    const height = surface.height;
    const padX = 16;
    const padY = 16;
    const gap = 7;
    const cols = 14;
    const rows = 4;
    const keyWidth = (width - padX * 2 - gap * (cols - 1)) / cols;
    const keyHeight = 44;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0c1422";
    ctx.fillRect(0, 0, width, height);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = padX + col * (keyWidth + gap);
        const y = padY + row * (keyHeight + gap);
        roundedPath(ctx, x, y, keyWidth, keyHeight, 7);
        ctx.fillStyle = "#1a2439";
        ctx.fill();
        ctx.strokeStyle = "rgba(127, 139, 255, 0.10)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Spacebar
    const spaceY = padY + rows * (keyHeight + gap);
    const spaceX = padX + (width - padX * 2) * 0.24;
    const spaceW = (width - padX * 2) * 0.42;
    roundedPath(ctx, spaceX, spaceY, spaceW, 40, 8);
    ctx.fillStyle = "#1a2439";
    ctx.fill();
    ctx.strokeStyle = "rgba(127, 139, 255, 0.10)";
    ctx.stroke();

    // Accent enter key
    const enterX = padX + (width - padX * 2) - keyWidth;
    roundedPath(ctx, enterX, padY + 3 * (keyHeight + gap), keyWidth, keyHeight, 7);
    ctx.fillStyle = "rgba(127, 139, 255, 0.32)";
    ctx.fill();
  };

  const CODE_LINES = [
    "<?php",
    "",
    "namespace App\\Http\\Controllers;",
    "",
    "use App\\Models\\Project;",
    "",
    "class PortfolioController extends Controller",
    "{",
    "    public function index()",
    "    {",
    "        $projects = Project::latest()->take(11)->get();",
    "",
    "        return view('portfolio', [",
    "            'projects' => $projects,",
    "            'stack' => ['PHP', 'Laravel', 'MySQL'],",
    "        ]);",
    "    }",
    "}",
  ];

  const drawCode = (surface) => {
    const ctx = surface.getContext("2d");
    const width = surface.width;
    const height = surface.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0a101d";
    ctx.fillRect(0, 0, width, height);

    // Title bar
    ctx.fillStyle = "#101a2e";
    ctx.fillRect(0, 0, width, 54);
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    ctx.fillRect(0, 53, width, 1);

    ["#ff5f57", "#febc2e", "#28c840"].forEach((color, index) => {
      ctx.beginPath();
      ctx.arc(30 + index * 24, 27, 6, 0, TAU);
      ctx.fillStyle = color;
      ctx.fill();
    });

    roundedPath(ctx, 122, 8, 230, 46, 8);
    ctx.fillStyle = "#0a101d";
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "500 18px 'Source Code Pro', monospace";
    ctx.fillStyle = "rgba(210, 220, 245, 0.8)";
    ctx.fillText("portfolio.php", 150, 31);
    ctx.beginPath();
    ctx.arc(132, 31, 5, 0, TAU);
    ctx.fillStyle = "#7f8bff";
    ctx.fill();

    // Code
    const startX = 88;
    const startY = 96;
    const lineHeight = 27;
    const tokenRe =
      /(\/\/[^\n]*)|('[^']*'|"[^"]*")|(\$[A-Za-z_]\w*)|\b(namespace|use|class|extends|public|function|return|new|as|foreach)\b|\b(\d+)\b/g;

    ctx.font = "400 20px 'Source Code Pro', ui-monospace, monospace";
    ctx.textBaseline = "middle";

    CODE_LINES.forEach((line, index) => {
      const y = startY + index * lineHeight;

      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(122, 138, 176, 0.45)";
      ctx.fillText(String(index + 1), startX - 22, y);

      ctx.textAlign = "left";
      let cursorX = startX;
      let lastIndex = 0;
      tokenRe.lastIndex = 0;
      let match = tokenRe.exec(line);

      while (match !== null) {
        if (match.index > lastIndex) {
          const chunk = line.slice(lastIndex, match.index);
          ctx.fillStyle = "#c3cbe4";
          ctx.fillText(chunk, cursorX, y);
          cursorX += ctx.measureText(chunk).width;
        }

        let color = "#c3cbe4";
        if (match[1]) color = "#4f5c7a";
        else if (match[2]) color = "#8fd3a2";
        else if (match[3]) color = "#ffd479";
        else if (match[4]) color = "#8b96ff";
        else if (match[5]) color = "#c792ea";

        ctx.fillStyle = color;
        ctx.fillText(match[0], cursorX, y);
        cursorX += ctx.measureText(match[0]).width;
        lastIndex = match.index + match[0].length;
        match = tokenRe.exec(line);
      }

      if (lastIndex < line.length) {
        const chunk = line.slice(lastIndex);
        ctx.fillStyle = "#c3cbe4";
        ctx.fillText(chunk, cursorX, y);
      }
    });

    // Status bar
    ctx.fillStyle = "#0f1829";
    ctx.fillRect(0, height - 44, width, 44);
    ctx.fillStyle = "#7f8bff";
    ctx.fillRect(0, height - 44, width, 2);
    ctx.font = "500 16px 'Source Code Pro', monospace";
    ctx.fillStyle = "rgba(210, 220, 245, 0.55)";
    ctx.textAlign = "left";
    ctx.fillText("PHP 8.3", 24, height - 21);
    ctx.fillText("Laravel 11", 160, height - 21);
    ctx.textAlign = "right";
    ctx.fillText("UTF-8 · 2 spaces", width - 24, height - 21);
  };

  /* ---------- Lighting ---------- */

  scene.add(new THREE.HemisphereLight(0xcdd8ff, 0x0b1120, 1.35));

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(5.5, 9, 6.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 8;
  keyLight.shadow.camera.bottom = -5;
  keyLight.shadow.bias = -0.0006;
  keyLight.shadow.normalBias = 0.02;
  keyLight.target.position.set(0, 0.6, 0);
  scene.add(keyLight);
  scene.add(keyLight.target);

  const accentLightA = new THREE.PointLight(0x4d5bff, 26, 16, 2);
  accentLightA.position.set(-4.2, 3.4, 3.2);
  scene.add(accentLightA);

  const accentLightB = new THREE.PointLight(0x9aa4ff, 16, 16, 2);
  accentLightB.position.set(4.4, 2.6, -1.8);
  scene.add(accentLightB);

  /* ---------- Ambient pieces ---------- */

  const backdropGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: backdropGlowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    })
  );
  backdropGlow.scale.set(4.8, 3.9, 1);
  backdropGlow.position.set(0, 2.0, -2.4);
  world.add(backdropGlow);

  const shadowDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    })
  );
  shadowDecal.rotation.x = -Math.PI / 2;
  shadowDecal.position.y = -0.5;
  world.add(shadowDecal);

  const floorGrid = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 26),
    new THREE.MeshBasicMaterial({
      map: makeGridTexture(1024, 64, true),
      transparent: true,
      depthWrite: false,
      opacity: 0,
    })
  );
  floorGrid.rotation.x = -Math.PI / 2;
  floorGrid.position.y = -1.2;
  world.add(floorGrid);

  const haloMaterial = () =>
    new THREE.MeshBasicMaterial({
      color: 0x8b96ff,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    });

  const haloA = new THREE.Mesh(
    new THREE.TorusGeometry(3.25, 0.007, 6, 220),
    haloMaterial()
  );
  haloA.rotation.x = Math.PI / 2 - 0.04;
  haloA.position.y = -0.4;
  world.add(haloA);

  const haloB = new THREE.Mesh(
    new THREE.TorusGeometry(3.85, 0.006, 6, 220),
    haloMaterial()
  );
  haloB.rotation.x = Math.PI / 2 + 0.05;
  haloB.position.y = -0.62;
  world.add(haloB);

  /* ---------- Floating island ---------- */

  const island = new THREE.Group();
  world.add(island);

  const islandBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.72, 0.3, 72),
    new THREE.MeshStandardMaterial({
      color: 0x0e1524,
      metalness: 0.55,
      roughness: 0.45,
    })
  );
  islandBase.position.y = -0.15;
  islandBase.castShadow = true;
  islandBase.receiveShadow = true;
  island.add(islandBase);

  const islandTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.55, 2.55, 0.04, 72),
    new THREE.MeshStandardMaterial({
      color: 0x121b2e,
      metalness: 0.8,
      roughness: 0.3,
    })
  );
  islandTop.position.y = 0.02;
  islandTop.receiveShadow = true;
  island.add(islandTop);

  const islandRim = new THREE.Mesh(
    new THREE.TorusGeometry(2.58, 0.012, 6, 180),
    new THREE.MeshBasicMaterial({
      color: 0x7f8bff,
      transparent: true,
      opacity: 0.85,
    })
  );
  islandRim.rotation.x = Math.PI / 2;
  island.add(islandRim);

  const islandRimGlow = new THREE.Mesh(
    new THREE.TorusGeometry(2.59, 0.05, 6, 180),
    new THREE.MeshBasicMaterial({
      color: 0x5c6bff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  islandRimGlow.rotation.x = Math.PI / 2;
  island.add(islandRimGlow);

  const islandSheen = new THREE.Mesh(
    new THREE.CircleGeometry(2.43, 72),
    new THREE.MeshBasicMaterial({
      map: backdropGlowTexture,
      color: 0x9aa4ff,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  islandSheen.rotation.x = -Math.PI / 2;
  islandSheen.position.y = 0.05;
  island.add(islandSheen);

  const islandGrid = new THREE.Mesh(
    new THREE.CircleGeometry(2.46, 72),
    new THREE.MeshBasicMaterial({
      map: makeGridTexture(1024, 68, true),
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    })
  );
  islandGrid.rotation.x = -Math.PI / 2;
  islandGrid.position.y = 0.045;
  island.add(islandGrid);

  const laptopShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, 2.1),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    })
  );
  laptopShadow.rotation.x = -Math.PI / 2;
  laptopShadow.position.set(0, 0.052, 0.35);
  world.add(laptopShadow);

  /* ---------- Laptop ---------- */

  const laptop = new THREE.Group();
  laptop.position.set(0, 0.06, 0.35);
  laptop.rotation.y = -0.12;
  world.add(laptop);

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2438,
    metalness: 0.72,
    roughness: 0.32,
  });

  const laptopDeck = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.08, 1.4),
    shellMaterial
  );
  laptopDeck.position.y = 0.04;
  laptopDeck.castShadow = true;
  laptopDeck.receiveShadow = true;
  laptop.add(laptopDeck);

  const keyboardTexture = makeTexture(createCanvas(640, 280));
  drawKeyboard(keyboardTexture.image);
  keyboardTexture.needsUpdate = true;

  const keyboard = new THREE.Mesh(
    new THREE.PlaneGeometry(1.72, 0.68),
    new THREE.MeshStandardMaterial({
      map: keyboardTexture,
      metalness: 0.35,
      roughness: 0.6,
    })
  );
  keyboard.rotation.x = -Math.PI / 2;
  keyboard.position.set(0, 0.085, 0.0);
  laptop.add(keyboard);

  const trackpad = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.3),
    new THREE.MeshStandardMaterial({
      color: 0x232e47,
      metalness: 0.5,
      roughness: 0.35,
    })
  );
  trackpad.rotation.x = -Math.PI / 2;
  trackpad.position.set(0, 0.088, 0.52);
  laptop.add(trackpad);

  const lid = new THREE.Group();
  lid.position.set(0, 0.03, -0.66);
  lid.rotation.x = -0.22;
  laptop.add(lid);

  const lidShell = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 1.32, 0.06),
    shellMaterial
  );
  lidShell.position.y = 0.66;
  lidShell.castShadow = true;
  lid.add(lidShell);

  const codeCanvas = createCanvas(1024, 648);
  const codeTexture = makeTexture(codeCanvas);
  const drawCodeTexture = () => {
    drawCode(codeCanvas);
    codeTexture.needsUpdate = true;
  };
  drawCodeTexture();

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.2),
    new THREE.MeshBasicMaterial({
      map: codeTexture,
      toneMapped: false,
    })
  );
  screen.position.set(0, 0.66, 0.036);
  lid.add(screen);

  const screenLight = new THREE.PointLight(0x6d7bff, 3.4, 4.2, 2);
  screenLight.position.set(0, 0.66, 0.4);
  lid.add(screenLight);

  /* ---------- Project screens ---------- */

  const projectWindowDefs = [
    {
      url: "profileproject/kolab.html",
      name: "KOLAB+",
      label: "kolab.plus — workspace",
      host: "aldo.dev/kolab",
      imageSrc: "profileproject/kolab/kolab2.png",
      position: new THREE.Vector3(-1.12, 2.75, 0.55),
      rotationY: 0.26,
      width: 2.2,
      phase: 0.6,
      tint: 0x8792ff,
      delay: 0.45,
    },
    {
      url: "profileproject/maleekatrans.html",
      name: "Maleeka Trans",
      label: "maleekatrans — rental",
      host: "aldo.dev/maleeka",
      imageSrc: "profileproject/maleekatrans/1.png",
      position: new THREE.Vector3(1.3, 3.1, -0.5),
      rotationY: -0.22,
      width: 2.0,
      phase: 2.4,
      tint: 0x9aa4ff,
      delay: 0.6,
    },
  ];

  const windowItems = [];
  const projectMeshes = [];

  projectWindowDefs.forEach((def) => {
    const surface = createCanvas(1024, 640);
    const texture = makeTexture(surface);
    const draw = () => {
      drawBrowserWindow(surface, def);
      texture.needsUpdate = true;
    };
    draw();

    loadImage(def.imageSrc)
      .then((image) => {
        def.image = image;
        draw();
      })
      .catch(() => {
        /* Keep the placeholder window. */
      });

    const height = def.width * 0.625;
    const group = new THREE.Group();
    group.position.copy(def.position);
    group.rotation.y = def.rotationY;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(def.width, height),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
        side: THREE.DoubleSide,
      })
    );
    mesh.userData.url = def.url;
    group.add(mesh);
    projectMeshes.push(mesh);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: windowGlowTexture,
        color: def.tint,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.scale.set(def.width * 1.7, def.width * 1.25, 1);
    glow.position.z = -0.12;
    group.add(glow);

    world.add(group);
    windowItems.push({
      draw,
      group,
      mesh,
      glow,
      base: def.position.clone(),
      rotationY: def.rotationY,
      phase: def.phase,
      delay: def.delay,
      hover: 1,
    });
  });

  /* ---------- 3D ID card ---------- */

  const idCardDef = { photo: null };
  const idCanvas = createCanvas(720, 1000);
  const idTexture = makeTexture(idCanvas);
  const drawId = () => {
    drawIdCard(idCanvas, idCardDef);
    idTexture.needsUpdate = true;
  };
  drawId();

  loadImage("img/aldo.jpg")
    .then((image) => {
      idCardDef.photo = image;
      drawId();
    })
    .catch(() => {
      /* Card keeps the neutral photo block. */
    });

  const idBase = new THREE.Vector3(1.6, 1.1, 1.1);
  const idRotationY = -0.4;
  const idGroup = new THREE.Group();
  idGroup.position.copy(idBase);
  idGroup.rotation.set(0.02, idRotationY, -0.02);
  world.add(idGroup);

  const idMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 1.389),
    new THREE.MeshBasicMaterial({
      map: idTexture,
      transparent: true,
      toneMapped: false,
      side: THREE.DoubleSide,
    })
  );
  idGroup.add(idMesh);

  const idGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: backdropGlowTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.28,
    })
  );
  idGlow.scale.set(2.55, 2.95, 1);
  idGlow.position.z = -0.12;
  idGroup.add(idGlow);

  /* ---------- Floating chips ---------- */

  const chipDefs = [
    {
      label: "Aldo Aditama",
      position: new THREE.Vector3(-0.65, 3.78, 0.5),
      scale: 0.98,
      phase: 3.1,
      delay: 1.05,
    },
  ];

  const chipItems = chipDefs.map((def) => {
    const surface = createCanvas(512, 160);
    const texture = makeTexture(surface);
    const draw = () => {
      drawChip(surface, def.label);
      texture.needsUpdate = true;
    };
    draw();

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
        opacity: 0,
      })
    );
    sprite.position.copy(def.position);
    sprite.scale.set(0.92 * def.scale, 0.2875 * def.scale, 1);
    world.add(sprite);

    return {
      draw,
      sprite,
      base: def.position.clone(),
      baseScale: def.scale,
      phase: def.phase,
      delay: def.delay,
    };
  });

  /* ---------- Particles ---------- */

  const particleCount = window.innerWidth < 760 ? 120 : 210;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const particleSeeds = new Float32Array(particleCount);
  const particleBaseX = new Float32Array(particleCount);
  const colorA = new THREE.Color(0x7f8bff);
  const colorB = new THREE.Color(0xb6bbd1);

  for (let i = 0; i < particleCount; i += 1) {
    particleBaseX[i] = (Math.random() - 0.5) * 10;
    particlePositions[i * 3] = particleBaseX[i];
    particlePositions[i * 3 + 1] = -0.8 + Math.random() * 6.6;
    particlePositions[i * 3 + 2] = -3.2 + Math.random() * 6;
    particleSeeds[i] = Math.random();

    const tone = Math.random() > 0.5 ? colorA : colorB;
    particleColors[i * 3] = tone.r;
    particleColors[i * 3 + 1] = tone.g;
    particleColors[i * 3 + 2] = tone.b;
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3)
  );
  particleGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(particleColors, 3)
  );

  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  world.add(particles);

  /* ---------- Re-render text once webfonts are ready ---------- */

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready
      .then(() => {
        windowItems.forEach((item) => item.draw());
        chipItems.forEach((item) => item.draw());
        drawId();
        drawCodeTexture();
      })
      .catch(() => {
        /* System fonts are a fine fallback. */
      });
  }

  /* ---------- State ---------- */

  const state = {
    time: 0,
    visible: true,
    hoverDirty: false,
    hovered: null,
    dragging: false,
    dragTarget: 0,
    dragValue: 0,
    dragStartX: 0,
    dragStartValue: 0,
    moved: 0,
    downAt: 0,
    pointerX: 0,
    pointerY: 0,
    camX: 0,
    camY: 0,
    ndc: new THREE.Vector2(0, 0),
    distance: 9.6,
    baseY: 2.4,
    heroHeight: heroSection.offsetHeight || 1,
    shadowOpacity: 0.6,
    backdropOpacity: 0.8,
  };

  /* ---------- Theme sync ---------- */

  const applyTheme = () => {
    const dark = document.body.classList.contains("dark-mode");
    scene.fog.color.set(readCssVar("--bg", dark ? "#0a0e18" : "#eef1f7"));
    backdropGlow.material.color.set(
      readCssVar("--accent", dark ? "#7f8bff" : "#3a47e8")
    );
    state.shadowOpacity = dark ? 0.85 : 0.6;
    state.backdropOpacity = dark ? 0.55 : 0.8;
  };

  applyTheme();

  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  /* ---------- Sizing ---------- */

  const resize = () => {
    const width = Math.max(stageEl.clientWidth, 1);
    const height = Math.max(stageEl.clientHeight, 1);

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, width < 680 ? 1.8 : 2)
    );
    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const distanceWidth =
      4.9 / 2 / (Math.tan(fov / 2) * camera.aspect);
    const distanceHeight = 4.8 / 2 / Math.tan(fov / 2);

    state.distance = clamp(
      Math.max(distanceWidth, distanceHeight) + 0.35,
      5.4,
      12.5
    );
    state.baseY = 1.62 + state.distance * 0.085;
    state.heroHeight = Math.max(heroSection.offsetHeight, 1);

    camera.updateProjectionMatrix();
  };

  resize();

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(stageEl);
  }
  window.addEventListener("resize", resize, { passive: true });

  /* ---------- Pointer interaction ---------- */

  const raycaster = new THREE.Raycaster();

  const updateNdc = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    state.ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
    state.hoverDirty = true;
  };

  const updateHover = () => {
    if (state.dragging || state.time < 1) return;
    raycaster.setFromCamera(state.ndc, camera);
    const hits = raycaster.intersectObjects(projectMeshes, false);
    const next = hits.length ? hits[0].object : null;
    if (next === state.hovered) return;
    state.hovered = next;
    canvas.style.cursor = next ? "pointer" : "grab";
  };

  const onPointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    state.dragging = true;
    state.dragStartX = event.clientX;
    state.dragStartValue = state.dragTarget;
    state.moved = 0;
    state.downAt = performance.now();
    state.hovered = null;
    canvas.style.cursor = "grabbing";
    updateNdc(event.clientX, event.clientY);
  };

  const onWindowPointerMove = (event) => {
    if (!state.dragging) return;
    const deltaX = event.clientX - state.dragStartX;
    state.moved = Math.max(state.moved, Math.abs(deltaX));
    state.dragTarget = clamp(
      state.dragStartValue + deltaX * 0.0042,
      -0.5,
      0.5
    );
  };

  const onPointerUp = (event) => {
    if (!state.dragging) return;
    state.dragging = false;

    const isTap =
      state.moved < 8 && performance.now() - state.downAt < 650;

    updateNdc(event.clientX, event.clientY);

    if (isTap && state.time > 1.2) {
      raycaster.setFromCamera(state.ndc, camera);
      const hits = raycaster.intersectObjects(projectMeshes, false);
      const url = hits.length ? hits[0].object.userData.url : null;
      if (url) {
        window.location.href = url;
        return;
      }
    }

    canvas.style.cursor = "grab";
  };

  const onPointerCancel = () => {
    state.dragging = false;
    canvas.style.cursor = "grab";
  };

  canvas.addEventListener("pointerdown", onPointerDown);

  canvas.addEventListener("pointermove", (event) => {
    updateNdc(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerleave", () => {
    if (state.dragging) return;
    state.hovered = null;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    heroStage.classList.remove("is-webgl");
  });

  canvas.addEventListener("webglcontextrestored", () => {
    heroStage.classList.add("is-webgl");
  });

  window.addEventListener("pointermove", onWindowPointerMove, {
    passive: true,
  });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);

  window.addEventListener(
    "pointermove",
    (event) => {
      if (!hasFinePointer) return;
      state.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      state.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  /* ---------- Visibility ---------- */

  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          state.visible = entry.isIntersecting;
        });
      },
      { rootMargin: "60px 0px" }
    );
    visibilityObserver.observe(heroStage);
  }

  /* ---------- Animation ---------- */

  const clock = new THREE.Clock();
  const easeIntro = (delay) =>
    easeOutCubic(clamp((state.time - delay) / 1.25, 0, 1));

  const renderFrame = (delta) => {
    const time = state.time;

    /* Camera */
    const scrollProgress = clamp(
      window.scrollY / Math.max(state.heroHeight, 1),
      0,
      1
    );
    const camEase = Math.min(1, delta * 3.2);

    state.camX = lerp(state.camX, state.pointerX * 0.55, camEase);
    state.camY = lerp(state.camY, state.pointerY * 0.32, camEase);

    camera.position.set(
      state.camX,
      state.baseY - state.camY + scrollProgress * 0.18,
      state.distance + scrollProgress * 0.55
    );
    camera.lookAt(lookAt);

    /* Workspace tilt */
    state.dragValue = lerp(
      state.dragValue,
      state.dragTarget,
      Math.min(1, delta * 5)
    );

    world.rotation.y =
      Math.sin(time * 0.17) * 0.03 +
      state.dragValue +
      scrollProgress * 0.07;
    world.rotation.x = Math.sin(time * 0.13) * 0.012;
    world.position.y = -scrollProgress * 0.7;

    /* Island */
    const islandE = easeIntro(0);
    island.scale.setScalar(0.9 + 0.1 * islandE);
    island.position.y = -0.55 * (1 - islandE);
    island.rotation.y = Math.sin(time * 0.1) * 0.04;

    shadowDecal.material.opacity = state.shadowOpacity * islandE;
    backdropGlow.material.opacity =
      state.backdropOpacity * easeIntro(0.05);
    floorGrid.material.opacity = 0.16 * easeIntro(0.15);
    haloA.material.opacity = 0.3 * islandE;
    haloB.material.opacity = 0.15 * islandE;
    islandRimGlow.material.opacity = 0.22 * islandE;
    islandSheen.material.opacity = 0.13 * islandE;
    haloA.rotation.z = time * 0.03;
    haloB.rotation.z = -time * 0.02;

    /* Laptop */
    const laptopE = easeIntro(0.28);
    laptop.position.y = 0.06 - 0.85 * (1 - laptopE);
    laptop.scale.setScalar(1.28 * (0.95 + 0.05 * laptopE));
    laptop.rotation.y = -0.12 + Math.sin(time * 0.3) * 0.01;
    laptopShadow.material.opacity = 0.55 * laptopE;
    screenLight.intensity = 3.2 + Math.sin(time * 1.7) * 0.45;

    /* Project screens */
    windowItems.forEach((item) => {
      const itemEase = easeIntro(item.delay);
      const bob = Math.sin(time * 0.85 + item.phase) * 0.075;

      item.group.position.y =
        item.base.y + bob - 1.1 * (1 - itemEase);
      item.group.position.x =
        item.base.x + Math.sin(time * 0.4 + item.phase) * 0.03;
      item.group.rotation.y =
        item.rotationY +
        Math.sin(time * 0.32 + item.phase) * 0.055;
      item.group.rotation.z =
        Math.sin(time * 0.45 + item.phase) * 0.014;

      const hoverTarget =
        state.hovered === item.mesh ? 1.055 : 1;
      item.hover = lerp(
        item.hover,
        hoverTarget,
        Math.min(1, delta * 10)
      );

      item.group.scale.setScalar(
        (0.86 + 0.14 * itemEase) * item.hover
      );
      item.mesh.material.opacity = itemEase;
      item.glow.material.opacity =
        itemEase * (0.2 + (item.hover - 1) * 2.2);
    });

    /* ID card */
    const idEase = easeIntro(0.72);
    idGroup.position.y =
      idBase.y + Math.sin(time * 0.72 + 1.4) * 0.055 -
      0.9 * (1 - idEase);
    idGroup.position.z =
      idBase.z + Math.sin(time * 0.5 + 1.1) * 0.03;
    idGroup.rotation.y =
      idRotationY + Math.sin(time * 0.32 + 0.8) * 0.05;
    idGroup.rotation.z = -0.02 + Math.sin(time * 0.44) * 0.012;
    idGroup.scale.setScalar(0.85 + 0.15 * idEase);
    idGlow.material.opacity = 0.28 * idEase;

    /* Chips */
    chipItems.forEach((item) => {
      const itemEase = easeIntro(item.delay);

      item.sprite.position.x =
        item.base.x + Math.sin(time * 0.5 + item.phase) * 0.035;
      item.sprite.position.y =
        item.base.y +
        Math.sin(time * 0.8 + item.phase) * 0.11 -
        0.5 * (1 - itemEase);
      item.sprite.position.z =
        item.base.z + Math.cos(time * 0.42 + item.phase) * 0.03;

      const scale = item.baseScale * (0.82 + 0.18 * itemEase);
      item.sprite.scale.set(0.92 * scale, 0.2875 * scale, 1);
      item.sprite.material.opacity = 0.95 * itemEase;
    });

    /* Particles */
    const positions = particleGeometry.attributes.position;
    for (let i = 0; i < particleCount; i += 1) {
      const index = i * 3;
      let y =
        positions.array[index + 1] +
        delta * (0.08 + particleSeeds[i] * 0.16);
      if (y > 6.2) y = -0.8;
      positions.array[index + 1] = y;
      positions.array[index] =
        particleBaseX[i] +
        Math.sin(time * 0.3 + particleSeeds[i] * TAU) * 0.16;
    }
    positions.needsUpdate = true;
    particles.material.opacity = 0.12 + 0.58 * easeIntro(0.55);

    /* Hover raycast */
    if (state.hoverDirty) {
      state.hoverDirty = false;
      updateHover();
    }

    renderer.render(scene, camera);
  };

  const frame = () => {
    requestAnimationFrame(frame);

    const delta = Math.min(clock.getDelta(), 0.05);
    if (!state.visible || document.hidden) return;

    state.time += delta;
    renderFrame(delta);
  };

  /* ---------- Go ---------- */

  camera.position.set(0, state.baseY, state.distance);
  camera.lookAt(lookAt);
  renderer.render(scene, camera);
  heroStage.classList.add("is-webgl");
  requestAnimationFrame(frame);
}
