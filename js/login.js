(() => {
  const form = document.querySelector('.login__form');
  const input = document.getElementById('pass');
  const msg = document.querySelector('.login__msg');
  const ojo = document.querySelector('.field__eye');
  const pistaBtn = document.querySelector('.login__hint');
  const vela = document.querySelector('vela-espiral');
  const { passwordHash, pista, mensajesError } = window.REGALO;

  let intentos = 0;
  let ocupado = false;

  const normalizar = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  async function sha256(texto) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function mostrar(texto, clase = '') {
    msg.textContent = texto;
    msg.className = `login__msg ${clase}`;
  }

  function sacudir() {
    form.classList.remove('shake');
    void form.offsetWidth; // reinicia la animación
    form.classList.add('shake');
    navigator.vibrate?.([40, 40, 40]);
  }

  const velaBox = vela?.parentElement;
  const deseos = document.querySelector('.deseos');
  let luzRaf = 0;
  let deseosT = 0;

  // Mientras la vela está prendida, la luz de la página sigue a la llama y titila con ella.
  function seguirLuz() {
    const p = vela.flamePoint?.();
    if (p) {
      const raiz = document.documentElement.style;
      raiz.setProperty('--fx', `${p.x}px`);
      raiz.setProperty('--fy', `${p.y}px`);
      raiz.setProperty('--luz', p.luz.toFixed(3));
    }
    luzRaf = vela.isLit ? requestAnimationFrame(seguirLuz) : 0;
  }

  // El globo se ancla una sola vez, con la vela todavía parada: así no sale disparado ni se aplasta
  // contra el borde cuando la giran.
  function anclarGlobo() {
    if (velaBox.style.getPropertyValue('--llama-x')) return;
    const p = vela.flamePoint?.();
    if (!p) return;
    const caja = velaBox.getBoundingClientRect();
    velaBox.style.setProperty('--llama-x', `${p.x - caja.left}px`);
    velaBox.style.setProperty('--llama-y', `${p.y - caja.top}px`);
    document.documentElement.style.setProperty('--globo-x', `${p.x}px`);
  }

  function globo(titulo, texto, ms) {
    anclarGlobo();
    deseos.classList.remove('is-visible');
    void deseos.offsetWidth; // reinicia la animación de entrada
    deseos.querySelector('.deseos__titulo').textContent = titulo;
    deseos.querySelector('.deseos__texto').textContent = texto;
    deseos.classList.add('is-visible');
    if (ms) deseosT = setTimeout(() => deseos.classList.remove('is-visible'), ms);
  }

  const DESEOS = ['Podés pedir 3 deseos ✨', 'Luego soplá la vela y podés seguir con el regalo.'];

  // Mientras la vela está prendida no se puede escribir la contraseña: primero hay que soplarla.
  function bloquear(si) {
    form.inert = si;
    pistaBtn.inert = si;
  }

  // Si tocan el formulario bloqueado, el globo vuelve a recordar que hay que soplar la vela.
  document.querySelector('.login').addEventListener('click', (e) => {
    if (!form.inert || document.body.classList.contains('is-unlocked')) return;
    const tocado = [form, pistaBtn].some((el) => {
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (!tocado) return;
    clearTimeout(deseosT);
    globo(...DESEOS);
    navigator.vibrate?.(30);
  });

  // Al prenderla se apaga la página y aparece el globo de los deseos; al soplarla vuelve la luz.
  vela?.addEventListener('change', (e) => {
    const { lit } = e.detail;
    document.body.classList.toggle('is-lit', lit);
    bloquear(lit);
    if (lit && !luzRaf) seguirLuz();

    clearTimeout(deseosT);
    if (document.body.classList.contains('is-unlocked')) return;
    if (lit) {
      deseosT = setTimeout(() => globo(...DESEOS), 900);
    } else if (deseos.classList.contains('is-visible')) {
      globo('¡Espero que se cumplan! 🎉', 'Ahora sí podés ver tu regalo.', 3500);
    }
  });

  // La vela se prende sola apenas termina de aparecer la página, y hasta soplarla no se puede escribir.
  // Si el navegador no puede mostrarla (sin WebGL), no hay vela que soplar y el formulario queda libre.
  if (vela?.gl) {
    bloquear(true);
    setTimeout(() => vela.toggle(true), 700);
  }

  if (!pista) pistaBtn.hidden = true;
  pistaBtn.addEventListener('click', () => {
    pistaBtn.classList.remove('is-highlight');
    mostrar(pista, 'is-hint');
  });

  ojo.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    ojo.setAttribute('aria-pressed', String(visible));
    ojo.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
    input.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (ocupado) return;

    const valor = normalizar(input.value);
    if (!valor) {
      sacudir();
      input.focus();
      return;
    }

    if (!window.crypto?.subtle) {
      mostrar('Abrilo desde el link que te pasaron (https).');
      return;
    }

    if (await sha256(valor) !== passwordHash) {
      intentos++;
      mostrar(mensajesError[(intentos - 1) % mensajesError.length]);
      sacudir();
      input.select();
      if (intentos >= 3 && pista) pistaBtn.classList.add('is-highlight');
      return;
    }

    ocupado = true;
    try { sessionStorage.setItem('regalo:ok', '1'); } catch {}
    input.blur();
    mostrar('¡Correcta! ✨');
    document.body.classList.add('is-unlocked');
    deseos.classList.remove('is-visible');
    vela?.toggle?.(true); // con la contraseña correcta la vela se prende sola
    navigator.vibrate?.(30);

    setTimeout(() => {
      document.body.classList.add('is-leaving');
      setTimeout(() => location.assign('carta.html'), 400);
    }, 1300);
  });
})();
