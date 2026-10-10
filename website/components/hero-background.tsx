"use client";

import { useEffect, useRef } from "react";

const vertexShader = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Independent Bayer-threshold field rendered edge-to-edge over a white canvas.
const fragmentShader = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;

float bayer2(vec2 p) {
  float x = mod(p.x + p.y, 2.0);
  return x * 2.0 + mod(p.y, 2.0);
}

float bayer4(vec2 p) {
  vec2 low = mod(p, 2.0);
  vec2 high = floor(mod(p, 4.0) * 0.5);
  return 4.0 * bayer2(low) + bayer2(high);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float sideField = smoothstep(0.035, 0.26, abs(uv.x - 0.5) * 2.0);
  float verticalFade = smoothstep(0.015, 0.11, uv.y) * (1.0 - smoothstep(0.86, 0.99, uv.y));
  float wave = 0.5
    + 0.28 * sin(uv.x * 13.0 + sin(uv.y * 5.8 - uTime * 0.78) * 2.45 + cos(uv.y * 3.8 + uTime * 0.42))
    + 0.22 * cos(uv.x * 7.2 - uv.y * 7.8 + uTime * 0.56);
  float cloud = smoothstep(0.28, 0.72, wave);
  float strength = sideField * verticalFade * cloud;
  float threshold = (bayer4(floor(gl_FragCoord.xy / 7.0)) + 0.5) / 16.0;
  float squares = step(threshold, strength);
  vec3 cool = vec3(0.82, 0.84, 1.0);
  vec3 warm = vec3(1.0, 0.82, 0.72);
  vec3 tint = mix(cool, warm, smoothstep(0.0, 1.0, uv.x));
  gl_FragColor = vec4(tint, squares * 0.36);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const position = gl.createBuffer();
    if (!position) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastFrame = 0;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      draw(0);
    };

    const draw = (time: number) => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeLocation, reducedMotion.matches ? 0 : time * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const animate = (time: number) => {
      if (time - lastFrame >= 33) {
        draw(time);
        lastFrame = time;
      }
      if (!reducedMotion.matches) frame = window.requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    if (!reducedMotion.matches) frame = window.requestAnimationFrame(animate);

    const onMotionChange = () => {
      window.cancelAnimationFrame(frame);
      if (reducedMotion.matches) draw(0);
      else frame = window.requestAnimationFrame(animate);
    };
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
      window.cancelAnimationFrame(frame);
      gl.deleteBuffer(position);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas className="hero-dither" ref={canvasRef} aria-hidden="true" />;
}
