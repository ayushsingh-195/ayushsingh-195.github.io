/* ============================================================
   1. UI interactions (nav, scroll reveal, active link)
   ============================================================ */
const nav = document.getElementById("nav");
const navLinks = document.getElementById("navLinks");
const menuBtn = document.getElementById("menuBtn");

// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Add a blurred background to the nav after scrolling
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 20);
}, { passive: true });

// Mobile menu toggle
menuBtn.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
});
navLinks.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    navLinks.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", false);
  }
});

// IntersectionObserver: reveals sections once as they enter the viewport
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target); // animate only once
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// Highlight the nav link of the section currently in view
const links = [...navLinks.querySelectorAll("a")];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      links.forEach((l) => l.classList.toggle("active", l.hash === "#" + entry.target.id));
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach((s) => sectionObserver.observe(s));


/* ============================================================
   2. 3D hero element (Three.js)
   A slow wireframe icosahedron with a small solid shape inside.
   It tilts gently toward the mouse. No particles, no heavy effects.
   ============================================================ */
function initHero3D() {
  const container = document.getElementById("heroCanvas");
  if (!container || typeof THREE === "undefined") return; // CDN failed: CSS gradient remains

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (err) {
    return; // WebGL unavailable: skip gracefully
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 5;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap for performance
  container.appendChild(renderer.domElement);

  // One group so both shapes rotate/tilt together
  const group = new THREE.Group();
  scene.add(group);

  // CONCEPT: LIGHTS. MeshStandardMaterial reacts to light, so it needs lights (MeshBasicMaterial ignores them).
  scene.add(new THREE.AmbientLight(0x404060, 1.2));            // soft base light from everywhere
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);       // parallel rays, like the sun
  sun.position.set(3, 4, 5);
  const cyanLight = new THREE.PointLight(0x22d3ee, 1.4, 20);   // glows from one point
  cyanLight.position.set(-4, -2, 3);
  const indigoLight = new THREE.PointLight(0x7c8cff, 1.2, 20);
  indigoLight.position.set(4, 2, -2);
  scene.add(sun, cyanLight, indigoLight);

  // CONCEPT: MATERIAL. metalness + roughness give the glossy look; flatShading shows the facets.
  const inner = new THREE.Mesh(                                // solid "gem" in the centre
    new THREE.IcosahedronGeometry(1.2, 1),
    new THREE.MeshStandardMaterial({ color: 0x4b5bd6, metalness: 0.7, roughness: 0.25, flatShading: true })
  );
  const outer = new THREE.Mesh(                                // faint wireframe shell around it
    new THREE.IcosahedronGeometry(1.75, 1),
    new THREE.MeshBasicMaterial({ color: 0x7c8cff, wireframe: true, transparent: true, opacity: 0.25 })
  );
  const ring = new THREE.Mesh(                                 // thin orbit ring
    new THREE.TorusGeometry(2.2, 0.03, 16, 120),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.8, roughness: 0.3 })
  );
  ring.rotation.x = Math.PI / 2.4;
  // CONCEPT: SCENE GRAPH. The moon is a child of the ring, so it orbits just because the ring rotates.
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3, roughness: 0.35 })
  );
  moon.position.set(2.2, 0, 0);   // on the ring's edge (local coordinates)
  ring.add(moon);
  group.add(inner, outer, ring);

  // Keep the canvas matched to its container size
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);

  // Mouse position (-1 to 1) used for a subtle tilt
  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let running = false;

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    outer.rotation.y += 0.002;
    outer.rotation.x += 0.001;
    inner.rotation.y -= 0.004;
    ring.rotation.z += 0.003;
    // CONCEPT: scroll-linked animation. Scroll position drives the rotation.
    group.rotation.y = window.scrollY * 0.002;
    // Ease the group toward the mouse-based tilt (lerp = smooth follow)
    group.rotation.x += (mouse.y * 0.35 - group.rotation.x) * 0.05;
    group.rotation.z += (-mouse.x * 0.2 - group.rotation.z) * 0.05;
    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    renderer.render(scene, camera); // single static frame
    return;
  }

  // Only render while the hero is visible and the tab is active
  let heroVisible = true;
  function update() {
    const shouldRun = heroVisible && !document.hidden;
    if (shouldRun && !running) { running = true; animate(); }
    else if (!shouldRun) running = false;
  }
  new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; update(); }).observe(container);
  document.addEventListener("visibilitychange", update);
  update();
}

initHero3D();


/* ============================================================
   3. CSS 3D tilt on cards (no WebGL, just math + CSS variables)
   CONCEPT: mouse position inside the card -> rotateX / rotateY.
   ============================================================ */
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(".card, .roadmap li").forEach((el) => {
    el.classList.add("tilt");

    el.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;            // no tilt on touch screens
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;        // 0 (left) to 1 (right)
      const py = (e.clientY - r.top) / r.height;        // 0 (top) to 1 (bottom)
      el.style.setProperty("--ry", (px - 0.5) * 12 + "deg");   // left/right tilt
      el.style.setProperty("--rx", (0.5 - py) * 12 + "deg");   // up/down tilt
      el.style.setProperty("--mx", px * 100 + "%");            // glare position
      el.style.setProperty("--my", py * 100 + "%");
    });

    el.addEventListener("pointerleave", () => {
      ["--rx", "--ry"].forEach((v) => el.style.setProperty(v, "0deg"));
    });
  });
}


/* ============================================================
   4. Scroll progress bar
   CONCEPT: scroll position / total scrollable height = 0..1, used as scaleX.
   ============================================================ */
const progress = document.getElementById("progress");
window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
}, { passive: true });


/* ============================================================
   5. Draggable CSS 3D cube
   CONCEPT: pointer drag changes two angles (cx, cy) -> CSS rotateX / rotateY.
   ============================================================ */
(function initCube() {
  const scene = document.getElementById("cubeScene");
  const cube = document.getElementById("cube");
  if (!scene) return;

  let cx = -20, cy = 30;                 // current angles in degrees
  let dragging = false, lastX = 0, lastY = 0, visible = false;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const apply = () => {
    cube.style.setProperty("--cx", cx + "deg");
    cube.style.setProperty("--cy", cy + "deg");
  };

  scene.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    scene.setPointerCapture(e.pointerId);
    scene.style.cursor = "grabbing";
  });
  scene.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    cy += (e.clientX - lastX) * 0.6;     // drag right/left -> spin around Y
    cx -= (e.clientY - lastY) * 0.6;     // drag up/down -> spin around X
    lastX = e.clientX; lastY = e.clientY;
    apply();
  });
  const stop = () => { dragging = false; scene.style.cursor = "grab"; };
  scene.addEventListener("pointerup", stop);
  scene.addEventListener("pointercancel", stop);

  // Spin slowly on its own, but only while visible (saves CPU)
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(scene);
  (function spin() {
    requestAnimationFrame(spin);
    if (visible && !dragging && !reduce) { cy += 0.4; apply(); }
  })();
  apply();
})();


/* ============================================================
   6. Hero text depth tilt
   CONCEPT: same mouse -> rotation idea, applied to a group of layers.
   ============================================================ */
(function heroDepth() {
  const hero = document.querySelector(".hero-text");
  if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const x = e.clientX / window.innerWidth - 0.5;   // -0.5 to 0.5
    const y = e.clientY / window.innerHeight - 0.5;
    hero.style.setProperty("--hy", x * 8 + "deg");
    hero.style.setProperty("--hx", -y * 6 + "deg");
  }, { passive: true });
})();
