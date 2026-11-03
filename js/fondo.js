// Crea los destellos del fondo con posiciones y tiempos al azar.
(() => {
  const capa = document.querySelector('.sparkles');
  if (!capa) return;

  const azar = (min, max) => min + Math.random() * (max - min);
  const frag = document.createDocumentFragment();

  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    const tam = azar(2, 5);
    const dur = azar(9, 18);
    s.style.cssText = `left:${azar(0, 100)}%;width:${tam}px;height:${tam}px;` +
      `animation-duration:${dur}s;animation-delay:${-azar(0, dur)}s;--drift:${azar(-40, 40)}px`;
    frag.append(s);
  }
  capa.append(frag);
})();
