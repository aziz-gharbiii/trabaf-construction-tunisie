'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { split } from './splitStore';
import { getImagePath } from '@/lib/image-path';

/* ======================================================================
   Hero « Du plan à la réalité » photo-réaliste.
   Une vraie image (rendu HD) devient 3D grâce à une carte de profondeur :
   les plans proches bougent plus que le fond (parallaxe souris + travelling lent).
   Une ligne de scan jaune sépare la version « plan d'architecte » de la photo.
   ====================================================================== */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uReal;
  uniform sampler2D uPlan;
  uniform sampler2D uDepth;
  uniform vec2 uRes;
  uniform vec2 uMove;      // parallaxe (souris + dérive)
  uniform vec2 uAnchor;    // point de l'image gardé au centre selon le format d'écran
  uniform float uZoom;
  uniform float uSplit;    // position de la ligne de scan (0..1 écran)
  uniform float uEdge;     // visibilité de la ligne
  uniform float uIntro;    // apparition
  varying vec2 vUv;

  vec2 cover(vec2 uv) {
    float a = uRes.x / uRes.y;               // image carrée
    vec2 s = a > 1.0 ? vec2(1.0, 1.0 / a) : vec2(a, 1.0);
    return uAnchor + (uv - 0.5) * s / uZoom;
  }

  void main() {
    vec2 uv = cover(vUv);
    float depth = texture2D(uDepth, uv).r;
    // parallaxe : les zones proches (depth=1) se déplacent plus que le fond
    vec2 p = uv + uMove * (depth - 0.35);
    float d2 = texture2D(uDepth, p).r;
    p = uv + uMove * (d2 - 0.35);

    vec3 real = texture2D(uReal, p).rgb;
    vec3 plan = texture2D(uPlan, p).rgb;

    // gauche de la ligne = réalisé, droite = plan
    float x = vUv.x;
    float m = smoothstep(uSplit - 0.0015, uSplit + 0.0015, x);
    vec3 col = mix(real, plan, m);

    // ligne de scan lumineuse + reflet léger côté plan
    float dist = abs(x - uSplit) * uRes.x;
    float line = exp(-dist * 0.35) * 1.6 + exp(-dist * 0.04) * 0.35;
    col += vec3(1.0, 0.72, 0.0) * line * uEdge;

    // vignette douce + fondu d'entrée
    vec2 q = vUv - 0.5;
    col *= 1.0 - dot(q, q) * 0.55;
    col *= uIntro;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const smooth = (t: number) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

function Picture({ mobile }: { mobile: boolean }) {
  const [real, plan, depth] = useTexture([
    getImagePath('/images/hero/reel.webp'),
    getImagePath('/images/hero/plan.webp'),
    getImagePath('/images/hero/depth.png')
  ]);
  const { gl, size, pointer } = useThree();

  useMemo(() => {
    [real, plan, depth].forEach((t) => {
      t.colorSpace = THREE.NoColorSpace; // couleurs affichées telles quelles
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      t.needsUpdate = true;
    });
  }, [real, plan, depth, gl]);

  const uniforms = useMemo(
    () => ({
      uReal: { value: real },
      uPlan: { value: plan },
      uDepth: { value: depth },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMove: { value: new THREE.Vector2() },
      uAnchor: { value: new THREE.Vector2(0.5, 0.5) },
      uZoom: { value: 1.08 },
      uSplit: { value: 0 },
      uEdge: { value: 0 },
      uIntro: { value: 0 }
    }),
    [real, plan, depth]
  );

  const t0 = useRef<number | null>(null);
  const sent = useRef(false);
  const move = useRef(new THREE.Vector2());

  useFrame((state) => {
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - t0.current;
    const u = uniforms;

    u.uRes.value.set(size.width, size.height);
    const portrait = size.width / size.height < 1;
    // sur téléphone on centre sur l'immeuble (à droite de l'image)
    u.uAnchor.value.set(portrait ? 0.66 : 0.56, portrait ? 0.5 : 0.44);

    // travelling : léger zoom au chargement puis avance avec le scroll
    const s = clamp(window.scrollY / window.innerHeight, 0, 1);
    u.uZoom.value = 1.05 + (1 - ease(t / 3.5)) * 0.12 + s * 0.12;

    // parallaxe : souris (desktop) + dérive automatique (vivant même sans souris)
    const drift = new THREE.Vector2(Math.sin(t * 0.35) * 0.6, Math.cos(t * 0.27) * 0.35);
    const target = mobile ? drift : drift.multiplyScalar(0.4).add(new THREE.Vector2(pointer.x, pointer.y));
    move.current.lerp(target, 0.05);
    const amp = mobile ? 0.018 : 0.03;
    u.uMove.value.set(-move.current.x * amp, -move.current.y * amp * 0.6);

    // scénario : plan seul → balayage → réalisé
    if (!split.manual) {
      split.value = smooth((t - 1.2) / 3.2);
      if (t > 4.5) split.introDone = true;
    }
    // ligne de scan = bord droit de la zone « réalisée » (0 = tout plan, 1 = tout réel)
    u.uSplit.value = split.value <= 0.001 ? -0.2 : split.value >= 0.999 ? 1.2 : split.value;
    const edge = split.value > 0.001 && split.value < 0.999 ? 1 : 0;
    u.uEdge.value += (edge - u.uEdge.value) * 0.15;
    u.uIntro.value = ease(t / 0.9);

    if (!sent.current) {
      sent.current = true;
      window.dispatchEvent(new Event('trabaf:scene-ready'));
    }
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} depthWrite={false} depthTest={false} />
    </mesh>
  );
}

export default function PhotoHero() {
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
        dpr={[1, 1.75]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        fallback={<div className="hero-fallback absolute inset-0" />}
      >
        <Suspense fallback={null}>
          <Picture mobile={mobile} />
        </Suspense>
      </Canvas>
    </div>
  );
}
