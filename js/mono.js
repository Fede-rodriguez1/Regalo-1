// Moño de cinta satinada dibujado en canvas.
// Cada lazo y cada cola es una tira con un "lomo" de puntos; se dibuja tramo por tramo
// con luz según el ángulo, y con la cara de atrás más oscura cuando la cinta gira.
// Así se puede desatar de verdad: los puntos cambian de forma en vez de desaparecer.
(() => {
  const N = 60; // puntos por tira
  const ANCHO = 13; // ancho de la cinta en px

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const suave = (t) => t * t * (3 - 2 * t);
  const salida = (t) => 1 - (1 - t) ** 3;
  const mezclar = (a, b, t) => a + (b - a) * t;

  function hexARgb(hex) {
    const h = hex.trim().replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  const mezclarColor = (a, b, t) => a.map((v, i) => Math.round(mezclar(v, b[i], t)));

  // Lazo: una elipse que sale del nudo y vuelve a él. lado = -1 izquierda, 1 derecha.
  // La mitad de abajo muestra la cara interna (más oscura) y la cinta se frunce en el nudo.
  function lazo(lado, tam) {
    const L = 58 * tam;
    const H = 24 * tam;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const x = (lado * L * (1 - Math.cos(2 * Math.PI * u))) / 2;
      let y = (-H * Math.sin(2 * Math.PI * u)) / 2 + 1;
      y -= 0.16 * Math.abs(x); // la punta del lazo apenas levantada
      const cara = u < 0.5 ? 1 : mezclar(1, -0.85, suave(clamp((u - 0.5) / 0.18)));
      const ancho = 0.7 + 0.75 * Math.sqrt(Math.sin(Math.PI * u)); // ancho en la punta, fruncido en el nudo
      pts.push({ x, y, cara, ancho });
    }
    return pts;
  }

  // Cola: cae desde el nudo hacia afuera con una curva en S y un giro de la cinta arriba.
  function cola(lado, largo, giro) {
    const p0 = [lado * 3, 5];
    const c1 = [lado * 13, 20];
    const c2 = [lado * 18, 36];
    const p3 = [lado * 40, 60];
    const rad = (giro * Math.PI) / 180;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const a = (1 - u) ** 3;
      const b = 3 * (1 - u) ** 2 * u;
      const c = 3 * (1 - u) * u * u;
      const d = u ** 3;
      let x = (a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0]) * mezclar(1, largo, u);
      let y = (a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]) * mezclar(1, largo, u);
      [x, y] = [x * Math.cos(rad) - y * Math.sin(rad), x * Math.sin(rad) + y * Math.cos(rad)];
      const cara = mezclar(-0.7, 1, suave(clamp((u - 0.08) / 0.22)));
      pts.push({ x, y, cara, ancho: 0.9 + 0.1 * u });
    }
    return pts;
  }

  const mezclarTira = (a, b, t) =>
    a.map((p, i) => ({
      x: mezclar(p.x, b[i].x, t),
      y: mezclar(p.y, b[i].y, t),
      cara: mezclar(p.cara, b[i].cara, t),
      ancho: mezclar(p.ancho, b[i].ancho, t),
    }));

  window.crearMono = function crearMono(canvas, colores) {
    const ctx = canvas.getContext('2d');
    const W = canvas.clientWidth;
    const Hc = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(Hc * dpr);
    const nudo = { x: W / 2, y: Hc * 0.38 }; // dónde queda el nudo dentro del canvas

    // Se dibuja en un canvas aparte y se copia con una sola sombra, para que no se marquen los tramos.
    const capa = document.createElement('canvas');
    capa.width = canvas.width;
    capa.height = canvas.height;
    const cctx = capa.getContext('2d');

    const base = hexARgb(colores.base);
    const oscuro = hexARgb(colores.oscuro);
    const claro = hexARgb(colores.claro);

    // Tono de un tramo: brillo satinado según el ángulo; la cara de atrás, más apagada.
    function tono(angulo, cara) {
      const luz = 0.5 + 0.5 * Math.cos(2 * (angulo - 0.7));
      if (cara >= 0) {
        const c = luz > 0.5 ? mezclarColor(base, claro, (luz - 0.5) * 1.6) : mezclarColor(oscuro, base, luz * 2);
        return mezclarColor(oscuro, c, 0.35 + 0.65 * cara);
      }
      return mezclarColor(mezclarColor(oscuro, [20, 5, 40], 0.3), oscuro, luz * 0.8);
    }

    function dibujarTira(pts, conCorte) {
      const lados = pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const tx = b.x - a.x;
        const ty = b.y - a.y;
        const l = Math.hypot(tx, ty) || 1;
        const m = (ANCHO / 2) * p.ancho * Math.max(0.15, Math.abs(p.cara));
        return { nx: (-ty / l) * m, ny: (tx / l) * m, tx: tx / l, ty: ty / l };
      });

      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i];
        const q = pts[i + 1];
        const s = lados[i];
        const t = lados[i + 1];
        const [r, g, b] = tono(Math.atan2(q.y - p.y, q.x - p.x), (p.cara + q.cara) / 2);
        cctx.fillStyle = cctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        cctx.beginPath();
        cctx.moveTo(p.x + s.nx, p.y + s.ny);
        cctx.lineTo(q.x + t.nx, q.y + t.ny);
        const ultimo = conCorte && i === pts.length - 2;
        if (ultimo) {
          // Corte en V en la punta de la cola.
          const prof = ANCHO * 0.7;
          cctx.lineTo(q.x - t.tx * prof, q.y - t.ty * prof);
        }
        cctx.lineTo(q.x - t.nx, q.y - t.ny);
        cctx.lineTo(p.x - s.nx, p.y - s.ny);
        cctx.closePath();
        cctx.fill();
        cctx.lineWidth = 0.6;
        cctx.stroke(); // tapa las rendijas entre tramos
      }

      // Brillo fino y continuo por el centro de la cinta, solo donde se ve la cara de adelante.
      cctx.lineWidth = 1.6;
      cctx.lineJoin = 'round';
      cctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
      cctx.beginPath();
      let enTramo = false;
      pts.forEach((p, i) => {
        const x = p.x + lados[i].nx * 0.3;
        const y = p.y + lados[i].ny * 0.3;
        if (p.cara < 0.6) enTramo = false;
        else if (enTramo) cctx.lineTo(x, y);
        else {
          cctx.moveTo(x, y);
          enTramo = true;
        }
      });
      cctx.stroke();
    }

    function dibujarNudo(k) {
      if (k <= 0.02) return;
      const w = 18 * k;
      const h = 19 * k;
      const g = cctx.createRadialGradient(-w * 0.15, -h * 0.2, 1, 0, 0, w * 0.8);
      g.addColorStop(0, `rgb(${claro})`);
      g.addColorStop(0.55, `rgb(${base})`);
      g.addColorStop(1, `rgb(${oscuro})`);
      cctx.fillStyle = g;
      cctx.beginPath();
      cctx.roundRect(-w / 2, -h / 2, w, h, 6 * k);
      cctx.fill();
      // Pliegues de la tela apretada.
      cctx.strokeStyle = `rgba(${oscuro}, 0.5)`;
      cctx.lineWidth = 0.9;
      cctx.beginPath();
      cctx.moveTo(-w / 2 + 1, -h * 0.22);
      cctx.quadraticCurveTo(0, -h * 0.1, w / 2 - 1, -h * 0.22);
      cctx.moveTo(-w / 2 + 1, h * 0.25);
      cctx.quadraticCurveTo(0, h * 0.12, w / 2 - 1, h * 0.25);
      cctx.stroke();
    }

    // Estado: hover (0..1) y avance del desatado (0..1).
    const estado = { hover: 0, hoverMeta: 0, p: 0 };

    function dibujar() {
      const { p } = estado;
      const h = estado.hover;

      const tirar = salida(clamp(p / 0.45)); // se tira de la cola derecha
      const soltar = suave(clamp((p - 0.3) / 0.4)); // el lazo izquierdo se deshace
      const aflojar = suave(clamp((p - 0.22) / 0.38)); // el nudo se afloja
      const caer = clamp((p - 0.58) / 0.42) ** 2; // todo cae del rollo
      const alfa = 1 - clamp((p - 0.85) / 0.15);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (alfa <= 0) return;

      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, capa.width, capa.height);
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.translate(nudo.x + 6 * caer, nudo.y + 150 * caer);
      cctx.rotate(0.12 * caer);

      // Colas (atrás de todo).
      dibujarTira(cola(-1, mezclar(1, 1.1, soltar), mezclar(0, 6, caer)), true);
      dibujarTira(cola(1, 1 + 0.55 * tirar + 0.04 * h, 5 * h - 10 * tirar + 14 * caer), true);

      // Lazo derecho: se achica hasta pasar por el nudo.
      const tamDer = 1 - tirar;
      if (tamDer > 0.06) dibujarTira(lazo(1, tamDer));

      // Lazo izquierdo: se desarma y termina colgando como otra cola.
      const izq = lazo(-1, 1 - 0.15 * tirar);
      dibujarTira(soltar > 0 ? mezclarTira(izq, cola(-1, 1.35, 22), soltar) : izq);

      dibujarNudo(1 - aflojar);

      ctx.globalAlpha = alfa;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6 * dpr;
      ctx.shadowOffsetY = 4 * dpr;
      ctx.drawImage(capa, 0, 0);
    }

    let pedido = 0;
    function animarHover() {
      cancelAnimationFrame(pedido);
      const paso = () => {
        estado.hover += (estado.hoverMeta - estado.hover) * 0.14;
        dibujar();
        if (Math.abs(estado.hoverMeta - estado.hover) > 0.002) pedido = requestAnimationFrame(paso);
      };
      paso();
    }

    function animar(desde, hasta, duracion) {
      cancelAnimationFrame(pedido);
      estado.hover = estado.hoverMeta = 0;
      return new Promise((listo) => {
        const inicio = performance.now();
        const paso = (ahora) => {
          const t = clamp((ahora - inicio) / duracion);
          estado.p = mezclar(desde, hasta, t);
          dibujar();
          t < 1 ? (pedido = requestAnimationFrame(paso)) : listo();
        };
        pedido = requestAnimationFrame(paso);
      });
    }

    dibujar();

    return {
      // Al pasar por encima (o apoyar el dedo) la cola derecha cae un poquito.
      hover(activo) {
        if (estado.p > 0) return;
        estado.hoverMeta = activo ? 1 : 0;
        animarHover();
      },
      desatar(duracion) {
        return animar(0, 1, duracion);
      },
      // Lo mismo al revés: la cinta sube, se anuda y se forman los lazos.
      atar(duracion) {
        return animar(1, 0, duracion);
      },
    };
  };
})();
