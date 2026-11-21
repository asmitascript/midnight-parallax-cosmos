import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { usePointer, useReducedMotion, useIsSmallScreen } from "./hooks";
import { starFrag, starVert, nebulaFrag, nebulaVert, planetFrag, planetVert, streakFrag, streakVert } from "./shaders";

// Parallax strength per depth layer (near layers move more).
const PARALLAX = { nebula: 0.4, far: 0.9, mid: 1.8, near: 3.2, objects: 1.2 };

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function StarLayer({ count, depth, spread, size, seed, tint, motion }: {
  count: number; depth: [number, number]; spread: number; size: number; seed: number; tint: THREE.Color[]; motion: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const r = rand(seed);
    const pos = new Float32Array(count * 3), sz = new Float32Array(count), br = new Float32Array(count),
      ph = new Float32Array(count), col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * spread * 1.8;
      pos[i * 3 + 1] = (r() - 0.5) * spread;
      pos[i * 3 + 2] = -(depth[0] + r() * (depth[1] - depth[0]));
      const big = Math.pow(r(), 6);
      sz[i] = size * (0.4 + big * 2.2);
      br[i] = 0.25 + Math.pow(r(), 2.5) * 0.75;
      ph[i] = r() * Math.PI * 2;
      const c = tint[Math.floor(r() * tint.length)]!;
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    g.setAttribute("aBright", new THREE.BufferAttribute(br, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count, depth, spread, size, seed, tint]);
  const { gl } = useThree();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: gl.getPixelRatio() } }), [gl]);
  useFrame((_, d) => { if (motion && mat.current) mat.current.uniforms["uTime"]!.value += Math.min(d, 0.05); });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={starVert} fragmentShader={starFrag} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Nebula({ motion }: { motion: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, d) => { if (motion && mat.current) mat.current.uniforms["uTime"]!.value += Math.min(d, 0.05); });
  return (
    <mesh position={[0, 0, -120]}>
      <planeGeometry args={[420, 240]} />
      <shaderMaterial ref={mat} vertexShader={nebulaVert} fragmentShader={nebulaFrag} uniforms={uniforms}
        transparent depthWrite={false} />
    </mesh>
  );
}

function Planet({ position, radius, color, rim, motion }: {
  position: [number, number, number]; radius: number; color: string; rim: string; motion: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) }, uRim: { value: new THREE.Color(rim) },
    uLight: { value: new THREE.Vector3(-0.7, 0.5, 0.5).normalize() },
  }), [color, rim]);
  useFrame((_, d) => { if (motion && ref.current) ref.current.rotation.y += d * 0.01; });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial vertexShader={planetVert} fragmentShader={planetFrag} uniforms={uniforms} transparent />
    </mesh>
  );
}

/** Faint spiral galaxy made of particles, far away. */
function Galaxy({ position, count, motion }: { position: [number, number, number]; count: number; motion: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const r = rand(77), pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const inner = new THREE.Color("#b7b4d8"), outer = new THREE.Color("#4a4f8a");
    for (let i = 0; i < count; i++) {
      const rad = Math.pow(r(), 1.6) * 9, arm = (i % 2) * Math.PI, ang = rad * 0.9 + arm;
      const j = () => (r() - 0.5) * (0.4 + rad * 0.25);
      pos.set([Math.cos(ang) * rad + j(), j() * 0.3, Math.sin(ang) * rad + j()], i * 3);
      const c = inner.clone().lerp(outer, rad / 9);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [count]);
  useFrame((_, d) => { if (motion && ref.current) ref.current.rotation.y += d * 0.008; });
  return (
    <group position={position} rotation={[1.25, 0, 0.5]} scale={1.6}>
      <points ref={ref} geometry={geo}>
        <pointsMaterial size={0.28} vertexColors transparent opacity={0.16} depthWrite={false}
          blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
    </group>
  );
}

function ShootingStars({ enabled }: { enabled: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const st = useRef({ t: 0, life: 1.2, next: 4, active: false, from: new THREE.Vector3(), dir: new THREE.Vector3() });
  const uniforms = useMemo(() => ({ uFade: { value: 0 } }), []);
  useFrame((_, delta) => {
    const s = st.current, m = mesh.current, d = Math.min(delta, 0.05);
    if (!m || !mat.current) return;
    if (!enabled) { m.visible = false; return; }
    if (!s.active) {
      s.next -= d;
      if (s.next <= 0) {
        s.active = true; s.t = 0; s.life = 0.9 + Math.random() * 0.8;
        s.from.set((Math.random() - 0.2) * 60, 10 + Math.random() * 18, -30 - Math.random() * 20);
        const a = Math.PI + 0.35 + Math.random() * 0.5;
        s.dir.set(Math.cos(a), Math.sin(a) * 0.6 - 0.3, 0).normalize();
        m.rotation.z = Math.atan2(s.dir.y, s.dir.x);
      }
      m.visible = false; return;
    }
    s.t += d;
    const k = s.t / s.life;
    m.visible = true;
    m.position.copy(s.from).addScaledVector(s.dir, k * 45);
    mat.current.uniforms["uFade"]!.value = Math.sin(Math.min(k, 1) * Math.PI) * 0.75;
    if (k >= 1) { s.active = false; s.next = 6 + Math.random() * 10; }
  });
  return (
    <mesh ref={mesh} visible={false}>
      <planeGeometry args={[9, 0.06]} />
      <shaderMaterial ref={mat} vertexShader={streakVert} fragmentShader={streakFrag} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/** Group that eases toward the pointer, scaled by depth. */
function Parallax({ strength, pointer, motion, children }: {
  strength: number; pointer: React.RefObject<{ x: number; y: number }>; motion: boolean; children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const g = ref.current; if (!g) return;
    const d = Math.min(delta, 0.05), p = pointer.current;
    const drift = motion ? state.clock.elapsedTime * 0.02 : 0;
    const tx = motion ? p.x * strength : 0, ty = motion ? p.y * strength * 0.6 : 0;
    const k = 1 - Math.exp(-2.2 * d);
    g.position.x += (tx - g.position.x) * k;
    g.position.y += (ty - g.position.y) * k;
    g.rotation.z = Math.sin(drift) * 0.01 * strength * 0.3;
  });
  return <group ref={ref}>{children}</group>;
}

function Scene() {
  const reduced = useReducedMotion();
  const small = useIsSmallScreen();
  const pointer = usePointer();
  const motion = !reduced;
  const m = small ? 0.45 : 1;
  const tints = useMemo(() => ({
    cool: ["#ffffff", "#dfe6ff", "#c4d0ff", "#fff4e6"].map((c) => new THREE.Color(c)),
    deep: ["#aab6e8", "#c9c2ee", "#e8ecff"].map((c) => new THREE.Color(c)),
    dust: ["#6d6aa8", "#5a6aa6", "#7b6aa0"].map((c) => new THREE.Color(c)),
  }), []);

  return (
    <>
      <color attach="background" args={["#03040b"]} />
      <Parallax strength={PARALLAX.nebula} pointer={pointer} motion={motion}><Nebula motion={motion} /></Parallax>
      <Parallax strength={PARALLAX.far} pointer={pointer} motion={motion}>
        <StarLayer count={Math.round(5000 * m)} depth={[70, 110]} spread={200} size={1.4} seed={11} tint={tints.deep} motion={motion} />
        <Galaxy position={[48, 22, -100]} count={Math.round(3500 * m)} motion={motion} />
      </Parallax>
      <Parallax strength={PARALLAX.objects} pointer={pointer} motion={motion}>
        <Planet position={[-42, -16, -80]} radius={6} color="#1a1f3d" rim="#5b63a8" motion={motion} />
        <Planet position={[30, -24, -95]} radius={1.6} color="#2a2340" rim="#8a7cb8" motion={motion} />
      </Parallax>
      <Parallax strength={PARALLAX.mid} pointer={pointer} motion={motion}>
        <StarLayer count={Math.round(2200 * m)} depth={[35, 70]} spread={110} size={1.8} seed={23} tint={tints.cool} motion={motion} />
        <StarLayer count={Math.round(1800 * m)} depth={[25, 60]} spread={100} size={1.1} seed={41} tint={tints.dust} motion={motion} />
        <ShootingStars enabled={motion} />
      </Parallax>
      <Parallax strength={PARALLAX.near} pointer={pointer} motion={motion}>
        <StarLayer count={Math.round(500 * m)} depth={[12, 30]} spread={60} size={2.2} seed={57} tint={tints.cool} motion={motion} />
      </Parallax>
    </>
  );
}

export default function CosmicScene() {
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => { requestAnimationFrame(() => wrap.current?.setAttribute("data-scene-ready", "")); }, []);
  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 400 }} dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}>
        <Scene />
      </Canvas>
    </div>
  );
}
