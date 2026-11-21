import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Deterministic PRNG so the layout stays stable between renders. */
export function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/**
 * Picks an (x, y) at a given depth, biased away from the screen centre so
 * the main content area stays calm. Returns world coordinates.
 */
export function edgePoint(r: () => number, z: number, fov = 60, aspect = 1.8, clear = 0.45) {
  const h = Math.tan((fov * Math.PI) / 360) * z, w = h * aspect;
  for (let i = 0; i < 12; i++) {
    const nx = r() * 2 - 1, ny = r() * 2 - 1;
    const d = Math.hypot(nx / 1.0, ny / 0.85);
    if (d > clear + r() * 0.25) return [nx * w * 1.05, ny * h * 1.05] as const;
  }
  return [(r() > 0.5 ? 1 : -1) * w * 0.85, (r() * 2 - 1) * h] as const;
}

// ---------- Code glyphs drifting like distant dust ----------
const GLYPHS = ["{ }", "</>", "=>", "0x", "&&", "[ ]", "#", ";", "λ", "01", "fn", "::", "||", "!=", "/*", "∑"];

function makeAtlas() {
  const cell = 64, cols = 4, rows = 4;
  const c = document.createElement("canvas");
  c.width = cell * cols; c.height = cell * rows;
  const g = c.getContext("2d")!;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = "500 26px ui-monospace, SFMono-Regular, Menlo, monospace";
  g.fillStyle = "#ffffff";
  GLYPHS.forEach((t, i) => g.fillText(t, (i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2));
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearMipMapLinearFilter;
  return tex;
}

const glyphVert = /* glsl */ `
attribute float aIndex; attribute float aSize; attribute float aPhase;
uniform float uTime; uniform float uPixelRatio;
varying float vIndex; varying float vAlpha;
void main() {
  vec3 p = position;
  p.y += sin(uTime * 0.05 + aPhase) * 0.6;
  p.x += cos(uTime * 0.04 + aPhase * 1.3) * 0.4;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vIndex = aIndex;
  vAlpha = 0.5 + 0.5 * sin(uTime * 0.12 + aPhase * 5.0);
  gl_PointSize = aSize * uPixelRatio * (120.0 / -mv.z);
}`;
const glyphFrag = /* glsl */ `
uniform sampler2D uAtlas; uniform vec3 uColor; uniform float uOpacity;
varying float vIndex; varying float vAlpha;
void main() {
  vec2 cell = vec2(mod(vIndex, 4.0), floor(vIndex / 4.0));
  vec2 uv = vec2((cell.x + gl_PointCoord.x) / 4.0, 1.0 - (cell.y + gl_PointCoord.y) / 4.0);
  float a = texture2D(uAtlas, uv).a * vAlpha * uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export function CodeGlyphs({ count, depth, seed, opacity, motion }: {
  count: number; depth: [number, number]; seed: number; opacity: number; motion: boolean;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const r = rand(seed);
    const pos = new Float32Array(count * 3), idx = new Float32Array(count), sz = new Float32Array(count), ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const z = depth[0] + r() * (depth[1] - depth[0]);
      const [x, y] = edgePoint(r, z, 60, 1.8, 0.55);
      pos.set([x, y, -z], i * 3);
      idx[i] = Math.floor(r() * GLYPHS.length);
      sz[i] = 14 + Math.pow(r(), 2) * 16;
      ph[i] = r() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aIndex", new THREE.BufferAttribute(idx, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
    return g;
  }, [count, depth, seed]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) },
    uAtlas: { value: makeAtlas() }, uColor: { value: new THREE.Color("#8d97cf") }, uOpacity: { value: opacity },
  }), [opacity]);
  useFrame((_, d) => { if (motion && mat.current) mat.current.uniforms["uTime"]!.value += Math.min(d, 0.05); });
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={glyphVert} fragmentShader={glyphFrag} uniforms={uniforms}
        transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// ---------- Network constellations & data-structure star patterns ----------
type Graph = { nodes: THREE.Vector3[]; edges: [number, number][] };

/** Organic cluster of nodes linked to their nearest neighbours (a "network"). */
function networkGraph(r: () => number, n: number, radius: number): Graph {
  const nodes = Array.from({ length: n }, () =>
    new THREE.Vector3((r() - 0.5) * radius * 2, (r() - 0.5) * radius * 1.3, (r() - 0.5) * radius * 0.8));
  const edges: [number, number][] = [];
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [j, a.distanceTo(b)] as const).filter(([j]) => j !== i)
      .sort((x, y) => x[1] - y[1]).slice(0, 1 + Math.floor(r() * 2));
    near.forEach(([j]) => { if (!edges.some(([p, q]) => (p === j && q === i))) edges.push([i, j]); });
  });
  return { nodes, edges };
}

/** Slightly irregular binary tree, like a constellation shaped from a data structure. */
function treeGraph(r: () => number, depth: number, spread: number): Graph {
  const nodes: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)], edges: [number, number][] = [];
  const grow = (parent: number, level: number, w: number) => {
    if (level >= depth) return;
    for (const side of [-1, 1]) {
      if (level > 1 && r() < 0.25) continue;
      const p = nodes[parent]!;
      nodes.push(new THREE.Vector3(p.x + side * w * (0.8 + r() * 0.4), p.y - spread * (0.8 + r() * 0.3), p.z + (r() - 0.5)));
      edges.push([parent, nodes.length - 1]);
      grow(nodes.length - 1, level + 1, w * 0.5);
    }
  };
  grow(0, 0, spread * 1.6);
  return { nodes, edges };
}

function GraphMesh({ graph, position, rotation, opacity, motion, speed }: {
  graph: Graph; position: [number, number, number]; rotation: [number, number, number]; opacity: number; motion: boolean; speed: number;
}) {
  const grp = useRef<THREE.Group>(null);
  const lineMat = useRef<THREE.LineBasicMaterial>(null);
  const { lineGeo, nodeGeo } = useMemo(() => {
    const lp = new Float32Array(graph.edges.length * 6);
    graph.edges.forEach(([a, b], i) => {
      const A = graph.nodes[a]!, B = graph.nodes[b]!;
      lp.set([A.x, A.y, A.z, B.x, B.y, B.z], i * 6);
    });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(lp, 3));
    const np = new Float32Array(graph.nodes.length * 3);
    graph.nodes.forEach((v, i) => np.set([v.x, v.y, v.z], i * 3));
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(np, 3));
    return { lineGeo, nodeGeo };
  }, [graph]);
  useFrame((s) => {
    if (!motion) return;
    const t = s.clock.elapsedTime;
    if (grp.current) grp.current.rotation.y = rotation[1] + Math.sin(t * 0.03 * speed) * 0.15;
    if (lineMat.current) lineMat.current.opacity = opacity * (0.75 + 0.25 * Math.sin(t * 0.25 * speed));
  });
  return (
    <group ref={grp} position={position} rotation={rotation}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial ref={lineMat} color="#6f7bbf" transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <points geometry={nodeGeo}>
        <pointsMaterial color="#b9c2f0" size={0.35} transparent opacity={opacity * 2.2} depthWrite={false}
          blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
    </group>
  );
}

export function Constellations({ motion, small }: { motion: boolean; small: boolean }) {
  const graphs = useMemo(() => {
    const r = rand(313);
    return {
      netA: networkGraph(r, small ? 9 : 14, 6),
      netB: networkGraph(r, small ? 7 : 10, 4.5),
      tree: treeGraph(r, 4, 2.4),
      netC: networkGraph(r, 8, 3.5),
    };
  }, [small]);
  return (
    <>
      <GraphMesh graph={graphs.netA} position={[-34, 15, -55]} rotation={[0.2, 0.4, 0.1]} opacity={0.14} motion={motion} speed={1} />
      <GraphMesh graph={graphs.tree} position={[38, -6, -62]} rotation={[0.1, -0.3, 0.12]} opacity={0.12} motion={motion} speed={0.8} />
      <GraphMesh graph={graphs.netB} position={[24, 22, -70]} rotation={[-0.3, 0.2, -0.2]} opacity={0.1} motion={motion} speed={1.3} />
      {!small && <GraphMesh graph={graphs.netC} position={[-30, -22, -48]} rotation={[0.4, -0.5, 0.3]} opacity={0.11} motion={motion} speed={0.9} />}
    </>
  );
}

// ---------- Faint hexagonal "shield" lattice (cybersecurity motif) ----------
export function HexLattice({ position, motion }: { position: [number, number, number]; motion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const pts: number[] = [], R = 1.2, w = Math.sqrt(3) * R;
    const r = rand(99);
    for (let q = -4; q <= 4; q++) for (let s = -4; s <= 4; s++) {
      const cx = w * (q + s / 2), cy = 1.5 * R * s, d = Math.hypot(cx, cy);
      if (d > 8 || r() < d / 10) continue; // dissolve towards the edges
      for (let k = 0; k < 6; k++) {
        const a0 = (Math.PI / 3) * k + Math.PI / 6, a1 = a0 + Math.PI / 3;
        pts.push(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, 0, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, 0);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  useFrame((_, d) => { if (motion && ref.current) ref.current.rotation.z += Math.min(d, 0.05) * 0.006; });
  return (
    <group position={position} rotation={[-0.9, 0.35, 0]}>
      <group ref={ref}>
        <lineSegments geometry={geo}>
          <lineBasicMaterial color="#5d669e" transparent opacity={0.07} depthWrite={false} blending={THREE.AdditiveBlending} />
        </lineSegments>
      </group>
    </group>
  );
}

// ---------- Orbital paths ----------
export function Orbit({ position, radius, tilt, opacity, motion, speed = 1, seed = 1 }: {
  position: [number, number, number]; radius: [number, number]; tilt: [number, number, number];
  opacity: number; motion: boolean; speed?: number; seed?: number;
}) {
  const moon = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => rand(seed)() * Math.PI * 2, [seed]);
  const line = useMemo(() => {
    const pts = new THREE.EllipseCurve(0, 0, radius[0], radius[1]).getPoints(160);
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)));
    const m = new THREE.LineDashedMaterial({ color: "#7480c0", transparent: true, opacity, dashSize: 0.6, gapSize: 0.5, depthWrite: false });
    const l = new THREE.Line(g, m);
    l.computeLineDistances();
    return l;
  }, [radius, opacity]);
  useFrame((s) => {
    if (!moon.current) return;
    const a = phase + (motion ? s.clock.elapsedTime * 0.02 * speed : 0);
    moon.current.position.set(Math.cos(a) * radius[0], Math.sin(a) * radius[1], 0);
  });
  return (
    <group position={position} rotation={tilt}>
      <primitive object={line} />
      <mesh ref={moon}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#aab3e6" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
