export const starVert = /* glsl */ `
attribute float aSize; attribute float aBright; attribute float aPhase; attribute vec3 aColor;
uniform float uTime; uniform float uPixelRatio;
varying float vAlpha; varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.75 + 0.25 * sin(uTime * (0.4 + aPhase * 0.25) + aPhase * 7.0);
  vAlpha = aBright * tw;
  vColor = aColor;
  gl_PointSize = aSize * uPixelRatio * (110.0 / -mv.z);
  gl_PointSize = clamp(gl_PointSize, 1.2, 6.0 * uPixelRatio);
}`;
export const starFrag = /* glsl */ `
varying float vAlpha; varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.5, 0.0, d);
  float a = pow(core, 2.2) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * 0.85, a);
}`;

export const nebulaVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const nebulaFrag = /* glsl */ `
uniform float uTime; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
void main() {
  vec2 p = vUv * vec2(3.5, 2.0);
  float t = uTime * 0.008;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  float n = fbm(p + 2.2 * q);
  float n2 = fbm(p * 1.7 + q * 1.5 + 8.0);
  vec3 base = vec3(0.012, 0.016, 0.045);
  vec3 blue = vec3(0.10, 0.14, 0.32);
  vec3 violet = vec3(0.20, 0.13, 0.34);
  vec3 purple = vec3(0.26, 0.11, 0.30);
  vec3 col = base;
  col = mix(col, blue, smoothstep(0.45, 0.85, n) * 0.55);
  col = mix(col, violet, smoothstep(0.5, 0.9, n2) * 0.45);
  col = mix(col, purple, smoothstep(0.62, 0.95, n * n2 * 1.6) * 0.35);
  // dust lanes
  col *= 1.0 - smoothstep(0.55, 0.8, fbm(p * 3.0 - q)) * 0.35;
  // diagonal band like a faint galactic plane
  float band = exp(-pow((vUv.y - 0.5 - (vUv.x - 0.5) * 0.35) * 4.0, 2.0));
  col += band * vec3(0.04, 0.045, 0.08) * (0.5 + n);
  float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
  gl_FragColor = vec4(col, edge);
}`;

export const planetVert = /* glsl */ `
varying vec3 vN; varying vec3 vView; varying vec3 vPos;
void main() {
  vN = normalize(normalMatrix * normal); vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
export const planetFrag = /* glsl */ `
uniform vec3 uColor; uniform vec3 uRim; uniform vec3 uLight;
varying vec3 vN; varying vec3 vView; varying vec3 vPos;
void main() {
  float diff = max(dot(vN, uLight), 0.0);
  float bands = 0.85 + 0.15 * sin(vPos.y * 3.0 + sin(vPos.x * 1.5));
  float rim = pow(1.0 - max(dot(vN, vView), 0.0), 3.0);
  vec3 col = uColor * (0.15 + diff * 0.9) * bands + uRim * rim * (0.5 + diff * 0.6);
  gl_FragColor = vec4(col * 0.8, 1.0);
}`;

export const streakVert = nebulaVert;
export const streakFrag = /* glsl */ `
uniform float uFade; varying vec2 vUv;
void main() {
  float tail = pow(vUv.x, 2.5);
  float w = 1.0 - abs(vUv.y - 0.5) * 2.0;
  gl_FragColor = vec4(vec3(0.85, 0.88, 1.0), tail * w * uFade);
}`;
