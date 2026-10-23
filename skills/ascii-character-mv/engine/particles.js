// C 模式：three.js 三维字符火星。每颗粒子从 start 飞向 end，进度由 uProg 决定（纯函数）
import * as THREE from '/engine/node_modules/three/build/three.module.js';
import { PAL, mulberry } from './glyph.js';

export const GLYPHS = "*+x.o#@%=~:;-/\\|<>01{}[]$&?!^AIBH";
let R, cam, scene, atlasTex, cv;
const sets = {};

export function initGL(W, H) {
  cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: true });
  R.setPixelRatio(1); R.setSize(W, H, false); R.setClearColor(0x000000, 0);
  cam = new THREE.PerspectiveCamera(50, W / H, .05, 400);
  scene = new THREE.Scene();
  // 字形图集 8×8
  const a = document.createElement('canvas'); a.width = a.height = 1024; const c = a.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, 1024, 1024); c.fillStyle = '#fff';
  c.font = '700 104px JBMono'; c.textAlign = 'center'; c.textBaseline = 'middle';
  [...GLYPHS].forEach((g, i) => c.fillText(g, (i % 8) * 128 + 64, Math.floor(i / 8) * 128 + 68));
  atlasTex = new THREE.CanvasTexture(a); atlasTex.minFilter = THREE.LinearMipmapLinearFilter; atlasTex.generateMipmaps = true;
  return cv;
}

const VS = `
attribute vec3 aStart; attribute vec3 aEnd; attribute vec4 aMisc;
uniform float uProg, uTime, uStagger, uSwirl, uSize, uPix, uDrift, uExplode;
varying vec4 vMisc; varying float vFade;
void main(){
  float s = aMisc.y;
  float k = clamp((uProg - s*uStagger)/(1.0-uStagger), 0., 1.);
  float e = k<.5 ? 4.*k*k*k : 1.-pow(-2.*k+2.,3.)/2.;
  vec3 p = mix(aStart, aEnd, e);
  float w = sin(e*3.14159);
  p += uSwirl*w*vec3(sin(s*91.+uTime*1.3), cos(s*53.+uTime*1.1), sin(s*27.+uTime*.9));
  p += uDrift*vec3(sin(uTime*1.9+s*40.), cos(uTime*1.6+s*31.), sin(uTime*1.3+s*17.));
  p += uExplode*normalize(p+vec3(.001))*(0.6+s);
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = clamp(uSize*aMisc.z*uPix/(-mv.z), 0., 220.);
  vMisc = aMisc; vFade = smoothstep(0.1, 1.2, -mv.z);
}`;
const FS = `
uniform sampler2D uAtlas; uniform vec3 uC0, uC1, uC2; uniform float uAlpha, uHalo;
varying vec4 vMisc; varying float vFade;
void main(){
  vec2 pc = gl_PointCoord;
  vec3 col = vMisc.w < .5 ? uC0 : (vMisc.w < 1.5 ? uC1 : uC2);
  float a;
  if (uHalo > .5) { float d = length(pc-.5)*2.; a = exp(-d*d*4.)*.22; }
  else { float g = vMisc.x; vec2 cell = vec2(mod(g,8.), floor(g/8.)); vec2 uv = vec2((cell.x+pc.x)/8., 1.-(cell.y+pc.y)/8.); a = texture2D(uAtlas, uv).r; }
  a *= uAlpha*vFade;
  gl_FragColor = vec4(col*a, a);
}`;

// 建一组粒子：start/end 为 Float32Array(N*3)，cls 为 Uint8Array(N)（0 橙 1 亮 2 绿）
export function makeSet(key, start, end, cls, seed = 1, sizeVar = .6, order = null) {
  if (sets[key]) return sets[key];
  const N = start.length / 3, r = mulberry(seed);
  const misc = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { misc[i * 4] = Math.floor(r() * 12); misc[i * 4 + 1] = order ? order[i] : r(); misc[i * 4 + 2] = 1 - sizeVar / 2 + r() * sizeVar; misc[i * 4 + 3] = cls ? cls[i] : (r() < .12 ? 1 : 0); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(end.slice(), 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 3));
  geo.setAttribute('aMisc', new THREE.BufferAttribute(misc, 4));
  const mk = halo => new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uProg: { value: 0 }, uTime: { value: 0 }, uStagger: { value: .4 }, uSwirl: { value: 1 }, uSize: { value: 1 }, uPix: { value: 1 }, uDrift: { value: 0 }, uExplode: { value: 0 },
      uAtlas: { value: atlasTex }, uAlpha: { value: 1 }, uHalo: { value: halo ? 1 : 0 },
      uC0: { value: new THREE.Color(PAL.accent) }, uC1: { value: new THREE.Color(PAL.accentHi) }, uC2: { value: new THREE.Color(PAL.brand) } }
  });
  const halo = new THREE.Points(geo, mk(true)), core = new THREE.Points(geo, mk(false));
  halo.frustumCulled = core.frustumCulled = false;
  return sets[key] = { halo, core, N };
}

// 渲染若干组。items: [{set, prog, stagger, swirl, size, drift, explode, alpha, haloSize}]，camera: {pos:[x,y,z], look:[x,y,z], fov, roll}
export function renderSets(items, camera, time) {
  scene.clear();
  cam.fov = camera.fov || 50; cam.position.set(...camera.pos); cam.up.set(Math.sin(camera.roll || 0), Math.cos(camera.roll || 0), 0); cam.lookAt(...camera.look); cam.updateProjectionMatrix();
  const pix = cv.height / 1080 * 900;
  for (const it of items) {
    for (const [m, sz] of [[it.set.halo, (it.size || 1) * (it.haloSize || 3.2)], [it.set.core, it.size || 1]]) {
      const u = m.material.uniforms;
      u.uProg.value = it.prog; u.uTime.value = time; u.uStagger.value = it.stagger ?? .4; u.uSwirl.value = it.swirl ?? 1;
      u.uSize.value = sz * .15; u.uPix.value = pix; u.uDrift.value = it.drift || 0; u.uExplode.value = it.explode || 0; u.uAlpha.value = it.alpha ?? 1;
      scene.add(m);
    }
  }
  R.render(scene, cam);
  return cv;
}

// ---------- 形状采样 ----------
// 在 2D 画布上画形状，按亮度概率采样 N 个点 → 世界坐标（宽 worldW，中心在原点，y 向上）
export function sampleDraw(drawFn, N, w, h, worldW, depth = .4, seed = 3, cx = 0, cy = 0) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h); drawFn(g, w, h);
  const d = g.getImageData(0, 0, w, h).data, r = mulberry(seed);
  const pos = new Float32Array(N * 3), cls = new Uint8Array(N), s = worldW / w;
  let n = 0, guard = 0;
  while (n < N && guard++ < N * 400) {
    const x = r() * w, y = r() * h, p = ((y | 0) * w + (x | 0)) * 4, L = d[p] / 255;
    if (r() > L) continue;
    pos[n * 3] = (x - w / 2) * s + cx; pos[n * 3 + 1] = -(y - h / 2) * s + cy; pos[n * 3 + 2] = (r() - .5) * depth;
    cls[n] = d[p + 1] > 200 && d[p] < 200 ? 2 : (L > .92 && r() < .3 ? 1 : 0);
    n++;
  }
  return { pos, cls };
}
export function scatter(N, rx, ry, rz, seed = 5, cx = 0, cy = 0, cz = 0) {
  const r = mulberry(seed), p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const a = r() * 6.283, b = Math.acos(2 * r() - 1), m = Math.cbrt(r());
    p[i * 3] = cx + Math.sin(b) * Math.cos(a) * rx * m; p[i * 3 + 1] = cy + Math.sin(b) * Math.sin(a) * ry * m; p[i * 3 + 2] = cz + Math.cos(b) * rz * m; }
  return p;
}
// 管道（飞行穿越用）：沿 -z 方向分布在半径 r 的圆筒壁附近
export function tube(N, r, len, seed = 9) {
  const R2 = mulberry(seed), p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const a = R2() * 6.283, rr = r * (.35 + .65 * Math.sqrt(R2())); p[i * 3] = Math.cos(a) * rr; p[i * 3 + 1] = Math.sin(a) * rr; p[i * 3 + 2] = -R2() * len; }
  return p;
}
