// Set ikon 3D Coba-coba: semua dimodelkan dari bentuk bulat-lembut (rounded box, lathe, extrude
// ber-bevel) dengan material "permen" mengilap. Satuan: satu ikon kira-kira selebar 2.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const C = {
  coral: "#ff4436", coralDeep: "#e0352a",
  butter: "#ffc83d", gold: "#f4b63a", goldDeep: "#d99a22",
  mint: "#2ed4a0", mintDeep: "#18ae83",
  lilac: "#9d8aff", lilacDeep: "#7560f0",
  sky: "#4da3ff", skyPale: "#cfe5ff",
  navy: "#22306e", night: "#121a45",
  pink: "#ff9fb4", pinkDeep: "#f2809a",
  white: "#f8f9fc", cloud: "#e3e9f5", cloudDeep: "#c3cde3",
  soil: "#7a4f37", pot: "#ff8a5c",
};

const mat = (color, o = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.2, ...o });
const metal = (color = C.gold) => mat(color, { metalness: 0.55, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 });
const M = (m) => (m instanceof THREE.Material ? m : mat(m));

function place(obj, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  obj.position.set(...pos);
  obj.rotation.set(...rot);
  if (Array.isArray(scale)) obj.scale.set(...scale);
  else if (scale != null) obj.scale.setScalar(scale);
  return obj;
}
const mesh = (geo, m, pos, rot, scale) => place(new THREE.Mesh(geo, M(m)), pos, rot, scale);
const G = (...children) => {
  const g = new THREE.Group();
  children.flat().forEach((c) => c && g.add(c));
  return g;
};
const at = (obj, pos, rot, scale) => place(obj, pos, rot, scale);
const box = (w, h, d, r, m, pos, rot) => mesh(new RoundedBoxGeometry(w, h, d, 8, Math.min(r, Math.min(w, h, d) / 2 - 0.001)), m, pos, rot);
const ball = (r, m, pos, scale) => mesh(new THREE.SphereGeometry(r, 64, 48), m, pos, undefined, scale);
const cyl = (rt, rb, h, m, pos, rot) => mesh(new THREE.CylinderGeometry(rt, rb, h, 72), m, pos, rot);
const ring = (R, r, m, pos, rot) => mesh(new THREE.TorusGeometry(R, r, 32, 140), m, pos, rot);
const lathe = (pts, m, pos, rot) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 120), m, pos, rot);

function puff(shapes, depth, bevel, m, pos, rot) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: 14, curveSegments: 64 });
  g.center();
  g.computeVertexNormals();
  return mesh(g, m, pos, rot);
}
const circle = (r) => {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, Math.PI * 2, false);
  return s;
};
const disc = (r, depth, bevel, m, pos, rot) => puff(circle(r), depth, bevel, m, pos, rot);
function poly(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}
function ngon(n, r, rot = 0) {
  return poly(Array.from({ length: n }, (_, i) => [Math.cos(rot + (i / n) * Math.PI * 2) * r, Math.sin(rot + (i / n) * Math.PI * 2) * r]));
}

// ---------- komponen ----------

/** Dadu bulat dengan mata timbul: 5 di depan, 3 di atas, 2 di samping kanan. */
function die(color = C.coral, pip = C.white, s = 1.6) {
  const h = s / 2;
  const r = s * 0.075;
  const o = s * 0.26;
  const dot = (pos) => ball(r, pip, pos);
  const inset = h - r * 0.45;
  const front = [[0, 0], [-o, -o], [o, o], [-o, o], [o, -o]].map(([x, y]) => dot([x, y, inset]));
  const top = [[-o, -o], [0, 0], [o, o]].map(([x, z]) => dot([x, inset, z]));
  const right = [[-o, o], [o, -o]].map(([y, z]) => dot([inset, y, z]));
  return G(box(s, s, s, s * 0.2, color), front, top, right);
}

/** Koin berdiri menghadap kamera. */
const coin = (r = 0.6, m = metal(), mark) =>
  G(disc(r, 0.14, 0.07, m), disc(r * 0.7, 0.04, 0.03, m, [0, 0, 0.11]), mark ? at(mark, [0, 0, 0.17]) : null);

// ---------- ikon ----------

export const ICONS = {
  // Logo: satu dadu koral yang sedikit miring, seperti baru dilempar.
  dadu: { build: () => die(), view: { x: 0.18, y: -0.62, z: 0.1 }, png: true },

  // Ilustrasi hero: tiga dadu + koin.
  "dadu-trio": {
    size: [480, 300],
    view: { x: 0.12, y: -0.45, z: 0, tilt: 0.42, fill: 0.86 },
    build: () =>
      G(
        at(die(C.coral, C.white, 1.6), [0, 0.8, 0], [0.2, 0.3, 0.12]),
        at(die(C.butter, C.night, 1.25), [-1.85, 0.62, 0.5], [0.4, -0.5, -0.2]),
        at(die(C.lilac, C.white, 1.15), [1.9, 0.58, 0.7], [-0.3, 0.8, 0.25]),
        at(coin(0.45, metal()), [-0.7, 0.32, 1.6], [-1.3, 0, 0.4]),
        at(coin(0.38, metal(C.mint)), [0.95, 0.27, 1.75], [-1.45, 0, -0.3]),
      ),
  },

  // Saham: tiga batang naik di atas alas.
  saham: {
    build: () =>
      G(
        box(2.2, 0.22, 1.1, 0.1, C.navy, [0, 0, 0]),
        box(0.5, 0.75, 0.5, 0.16, C.sky, [-0.62, 0.48, 0]),
        box(0.5, 1.2, 0.5, 0.16, C.mint, [0, 0.71, 0]),
        box(0.5, 1.75, 0.5, 0.16, C.coral, [0.62, 0.98, 0]),
        at(coin(0.26, metal(C.butter)), [0.62, 2.12, 0], [0, 0.4, 0]),
      ),
  },

  // Kripto: koin lilac dengan cap segi enam.
  kripto: {
    build: () => coin(0.9, metal(C.lilac), G(puff(ngon(6, 0.42, Math.PI / 6), 0.06, 0.04, metal(C.lilacDeep)), puff(ngon(6, 0.2, Math.PI / 6), 0.08, 0.03, metal(C.white), [0, 0, 0.05]))),
    view: { x: 0.05, y: -0.35 },
  },

  // Emas: dua batang emas bertumpuk.
  emas: {
    build: () => {
      const bar = () => at(puff(poly([[-0.85, -0.3], [0.85, -0.3], [0.6, 0.3], [-0.6, 0.3]]), 0.75, 0.08, metal(C.gold)), [0, 0, 0], [0, 0, 0]);
      return G(at(bar(), [0, 0.3, 0]), at(bar(), [0.1, 0.95, 0.05], [0, 0.35, 0]));
    },
  },

  // Indeks / ETF / reksa dana: satu keranjang isi banyak "saham" warna-warni.
  keranjang: {
    build: () => {
      const balls = [];
      const colors = [C.coral, C.sky, C.mint, C.butter, C.lilac, C.pink];
      const spots = [[-0.45, 0.95, 0.1], [0.05, 1.0, -0.25], [0.5, 0.95, 0.1], [-0.15, 1.05, 0.38], [0.3, 1.32, 0.15], [-0.3, 1.33, -0.05], [0.0, 1.55, 0.1]];
      spots.forEach((p, i) => balls.push(ball(0.3, colors[i % colors.length], p)));
      return G(
        lathe([[0, 0], [0.7, 0.02], [0.95, 0.35], [1.1, 0.95], [1.02, 1.0], [0.88, 0.42], [0.62, 0.12], [0, 0.1]], C.coral),
        ring(1.06, 0.07, C.coralDeep, [0, 0.98, 0], [Math.PI / 2, 0, 0]),
        balls,
      );
    },
  },

  // Saham dunia: bola dunia dengan cincin.
  dunia: {
    build: () => {
      const land = [[0.4, 0.5, 0.65], [-0.55, 0.15, 0.72], [0.15, -0.45, 0.82], [-0.2, 0.75, 0.55], [0.75, -0.1, 0.55]].map(([x, y, z]) => {
        const v = new THREE.Vector3(x, y, z).normalize().multiplyScalar(0.92);
        const m = ball(0.32, C.mint, [v.x, v.y, v.z], [1, 1, 0.35]);
        m.lookAt(v.clone().multiplyScalar(2));
        return m;
      });
      return G(ball(0.95, C.sky), land, ring(1.35, 0.07, C.butter, [0, 0, 0], [1.25, 0.25, 0]));
    },
  },

  // Pasar uang / deposito: celengan.
  celengan: {
    build: () =>
      G(
        ball(0.9, C.pink, [0, 0.95, 0], [1.25, 1, 1]),
        cyl(0.3, 0.32, 0.3, C.pinkDeep, [1.12, 0.92, 0], [0, 0, Math.PI / 2]),
        ball(0.06, C.night, [1.28, 0.98, 0.1]),
        ball(0.06, C.night, [1.28, 0.98, -0.1]),
        mesh(new THREE.ConeGeometry(0.2, 0.32, 48), C.pinkDeep, [0.55, 1.78, 0.35], [0.2, 0, -0.3]),
        mesh(new THREE.ConeGeometry(0.2, 0.32, 48), C.pinkDeep, [0.55, 1.78, -0.35], [-0.2, 0, -0.3]),
        ball(0.07, C.night, [0.88, 1.2, 0.42]),
        ...[[-0.6, 0.38], [0.6, 0.38], [-0.6, -0.38], [0.6, -0.38]].map(([x, z]) => cyl(0.17, 0.17, 0.4, C.pinkDeep, [x, 0.2, z])),
        box(0.5, 0.08, 0.12, 0.04, C.night, [-0.1, 1.86, 0]),
        at(coin(0.36, metal()), [-0.1, 2.25, 0], [0, Math.PI / 2, 0]),
      ),
    view: { x: 0.1, y: -0.9 },
  },

  // SBN / obligasi: sertifikat dengan segel.
  sertifikat: {
    build: () =>
      G(
        box(1.6, 2.0, 0.12, 0.08, C.white, [0, 1.0, 0]),
        ...[0.55, 0.3, 0.05].map((y, i) => box(i ? 1.0 : 1.15, 0.09, 0.04, 0.03, i ? C.cloudDeep : C.navy, [-0.1, 1.0 + y + 0.25, 0.08])),
        disc(0.32, 0.08, 0.05, metal(C.coral), [0.38, 0.55, 0.12]),
        at(puff(poly([[-0.1, 0], [0.1, 0], [0.16, -0.5], [0, -0.38], [-0.16, -0.5]]), 0.03, 0.02, C.coralDeep), [0.28, 0.25, 0.08], [0, 0, 0.2]),
        at(puff(poly([[-0.1, 0], [0.1, 0], [0.16, -0.5], [0, -0.38], [-0.16, -0.5]]), 0.03, 0.02, C.coralDeep), [0.5, 0.25, 0.08], [0, 0, -0.2]),
      ),
    view: { x: 0.0, y: -0.4 },
  },

  // Untung: tunas tumbuh di pot.
  tunas: {
    build: () => {
      const leaf = (rot) => {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.bezierCurveTo(0.35, 0.1, 0.6, 0.35, 0.7, 0.7);
        s.bezierCurveTo(0.35, 0.65, 0.1, 0.4, 0, 0);
        return at(puff(s, 0.05, 0.04, C.mint), [0, 0, 0], rot);
      };
      return G(
        lathe([[0, 0], [0.6, 0], [0.75, 0.9], [0.82, 0.92], [0.82, 1.05], [0, 1.05]], C.pot),
        cyl(0.72, 0.72, 0.06, C.soil, [0, 0.98, 0]),
        cyl(0.06, 0.07, 0.9, C.mintDeep, [0, 1.45, 0]),
        at(leaf([0, 0, 0]), [0.35, 1.95, 0], [0, 0.3, -0.2]),
        at(leaf([0, 0, 0]), [-0.35, 1.75, 0], [0, -0.3, Math.PI + 0.9]),
      );
    },
  },

  // Rugi: awan hujan.
  awan: {
    build: () => {
      const drop = (x, y, z) => at(lathe([[0, 0], [0.12, 0.1], [0.14, 0.2], [0.09, 0.32], [0, 0.46]], C.sky), [x, y, z], [Math.PI, 0, 0]);
      return G(
        ball(0.6, C.cloud, [0, 1.6, 0]),
        ball(0.48, C.cloud, [-0.62, 1.4, 0.05]),
        ball(0.5, C.cloud, [0.62, 1.42, 0]),
        box(1.9, 0.5, 0.9, 0.25, C.cloud, [0, 1.2, 0]),
        drop(-0.5, 0.75, 0.15),
        drop(0.05, 0.6, 0.2),
        drop(0.55, 0.78, 0.1),
      );
    },
  },

  // Anjlok: kilat.
  kilat: {
    build: () => puff(poly([[0.15, 1.1], [-0.55, -0.05], [-0.05, -0.05], [-0.3, -1.1], [0.55, 0.2], [0.05, 0.2], [0.35, 1.1]]), 0.3, 0.1, C.butter),
    view: { x: 0.05, y: -0.45, z: -0.05 },
  },

  // Target: bendera di bukit.
  bendera: {
    build: () =>
      G(
        lathe([[0, 0], [1.0, 0], [0.75, 0.3], [0.35, 0.48], [0, 0.52]], C.mint),
        cyl(0.05, 0.05, 1.9, C.white, [0, 1.3, 0]),
        ball(0.11, metal(C.butter), [0, 2.3, 0]),
        box(0.95, 0.6, 0.08, 0.06, C.coral, [0.5, 1.92, 0]),
      ),
    view: { x: 0.08, y: -0.5 },
  },
};
