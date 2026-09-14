'use client';

import { useEffect, useRef } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';

/**
 * Flowing silk, ported from React Bits Silk (MIT). The original renders
 * through three.js + react-three-fiber; this port keeps the same fragment
 * shader but draws it on a single ogl triangle, so no three.js dependency
 * is needed. Light mode folds the cloth around a light base colour with
 * white speculars — the look used on the paper hero.
 */
export type SilkProps = {
  /** wave speed; React Bits default 5 */
  speed?: number;
  scale?: number;
  color?: string;
  noiseIntensity?: number;
  /** radians */
  rotation?: number;
  lightMode?: boolean;
  className?: string;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [0.5, 0.5, 0.5];
  return [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255];
};

const VERTEX = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uTime, uSpeed, uScale, uRotation, uNoiseIntensity, uLightMode;
uniform vec3 uColor;
out vec4 fragColor;
const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  vec2 r = (e * sin(e * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}
vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle); float s = sin(angle);
  return mat2(c, -s, s, c) * uv;
}
void main() {
  float rnd = noise(gl_FragCoord.xy);
  vec2 uv = rotateUvs(vUv * uScale, uRotation);
  vec2 tex = uv * uScale;
  float tOffset = uSpeed * uTime;
  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);
  float pattern = 0.6 + 0.4 * sin(5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * tOffset) + sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));
  float grain = rnd / 15.0 * uNoiseIntensity;
  vec3 result = uColor * pattern - vec3(grain);
  if (uLightMode > 0.5) {
    float fold = smoothstep(0.28, 0.9, pattern);
    float specular = smoothstep(0.72, 0.98, pattern);
    vec3 shadowColor = uColor * 0.72;
    vec3 bodyColor = min(uColor * 1.18, vec3(1.0));
    vec3 lightBase = mix(shadowColor, bodyColor, fold);
    lightBase = mix(lightBase, vec3(1.0), specular * 0.92);
    float fineNoise = noise(gl_FragCoord.xy * 0.63 + vec2(17.0, 41.0));
    float grainSignal = (rnd + fineNoise - 1.0);
    float grainStrength = clamp(uNoiseIntensity * 0.038, 0.0, 0.16);
    result = lightBase + grainSignal * grainStrength;
  }
  fragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}
`;

export function Silk({ speed = 5, scale = 1, color = '#D8D5CF', noiseIntensity = 1.5, rotation = 0, lightMode = true, className = '' }: SilkProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const uniformsRef = useRef<Record<string, { value: number | Float32Array }> | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ webgl: 2, alpha: false, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    } catch {
      return; // no WebGL2 — the plain paper background remains
    }
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(canvas);

    const uniforms = {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uScale: { value: scale },
      uRotation: { value: rotation },
      uNoiseIntensity: { value: noiseIntensity },
      uLightMode: { value: lightMode ? 1 : 0 },
      uColor: { value: new Float32Array(hexToRgb(color)) },
    };
    uniformsRef.current = uniforms;
    const program = new Program(gl, { vertex: VERTEX, fragment: FRAGMENT, uniforms });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const setSize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
      renderer.render({ scene: mesh });
    };
    const ro = new ResizeObserver(setSize);
    ro.observe(host);
    setSize();

    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    let last = performance.now();
    const loop = (t: number) => {
      const delta = (t - last) / 1000;
      last = t;
      uniforms.uTime.value += 0.1 * delta; // matches the r3f useFrame step
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (visible && pageVisible && raf === 0) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop(); }, { threshold: 0 });
    io.observe(host);
    const onVis = () => { pageVisible = !document.hidden; if (pageVisible) start(); else stop(); };
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      uniformsRef.current = null;
      try { host.removeChild(canvas); } catch { /* already gone */ }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // Built once; prop updates flow through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const u = uniformsRef.current;
    if (!u) return;
    (u.uSpeed as { value: number }).value = speed;
    (u.uScale as { value: number }).value = scale;
    (u.uRotation as { value: number }).value = rotation;
    (u.uNoiseIntensity as { value: number }).value = noiseIntensity;
    (u.uLightMode as { value: number }).value = lightMode ? 1 : 0;
    (u.uColor.value as Float32Array).set(hexToRgb(color));
  }, [speed, scale, rotation, noiseIntensity, lightMode, color]);

  return <div ref={hostRef} aria-hidden className={`relative h-full w-full overflow-hidden ${className}`.trim()} />;
}
