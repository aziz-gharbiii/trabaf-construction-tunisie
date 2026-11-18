'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Sky } from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';

/* ======================================================================
   Scène 3D réaliste du hero — chantier TRABAF au coucher du soleil.
   Résidence R+6 : 5 niveaux finis (façade vitrée, balcons, brise-soleil
   bois), 2 niveaux en gros œuvre (échafaudage, filet, fers en attente),
   grue à tour en treillis qui lève des charges, piscine + palmiers,
   palissade de chantier aux couleurs TRABAF.
   Tout est généré en code (aucun modèle à télécharger).
   ====================================================================== */

const YELLOW = '#F5B800';
const NAVY = '#0E2E5C';
const FLOORS = 7;
const FINISHED = 5;
const H = 0.62; // hauteur d'étage
const W = 4.4; // largeur façade (x)
const D = 2.8; // profondeur (z)
const BAYS = 4;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/* ---------------- Textures procédurales (canvas) ---------------- */
function noiseTexture(base: string, spread: number, repeat: number, size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * spread;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 30, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function bannerTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, c.width, c.height);
  for (let x = -40; x < c.width + 40; x += 40) {
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    ctx.moveTo(x, 140);
    ctx.lineTo(x + 20, 140);
    ctx.lineTo(x + 40, 160);
    ctx.lineTo(x + 20, 160);
    ctx.fill();
  }
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px Arial, sans-serif';
  ctx.fillText('TRABAF', 40, 62);
  ctx.fillStyle = YELLOW;
  ctx.font = '700 30px Arial, sans-serif';
  ctx.fillText('CONSTRUCTION', 300, 50);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 24px Arial, sans-serif';
  ctx.fillText('Bâtir vos rêves  •  +216 50 044 010', 300, 90);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------------- Matériaux partagés ---------------- */
function useMaterials() {
  return useMemo(() => {
    const concrete = new THREE.MeshStandardMaterial({ map: noiseTexture('#a7a399', 26, 2), roughness: 0.92 });
    const render = new THREE.MeshStandardMaterial({ color: '#efede8', roughness: 0.85 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#6f8ea8',
      metalness: 0.15,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.8
    });
    const frame = new THREE.MeshStandardMaterial({ color: '#2a2e35', metalness: 0.7, roughness: 0.35 });
    const wood = new THREE.MeshStandardMaterial({ color: '#8b6440', roughness: 0.7 });
    const rail = new THREE.MeshPhysicalMaterial({ color: '#cfe3f0', transparent: true, opacity: 0.28, roughness: 0.05 });
    const warm = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb35c', emissiveIntensity: 2.2, toneMapped: false });
    const rebar = new THREE.MeshStandardMaterial({ color: '#6b4430', metalness: 0.6, roughness: 0.6 });
    const scaffold = new THREE.MeshStandardMaterial({ color: '#b8bec6', metalness: 0.8, roughness: 0.35 });
    const plank = new THREE.MeshStandardMaterial({ color: '#a37a4c', roughness: 0.85 });
    const net = new THREE.MeshStandardMaterial({ color: '#2f7d3a', transparent: true, opacity: 0.42, side: THREE.DoubleSide, roughness: 1 });
    const yellow = new THREE.MeshStandardMaterial({ color: YELLOW, metalness: 0.35, roughness: 0.45 });
    const steel = new THREE.MeshStandardMaterial({ color: '#3b4553', metalness: 0.7, roughness: 0.45 });
    return { concrete, render, glass, frame, wood, rail, warm, rebar, scaffold, plank, net, yellow, steel };
  }, []);
}
type Mats = ReturnType<typeof useMaterials>;

/* ---------------- Barres (treillis) en InstancedMesh ---------------- */
type Bar = [THREE.Vector3, THREE.Vector3, number];
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function Bars({ bars, material }: { bars: Bar[]; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    bars.forEach(([a, b, t], i) => {
      const dir = new THREE.Vector3().subVectors(b, a);
      const len = dir.length();
      o.position.copy(a).addScaledVector(dir, 0.5);
      o.quaternion.setFromUnitVectors(up, dir.normalize());
      o.scale.set(t, len, t);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [bars]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, bars.length]} material={material} castShadow>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

/* ---------------- Étage fini ---------------- */
function FinishedFloor({ i, m, lit }: { i: number; m: Mats; lit: boolean[] }) {
  const bay = W / BAYS;
  const balcony = i > 0;
  return (
    <group>
      <mesh position={[0, 0.04, 0]} material={m.concrete} castShadow receiveShadow>
        <boxGeometry args={[W + 0.1, 0.08, D + 0.1]} />
      </mesh>
      <mesh position={[-W / 2, H / 2, 0]} material={m.render} castShadow receiveShadow>
        <boxGeometry args={[0.12, H, D]} />
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} material={m.render} castShadow receiveShadow>
        <boxGeometry args={[0.12, H, D]} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]} material={m.render} castShadow receiveShadow>
        <boxGeometry args={[W, H, 0.12]} />
      </mesh>
      {[-0.6, 0.6].map((z) => (
        <mesh key={z} position={[W / 2 + 0.065, H / 2 + 0.02, z]} material={m.glass}>
          <boxGeometry args={[0.02, H * 0.55, 0.5]} />
        </mesh>
      ))}
      {Array.from({ length: BAYS }).map((_, b) => {
        const x = -W / 2 + bay * (b + 0.5);
        return (
          <group key={b} position={[x, 0, D / 2]}>
            <mesh position={[0, H / 2 + 0.03, -0.02]} material={lit[b] ? m.warm : m.glass}>
              <boxGeometry args={[bay - 0.14, H - 0.16, 0.02]} />
            </mesh>
            <mesh position={[0, H / 2 + 0.03, -0.04]} material={m.frame}>
              <boxGeometry args={[bay - 0.1, H - 0.12, 0.015]} />
            </mesh>
            <mesh position={[0, H / 2 + 0.03, -0.005]} material={m.frame}>
              <boxGeometry args={[0.018, H - 0.16, 0.02]} />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: BAYS + 1 }).map((_, b) => (
        <mesh key={b} position={[-W / 2 + bay * b, H / 2, D / 2 + 0.06]} material={b % BAYS === 0 ? m.render : m.wood} castShadow>
          <boxGeometry args={[0.07, H, 0.16]} />
        </mesh>
      ))}
      {balcony && (
        <group position={[0, 0, D / 2 + 0.28]}>
          <mesh position={[0, 0.04, 0]} material={m.render} castShadow receiveShadow>
            <boxGeometry args={[W * 0.62, 0.07, 0.5]} />
          </mesh>
          <mesh position={[0, 0.19, 0.24]} material={m.rail}>
            <boxGeometry args={[W * 0.62, 0.24, 0.015]} />
          </mesh>
          <mesh position={[0, 0.31, 0.24]} material={m.frame}>
            <boxGeometry args={[W * 0.62, 0.015, 0.03]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ---------------- Étage en gros œuvre ---------------- */
function RawFloor({ m, top }: { m: Mats; top: boolean }) {
  const xs = [-W / 2, -W / 6, W / 6, W / 2];
  const zs = [-D / 2, D / 2];
  return (
    <group>
      <mesh position={[0, 0.04, 0]} material={m.concrete} castShadow receiveShadow>
        <boxGeometry args={[W + 0.1, 0.08, D + 0.1]} />
      </mesh>
      {xs.map((x) =>
        zs.map((z) =>
          top ? (
            <group key={`${x}${z}`} position={[x, 0.08, z]}>
              <mesh position={[0, 0.12, 0]} material={m.concrete} castShadow>
                <boxGeometry args={[0.13, 0.24, 0.13]} />
              </mesh>
              {[-0.035, 0.035].map((dx) =>
                [-0.035, 0.035].map((dz) => (
                  <mesh key={`${dx}${dz}`} position={[dx, 0.42, dz]} material={m.rebar}>
                    <cylinderGeometry args={[0.008, 0.008, 0.4, 5]} />
                  </mesh>
                ))
              )}
            </group>
          ) : (
            <mesh key={`${x}${z}`} position={[x, H / 2, z]} material={m.concrete} castShadow>
              <boxGeometry args={[0.13, H, 0.13]} />
            </mesh>
          )
        )
      )}
      {!top && (
        <mesh position={[0.8, 0.16, -0.3]} material={m.concrete} castShadow>
          <boxGeometry args={[0.45, 0.16, 0.35]} />
        </mesh>
      )}
    </group>
  );
}

/* ---------------- Échafaudage + filet ---------------- */
function Scaffold({ m }: { m: Mats }) {
  const y0 = FINISHED * H - 0.2;
  const y1 = FLOORS * H + 0.5;
  const bars = useMemo<Bar[]>(() => {
    const out: Bar[] = [];
    const z0 = D / 2 + 0.38;
    const z1 = D / 2 + 0.72;
    const cols = 7;
    const xAt = (c: number) => -W / 2 - 0.2 + ((W + 0.4) * c) / (cols - 1);
    for (let c = 0; c < cols; c++) {
      out.push([v(xAt(c), y0, z0), v(xAt(c), y1, z0), 0.025], [v(xAt(c), y0, z1), v(xAt(c), y1, z1), 0.025]);
    }
    for (let y = y0 + 0.05; y <= y1; y += 0.31) {
      out.push([v(xAt(0), y, z0), v(xAt(cols - 1), y, z0), 0.02], [v(xAt(0), y, z1), v(xAt(cols - 1), y, z1), 0.02]);
    }
    for (let c = 0; c < cols - 1; c += 2) out.push([v(xAt(c), y0, z1), v(xAt(c + 1), y1, z1), 0.018]);
    return out;
  }, [y0, y1]);
  return (
    <group>
      <Bars bars={bars} material={m.scaffold} />
      {[FINISHED * H + 0.02, (FINISHED + 1) * H + 0.02, FLOORS * H + 0.02].map((y) => (
        <mesh key={y} position={[0, y, D / 2 + 0.55]} material={m.plank} castShadow receiveShadow>
          <boxGeometry args={[W + 0.4, 0.03, 0.32]} />
        </mesh>
      ))}
      <mesh position={[0, (y0 + y1) / 2, D / 2 + 0.75]} material={m.net}>
        <planeGeometry args={[W + 0.45, y1 - y0]} />
      </mesh>
    </group>
  );
}

/* ---------------- Bâtiment animé ---------------- */
function Building({ m, reduced }: { m: Mats; reduced: boolean }) {
  const floors = useRef<(THREE.Group | null)[]>([]);
  const scaffold = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);

  const lit = useMemo(() => {
    let s = 11;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: FINISHED }, () => Array.from({ length: BAYS }, () => r() > 0.55));
  }, []);

  useFrame((state) => {
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = reduced ? 100 : state.clock.elapsedTime - t0.current;
    floors.current.forEach((g, i) => {
      if (!g) return;
      const p = ease((t - 0.4 - i * 0.28) / 0.8);
      g.visible = p > 0.001;
      g.scale.y = Math.max(0.001, p);
      g.position.y = i * H;
    });
    if (scaffold.current) {
      const p = ease((t - 0.4 - FLOORS * 0.28) / 0.8);
      scaffold.current.visible = p > 0.001;
      scaffold.current.scale.y = Math.max(0.001, p);
    }
  });

  return (
    <group>
      <mesh position={[0, -0.05, 0]} material={m.concrete} receiveShadow castShadow>
        <boxGeometry args={[W + 0.7, 0.1, D + 1.4]} />
      </mesh>
      {Array.from({ length: FLOORS }).map((_, i) => (
        <group key={i} ref={(el) => { floors.current[i] = el; }} visible={false}>
          {i < FINISHED ? <FinishedFloor i={i} m={m} lit={lit[i]} /> : <RawFloor m={m} top={i === FLOORS - 1} />}
        </group>
      ))}
      <group ref={scaffold} visible={false}>
        <Scaffold m={m} />
      </group>
    </group>
  );
}

/* ---------------- Grue à tour en treillis ---------------- */
const CRANE_POS = new THREE.Vector3(-3.6, 0, -1.6);
const MAST = 7.2;
const JIB = 6.2;

function useCraneBars() {
  return useMemo(() => {
    const mast: Bar[] = [];
    const s = 0.16;
    const seg = 0.36;
    const corners = [v(-s, 0, -s), v(s, 0, -s), v(s, 0, s), v(-s, 0, s)];
    corners.forEach((c) => mast.push([c.clone(), c.clone().setY(MAST), 0.035]));
    for (let y = 0; y < MAST - 0.01; y += seg) {
      for (let k = 0; k < 4; k++) {
        const a = corners[k].clone().setY(y);
        mast.push([a, corners[(k + 1) % 4].clone().setY(y), 0.02]);
        mast.push([a, corners[(k + 1) % 4].clone().setY(Math.min(MAST, y + seg)), 0.016]);
      }
    }
    const jib: Bar[] = [];
    const jw = 0.13;
    const jh = 0.3;
    const back = 2.0;
    jib.push([v(-back, 0, -jw), v(JIB, 0, -jw), 0.03], [v(-back, 0, jw), v(JIB, 0, jw), 0.03], [v(-back * 0.6, jh, 0), v(JIB, jh * 0.4, 0), 0.03]);
    for (let x = -back * 0.6; x < JIB - 0.2; x += 0.32) {
      const topY = jh - ((x + back * 0.6) / (JIB + back * 0.6)) * jh * 0.6;
      jib.push([v(x, 0, -jw), v(x, 0, jw), 0.015]);
      jib.push([v(x, 0, -jw), v(x + 0.16, topY, 0), 0.014]);
      jib.push([v(x, 0, jw), v(x + 0.16, topY, 0), 0.014]);
    }
    return { mast, jib };
  }, []);
}

function Crane({ m, reduced }: { m: Mats; reduced: boolean }) {
  const { mast, jib } = useCraneBars();
  const turn = useRef<THREE.Group>(null);
  const trolley = useRef<THREE.Group>(null);
  const hook = useRef<THREE.Group>(null);
  const cable = useRef<THREE.Mesh>(null);
  const load = useRef<THREE.Group>(null);

  // Cycle : prise de charge au stock → rotation → dépose au dernier étage → retour
  const A_PILE = 0.78;
  const R_PILE = 3.4;
  const A_TOP = -0.42;
  const R_TOP = 3.9;
  const TOP_Y = FLOORS * H + 0.6 - MAST;
  const PILE_Y = 0.6 - MAST;
  const HIGH_Y = -1.0;

  useFrame((state) => {
    const t = reduced ? 3 : state.clock.elapsedTime;
    const p = (t % 16) / 16;
    let angle = A_PILE;
    let radius = R_PILE;
    let y = HIGH_Y;
    let carrying = false;
    if (p < 0.12) {
      y = HIGH_Y + (PILE_Y - HIGH_Y) * smooth(p / 0.12);
    } else if (p < 0.24) {
      y = PILE_Y + (HIGH_Y - PILE_Y) * smooth((p - 0.12) / 0.12);
      carrying = true;
    } else if (p < 0.5) {
      const k = smooth((p - 0.24) / 0.26);
      angle = A_PILE + (A_TOP - A_PILE) * k;
      radius = R_PILE + (R_TOP - R_PILE) * k;
      carrying = true;
    } else if (p < 0.62) {
      angle = A_TOP;
      radius = R_TOP;
      y = HIGH_Y + (TOP_Y - HIGH_Y) * smooth((p - 0.5) / 0.12);
      carrying = true;
    } else if (p < 0.74) {
      angle = A_TOP;
      radius = R_TOP;
      y = TOP_Y + (HIGH_Y - TOP_Y) * smooth((p - 0.62) / 0.12);
    } else {
      const k = smooth((p - 0.74) / 0.26);
      angle = A_TOP + (A_PILE - A_TOP) * k;
      radius = R_TOP + (R_PILE - R_TOP) * k;
    }
    if (turn.current) turn.current.rotation.y = angle;
    if (trolley.current) trolley.current.position.x = radius;
    if (hook.current) hook.current.position.y = y;
    if (cable.current) {
      cable.current.scale.y = -y;
      cable.current.position.y = y / 2;
    }
    if (load.current) load.current.visible = carrying;
  });

  return (
    <group position={CRANE_POS}>
      <mesh position={[0, 0.12, 0]} material={m.concrete} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.24, 1.1]} />
      </mesh>
      <Bars bars={mast} material={m.yellow} />
      <group ref={turn} position={[0, MAST, 0]}>
        <mesh position={[0.05, 0.05, 0.28]} material={m.steel} castShadow>
          <boxGeometry args={[0.36, 0.34, 0.26]} />
        </mesh>
        <mesh position={[0.24, 0.05, 0.28]} material={m.glass}>
          <boxGeometry args={[0.02, 0.24, 0.2]} />
        </mesh>
        <Bars bars={jib} material={m.yellow} />
        <mesh position={[0, 0.7, 0]} material={m.yellow} castShadow>
          <boxGeometry args={[0.1, 1.4, 0.1]} />
        </mesh>
        <Bars
          bars={[
            [v(0, 1.4, 0), v(JIB * 0.7, 0.3, 0), 0.012],
            [v(0, 1.4, 0), v(-1.9, 0.05, 0), 0.012]
          ]}
          material={m.steel}
        />
        <mesh position={[-1.75, -0.12, 0]} material={m.concrete} castShadow>
          <boxGeometry args={[0.5, 0.42, 0.42]} />
        </mesh>
        <group ref={trolley} position={[R_PILE, -0.04, 0]}>
          <mesh material={m.steel} castShadow>
            <boxGeometry args={[0.24, 0.07, 0.3]} />
          </mesh>
          <mesh ref={cable} material={m.steel}>
            <cylinderGeometry args={[0.006, 0.006, 1, 4]} />
          </mesh>
          <group ref={hook}>
            <mesh material={m.yellow} castShadow>
              <boxGeometry args={[0.12, 0.1, 0.12]} />
            </mesh>
            <group ref={load} position={[0, -0.22, 0]}>
              <mesh material={m.concrete} castShadow>
                <boxGeometry args={[0.5, 0.26, 0.4]} />
              </mesh>
              <mesh position={[0, -0.15, 0]} material={m.plank}>
                <boxGeometry args={[0.55, 0.04, 0.45]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/* ---------------- Piscine ---------------- */
const waterVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const waterFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSky;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec2 uv = vUv * vec2(9.0, 5.0);
    float c = 0.0;
    for (int i = 0; i < 4; i++) {
      uv += vec2(sin(uv.y * 1.2 + uTime * 0.6), cos(uv.x * 1.05 + uTime * 0.5)) * 0.33;
      c += abs(sin(uv.x + uv.y));
    }
    c /= 4.0;
    vec3 deep = vec3(0.02, 0.32, 0.46);
    vec3 shallow = vec3(0.16, 0.66, 0.74);
    vec3 col = mix(shallow, deep, smoothstep(0.0, 1.0, vUv.x));
    col += vec3(0.75, 0.95, 1.0) * pow(c, 6.0) * 0.55;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(viewDir.y, 0.0), 3.0);
    col = mix(col, uSky, fres * 0.55);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Palm({ position, height = 1.6, lean = 0.15, rot = 0 }: { position: [number, number, number]; height?: number; lean?: number; rot?: number }) {
  const leaves = 8;
  return (
    <group position={position} rotation={[0, rot, lean]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.06, height, 7]} />
        <meshStandardMaterial color="#7a5c3e" roughness={0.95} />
      </mesh>
      {Array.from({ length: leaves }).map((_, k) => (
        <group key={k} position={[0, height, 0]} rotation={[0, (k / leaves) * Math.PI * 2, 0]}>
          <mesh position={[0.32, -0.08, 0]} rotation={[0, 0, -0.45]} castShadow>
            <boxGeometry args={[0.68, 0.015, 0.13]} />
            <meshStandardMaterial color={k % 2 ? '#3f6b2a' : '#4d7d33'} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Pool({ reduced }: { reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSky: { value: new THREE.Color('#e9b98c') } }), []);
  useFrame((s) => {
    if (mat.current && !reduced) mat.current.uniforms.uTime.value = s.clock.elapsedTime;
  });
  const PW = 3.2;
  const PD = 1.5;
  return (
    <group position={[3.3, 0, 3.4]} rotation={[0, -0.12, 0]}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[PW + 1.4, 0.04, PD + 1.1]} />
        <meshStandardMaterial color="#9b7653" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[PW + 0.24, 0.03, PD + 0.24]} />
        <meshStandardMaterial color="#efe9df" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.068, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PW, PD]} />
        <shaderMaterial ref={mat} vertexShader={waterVertex} fragmentShader={waterFragment} uniforms={uniforms} />
      </mesh>
      {[-0.7, 0.1].map((x) => (
        <group key={x} position={[x, 0.04, PD / 2 + 0.42]}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.24, 0.05, 0.6]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.14, -0.26]} rotation={[0.7, 0, 0]} castShadow>
            <boxGeometry args={[0.24, 0.04, 0.22]} />
            <meshStandardMaterial color="#f4f1ea" roughness={0.7} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0.3, 0]} color="#56d4ff" intensity={1.6} distance={3} />
      <Palm position={[PW / 2 + 0.45, 0.04, -0.3]} height={1.9} lean={-0.12} />
      <Palm position={[PW / 2 + 0.55, 0.04, 0.55]} height={1.5} lean={-0.2} rot={1.2} />
      <Palm position={[-PW / 2 - 0.5, 0.04, 0.6]} height={1.7} lean={0.15} rot={2.4} />
    </group>
  );
}

/* ---------------- Site : sol, palissade, conteneur, stock ---------------- */
function Site({ m }: { m: Mats }) {
  const ground = useMemo(() => noiseTexture('#6e6253', 30, 10), []);
  const asphalt = useMemo(() => noiseTexture('#3a3c40', 18, 14), []);
  const banner = useMemo(() => bannerTexture(), []);
  const fence: [number, number, number, number][] = [
    [-6.6, -0.6, Math.PI / 2, 8.6],
    [-1.6, -4.9, 0, 10]
  ];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial map={asphalt} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.8, -0.095, -0.6]} receiveShadow>
        <planeGeometry args={[11.6, 8.8]} />
        <meshStandardMaterial map={ground} roughness={1} />
      </mesh>
      {fence.map(([x, z, r, len], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[len, 0.84, 0.04]} />
            <meshStandardMaterial color={NAVY} roughness={0.6} />
          </mesh>
          {[-len / 4, len / 4].map((bx) => (
            <mesh key={bx} position={[bx, 0.44, 0.025]}>
              <planeGeometry args={[3.4, 0.53]} />
              <meshStandardMaterial map={banner} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}
      <group position={[-5.2, 0, 2.3]} rotation={[0, 0.3, 0]}>
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.84, 0.82]} />
          <meshStandardMaterial color="#f2f2ef" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.46, 0.415]}>
          <boxGeometry args={[0.5, 0.32, 0.01]} />
          <meshStandardMaterial color="#6f8ea8" metalness={0.5} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.86, 0]}>
          <boxGeometry args={[2.04, 0.04, 0.86]} />
          <meshStandardMaterial color={YELLOW} />
        </mesh>
      </group>
      <group position={[CRANE_POS.x + 2.4, 0, CRANE_POS.z - 2.4]}>
        {[
          [0, 0],
          [0.6, 0.1],
          [0.3, 0.55]
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.02, 0]} material={m.plank} castShadow receiveShadow>
              <boxGeometry args={[0.55, 0.04, 0.45]} />
            </mesh>
            <mesh position={[0, 0.17, 0]} material={m.concrete} castShadow>
              <boxGeometry args={[0.5, 0.26, 0.4]} />
            </mesh>
          </group>
        ))}
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} position={[-0.9, 0.03 + k * 0.025, 0.2 + (k % 2) * 0.02]} rotation={[0, 0.1, Math.PI / 2]} material={m.rebar}>
            <cylinderGeometry args={[0.012, 0.012, 1.6, 5]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ---------------- Caméra : intro + parallaxe + scroll ---------------- */
function CameraRig({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const { camera, pointer } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const t0 = useRef<number | null>(null);
  useFrame((state) => {
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const intro = reduced ? 1 : ease((state.clock.elapsedTime - t0.current) / 3.2);
    const s = clamp(window.scrollY / window.innerHeight, 0, 1.2);
    const drift = reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.08);
    const R = (mobile ? 17 : 14.5) + (1 - intro) * 7;
    const theta = 0.62 + drift * 0.07 + pointer.x * 0.08 - s * 0.25;
    const tx = Math.sin(theta) * R;
    const tz = Math.cos(theta) * R;
    const ty = 3.4 + (1 - intro) * 5 + pointer.y * 0.5 + s * 2.5;
    camera.position.x += (tx - camera.position.x) * 0.06;
    camera.position.y += (ty - camera.position.y) * 0.06;
    camera.position.z += (tz - camera.position.z) * 0.06;
    look.set(mobile ? 0.2 : -2.3, (mobile ? 1.0 : 2.6) + s * 0.6, 0.4);
    camera.lookAt(look);
  });
  return null;
}

function ReadySignal() {
  const sent = useRef(false);
  useFrame(() => {
    if (sent.current) return;
    sent.current = true;
    window.dispatchEvent(new Event('trabaf:scene-ready'));
  });
  return null;
}

const SUN = new THREE.Vector3(-60, 9, 45);

function World({ reduced, mobile }: { reduced: boolean; mobile: boolean }) {
  const m = useMaterials();
  return (
    <>
      <Sky distance={4500} sunPosition={SUN} turbidity={9} rayleigh={2.6} mieCoefficient={0.006} mieDirectionalG={0.86} />
      <fog attach="fog" args={['#b79a8a', 30, 95]} />
      <Environment resolution={128} frames={1}>
        <Sky sunPosition={SUN} turbidity={9} rayleigh={2.6} mieCoefficient={0.006} mieDirectionalG={0.86} />
      </Environment>
      <hemisphereLight args={['#c9d6ff', '#5a4636', 0.55]} />
      <directionalLight
        position={[SUN.x * 0.2, SUN.y * 0.9, SUN.z * 0.2]}
        intensity={2.6}
        color="#ffcf9e"
        castShadow
        shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />

      <group position={[mobile ? 0 : 0.6, 0, 0]} scale={mobile ? 0.85 : 1}>
        <Building m={m} reduced={reduced} />
        <Crane m={m} reduced={reduced} />
        <Pool reduced={reduced} />
        <Site m={m} />
        <ContactShadows position={[0, -0.04, 0]} scale={16} blur={2.4} opacity={0.55} far={6} frames={1} />
      </group>

      <CameraRig mobile={mobile} reduced={reduced} />
      <ReadySignal />

      {!mobile && (
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={0.6} intensity={2.2} distanceFalloff={0.6} halfRes />
          <Bloom mipmapBlur luminanceThreshold={1} intensity={0.55} />
          <SMAA />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      )}
    </>
  );
}

export default function HeroScene() {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const reduced = false; // scène animée pour tous (voir useReducedMotion)
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onMq = () => setMobile(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    if (wrap.current) io.observe(wrap.current);
    return () => {
      mq.removeEventListener('change', onMq);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, mobile ? 1.5 : 1.75]}
        camera={{ position: [14, 9, 18], fov: 36, near: 0.1, far: 200 }}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
        fallback={<div className="hero-fallback absolute inset-0" />}
      >
        <World reduced={reduced} mobile={mobile} />
      </Canvas>
    </div>
  );
}
