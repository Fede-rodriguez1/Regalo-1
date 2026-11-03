// Moño de cinta satinada dibujado en canvas.
// Cada lazo y cada cola es una tira con un "lomo" de puntos; se dibuja tramo por tramo
// con luz según el ángulo, y con la cara de atrás más oscura cuando la cinta gira.
// Así se puede desatar de verdad: los puntos cambian de forma en vez de desaparecer.
(() => {
  const N = 60; // puntos por tira
  const ANCHO = 14; // ancho de la cinta en px (antes de escalar)
  const ESCALA = 0.7; // tamaño del moño completo
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const sombra = mezclarColor(oscuro, [12, 2, 28], 0.45);
    const blanco = [255, 246, 255];
    const rgb = (c, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

    // Grano de la tela: ruido fino que se aplica solo sobre la cinta.
    const grano = document.createElement('canvas');
    grano.width = grano.height = 96;
    const gctx = grano.getContext('2d');
    const ruido = gctx.createImageData(96, 96);
    for (let i = 0; i < ruido.data.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      ruido.data[i] = ruido.data[i + 1] = ruido.data[i + 2] = v;
      ruido.data[i + 3] = Math.random() * 26;
    }
    gctx.putImageData(ruido, 0, 0);
    const patronGrano = cctx.createPattern(grano, 'repeat');

    // Brillo satinado según el ángulo del tramo respecto de la luz. brilloLuz hace que el reflejo
    // se desplace apenas con el tiempo, como cuando la tela se mueve.
    let brilloLuz = 0;
    function luzDe(angulo) {
      return 0.5 + 0.5 * Math.cos(2 * (angulo - 0.7 - brilloLuz));
    }

    // Color de la cara de un tramo; la cara de atrás (cara < 0) es más apagada y sin reflejo.
    function tono(luz, cara) {
      if (cara >= 0) {
        const c = luz > 0.5 ? mezclarColor(base, claro, (luz - 0.5) * 1.6) : mezclarColor(oscuro, base, luz * 2);
        return mezclarColor(oscuro, c, 0.35 + 0.65 * cara);
      }
      return mezclarColor(sombra, oscuro, luz * 0.8);
    }

    // Degradé a lo ancho de la cinta: bordes en sombra (la tela se curva), cuerpo del color
    // y una franja de reflejo satinado que se corre hacia un lado.
    function degradeAncho(p, s, luz, cara) {
      const c = tono(luz, cara);
      const g = cctx.createLinearGradient(p.x + s.nx, p.y + s.ny, p.x - s.nx, p.y - s.ny);
      const brillo = cara > 0 ? luz ** 3 * 0.55 * cara : 0;
      g.addColorStop(0, rgb(mezclarColor(c, sombra, 0.55)));
      g.addColorStop(0.14, rgb(c));
      g.addColorStop(0.36, rgb(mezclarColor(c, blanco, brillo)));
      g.addColorStop(0.5, rgb(mezclarColor(c, blanco, brillo * 0.45)));
      g.addColorStop(0.82, rgb(c));
      g.addColorStop(1, rgb(mezclarColor(c, sombra, 0.65)));
      return g;
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
        const cara = (p.cara + q.cara) / 2;
        cctx.fillStyle = cctx.strokeStyle = degradeAncho(p, s, luzDe(Math.atan2(q.y - p.y, q.x - p.x)), cara);
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

      // Hilos de la trama a lo largo de la cinta y el orillo (borde tejido) un poco más marcado.
      const linea = (desplazo, color, grosor) => {
        cctx.lineWidth = grosor;
        cctx.strokeStyle = color;
        cctx.beginPath();
        let enTramo = false;
        pts.forEach((p, i) => {
          const x = p.x + lados[i].nx * desplazo;
          const y = p.y + lados[i].ny * desplazo;
          if (p.cara < 0.25) enTramo = false;
          else if (enTramo) cctx.lineTo(x, y);
          else {
            cctx.moveTo(x, y);
            enTramo = true;
          }
        });
        cctx.stroke();
      };
      cctx.lineJoin = 'round';
      for (const d of [-0.62, -0.38, -0.12, 0.14, 0.4, 0.64]) linea(d, 'rgba(20, 0, 40, 0.07)', 0.5);
      linea(0.86, 'rgba(255, 240, 255, 0.16)', 0.6);
      linea(-0.86, 'rgba(255, 240, 255, 0.1)', 0.6);
      linea(0.97, 'rgba(15, 0, 30, 0.35)', 0.7);
      linea(-0.97, 'rgba(15, 0, 30, 0.35)', 0.7);
    }

    // Nudo: tela apretada, abombada en el centro, con pliegues que convergen y bordes en sombra.
    function dibujarNudo(k) {
      if (k <= 0.02) return;
      const w = 19 * k;
      const h = 20 * k;
      cctx.save();
      cctx.beginPath();
      cctx.moveTo(-w * 0.42, -h / 2);
      cctx.quadraticCurveTo(0, -h * 0.58, w * 0.42, -h / 2);
      cctx.quadraticCurveTo(w * 0.6, 0, w * 0.42, h / 2);
      cctx.quadraticCurveTo(0, h * 0.6, -w * 0.42, h / 2);
      cctx.quadraticCurveTo(-w * 0.6, 0, -w * 0.42, -h / 2);
      cctx.closePath();
      const g = cctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      g.addColorStop(0, rgb(sombra));
      g.addColorStop(0.22, rgb(oscuro));
      g.addColorStop(0.42, rgb(mezclarColor(claro, blanco, 0.25 + 0.15 * Math.sin(brilloLuz * 6))));
      g.addColorStop(0.6, rgb(base));
      g.addColorStop(1, rgb(sombra));
      cctx.fillStyle = g;
      cctx.fill();
      cctx.clip();
      // Pliegues: la tela se frunce hacia arriba y hacia abajo del nudo.
      cctx.lineWidth = 0.8;
      for (const [x0, dir] of [[-0.3, 1], [-0.05, 1], [0.22, 1], [-0.25, -1], [0.05, -1], [0.3, -1]]) {
        cctx.strokeStyle = 'rgba(15, 0, 30, 0.32)';
        cctx.beginPath();
        cctx.moveTo(w * x0, dir * h * 0.55);
        cctx.quadraticCurveTo(w * x0 * 0.4, dir * h * 0.2, w * x0 * 0.15, 0);
        cctx.stroke();
        cctx.strokeStyle = 'rgba(255, 235, 255, 0.14)';
        cctx.beginPath();
        cctx.moveTo(w * x0 + 1, dir * h * 0.55);
        cctx.quadraticCurveTo(w * x0 * 0.4 + 1, dir * h * 0.2, w * x0 * 0.15 + 0.6, 0);
        cctx.stroke();
      }
      // Sombra arriba y abajo, donde la tela se mete bajo los lazos.
      const v = cctx.createLinearGradient(0, -h / 2, 0, h / 2);
      v.addColorStop(0, 'rgba(10, 0, 25, 0.45)');
      v.addColorStop(0.25, 'rgba(10, 0, 25, 0)');
      v.addColorStop(0.75, 'rgba(10, 0, 25, 0)');
      v.addColorStop(1, 'rgba(10, 0, 25, 0.5)');
      cctx.fillStyle = v;
      cctx.fillRect(-w, -h, w * 2, h * 2);
      cctx.restore();
    }

    // Estado: hover (0..1) y avance del desatado (0..1).
    const estado = { hover: 0, hoverMeta: 0, p: 0 };

    function dibujar(ahora = performance.now()) {
      const { p } = estado;
      const h = estado.hover;
      const t = ahora / 1000;
      // Movimiento leve y constante: brisa que mece las colas y respiración de los lazos.
      const brisa = quieto ? 0 : Math.sin(t * 1.15) * 0.6 + Math.sin(t * 2.4 + 1.3) * 0.4;
      const respira = quieto ? 0 : Math.sin(t * 1.6);
      brilloLuz = quieto ? 0 : 0.1 * Math.sin(t * 0.7);

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
      // Al caer, la cinta gira un poco y las colas flamean por el aire.
      const flamea = quieto ? 0 : caer * 9 * Math.sin(t * 8.5);
      cctx.translate(nudo.x + 14 * caer + 4 * Math.sin(caer * 5), nudo.y + 150 * caer);
      cctx.rotate(0.3 * caer + 0.05 * Math.sin(caer * 7));
      cctx.scale(ESCALA, ESCALA);

      // Colas (atrás de todo). Se mecen con la brisa, cada una con su propio ritmo.
      dibujarTira(cola(-1, mezclar(1, 1.1, soltar), 2.2 * brisa + mezclar(0, 6, caer) + flamea), true);
      dibujarTira(cola(1, 1 + 0.55 * tirar + 0.04 * h, 1.8 * brisa + 5 * h - 10 * tirar + 14 * caer - flamea), true);

      // Lazo derecho: se achica hasta pasar por el nudo.
      const tamDer = (1 - tirar) * (1 + 0.012 * respira);
      if (tamDer > 0.06) dibujarTira(lazo(1, tamDer));

      // Lazo izquierdo: se desarma y termina colgando como otra cola.
      const izq = lazo(-1, (1 - 0.15 * tirar) * (1 - 0.012 * respira));
      dibujarTira(soltar > 0 ? mezclarTira(izq, cola(-1, 1.35, 22 + flamea), soltar) : izq);

      dibujarNudo(1 - aflojar);

      // Grano de la tela, solo sobre lo que ya es cinta.
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.globalCompositeOperation = 'source-atop';
      cctx.fillStyle = patronGrano;
      cctx.fillRect(0, 0, capa.width, capa.height);
      cctx.globalCompositeOperation = 'source-over';

      // Dos sombras: una de contacto, corta y oscura, y otra amplia y suave sobre el rollo.
      ctx.globalAlpha = alfa;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
      ctx.shadowBlur = 12 * dpr;
      ctx.shadowOffsetY = 7 * dpr;
      ctx.drawImage(capa, 0, 0);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 2.5 * dpr;
      ctx.shadowOffsetY = 1.5 * dpr;
      ctx.drawImage(capa, 0, 0);
    }

    // Mientras está atado, el moño se mueve solo (brisa) y responde al hover.
    let pedido = 0;
    function vivir() {
      cancelAnimationFrame(pedido);
      const paso = (ahora) => {
        estado.hover += (estado.hoverMeta - estado.hover) * 0.14;
        dibujar(ahora);
        const sigue = !quieto || Math.abs(estado.hoverMeta - estado.hover) > 0.002;
        if (estado.p === 0 && sigue) pedido = requestAnimationFrame(paso);
      };
      pedido = requestAnimationFrame(paso);
    }

    function animar(desde, hasta, duracion) {
      cancelAnimationFrame(pedido);
      estado.hover = estado.hoverMeta = 0;
      return new Promise((listo) => {
        const inicio = performance.now();
        const paso = (ahora) => {
          const t = clamp((ahora - inicio) / duracion);
          estado.p = mezclar(desde, hasta, t);
          dibujar(ahora);
          if (t < 1) pedido = requestAnimationFrame(paso);
          else {
            if (estado.p === 0) vivir();
            listo();
          }
        };
        pedido = requestAnimationFrame(paso);
      });
    }

    dibujar();
    vivir();

    return {
      // Al pasar por encima (o apoyar el dedo) la cola derecha cae un poquito.
      hover(activo) {
        if (estado.p > 0) return;
        estado.hoverMeta = activo ? 1 : 0;
        if (quieto) vivir();
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
