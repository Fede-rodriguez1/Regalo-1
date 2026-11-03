// Lluvia de confeti liviana en un canvas; se apaga sola.
window.lanzarConfeti = (canvas, cantidad = 140) => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const colores = ['#a66bff', '#f0c8ff', '#7b35d4', '#c9a7ff', '#ffffff', '#ff9ee8'];
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = innerWidth;
  const h = innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;

  const azar = (min, max) => min + Math.random() * (max - min);
  const piezas = Array.from({ length: cantidad }, () => ({
    x: w / 2 + azar(-w * 0.2, w * 0.2),
    y: h * 0.4,
    vx: azar(-7, 7),
    vy: azar(-15, -5),
    r: azar(0, Math.PI),
    vr: azar(-0.25, 0.25),
    ancho: azar(6, 11),
    alto: azar(4, 8),
    color: colores[(Math.random() * colores.length) | 0],
  }));

  const DURACION = 4200;
  const inicio = performance.now();
  let previo = inicio;

  function cuadro(t) {
    // Normaliza a 60 fps para que en pantallas de 120 Hz no vaya al doble de velocidad.
    const k = Math.min((t - previo) / 16.67, 3);
    previo = t;
    const vida = (t - inicio) / DURACION;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (vida >= 1) return;
    ctx.globalAlpha = vida > 0.75 ? (1 - vida) / 0.25 : 1;

    for (const p of piezas) {
      p.vy += 0.3 * k;
      p.vx *= 0.99;
      p.x += p.vx * k;
      p.y += p.vy * k;
      p.r += p.vr * k;
      const cos = Math.cos(p.r);
      const sin = Math.sin(p.r);
      ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, p.x * dpr, p.y * dpr);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto * Math.cos(p.r * 2));
    }
    requestAnimationFrame(cuadro);
  }

  requestAnimationFrame(cuadro);
};
