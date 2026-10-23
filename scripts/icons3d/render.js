// Merender setiap model di icons.js menjadi WebP transparan: cahaya studio lembut (environment +
// key + rim), bayangan kontak tipis, kamera 3/4, dan auto-framing supaya semua ikon sama besar.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ICONS } from "./icons.js";

const SIZE = 768;
const OUT = 256;
const FILL = 0.9;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const out = document.createElement("canvas");
const ctx = out.getContext("2d");
const log = (s) => (document.getElementById("log").textContent += `${s}\n`);

function stage(model, view = {}, aspect = 1) {
  const scene = new THREE.Scene();
  scene.environment = envMap;
  scene.environmentIntensity = 0.95;
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-3, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 16;
  key.shadow.blurSamples = 20;
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.1, far: 40 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd9e2ff, 0.8);
  rim.position.set(4, 3, -4);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe4f6, 0.5));

  const pivot = new THREE.Group();
  pivot.add(model);
  model.rotation.set(view.x ?? 0.1, view.y ?? -0.55, view.z ?? 0);
  model.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  scene.add(pivot);
  const box = new THREE.Box3().setFromObject(pivot);
  const c = box.getCenter(new THREE.Vector3());
  pivot.position.set(-c.x, -c.y, -c.z);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.14 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(26, aspect, 0.1, 100);
  const dir = new THREE.Vector3(0, view.tilt ?? 0.5, 1).normalize();
  const corners = (b) => {
    const o = [];
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) o.push(new THREE.Vector3(x, y, z));
    return o;
  };
  let dist = new THREE.Box3().setFromObject(pivot).getBoundingSphere(new THREE.Sphere()).radius / Math.sin(THREE.MathUtils.degToRad(13));
  for (let i = 0; i < 6; i++) {
    camera.position.copy(dir).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    let minX = 1, maxX = -1, minY = 1, maxY = -1;
    for (const p of corners(new THREE.Box3().setFromObject(pivot))) {
      const v = p.project(camera);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
    }
    const extent = Math.max((maxX - minX) / 2, ((maxY - minY) / 2) * (aspect >= 1 ? 1 : 1 / aspect));
    const shift = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, 0.5).unproject(camera).sub(camera.position).normalize();
    pivot.position.sub(camera.position.clone().add(shift.multiplyScalar(dist)));
    ground.position.y = new THREE.Box3().setFromObject(pivot).min.y - 0.002;
    dist *= extent / (view.fill ?? FILL);
  }
  camera.position.copy(dir).multiplyScalar(dist);
  camera.lookAt(0, 0, 0);
  return { scene, camera };
}

async function save(name, [w, h], ext = "webp") {
  out.width = w;
  out.height = h;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, w, h);
  if (ext === "png") {
    // Ikon aplikasi: kotak biru malam (sudut ala iOS), dadu 76% di tengah.
    ctx.fillStyle = "#121a45";
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, w * 0.22);
    ctx.fill();
    const s = w * 0.76;
    ctx.drawImage(renderer.domElement, (w - s) / 2, (h - s) / 2 + w * 0.01, s, s);
  } else {
    ctx.drawImage(renderer.domElement, 0, 0, w, h);
  }
  const blob = await new Promise((r) => out.toBlob(r, ext === "png" ? "image/png" : "image/webp", 0.92));
  const res = await fetch(`/save?name=${name}&ext=${ext}`, { method: "POST", body: blob });
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
}

const only = new URLSearchParams(location.search).get("only")?.split(",");
const list = Object.entries(ICONS).filter(([n]) => !only || only.includes(n));
for (const [name, def] of list) {
  try {
    const [w, h] = def.size ?? [OUT, OUT];
    const scale = SIZE / Math.max(w, h);
    renderer.setSize(Math.round(w * scale), Math.round(h * scale));
    const { scene, camera } = stage(def.build(), def.view, w / h);
    renderer.render(scene, camera);
    await save(name, [w, h]);
    if (def.png) {
      // Ikon aplikasi: dadu di atas latar biru malam berujung bulat, 512 px.
      await save(`${name}-app`, [512, 512], "png");
    }
    log(`✓ ${name}`);
  } catch (e) {
    log(`✗ ${name}: ${e.message}`);
    console.error(e);
  }
}
document.querySelector("h1").textContent = `Selesai: ${list.length} ikon`;
window.__done = true;
