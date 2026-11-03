/* <vela-espiral> — vela espiral 3D con llama interactiva (WebGL, sin dependencias) */
(function () {
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uRef; // alto de la caja del elemento en px: el canvas es más grande para que la vela nunca se corte
uniform float uTime;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform float uFlame;
uniform float uFlick;
uniform float uSmoke;
uniform float uSmokeAge;
uniform float uEmber;
uniform float uLit;

float ss(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }

float hash(vec3 p){
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x){
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i + vec3(0.0,0.0,0.0)), hash(i + vec3(1.0,0.0,0.0)), f.x),
                 mix(hash(i + vec3(0.0,1.0,0.0)), hash(i + vec3(1.0,1.0,0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0,0.0,1.0)), hash(i + vec3(1.0,0.0,1.0)), f.x),
                 mix(hash(i + vec3(0.0,1.0,1.0)), hash(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
}
float fbm(vec3 p){
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 4; i++){
    s += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdFrustum(vec3 p, float r0, float r1, float y0, float y1){
  float t = clamp((p.y - y0) / (y1 - y0), 0.0, 1.0);
  float r = mix(r0, r1, t);
  float hc = 0.5 * (y1 - y0);
  vec2 d = vec2(length(p.xz) - r, abs(p.y - y0 - hc) - hc);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdBody(vec3 p){
  float a = atan(p.z, p.x);
  float g = 0.5 + 0.5 * cos(2.0 * a + p.y * 10.0);
  g = g * g * (3.0 - 2.0 * g);
  float groove = 1.0 - ss(1.28, 1.42, p.y);
  float r = 0.086 + 0.018 * g * groove + 0.009 * (1.0 - groove);
  r *= mix(1.0, 0.38, ss(1.48, 1.66, p.y));
  float hc = 1.14;
  vec2 d = vec2(length(p.xz) - r, abs(p.y - 0.52) - hc);
  return (min(max(d.x, d.y), 0.0) + length(max(d, 0.0))) * 0.5;
}

float sdWick(vec3 p){
  float h = clamp((p.y - 1.60) / 0.16, 0.0, 1.0);
  vec3 q = p;
  q.x -= 0.018 * h * h;
  vec3 a = vec3(0.0, 1.60, 0.0);
  vec3 ba = vec3(0.0, 0.16, 0.0);
  vec3 pa = q - a;
  float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t) - 0.0085 * (1.0 - 0.3 * h);
}

float sdHolder(vec3 p){
  float sleeve = sdFrustum(p, 0.116, 0.122, -1.12, -0.52) - 0.003;
  float shoulder = sdFrustum(p, 0.066, 0.116, -1.22, -1.12);
  float spike = sdFrustum(p, 0.040, 0.064, -2.10, -1.22) - 0.004;
  float d = smin(sleeve, shoulder, 0.012);
  d = smin(d, spike, 0.01);
  return d * 0.9;
}

vec2 map(vec3 p){
  vec2 bd = vec2(length(p.xz) - 0.14, abs(p.y + 0.17) - 1.96);
  float bound = min(max(bd.x, bd.y), 0.0) + length(max(bd, 0.0));
  if (bound > 0.05) return vec2(bound, 0.0);
  vec2 r = vec2(sdBody(p), 1.0);
  float h = sdHolder(p);
  if (h < r.x) r = vec2(h, 2.0);
  float w = sdWick(p);
  if (w < r.x) r = vec2(w, 3.0);
  return r;
}

vec3 calcNormal(vec3 p){
  const float e = 0.0007;
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * map(p + k.xyy * e).x + k.yyx * map(p + k.yyx * e).x +
                   k.yxy * map(p + k.yxy * e).x + k.xxx * map(p + k.xxx * e).x);
}

float calcAO(vec3 p, vec3 n){
  float o = 0.0;
  float s = 1.0;
  for (int i = 1; i <= 5; i++){
    float h = 0.012 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= 0.7;
  }
  return clamp(1.0 - o * 6.0, 0.0, 1.0);
}

vec3 envMap(vec3 d, float rough){
  vec3 c = mix(vec3(0.010, 0.009, 0.008), vec3(0.045, 0.042, 0.040), ss(-0.4, 0.9, d.y));
  float k = 1.0 / (1.0 + rough * 3.0);
  c += vec3(1.5, 1.47, 1.42) * ss(0.55 - rough * 0.5, 0.85, d.y) * k * 1.2;
  float vb = ss(-0.7, -0.1, d.y) * (1.0 - ss(0.3, 0.95, d.y));
  float s1 = 1.0 - ss(0.0, 0.16 + rough * 0.6, abs(d.x - 0.75));
  c += vec3(1.25, 1.27, 1.35) * s1 * vb * k * 1.3;
  float s2 = 1.0 - ss(0.0, 0.12 + rough * 0.6, abs(d.x + 0.72));
  c += vec3(1.0, 0.96, 0.92) * s2 * vb * k * 0.9;
  c += vec3(0.09, 0.07, 0.05) * ss(0.0, -0.8, d.y);
  return c;
}

vec3 shade(vec3 p, vec3 rd, float mat){
  vec3 n = calcNormal(p);
  vec3 v = -rd;
  float occ = calcAO(p, n);
  float envK = 1.0 - 0.5 * uLit;
  vec3 fp = vec3(0.016, 1.69 + 0.13 * uFlame, 0.0);
  vec3 L = fp - p;
  float dl = length(L);
  L /= dl;
  float fI = uFlame * uFlick;
  vec3 fCol = vec3(1.0, 0.56, 0.22) * fI * 0.9 / (0.02 + dl * dl * 1.6);
  vec3 ep = vec3(0.018, 1.76, 0.0);
  float de = length(ep - p);
  fCol += vec3(1.0, 0.3, 0.06) * uEmber * 0.004 / (0.002 + de * de * 4.0);
  vec3 col;
  if (mat < 1.5){
    vec3 gn = vec3(noise(p * 220.0), noise(p * 220.0 + 11.0), noise(p * 220.0 + 23.0)) - 0.5;
    vec3 nn = normalize(n + gn * 0.16);
    float rough = 0.30;
    vec3 F0 = vec3(0.80, 0.81, 0.83);
    float NoV = max(dot(nn, v), 0.001);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - NoV, 5.0);
    vec3 R = reflect(rd, nn);
    vec3 spec = envMap(R, rough) * F * envK;
    vec3 diff = envMap(nn, 1.0) * 0.10 * envK * vec3(0.85);
    float NoL = max(dot(nn, L), 0.0);
    vec3 H = normalize(L + v);
    float NoH = max(dot(nn, H), 0.0);
    float a2 = rough * rough * rough * rough;
    float dd = NoH * NoH * (a2 - 1.0) + 1.0;
    float D = a2 / (3.14159 * dd * dd);
    vec3 Fl = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, v), 0.0), 5.0);
    spec += fCol * (D * Fl * 0.25 * NoL + 0.12 * NoL * vec3(0.85));
    col = (spec + diff) * occ;
  } else if (mat < 2.5){
    vec3 alb = vec3(0.86, 0.86, 0.84);
    float NoV = max(dot(n, v), 0.001);
    float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
    vec3 R = reflect(rd, n);
    vec3 irr = envMap(n, 1.0) * 0.55 * envK;
    float NoL = max((dot(n, L) + 0.35) / 1.35, 0.0);
    vec3 diff = alb * (irr + fCol * NoL * 0.9);
    float tr = pow(max(dot(v, -L), 0.0), 2.0) * 0.4 + 0.15;
    diff += alb * fCol * tr * 0.4 * vec3(1.0, 0.9, 0.8);
    float sss = 0.06 * pow(1.0 - NoV, 2.0);
    diff += vec3(0.9, 0.88, 0.84) * sss * envK;
    vec3 spec = envMap(R, 0.25) * F * envK * 0.9;
    col = (diff + spec) * occ;
  } else {
    col = vec3(0.025, 0.02, 0.018) * (envMap(n, 1.0) * envK + fCol * 0.5);
    float tip = ss(1.69, 1.76, p.y);
    col += vec3(1.0, 0.32, 0.06) * tip * (uEmber * 3.0 + uFlame * 1.2);
  }
  return col;
}

vec2 boxHit(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax){
  vec3 inv = 1.0 / (rd + vec3(1e-6));
  vec3 t0 = (bmin - ro) * inv;
  vec3 t1 = (bmax - ro) * inv;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z));
}

vec3 flameEmit(vec3 p, float t){
  float Fv = uFlame;
  float H = 0.40 * Fv + 0.001;
  vec3 q = p - vec3(0.016, 1.685, 0.0);
  float n = q.y / H;
  if (n < -0.4 || n > 1.6) return vec3(0.0);
  float sw = max(n, 0.0);
  sw *= sw;
  q.x -= sw * (0.014 * sin(t * 2.1) + 0.007 * sin(t * 5.3 + 1.3) + 0.004 * sin(t * 11.0)) * uFlick;
  q.z -= sw * (0.011 * sin(t * 1.7 + 2.0) + 0.006 * sin(t * 6.1));
  vec3 tq = vec3(q.x * 22.0, q.y * 8.0 - t * 5.0, q.z * 22.0);
  float tb = fbm(tq);
  q.xz += (tb - 0.5) * 0.03 * sw;
  float W = 0.05 * (0.55 + 0.45 * Fv);
  float y0 = H * 0.24;
  float sy = q.y < y0 ? (q.y - y0) / (H * 0.30) : (q.y - y0) / (H * 0.76);
  float sp = max(sy, 0.0);
  float taper = 1.0 + 1.6 * sp * sp;
  float rr = length(q.xz) / W * taper;
  float d = length(vec2(rr, sy));
  d += (tb - 0.5) * 0.45 * ss(0.1, 1.0, sy);
  if (d > 1.15) return vec3(0.0);
  float inner = 1.0 - ss(0.0, 0.75, length(vec2(length(q.xz) / (W * 0.5), (q.y - H * 0.08) / (H * 0.2))));
  float body = 1.0 - ss(0.55, 1.0, d);
  vec3 white = vec3(1.0, 0.95, 0.84);
  vec3 yellow = vec3(1.0, 0.74, 0.36);
  vec3 orange = vec3(1.0, 0.38, 0.08);
  vec3 c = mix(orange, yellow, 1.0 - ss(0.75, 1.0, d));
  c = mix(c, white, (1.0 - ss(0.25, 0.65, d)) * (1.0 - ss(0.2, 1.0, sy)));
  c = mix(c, vec3(0.95, 0.22, 0.04), ss(0.3, 1.0, sy) * 0.55);
  float base = ss(-0.95, -0.35, sy);
  float lum = body * base * (1.0 - 0.8 * inner);
  vec3 e = c * lum * 30.0;
  float blue = (1.0 - ss(0.65, 1.1, d)) * (1.0 - base) * ss(-1.3, -0.9, sy);
  e += vec3(0.12, 0.28, 1.0) * blue * 7.0;
  e += vec3(1.0, 0.35, 0.08) * (1.0 - ss(0.9, 1.15, d)) * 0.8 * base;
  return e * uFlick * ss(0.0, 0.15, Fv);
}

float smokeDens(vec3 p, float t){
  vec3 q = p - vec3(0.018, 1.75, 0.0);
  float h = q.y;
  if (h < 0.0) return 0.0;
  float age = uSmokeAge;
  float front = age * 0.85;
  float tail = max(0.0, (age - 0.9) * 0.75);
  vec2 off = vec2(sin(h * 3.6 - t * 1.3) * 0.05 + sin(h * 8.0 - t * 2.4) * 0.018,
                  cos(h * 2.9 - t * 1.1 + 1.0) * 0.04) * h;
  float r = length(q.xz - off);
  float w = 0.008 + 0.06 * h;
  float nz = fbm(vec3(q.x * 9.0, h * 4.0 - t * 1.4, q.z * 9.0));
  float dd = 1.0 - ss(0.0, w, r + (nz - 0.5) * w * 1.6);
  dd *= (1.0 - ss(front - 0.35, front, h)) * ss(tail, tail + 0.35, h);
  dd *= exp(-h * 0.8) * (0.5 + nz);
  return dd * uSmoke;
}

vec3 aces(vec3 x){
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRef * 2.0;
  vec3 ro = uCamPos;
  vec3 rd = normalize(uCamRot * vec3(uv, -2.0));
  float jit = hash(vec3(gl_FragCoord.xy, fract(uTime) * 97.0));

  // Fondo transparente (para que se vea el fondo de la página): solo se pinta la vela y su luz.
  vec3 col = vec3(0.0);

  float t = 0.0;
  float mat = -1.0;
  for (int i = 0; i < 160; i++){
    vec2 h = map(ro + rd * t);
    if (h.x < 0.0003 * t + 0.0002){ mat = h.y; break; }
    t += h.x;
    if (t > 30.0) break;
  }
  float tHit = 1000.0;
  if (mat > 0.5){
    col = shade(ro + rd * t, rd, mat);
    tHit = t;
  }

  if (uSmoke > 0.002){
    vec2 bh = boxHit(ro, rd, vec3(-0.5, 1.66, -0.5), vec3(0.5, 3.9, 0.5));
    float t0 = max(bh.x, 0.0);
    float t1 = min(bh.y, tHit);
    if (t1 > t0){
      float dt = (t1 - t0) / 40.0;
      float tt = t0 + dt * jit;
      vec3 sc = vec3(0.0);
      float T = 1.0;
      for (int i = 0; i < 40; i++){
        vec3 p = ro + rd * tt;
        float d = smokeDens(p, uTime);
        if (d > 0.001){
          float a = 1.0 - exp(-d * dt * 28.0);
          float hh = p.y - 1.74;
          vec3 lc = vec3(0.42, 0.42, 0.45) * (1.0 - 0.5 * uLit) + vec3(1.0, 0.35, 0.08) * uEmber * exp(-hh * 6.0) * 1.5;
          sc += T * a * lc;
          T *= 1.0 - a;
        }
        tt += dt;
      }
      col = col * T + sc;
    }
  }

  if (uFlame > 0.002){
    vec2 bh = boxHit(ro, rd, vec3(-0.14, 1.58, -0.14), vec3(0.16, 2.30, 0.14));
    float t0 = max(bh.x, 0.0);
    float t1 = min(bh.y, tHit);
    if (t1 > t0){
      float dt = (t1 - t0) / 48.0;
      float tt = t0 + dt * jit;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < 48; i++){
        acc += flameEmit(ro + rd * tt, uTime) * dt;
        tt += dt;
      }
      col += acc;
    }
  }

  float fI = uFlame * uFlick;
  vec3 fc = vec3(0.016, 1.69 + 0.14 * uFlame, 0.0);
  float tc = max(dot(fc - ro, rd), 0.0);
  float dist = length(ro + rd * tc - fc);
  col += vec3(1.0, 0.5, 0.18) * fI * (0.05 * exp(-dist * 5.0) + 0.16 * exp(-dist * 22.0));
  // El halo ancho se apaga hacia los bordes del recuadro para que no se note el corte.
  vec2 e = gl_FragCoord.xy / uRes;
  float borde = ss(0.0, 0.3, e.x) * ss(1.0, 0.7, e.x) * ss(0.0, 0.3, e.y) * ss(1.0, 0.7, e.y);
  col += vec3(1.0, 0.5, 0.2) * fI * 0.03 * exp(-dist * 1.2) * borde;
  vec3 ec = vec3(0.018, 1.76, 0.0);
  float te = max(dot(ec - ro, rd), 0.0);
  float de = length(ro + rd * te - ec);
  col += vec3(1.0, 0.3, 0.05) * uEmber * 0.05 * exp(-de * 40.0);
  // Toda la luz fuera de la vela (halo, humo) se difumina cerca de los bordes para que nunca se vea el corte del canvas.
  if (tHit > 999.0) col *= ss(0.0, 0.18, e.x) * ss(1.0, 0.82, e.x) * ss(0.0, 0.18, e.y) * ss(1.0, 0.82, e.y);

  col = aces(col * 1.1);
  col = pow(col, vec3(1.0 / 2.2));
  // Donde no hay vela, la opacidad sale del brillo (halo de la llama, humo), con color premultiplicado.
  float alpha = tHit < 999.0 ? 1.0 : clamp(max(max(col.r, col.g), col.b) * 1.5, 0.0, 1.0);
  if (tHit < 999.0) col += (jit - 0.5) * (2.0 / 255.0);
  gl_FragColor = vec4(col, alpha);
}
`;

  const CSS = `
    :host { display: block; position: relative; width: 100%; aspect-ratio: 9 / 11; background: transparent; touch-action: none; cursor: grab; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #ece7de; }
    /* El canvas desborda la caja (transparente) para que al girar la vela no quede cortada; los toques los recibe el host */
    canvas { position: absolute; top: -12%; left: -50%; width: 200%; height: 124%; display: block; pointer-events: none; }
    .bar { position: absolute; left: 20px; right: 20px; bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; pointer-events: none; }
    .hint { margin: 0; font-size: 13px; line-height: 1.5; color: #a8a196; max-width: 420px; }
    button { pointer-events: auto; height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid rgba(255,240,220,0.22); background: rgba(255,244,230,0.08); color: #f3ede4; font: 600 14px/1 inherit; font-family: inherit; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    button.on { background: #f0a24a; border-color: #f0a24a; color: #1a1108; }
    .err { position: absolute; left: 20px; right: 20px; top: 20px; padding: 12px 14px; border-radius: 10px; background: #2a1712; border: 1px solid #6b3324; color: #f6d9cf; font-size: 12px; white-space: pre-wrap; }
  `;

  const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1.5 3.2 5 5.4 5 10a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.4-5 .3 1.6 1 2.6 2 3 0-3.2-.2-5.6.6-8z"></path></svg>';

  class VelaEspiral extends HTMLElement {
    static get observedAttributes() { return ['lit']; }

    connectedCallback() {
      if (this._root) { this._start(); return; }
      const root = this._root = this.attachShadow({ mode: 'open' });
      const showUi = this.getAttribute('controls') !== 'false';
      const labelOn = this.getAttribute('label-on') || 'Apagar vela';
      const labelOff = this.getAttribute('label-off') || 'Encender vela';
      const hint = this.getAttribute('hint') || 'Arrastra para girar · Rueda para acercar · Clic para encender o apagar';
      root.innerHTML = '<style>' + CSS + '</style>' +
        '<canvas role="img" aria-label="Vela espiral en 3D. Arrastra para girar y haz clic para encender o apagar."></canvas>' +
        (showUi ? '<div class="bar"><p class="hint"></p><button type="button">' + ICON + '<span></span></button></div>' : '');
      this._canvas = root.querySelector('canvas');
      this._btn = root.querySelector('button');
      if (showUi) {
        root.querySelector('.hint').textContent = hint;
        this._labels = [labelOff, labelOn];
        this._btn.addEventListener('click', () => this.toggle());
      }
      this.lit = false;
      this._init();
      if (this.hasAttribute('lit')) this.toggle();
      this._start();
    }

    disconnectedCallback() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this._io) this._io.disconnect();
    }

    get isLit() { return this.lit; }

    // Posición de la llama en pantalla (coordenadas del viewport) y cuánta luz da, para iluminar la página.
    flamePoint() {
      if (!this.R) return null;
      const r = this.getBoundingClientRect();
      const R = this.R, d = this.dist, t = this.target;
      const v = [0.016 - (t[0] + R[2][0] * d), 1.8 - (t[1] + R[2][1] * d), -(t[2] + R[2][2] * d)];
      const dot = (a) => a[0] * v[0] + a[1] * v[1] + a[2] * v[2];
      const lz = dot(R[2]);
      if (lz >= 0) return null;
      return {
        x: r.left + r.width / 2 - dot(R[0]) / lz * r.height,
        y: r.top + r.height / 2 + dot(R[1]) / lz * r.height,
        luz: this.luz || 0
      };
    }

    toggle(force) {
      const next = typeof force === 'boolean' ? force : !this.lit;
      if (next === this.lit) return;
      const now = performance.now() / 1000;
      this.lit = next;
      if (this.lit) this.onT = now; else this.offT = now;
      if (this._btn) {
        this._btn.classList.toggle('on', this.lit);
        this._btn.querySelector('span').textContent = this._labels[this.lit ? 1 : 0];
      }
      this.dispatchEvent(new CustomEvent('change', { detail: { lit: this.lit } }));
    }

    _err(msg) {
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this._root.appendChild(d);
    }

    rot(v, k, a) {
      const c = Math.cos(a), s = Math.sin(a);
      const d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
      return [
        v[0] * c + (k[1] * v[2] - k[2] * v[1]) * s + k[0] * d * (1 - c),
        v[1] * c + (k[2] * v[0] - k[0] * v[2]) * s + k[1] * d * (1 - c),
        v[2] * c + (k[0] * v[1] - k[1] * v[0]) * s + k[2] * d * (1 - c)
      ];
    }

    rotateCam(axis, a) {
      const ax = axis.slice();
      this.R = this.R.map((v) => this.rot(v, ax, a));
      const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
      const cross = (a1, b1) => [a1[1] * b1[2] - a1[2] * b1[1], a1[2] * b1[0] - a1[0] * b1[2], a1[0] * b1[1] - a1[1] * b1[0]];
      const b = norm(this.R[2]);
      const r = norm(cross(this.R[1], b));
      this.R = [r, cross(b, r), b];
    }

    // Giro libre en cualquier dirección. La cámara orbita el centro de la vela (target-y) y el canvas
    // desborda la caja lo suficiente para que la vela entre entera en cualquier orientación.
    applyDrag(dx, dy) {
      this.rotateCam(this.R[1], -dx * 0.008);
      this.rotateCam(this.R[0], -dy * 0.008);
    }

    _init() {
      const c = this._canvas;
      const gl = c.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
      if (!gl) { this._err('WebGL no está disponible en este navegador.'); return; }
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'Error de shader');
        return s;
      };
      let prog;
      try {
        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}'));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'Error de enlace');
      } catch (e) {
        this._err('No se pudo compilar el render 3D:\n' + String(e.message || e).slice(0, 400));
        return;
      }
      this.gl = gl;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = this.U = {};
      ['uRes', 'uRef', 'uTime', 'uCamPos', 'uCamRot', 'uFlame', 'uFlick', 'uSmoke', 'uSmokeAge', 'uEmber', 'uLit'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

      this.R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      this.rotateCam(this.R[0], -0.14);
      this.dist = parseFloat(this.getAttribute('zoom')) || 6.4;
      const ty = parseFloat(this.getAttribute('target-y'));
      this.target = [0, Number.isFinite(ty) ? ty : -0.12, 0]; // altura a la que apunta la cámara
      this.onT = -100; this.offT = -100;
      this.flame = 0; this.litMix = 0; this.gust = 0;
      this.vx = 0; this.vy = 0; this.scale = 1; this.slow = 0;
      this.touched = this.getAttribute('autorotate') === 'false';
      this.visible = true;
      this.t0 = performance.now() / 1000;

      this.addEventListener('pointerdown', (e) => {
        if (e.composedPath()[0].closest?.('button')) return; // el botón de la barra se maneja solo
        try { this.setPointerCapture(e.pointerId); } catch (_) {}
        this.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
        this.touched = true; this.vx = 0; this.vy = 0;
        this.style.cursor = 'grabbing';
      });
      this.addEventListener('pointermove', (e) => {
        const d = this.drag;
        if (!d) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        d.x = e.clientX; d.y = e.clientY;
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) d.moved = true;
        if (d.moved) { this.applyDrag(dx, dy); this.vx = dx; this.vy = dy; }
      });
      const up = () => {
        const d = this.drag;
        if (!d) return;
        this.drag = null;
        this.style.cursor = 'grab';
        if (!d.moved && performance.now() - d.t < 500) { this.vx = 0; this.vy = 0; this.toggle(); }
      };
      this.addEventListener('pointerup', up);
      this.addEventListener('pointercancel', up);
      if (this.getAttribute('wheel-zoom') !== 'false') {
        this.addEventListener('wheel', (e) => {
          e.preventDefault();
          this.dist = Math.min(11, Math.max(2.6, this.dist * Math.exp(e.deltaY * 0.0012)));
        }, { passive: false });
      }
    }

    _start() {
      if (!this.gl || this.raf) return;
      if ('IntersectionObserver' in window && !this._io) {
        this._io = new IntersectionObserver((entries) => {
          this.visible = entries[0].isIntersecting;
          if (this.visible && !this.raf) this._loop();
        });
      }
      if (this._io) this._io.observe(this);
      this.last = performance.now() / 1000;
      this._loop();
    }

    _loop() {
      if (!this.visible || !this.isConnected) { this.raf = 0; return; }
      this.raf = requestAnimationFrame(() => this._loop());
      const gl = this.gl, c = this._canvas, U = this.U;
      const now = performance.now() / 1000;
      const dt = Math.min(0.1, now - this.last);
      this.last = now;
      const t = now - this.t0;

      if (!this.drag) {
        if (Math.abs(this.vx) + Math.abs(this.vy) > 0.02) {
          this.applyDrag(this.vx, this.vy);
          this.vx *= 0.92; this.vy *= 0.92;
        } else if (!this.touched) {
          this.rotateCam([0, 1, 0], dt * 0.22);
        }
      }

      if (this.lit) {
        const a = now - this.onT;
        const g = Math.min(a / 0.55, 1);
        let f = g * g * (3 - 2 * g);
        if (a < 1.5) f *= 1 + 0.3 * Math.exp(-a * 3.5) * Math.sin(a * 13);
        this.flame = f;
      } else {
        this.flame *= Math.exp(-dt * 14);
      }
      this.litMix += ((this.lit ? 1 : 0) - this.litMix) * Math.min(1, dt * 2.5);

      const f1 = Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1.2);
      const f2 = Math.sin(t * 17.0 + 0.5);
      this.gust = (this.gust + (Math.random() - 0.5) * 0.06) * 0.95;
      const flick = 0.93 + 0.05 * f1 + 0.02 * f2 + this.gust * 0.6;
      const flameSize = this.flame * (0.97 + 0.04 * f1 + 0.02 * Math.sin(t * 9.7));
      this.luz = flameSize * flick;

      const age = now - this.offT;
      let smoke = this.offT > 0 && age < 10 ? Math.exp(-age * 0.45) : 0;
      if (this.lit) smoke *= Math.exp(-(now - this.onT) * 3);
      const ember = !this.lit && this.offT > 0 ? Math.exp(-age * 1.1) : 0;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      if (dt > 0.034) this.slow++; else this.slow = Math.max(0, this.slow - 1);
      if (this.slow > 20 && this.scale > 0.5) { this.scale = Math.max(0.5, this.scale - 0.1); this.slow = 0; }
      const w = Math.max(1, Math.round(c.clientWidth * dpr * this.scale));
      const h = Math.max(1, Math.round(c.clientHeight * dpr * this.scale));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      gl.viewport(0, 0, w, h);

      const b = this.R[2];
      gl.uniform2f(U.uRes, w, h);
      gl.uniform1f(U.uRef, this.clientHeight * dpr * this.scale);
      gl.uniform1f(U.uTime, t);
      gl.uniform3f(U.uCamPos, this.target[0] + b[0] * this.dist, this.target[1] + b[1] * this.dist, this.target[2] + b[2] * this.dist);
      gl.uniformMatrix3fv(U.uCamRot, false, new Float32Array([].concat(this.R[0], this.R[1], this.R[2])));
      gl.uniform1f(U.uFlame, flameSize);
      gl.uniform1f(U.uFlick, flick);
      gl.uniform1f(U.uSmoke, smoke);
      gl.uniform1f(U.uSmokeAge, Math.max(0, age));
      gl.uniform1f(U.uEmber, ember);
      gl.uniform1f(U.uLit, this.litMix);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  if (!customElements.get('vela-espiral')) customElements.define('vela-espiral', VelaEspiral);
})();
