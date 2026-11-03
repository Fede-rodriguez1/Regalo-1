(() => {
  // Si no pasó por el login, lo mandamos ahí. Si el navegador bloquea el storage, dejamos pasar.
  try {
    if (sessionStorage.getItem('regalo:ok') !== '1') {
      location.replace('index.html');
      return;
    }
  } catch {}

  const { carta } = window.REGALO;
  const html = document.documentElement;
  const scroll = document.getElementById('scroll');
  const sheet = document.getElementById('sheet');
  const letter = sheet.querySelector('.letter');
  const papel = sheet.querySelector('.sheet__paper');
  const roll = scroll.querySelector('.roll');
  const lineas = scroll.querySelector('.roll__lines');
  const rolloPapel = roll.querySelector('.roll__paper');
  const ribbon = scroll.querySelector('.ribbon');
  const bow = document.getElementById('bow');
  const hint = scroll.querySelector('.tap-hint');
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ms = (d) => (reducido ? 1 : d);
  let medidas = { shift: 0, offset: 0, alto: 0 };
  let estado = 'cerrada'; // cerrada | abriendo | abierta | cerrando
  let animCinta;
  let animHint;

  function armarCarta() {
    // Cada palabra va en su propio span para poder "escribirlas" una por una al abrir la carta.
    const agregar = (tag, clase, texto) => {
      const el = document.createElement(tag);
      el.className = `${clase} reveal`;
      for (const parte of texto.split(/(\s+)/)) {
        if (!parte) continue;
        if (/^\s+$/.test(parte)) { el.append(parte); continue; }
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = parte;
        el.append(w);
      }
      letter.append(el);
    };
    if (carta.titulo) agregar('h1', 'letter__title', carta.titulo);
    if (carta.destinatario) agregar('p', 'letter__to', carta.destinatario);
    carta.parrafos.forEach((t) => agregar('p', 'letter__p', t));
    if (carta.despedida) agregar('p', 'letter__bye', carta.despedida);
    if (carta.firma) agregar('p', 'letter__sign', carta.firma);
  }

  // shift: cuánto sube el rollo para quedar arriba de todo cuando está cerrado.
  // offset: cuánto baja todo para que el rollo cerrado quede centrado en la pantalla.
  function medir() {
    const shift = roll.offsetTop;
    const offset = Math.max(0, (innerHeight - roll.offsetHeight) / 2 - scroll.offsetTop);
    medidas = { shift, offset, alto: sheet.offsetHeight };
    html.style.setProperty('--shift', `${shift}px`);
    html.style.setProperty('--offset', `${offset}px`);
  }

  // ---- Pergamino dibujado en canvas (la carta y el rollo comparten la misma textura) ----

  // Números pseudoaleatorios con semilla, para que se vea igual cada vez que se redibuja.
  function crearAzar(semilla) {
    return () => {
      semilla = (semilla * 1664525 + 1013904223) % 4294967296;
      return semilla / 4294967296;
    };
  }

  // Prepara el canvas al tamaño del elemento. Devuelve null si no cambió de tamaño.
  function prepararCanvas(canvas, w, h) {
    if (!w || !h || canvas.dataset.size === `${w}x${h}`) return null;
    canvas.dataset.size = `${w}x${h}`;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, dpr };
  }

  // Recorre un lado con pequeños desvíos suavizados (y alguna muesca) para que parezca rasgado.
  function rasgar(camino, azar, desde, hasta, normal, amplitud, primero) {
    const largo = Math.hypot(hasta[0] - desde[0], hasta[1] - desde[1]);
    let desvio = amplitud / 2;
    for (let d = 0; d <= largo; d += 4) {
      desvio = desvio * 0.6 + (amplitud * (0.3 + azar())) * 0.4 + (azar() < 0.03 ? amplitud : 0);
      const t = d / largo;
      const x = desde[0] + (hasta[0] - desde[0]) * t + normal[0] * desvio;
      const y = desde[1] + (hasta[1] - desde[1]) * t + normal[1] * desvio;
      primero && d === 0 ? camino.moveTo(x, y) : camino.lineTo(x, y);
    }
  }

  function texturizar(ctx, w, h, azar) {
    // Manchas de humedad y zonas más claras.
    for (let i = 0; i < 4 + (w * h) / 50000; i++) {
      const x = azar() * w;
      const y = azar() * h;
      const r = Math.min(40 + azar() * 110, Math.max(w, h));
      const claro = azar() < 0.35;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, claro ? 'rgba(255, 246, 222, 0.35)' : 'rgba(150, 100, 45, 0.1)');
      g.addColorStop(1, 'rgba(150, 100, 45, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Fibras y motitas del papel.
    ctx.lineCap = 'round';
    for (let i = 0; i < (w * h) / 90; i++) {
      const x = azar() * w;
      const y = azar() * h;
      const largo = 2 + azar() * 7;
      const ang = (azar() - 0.5) * 0.8;
      ctx.strokeStyle = `rgba(${azar() < 0.5 ? '110, 70, 30' : '255, 245, 220'}, ${0.04 + azar() * 0.06})`;
      ctx.lineWidth = 0.4 + azar() * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * largo, y + Math.sin(ang) * largo);
      ctx.stroke();
    }
  }

  // Bordes quemados: la sombra de todo lo que queda afuera del papel cae hacia adentro.
  function quemar(ctx, borde, w, h, dpr, niveles) {
    const afuera = new Path2D();
    afuera.rect(-200, -200, w + 400, h + 400);
    afuera.addPath(borde);
    ctx.fillStyle = '#000';
    niveles.forEach(([blur, color]) => {
      ctx.shadowBlur = blur * dpr;
      ctx.shadowColor = color;
      ctx.fill(afuera, 'evenodd');
    });
    ctx.shadowColor = 'transparent';
  }

  // Grano fino píxel por píxel.
  function granular(ctx, canvas) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const n = (Math.random() - 0.5) * 16;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n * 0.8;
    }
    ctx.putImageData(img, 0, 0);
  }

  function rellenarPergamino(ctx, borde, h) {
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#e9d2a2');
    base.addColorStop(0.5, '#f0ddb5');
    base.addColorStop(1, '#e6cd9b');
    ctx.fillStyle = base;
    ctx.fill(borde);
  }

  // La hoja: arriba y a los costados rasgada y quemada; abajo sigue dentro del rollo.
  function pintarPapel() {
    const w = sheet.offsetWidth;
    const h = sheet.offsetHeight;
    const listo = prepararCanvas(papel, w, h);
    if (!listo) return;
    const { ctx, dpr } = listo;
    const azar = crearAzar(240819);

    const borde = new Path2D();
    rasgar(borde, azar, [0, 0], [w, 0], [0, 1], 5, true);
    rasgar(borde, azar, [w, 0], [w, h + 40], [-1, 0], 5);
    rasgar(borde, azar, [0, h + 40], [0, 0], [1, 0], 5);
    borde.closePath();

    rellenarPergamino(ctx, borde, h);
    ctx.save();
    ctx.clip(borde);
    texturizar(ctx, w, h, azar);
    quemar(ctx, borde, w, h, dpr, [[38, 'rgba(122, 74, 30, 0.55)'], [10, 'rgba(95, 55, 20, 0.6)'], [3, 'rgba(70, 40, 15, 0.7)']]);
    ctx.restore();
    granular(ctx, papel);
  }

  // El rollo: el mismo papel enrollado, con sombreado de cilindro y las capas del papel en las puntas.
  function pintarRollo() {
    const w = roll.offsetWidth;
    const h = roll.offsetHeight;
    const listo = prepararCanvas(rolloPapel, w, h);
    if (!listo) return;
    const { ctx, dpr } = listo;
    const azar = crearAzar(1908);

    // Las puntas se curvan apenas (perspectiva del cilindro) y tienen el borde del papel irregular.
    const curva = (y) => 4 * ((y - h / 2) / (h / 2)) ** 4;
    const borde = new Path2D();
    borde.moveTo(curva(0) + 2, 0);
    borde.lineTo(w - curva(0) - 2, 0);
    for (let y = 0; y <= h; y += 3) borde.lineTo(w - 2 - curva(y) - azar() * 1.6, y);
    for (let y = h; y >= 0; y -= 3) borde.lineTo(2 + curva(y) + azar() * 1.6, y);
    borde.closePath();

    rellenarPergamino(ctx, borde, h);
    ctx.save();
    ctx.clip(borde);
    texturizar(ctx, w, h, azar);

    // Volumen: sombra arriba y abajo, brillo suave un poco por encima del centro.
    const vol = ctx.createLinearGradient(0, 0, 0, h);
    vol.addColorStop(0, 'rgba(70, 40, 12, 0.7)');
    vol.addColorStop(0.18, 'rgba(70, 40, 12, 0.18)');
    vol.addColorStop(0.36, 'rgba(255, 248, 228, 0.35)');
    vol.addColorStop(0.5, 'rgba(255, 248, 228, 0)');
    vol.addColorStop(0.78, 'rgba(70, 40, 12, 0.22)');
    vol.addColorStop(1, 'rgba(50, 28, 8, 0.75)');
    ctx.fillStyle = vol;
    ctx.fillRect(0, 0, w, h);

    // Capas del papel que asoman en cada punta, como hojas apiladas.
    ctx.lineWidth = 0.7;
    for (let i = 1; i <= 4; i++) {
      const sep = i * 2.2 + azar();
      ctx.strokeStyle = `rgba(90, 55, 20, ${0.32 - i * 0.05})`;
      [[1, 0], [-1, w]].forEach(([dir, x0]) => {
        ctx.beginPath();
        for (let y = 2; y <= h - 2; y += 3) {
          const x = x0 + dir * (2 + curva(y) + sep + azar() * 0.5);
          y === 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
    }

    quemar(ctx, borde, w, h, dpr, [[14, 'rgba(110, 65, 25, 0.45)'], [3, 'rgba(80, 45, 15, 0.5)']]);
    ctx.restore();
    granular(ctx, rolloPapel);
  }

  const estilo = getComputedStyle(html);
  const mono = window.crearMono(bow.querySelector('.bow__canvas'), {
    base: estilo.getPropertyValue('--ribbon'),
    oscuro: estilo.getPropertyValue('--ribbon-dark'),
    claro: estilo.getPropertyValue('--ribbon-light'),
  });

  // Se tira de una cola, el lazo pasa por el nudo, el otro se deshace y la cinta cae del rollo.
  function desatar() {
    const dur = ms(2200);
    animCinta?.cancel();
    animHint?.cancel();
    animHint = hint.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(200), fill: 'forwards' });
    animCinta = ribbon.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'none', opacity: 1, offset: 0.58, easing: 'cubic-bezier(.5,0,1,1)' },
      { transform: 'translate(6px, 150px) rotate(4deg)', opacity: 1, offset: 0.85 },
      { transform: 'translate(7px, 190px) rotate(5deg)', opacity: 0 },
    ], { duration: dur, fill: 'forwards' });
    return Promise.all([mono.desatar(dur), animCinta.finished]);
  }

  function atar() {
    const dur = ms(1700);
    animCinta.reverse();
    animHint.reverse();
    return Promise.all([mono.atar(dur), animCinta.finished]);
  }

  // En qué momento (0..1) una curva cubic-bezier llega a cierto avance: inversa numérica de la curva.
  function tiempoDe([x1, y1, x2, y2], avance) {
    const punto = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30; i++) {
      const s = (lo + hi) / 2;
      if (punto(y1, y2, s) < avance) lo = s; else hi = s;
    }
    return punto(x1, x2, (lo + hi) / 2);
  }

  async function abrir() {
    if (estado !== 'cerrada') return;
    estado = 'abriendo';
    navigator.vibrate?.(25);

    await desatar();
    medir();
    const { shift, offset, alto } = medidas;

    // 1. El rollo sube hasta arriba de la pantalla.
    const subir = scroll.animate(
      [{ transform: `translateY(${offset}px)` }, { transform: 'none' }],
      { duration: ms(offset ? 1100 : 1), easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
    );
    await subir.finished;

    // 2. Se desenrolla: el papel se destapa de arriba hacia abajo al ritmo del rollo.
    // Arranca despacio (la primera pantalla, que es la que se ve, se destapa con calma) y acelera
    // recién cuando el rollo ya salió de la pantalla.
    const dur = ms(Math.min(9000, Math.max(4500, alto * 1.4)));
    const bezier = [0.55, 0, 0.35, 1];
    const opciones = { duration: dur, easing: `cubic-bezier(${bezier})`, fill: 'forwards' };
    const desenrollar = [
      sheet.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], opciones),
      roll.animate([{ transform: `translateY(${-shift}px)` }, { transform: 'none' }], opciones),
      lineas.animate([{ backgroundPosition: '0 0' }, { backgroundPosition: `0 ${alto}px` }], opciones),
    ];
    html.classList.remove('is-closed');
    subir.cancel();

    // 3. El texto se escribe en orden, de arriba hacia abajo y de izquierda a derecha, palabra por palabra.
    // Un párrafo empieza cuando termina el anterior (y nunca antes de que el papel destape su primera línea).
    const porLetra = reducido ? 0 : 8; // ms por letra
    let t = 0;
    for (const el of letter.querySelectorAll('.reveal')) {
      const frac = Math.min(1, (el.offsetTop + 30) / alto);
      t = Math.max(t + (reducido ? 0 : 220), dur * tiempoDe(bezier, frac));
      for (const w of el.querySelectorAll('.w')) {
        const largo = w.textContent.length * porLetra;
        w.animate(
          // El margen negativo deja ver los trazos de Caveat que sobresalen de la caja de la palabra.
          [{ opacity: 0, clipPath: 'inset(-0.4em 100% -0.4em -0.3em)' }, { opacity: 1, clipPath: 'inset(-0.4em -0.5em -0.4em -0.3em)' }],
          { duration: ms(Math.max(110, largo * 1.8)), delay: t, easing: 'ease-out', fill: 'both' },
        );
        t += largo + porLetra * 2; // una pausa chiquita entre palabras
      }
    }

    // La pantalla se queda en el inicio de la carta mientras se desenrolla; después se lee bajando a mano.
    scrollTo(0, 0);

    await Promise.all(desenrollar.map((a) => a.finished));
    desenrollar.forEach((a) => a.cancel()); // queda el layout natural, que se adapta si rota el celu
    estado = 'abierta';
    html.classList.add('is-open');
    navigator.vibrate?.([20, 60, 20]);
  }

  // Mientras se enrolla, la página sube junto con el rollo para no perderlo de vista.
  function seguirArriba(hasta) {
    (function paso() {
      if (performance.now() > hasta || scrollY <= 0) return;
      const arriba = roll.getBoundingClientRect().top;
      const limite = innerHeight * 0.55;
      if (arriba < limite) scrollBy(0, arriba - limite);
      requestAnimationFrame(paso);
    })();
  }

  // Lo inverso de abrir: se enrolla hacia arriba, el rollo baja al centro y el moño se vuelve a atar.
  async function cerrar() {
    if (estado !== 'abierta') return;
    estado = 'cerrando';
    html.classList.remove('is-open');
    navigator.vibrate?.(25);

    medir();
    const { shift, offset, alto } = medidas;

    // 1. Se enrolla: el rollo sube tapando el papel.
    const dur = ms(Math.min(3000, Math.max(1600, alto * 2.4)));
    const opciones = { duration: dur, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' };
    const enrollar = [
      sheet.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], opciones),
      roll.animate([{ transform: 'none' }, { transform: `translateY(${-shift}px)` }], opciones),
      lineas.animate([{ backgroundPosition: `0 ${alto}px` }, { backgroundPosition: '0 0' }], opciones),
    ];
    if (!reducido) seguirArriba(performance.now() + dur);
    await Promise.all(enrollar.map((a) => a.finished));
    scrollTo(0, 0);

    // 2. El rollo cerrado baja al centro de la pantalla.
    const bajar = scroll.animate(
      [{ transform: 'none' }, { transform: `translateY(${offset}px)` }],
      { duration: ms(offset ? 650 : 1), easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
    );
    await bajar.finished;
    html.classList.add('is-closed');
    [...enrollar, bajar].forEach((a) => a.cancel());
    letter.querySelectorAll('.w').forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

    // 3. El moño se vuelve a atar.
    await atar();
    estado = 'cerrada';
  }

  bow.addEventListener('pointerenter', () => mono.hover(true));
  bow.addEventListener('pointerdown', () => mono.hover(true));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
    bow.addEventListener(ev, () => mono.hover(false)));
  bow.addEventListener('click', abrir);
  roll.addEventListener('click', cerrar);

  let redibujo;
  addEventListener('resize', () => {
    if (estado === 'cerrada') medir();
    clearTimeout(redibujo);
    redibujo = setTimeout(() => { pintarPapel(); pintarRollo(); }, 200);
  });

  armarCarta();
  // Hay que medir con las fuentes ya cargadas, porque Caveat cambia el alto del texto.
  document.fonts.ready.then(() => {
    medir();
    pintarPapel();
    pintarRollo();
    html.classList.add('is-ready');
  });
})();
