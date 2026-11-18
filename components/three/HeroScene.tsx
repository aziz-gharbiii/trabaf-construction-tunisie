'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sky } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { split } from './splitStore';

/* ======================================================================
   Hero 3D « Du plan à la réalité » — deux immeubles tunisiens (R+4 et R+3)
   au coucher du soleil : façades blanches, persiennes et portes bleues,
   porte d'entrée en arc, balcons en fer forgé, citerne, chauffe-eau solaire
   et parabole sur le toit, piscine et palmiers.
   Une ligne de scan sépare la version « plan d'architecte 3D » (traits)
   de la version « réalisée » (matériaux réels). Tout est généré en code.
   ====================================================================== */

const YELLOW = '#F5B800';
const BLUE = '#1f5fa6';
const H = 0.62;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/* ---------------- Textures procédurales ---------------- */
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
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Persienne bleue à lames horizontales */
function shutterTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 128; y += 9) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(4, y + 5, 56, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(4, y, 56, 1);
  }
  ctx.strokeStyle = '#174a85';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 60, 124);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sol « plan d'architecte » : fond bleu + quadrillage */
function blueprintGroundTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0a2a57';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(120,170,240,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(170,210,255,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 30);
  return t;
}

/* ---------------- Matériaux ---------------- */
function useMaterials() {
  return useMemo(() => {
    const shutterMap = shutterTexture();
    return {
      render: new THREE.MeshStandardMaterial({ map: noiseTexture('#f4f2ec', 10, 3), roughness: 0.9 }),
      cream: new THREE.MeshStandardMaterial({ color: '#e7dcc6', roughness: 0.85 }),
      slab: new THREE.MeshStandardMaterial({ map: noiseTexture('#d9d4ca', 14, 2), roughness: 0.9 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#4d6a83', metalness: 0.2, roughness: 0.05, clearcoat: 1, envMapIntensity: 1.6 }),
      warm: new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb35c', emissiveIntensity: 1.8, toneMapped: false }),
      shutter: new THREE.MeshStandardMaterial({ map: shutterMap, roughness: 0.6 }),
      door: new THREE.MeshStandardMaterial({ color: '#1a4f8c', roughness: 0.5, metalness: 0.1 }),
      iron: new THREE.MeshStandardMaterial({ color: '#1c1d21', metalness: 0.6, roughness: 0.4 }),
      tank: new THREE.MeshStandardMaterial({ color: '#e9e9e6', roughness: 0.5, metalness: 0.2 }),
      panel: new THREE.MeshStandardMaterial({ color: '#1b2c4a', metalness: 0.6, roughness: 0.2 }),
      deck: new THREE.MeshStandardMaterial({ color: '#c9b089', roughness: 0.8 }),
      tile: new THREE.MeshStandardMaterial({ map: noiseTexture('#b9b2a5', 18, 8), roughness: 0.9 })
    };
  }, []);
}
type Mats = ReturnType<typeof useMaterials>;

/* ---------------- Porte d'entrée en arc ---------------- */
function archShape(w: number, h: number) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.lineTo(-r, 0);
  return s;
}

function ArchDoor({ m, x, z }: { m: Mats; x: number; z: number }) {
  const outer = useMemo(() => new THREE.ExtrudeGeometry(archShape(0.66, 0.56), { depth: 0.05, bevelEnabled: false, curveSegments: 18 }), []);
  const inner = useMemo(() => new THREE.ExtrudeGeometry(archShape(0.5, 0.48), { depth: 0.05, bevelEnabled: false, curveSegments: 18 }), []);
  return (
    <group position={[x, 0.02, z]}>
      <mesh geometry={outer} material={m.cream} castShadow />
      <mesh geometry={inner} material={m.door} position={[0, 0, 0.012]} />
      {/* clous décoratifs façon porte tunisienne */}
      {[-0.12, 0, 0.12].map((dx) =>
        [0.12, 0.24, 0.36].map((dy) => (
          <mesh key={`${dx}${dy}`} position={[dx, dy, 0.066]} material={m.iron}>
            <sphereGeometry args={[0.012, 6, 6]} />
          </mesh>
        ))
      )}
    </group>
  );
}

/* ---------------- Fenêtre + persiennes ouvertes ---------------- */
function TunisianWindow({ m, x, y, z, lit = false, w = 0.36, h = 0.36, rotY = 0 }: { m: Mats; x: number; y: number; z: number; lit?: boolean; w?: number; h?: number; rotY?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      {/* encadrement */}
      <mesh position={[0, 0, 0.015]} material={m.cream} castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.03]} />
      </mesh>
      <mesh position={[0, 0, 0.032]} material={lit ? m.warm : m.glass}>
        <boxGeometry args={[w, h, 0.01]} />
      </mesh>
      {/* volets ouverts de chaque côté */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * (w / 2 + 0.06 + w / 4), 0, 0.04]} rotation={[0, sgn * -0.35, 0]} material={m.shutter} castShadow>
          <boxGeometry args={[w / 2, h + 0.02, 0.015]} />
        </mesh>
      ))}
      {/* appui de fenêtre */}
      <mesh position={[0, -h / 2 - 0.05, 0.04]} material={m.cream}>
        <boxGeometry args={[w + 0.14, 0.03, 0.08]} />
      </mesh>
    </group>
  );
}

/* ---------------- Balcon fer forgé ---------------- */
function Balcony({ m, x, y, z, w }: { m: Mats; x: number; y: number; z: number; w: number }) {
  const bars = Math.floor(w / 0.055);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0, 0.17]} material={m.slab} castShadow receiveShadow>
        <boxGeometry args={[w, 0.06, 0.36]} />
      </mesh>
      <mesh position={[0, 0.27, 0.34]} material={m.iron}>
        <boxGeometry args={[w, 0.02, 0.02]} />
      </mesh>
      {Array.from({ length: bars + 1 }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + (i * w) / bars, 0.14, 0.34]} material={m.iron}>
          <boxGeometry args={[0.008, 0.26, 0.008]} />
        </mesh>
      ))}
      {/* volute décorative */}
      <mesh position={[0, 0.14, 0.345]} rotation={[0, 0, 0]} material={m.iron}>
        <torusGeometry args={[0.07, 0.006, 6, 20]} />
      </mesh>
    </group>
  );
}

/* ---------------- Équipements de toit ---------------- */
function RoofKit({ m, W, D }: { m: Mats; W: number; D: number }) {
  return (
    <group>
      {/* acrotère */}
      {[
        [0, D / 2, W, 0.06],
        [0, -D / 2, W, 0.06]
      ].map(([x, z, w, d], i) => (
        <mesh key={`p${i}`} position={[x, 0.11, z]} material={m.render} castShadow>
          <boxGeometry args={[w, 0.2, d]} />
        </mesh>
      ))}
      {[W / 2, -W / 2].map((x, i) => (
        <mesh key={`s${i}`} position={[x, 0.11, 0]} material={m.render} castShadow>
          <boxGeometry args={[0.06, 0.2, D]} />
        </mesh>
      ))}
      {/* cage d'escalier + porte bleue */}
      <group position={[-W / 2 + 0.6, 0, -D / 2 + 0.5]}>
        <mesh position={[0, 0.27, 0]} material={m.render} castShadow>
          <boxGeometry args={[0.9, 0.54, 0.7]} />
        </mesh>
        <mesh position={[0.2, 0.2, 0.355]} material={m.door}>
          <boxGeometry args={[0.24, 0.38, 0.01]} />
        </mesh>
      </group>
      {/* citerne d'eau (bâche) sur support */}
      <group position={[W / 2 - 0.55, 0, -D / 2 + 0.45]}>
        <mesh position={[0, 0.1, 0]} material={m.iron}>
          <boxGeometry args={[0.36, 0.2, 0.36]} />
        </mesh>
        <mesh position={[0, 0.38, 0]} material={m.tank} castShadow>
          <cylinderGeometry args={[0.17, 0.17, 0.36, 18]} />
        </mesh>
      </group>
      {/* chauffe-eau solaire */}
      <group position={[0.2, 0, -0.1]} rotation={[0, 0.2, 0]}>
        <mesh position={[0, 0.2, 0]} rotation={[-0.75, 0, 0]} material={m.panel} castShadow>
          <boxGeometry args={[0.7, 0.45, 0.03]} />
        </mesh>
        <mesh position={[0, 0.38, -0.2]} rotation={[0, 0, Math.PI / 2]} material={m.tank} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.72, 12]} />
        </mesh>
        <mesh position={[0, 0.12, -0.08]} material={m.iron}>
          <boxGeometry args={[0.68, 0.02, 0.4]} />
        </mesh>
      </group>
      {/* parabole */}
      <group position={[W / 2 - 0.5, 0.28, D / 2 - 0.4]} rotation={[0.5, 0.6, 0]}>
        <mesh material={m.tank}>
          <sphereGeometry args={[0.16, 16, 8, 0, Math.PI * 2, 0, 0.6]} />
        </mesh>
        <mesh position={[0, -0.14, 0.03]} material={m.iron}>
          <cylinderGeometry args={[0.01, 0.01, 0.3, 5]} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------- Immeuble tunisien paramétrable ---------------- */
function TunisianBuilding({ m, floors, W, D, seed }: { m: Mats; floors: number; W: number; D: number; seed: number }) {
  const bays = Math.max(3, Math.round(W / 1.2));
  const bay = W / bays;
  const mid = Math.floor(bays / 2);
  const lit = useMemo(() => {
    let s = seed;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: floors + 1 }, () => Array.from({ length: bays }, () => r() > 0.62));
  }, [floors, bays, seed]);
  const total = (floors + 1) * H;

  return (
    <group>
      {/* volume principal */}
      <mesh position={[0, total / 2, 0]} material={m.render} castShadow receiveShadow>
        <boxGeometry args={[W, total, D]} />
      </mesh>
      {/* soubassement en pierre */}
      <mesh position={[0, 0.08, 0]} material={m.cream} castShadow receiveShadow>
        <boxGeometry args={[W + 0.04, 0.16, D + 0.04]} />
      </mesh>
      {/* bandeaux d'étage */}
      {Array.from({ length: floors }).map((_, f) => (
        <mesh key={`b${f}`} position={[0, (f + 1) * H, D / 2 + 0.02]} material={m.cream}>
          <boxGeometry args={[W + 0.04, 0.05, 0.05]} />
        </mesh>
      ))}

      {/* RDC : porte en arc au centre, vitrines avec rideaux métalliques bleus */}
      <ArchDoor m={m} x={-W / 2 + bay * (mid + 0.5)} z={D / 2} />
      {Array.from({ length: bays }).map((_, b) =>
        b === mid ? null : (
          <group key={`rdc${b}`} position={[-W / 2 + bay * (b + 0.5), 0.3, D / 2 + 0.01]}>
            <mesh material={lit[0][b] ? m.warm : m.glass}>
              <boxGeometry args={[bay * 0.7, 0.36, 0.02]} />
            </mesh>
            <mesh position={[0, 0.13, 0.015]} material={m.shutter}>
              <boxGeometry args={[bay * 0.72, 0.12, 0.02]} />
            </mesh>
          </group>
        )
      )}

      {/* Étages : fenêtres à persiennes, balcon au centre */}
      {Array.from({ length: floors }).map((_, i) => {
        const f = i + 1;
        const y = f * H + H / 2;
        return (
          <group key={`f${f}`}>
            {Array.from({ length: bays }).map((_, b) => {
              const x = -W / 2 + bay * (b + 0.5);
              if (b === mid) {
                return (
                  <group key={b}>
                    <TunisianWindow m={m} x={x} y={y + 0.02} z={D / 2} lit={lit[f][b]} w={0.42} h={0.46} />
                    <Balcony m={m} x={x} y={f * H + 0.04} z={D / 2} w={bay * 0.9} />
                  </group>
                );
              }
              return <TunisianWindow key={b} m={m} x={x} y={y} z={D / 2} lit={lit[f][b]} />;
            })}
            {/* façade latérale visible */}
            {[-D / 4, D / 4].map((z, k) => (
              <TunisianWindow key={`side${k}`} m={m} x={W / 2} y={y} z={z} rotY={Math.PI / 2} w={0.3} h={0.32} lit={lit[f][(k + f) % bays]} />
            ))}
          </group>
        );
      })}

      {/* toit */}
      <group position={[0, total, 0]}>
        <RoofKit m={m} W={W} D={D} />
      </group>
    </group>
  );
}

/* ---------------- Piscine (eau en shader, compatible découpe) ---------------- */
const waterVertex = /* glsl */ `
  #include <clipping_planes_pars_vertex>
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mvPosition = viewMatrix * w;
    #include <clipping_planes_vertex>
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const waterFragment = /* glsl */ `
  #include <clipping_planes_pars_fragment>
  uniform float uTime;
  uniform vec3 uSky;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    #include <clipping_planes_fragment>
    vec2 uv = vUv * vec2(9.0, 5.0);
    float c = 0.0;
    for (int i = 0; i < 4; i++) {
      uv += vec2(sin(uv.y * 1.2 + uTime * 0.6), cos(uv.x * 1.05 + uTime * 0.5)) * 0.33;
      c += abs(sin(uv.x + uv.y));
    }
    c /= 4.0;
    vec3 col = mix(vec3(0.16, 0.66, 0.74), vec3(0.02, 0.32, 0.46), smoothstep(0.0, 1.0, vUv.x));
    col += vec3(0.75, 0.95, 1.0) * pow(c, 6.0) * 0.55;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    col = mix(col, uSky, pow(1.0 - max(viewDir.y, 0.0), 3.0) * 0.55);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Palm({ position, height = 1.6, lean = 0.15, rot = 0 }: { position: [number, number, number]; height?: number; lean?: number; rot?: number }) {
  const trunk = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7a5c3e', roughness: 0.95 }), []);
  const leafA = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f6b2a', roughness: 0.8 }), []);
  const leafB = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4d7d33', roughness: 0.8 }), []);
  return (
    <group position={position} rotation={[0, rot, lean]}>
      <mesh position={[0, height / 2, 0]} material={trunk} castShadow>
        <cylinderGeometry args={[0.035, 0.06, height, 7]} />
      </mesh>
      {Array.from({ length: 8 }).map((_, k) => (
        <group key={k} position={[0, height, 0]} rotation={[0, (k / 8) * Math.PI * 2, 0]}>
          <mesh position={[0.32, -0.08, 0]} rotation={[0, 0, -0.45]} material={k % 2 ? leafA : leafB} castShadow>
            <boxGeometry args={[0.68, 0.015, 0.13]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Pool({ m }: { m: Mats }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uSky: { value: new THREE.Color('#e9b98c') } }), []);
  useFrame((s) => {
    if (mat.current) mat.current.uniforms.uTime.value = s.clock.elapsedTime;
  });
  const PW = 3.0;
  const PD = 1.4;
  return (
    <group>
      <mesh position={[0, 0.02, 0]} material={m.deck} receiveShadow>
        <boxGeometry args={[PW + 1.4, 0.04, PD + 1.1]} />
      </mesh>
      <mesh position={[0, 0.05, 0]} material={m.cream} receiveShadow>
        <boxGeometry args={[PW + 0.24, 0.03, PD + 0.24]} />
      </mesh>
      <mesh position={[0, 0.068, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PW, PD]} />
        <shaderMaterial ref={mat} vertexShader={waterVertex} fragmentShader={waterFragment} uniforms={uniforms} clipping />
      </mesh>
      {[-0.6, 0.2].map((x) => (
        <group key={x} position={[x, 0.04, PD / 2 + 0.42]}>
          <mesh position={[0, 0.06, 0]} material={m.tank} castShadow>
            <boxGeometry args={[0.24, 0.05, 0.6]} />
          </mesh>
          <mesh position={[0, 0.14, -0.26]} rotation={[0.7, 0, 0]} material={m.tank} castShadow>
            <boxGeometry args={[0.24, 0.04, 0.22]} />
          </mesh>
        </group>
      ))}
      <Palm position={[PW / 2 + 0.45, 0.04, -0.3]} height={1.9} lean={-0.12} />
      <Palm position={[PW / 2 + 0.55, 0.04, 0.55]} height={1.5} lean={-0.2} rot={1.2} />
      <Palm position={[-PW / 2 - 0.5, 0.04, 0.6]} height={1.7} lean={0.15} rot={2.4} />
    </group>
  );
}

/* ---------------- Découpe Plan / Réel ---------------- */
type Planes = { real: THREE.Plane; plan: THREE.Plane };

/**
 * Tout ce qui est à l'intérieur est affiché « réel » d'un côté de la ligne de scan,
 * et en « plan 3D » (arêtes + volume translucide) de l'autre côté.
 */
function PlanToReal({ planes, children }: { planes: Planes; children: React.ReactNode }) {
  const root = useRef<THREE.Group>(null);
  const lineMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0, clippingPlanes: [planes.plan], toneMapped: false }),
    [planes]
  );
  const fillMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ color: '#3f86e8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, clippingPlanes: [planes.plan] }),
    [planes]
  );

  useLayoutEffect(() => {
    const g = root.current;
    if (!g) return;
    const meshes: THREE.Mesh[] = [];
    const mats = new Set<THREE.Material>();
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mt) => mats.add(mt));
      meshes.push(mesh);
    });
    mats.forEach((mt) => {
      mt.clippingPlanes = [planes.real];
      mt.clipShadows = true;
      mt.needsUpdate = true;
    });
    const added: THREE.Object3D[] = [];
    meshes.forEach((mesh) => {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 28), lineMat);
      const fill = new THREE.Mesh(mesh.geometry, fillMat);
      edges.raycast = () => undefined;
      fill.raycast = () => undefined;
      mesh.add(edges, fill);
      added.push(edges, fill);
    });
    return () => {
      added.forEach((o) => o.parent?.remove(o));
    };
  }, [planes, lineMat, fillMat]);

  // Les traits du plan apparaissent en fondu au chargement
  const t0 = useRef<number | null>(null);
  useFrame((state) => {
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const k = ease((state.clock.elapsedTime - t0.current) / 1.2);
    lineMat.opacity = 0.95 * k;
    fillMat.opacity = 0.09 * k;
  });

  return <group ref={root}>{children}</group>;
}

/* ---------------- Caméra + ligne de scan ---------------- */
const pivot = new THREE.Vector3();
const right = new THREE.Vector3();

function Director({ planes, mobile }: { planes: Planes; mobile: boolean }) {
  const { camera, pointer } = useThree();
  const beam = useRef<THREE.Group>(null);
  const beamMat = useRef<THREE.MeshBasicMaterial>(null);
  const t0 = useRef<number | null>(null);

  useFrame((state) => {
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;

    // Caméra : arrivée en douceur, légère dérive, parallaxe souris et scroll
    const intro = ease(t / 3);
    const s = clamp(window.scrollY / window.innerHeight, 0, 1.2);
    const theta = 0.55 + Math.sin(state.clock.elapsedTime * 0.08) * 0.06 + pointer.x * 0.07 - s * 0.2;
    const R = (mobile ? 17 : 12.5) + (1 - intro) * 6;
    camera.position.x += (Math.sin(theta) * R - camera.position.x) * 0.06;
    camera.position.z += (Math.cos(theta) * R - camera.position.z) * 0.06;
    camera.position.y += (3.2 + (1 - intro) * 4 + pointer.y * 0.4 + s * 2.2 - camera.position.y) * 0.06;
    pivot.set(mobile ? -0.8 : -2.8, (mobile ? -0.6 : 2.0) + s * 0.5, 0.4);
    camera.lookAt(pivot);

    // Scénario automatique : plan seul → balayage → réalisé
    if (!split.manual) {
      split.value = smooth((t - 1.4) / 3.2);
      if (t > 4.8) split.introDone = true;
    }

    // Plan de découpe perpendiculaire à l'écran (balayage gauche → droite)
    const camTheta = Math.atan2(camera.position.x, camera.position.z);
    right.set(Math.cos(camTheta), 0, -Math.sin(camTheta));
    const span = mobile ? 6 : 7.5;
    // aux extrémités, la découpe sort complètement du cadre (tout plan / tout réel)
    const offset = split.value >= 0.999 ? 300 : split.value <= 0.001 ? -300 : -span + split.value * span * 2 + (mobile ? 0 : 1.2);
    const c = right.dot(pivot) + offset;
    planes.real.normal.copy(right).negate();
    planes.real.constant = c;
    planes.plan.normal.copy(right);
    planes.plan.constant = -c;

    if (beam.current && beamMat.current) {
      beam.current.position.copy(pivot).addScaledVector(right, offset);
      beam.current.position.y = 2.5;
      beam.current.rotation.y = camTheta;
      const edge = split.value > 0.001 && split.value < 0.999;
      beamMat.current.opacity += ((edge ? 1 : 0) - beamMat.current.opacity) * 0.2;
      beamMat.current.color.setRGB(3.2, 2.3, 0.2); // > 1 → lueur via le bloom
    }
  });

  return (
    <group ref={beam}>
      {/* ligne de scan : trait lumineux vertical (le halo vient du bloom) */}
      <mesh>
        <boxGeometry args={[0.035, 7.5, 0.035]} />
        <meshBasicMaterial ref={beamMat} color={YELLOW} transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
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

const SUN = new THREE.Vector3(-60, 10, 45);

function World({ mobile }: { mobile: boolean }) {
  const m = useMaterials();
  const planes = useMemo<Planes>(() => ({ real: new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), plan: new THREE.Plane(new THREE.Vector3(1, 0, 0), 0) }), []);
  const asphalt = useMemo(() => noiseTexture('#4a4b4f', 16, 14), []);
  const bpGround = useMemo(() => blueprintGroundTexture(), []);
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 }), [asphalt]);
  const bpGroundMat = useMemo(() => new THREE.MeshBasicMaterial({ map: bpGround, clippingPlanes: [planes.plan], toneMapped: false }), [bpGround, planes]);

  return (
    <>
      <Sky distance={4500} sunPosition={SUN} turbidity={8} rayleigh={2.4} mieCoefficient={0.006} mieDirectionalG={0.86} />
      <fog attach="fog" args={['#c9a690', 32, 100]} />
      <Environment resolution={128} frames={1}>
        <Sky sunPosition={SUN} turbidity={8} rayleigh={2.4} mieCoefficient={0.006} mieDirectionalG={0.86} />
      </Environment>
      <hemisphereLight args={['#c9d6ff', '#5a4636', 0.6]} />
      <directionalLight
        position={[SUN.x * 0.2, SUN.y * 0.9, SUN.z * 0.2]}
        intensity={2.5}
        color="#ffd2a3"
        castShadow
        shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={45}
      />

      {/* sol "plan d'architecte" (visible côté plan) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.11, 0]} material={bpGroundMat}>
        <planeGeometry args={[120, 120]} />
      </mesh>

      <group position={[mobile ? 0 : 0.4, 0, 0]} scale={mobile ? 0.85 : 1}>
        <PlanToReal planes={planes}>
          {/* sol réel : asphalte + trottoirs */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} material={groundMat} receiveShadow>
            <planeGeometry args={[120, 120]} />
          </mesh>
          <mesh position={[-0.6, -0.05, 0.6]} material={m.tile} receiveShadow>
            <boxGeometry args={[12, 0.1, 6.4]} />
          </mesh>

          {/* Immeuble R+4 */}
          <group position={[0.6, 0, -0.6]}>
            <TunisianBuilding m={m} floors={4} W={4.6} D={2.8} seed={11} />
          </group>
          {/* Immeuble R+3, en retrait */}
          <group position={[-4.2, 0, -0.2]} rotation={[0, 0.08, 0]}>
            <TunisianBuilding m={m} floors={3} W={3.4} D={2.6} seed={37} />
          </group>
          {/* Piscine + palmiers */}
          <group position={[3.6, 0, 2.6]} rotation={[0, -0.12, 0]}>
            <Pool m={m} />
          </group>
          <Palm position={[-1.8, 0, 1.9]} height={1.8} lean={0.1} rot={0.6} />
          <Palm position={[-6.4, 0, 1.5]} height={1.6} lean={-0.12} rot={1.9} />
        </PlanToReal>
      </group>

      <Director planes={planes} mobile={mobile} />
      <ReadySignal />

      {!mobile && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur luminanceThreshold={1} intensity={0.6} />
          <SMAA />
          <Vignette eskil={false} offset={0.25} darkness={0.5} />
        </EffectComposer>
      )}
    </>
  );
}

function ClippingOn() {
  const { gl } = useThree();
  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);
  return null;
}

export default function HeroScene() {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onMq = () => setMobile(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    if (wrap.current) io.observe(wrap.current);
    // nouvelle visite du hero → rejouer le scénario
    split.value = 0;
    split.manual = false;
    split.introDone = false;
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
        camera={{ position: [12, 8, 20], fov: 36, near: 0.1, far: 200 }}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
        fallback={<div className="hero-fallback absolute inset-0" />}
      >
        <ClippingOn />
        <World mobile={mobile} />
      </Canvas>
    </div>
  );
}
