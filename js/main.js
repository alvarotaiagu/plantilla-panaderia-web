/* ==========================================================================
   Milmigas — obrador de pan (SITIO DE DEMOSTRACIÓN, negocio ficticio)
   Concepto «La miga»: todo el movimiento viene de la fermentación —burbujas
   que nacen y crecen, masa que sube, panes que se parten.

   Reglas que respeta este archivo:
   - `has-motion` solo se enciende si GSAP y ScrollTrigger existen de verdad.
   - `motion` (movimiento) y `gsapReady` son banderas distintas: con
     prefers-reduced-motion el contenido sigue cambiando (contadores, horario,
     índice de la galería); lo que se apaga es el movimiento.
   - El canvas no usa blur ni shadowBlur por fotograma: la burbuja se pinta una
     vez en un sprite fuera de pantalla y se repite con drawImage.
   ========================================================================== */
(function () {
  'use strict';

  var raiz = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var gsapReady = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var motion = gsapReady && !reduce.matches;

  if (gsapReady) {
    gsap.registerPlugin(ScrollTrigger);
    if (motion) raiz.classList.add('has-motion');
  }

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ── Cortina de entrada ────────────────────────────────────────────────
     Obligatoria (§5 del pliego) y con RETIRADA GARANTIZADA: se quita
     siempre —sin GSAP, con movimiento reducido, o si algo falla a mitad—,
     porque si se queda tapa la página entera. `ESPERA` es lo que el hero
     aguanta antes de entrar, para que el relevo sea limpio.
     ────────────────────────────────────────────────────────────────────── */
  var ESPERA = 0;
  (function cortina() {
    var el = document.querySelector('[data-cortina]');
    if (!el) return;
    var fuera = false;
    function quitar() { if (fuera) return; fuera = true; el.hidden = true; }
    if (!motion) { quitar(); return; }
    ESPERA = 1.30;

    var alta = el.querySelector('.cortina__hoja--alta');
    var baja = el.querySelector('.cortina__hoja--baja');
    var corte = el.querySelectorAll('.cortina__corte path');
    var centro = el.querySelector('.cortina__centro');
    gsap.set(centro, { opacity: 0, scale: 0.94 });
    var tl = gsap.timeline({ onComplete: quitar });
    tl.to(centro, { opacity: 1, scale: 1, duration: 0.45, ease: 'power2.out' })
      .to(corte, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut', stagger: 0.08 }, '-=0.2')
      .to(centro, { opacity: 0, scale: 1.05, duration: 0.32, ease: 'power1.in' }, '+=0.06')
      .to(alta, { yPercent: -101, duration: 0.85, ease: 'expo.inOut' }, '-=0.12')
      .to(baja, { yPercent: 101, duration: 0.85, ease: 'expo.inOut' }, '<');
    setTimeout(quitar, 5000);   // red de seguridad: pase lo que pase, se va
  })();


  /* ─────────────────────────────────────────────────────────────────────
     1. Scroll suave (Lenis) — único motor de scroll de la página
     ───────────────────────────────────────────────────────────────────── */
  var lenis = null;
  if (motion && typeof window.Lenis !== 'undefined') {
    // lerp alto a propósito: con la galería anclada horizontal, un lerp bajo
    // hace que el contenido parezca irse al revés al invertir el scroll.
    lenis = new Lenis({ lerp: 0.17, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function irA(destino) {
    if (lenis) lenis.scrollTo(destino, { offset: -70 });
    else if (destino && destino.scrollIntoView) destino.scrollIntoView({ behavior: 'auto' });
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var destino = document.getElementById(id.slice(1));
      if (!destino) return;
      e.preventDefault();
      cerrarMenu();
      irA(destino);
      destino.setAttribute('tabindex', '-1');
      destino.focus({ preventScroll: true });
    });
  });

  /* ─────────────────────────────────────────────────────────────────────
     2. Hero: canvas de fermentación
     ───────────────────────────────────────────────────────────────────── */
  (function fermentacion() {
    var lienzo = $('[data-fermento]');
    if (!lienzo) return;
    var ctx = lienzo.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var burbujas = [];
    var sprite = document.createElement('canvas');
    var spriteCtx = sprite.getContext('2d');
    var LADO = 128;

    // Sprite de burbuja: un degradado radial pintado UNA vez.
    sprite.width = sprite.height = LADO;
    var g = spriteCtx.createRadialGradient(LADO / 2, LADO / 2, 2, LADO / 2, LADO / 2, LADO / 2);
    g.addColorStop(0, 'rgba(168, 72, 27, 0.30)');
    g.addColorStop(0.62, 'rgba(168, 72, 27, 0.16)');
    g.addColorStop(0.86, 'rgba(168, 72, 27, 0.07)');
    g.addColorStop(1, 'rgba(168, 72, 27, 0)');
    spriteCtx.fillStyle = g;
    spriteCtx.fillRect(0, 0, LADO, LADO);
    // borde suave de alvéolo
    spriteCtx.strokeStyle = 'rgba(122, 50, 17, 0.20)';
    spriteCtx.lineWidth = 3;
    spriteCtx.beginPath();
    spriteCtx.arc(LADO / 2, LADO / 2, LADO / 2 - 6, 0, Math.PI * 2);
    spriteCtx.stroke();

    function nueva(inicial) {
      var r = 14 + Math.pow(Math.random(), 2.2) * 120;
      return {
        x: Math.random() * w,
        y: inicial ? Math.random() * h : h + r,
        r: r,
        r0: r,
        vy: 6 + Math.random() * 16,       // px por segundo: sube despacio
        crece: 1 + Math.random() * 0.6,   // px por segundo de radio
        vida: 0,
        max: 14 + Math.random() * 16
      };
    }

    function medir() {
      var caja = lienzo.getBoundingClientRect();
      w = Math.max(1, caja.width);
      h = Math.max(1, caja.height);
      lienzo.width = Math.round(w * dpr);
      lienzo.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var objetivo = Math.round(Math.min(46, Math.max(16, (w * h) / 26000)));
      burbujas = [];
      for (var i = 0; i < objetivo; i++) burbujas.push(nueva(true));
    }

    function pintar() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < burbujas.length; i++) {
        var b = burbujas[i];
        var d = b.r * 2;
        ctx.drawImage(sprite, b.x - b.r, b.y - b.r, d, d);
      }
    }

    var ultimo = 0, corriendo = false, visible = true;

    function paso(t) {
      if (!corriendo) return;
      var dt = ultimo ? Math.min((t - ultimo) / 1000, 0.05) : 0.016;
      ultimo = t;
      for (var i = 0; i < burbujas.length; i++) {
        var b = burbujas[i];
        b.y -= b.vy * dt;
        b.r += b.crece * dt;
        b.vida += dt;
        if (b.y + b.r < -40 || b.vida > b.max) burbujas[i] = nueva(false);
      }
      pintar();
      requestAnimationFrame(paso);
    }

    function arrancar() {
      if (corriendo || !visible || !motion) return;
      corriendo = true; ultimo = 0;
      requestAnimationFrame(paso);
    }
    function parar() { corriendo = false; }

    medir();
    pintar(); // primer fotograma estático: válido también sin movimiento

    if (motion) {
      arrancar();
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) parar(); else arrancar();
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (ent) {
          visible = ent[0].isIntersecting;
          if (visible) arrancar(); else parar();
        }, { threshold: 0 }).observe(lienzo);
      }
    }

    var temporizador;
    window.addEventListener('resize', function () {
      clearTimeout(temporizador);
      temporizador = setTimeout(function () { medir(); pintar(); }, 200);
    });
  })();

  /* ─────────────────────────────────────────────────────────────────────
     3. Char-reveal: las letras suben como sube la masa
     ───────────────────────────────────────────────────────────────────── */
  function partir(el) {
    var original = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', original);
    var trozos = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) trozos.push({ t: 'texto', v: n.nodeValue });
      else if (n.nodeName === 'BR') trozos.push({ t: 'br' });
      else trozos.push({ t: 'texto', v: n.textContent });
    });
    el.textContent = '';
    var letras = [];
    trozos.forEach(function (tr) {
      if (tr.t === 'br') { el.appendChild(document.createElement('br')); return; }
      tr.v.split(/(\s+)/).forEach(function (palabra) {
        if (!palabra) return;
        if (/^\s+$/.test(palabra)) { el.appendChild(document.createTextNode(' ')); return; }
        var cont = document.createElement('span');
        cont.className = 'palabra';
        cont.setAttribute('aria-hidden', 'true');
        palabra.split('').forEach(function (c) {
          var s = document.createElement('span');
          s.className = 'palabra__letra';
          s.textContent = c;
          cont.appendChild(s);
          letras.push(s);
        });
        el.appendChild(cont);
      });
    });
    return letras;
  }

  if (motion) {
    $$('[data-char]').forEach(function (el) {
      var letras = partir(el);
      gsap.set(letras, { yPercent: 105, opacity: 0 });
      if (el.closest('.hero')) {
        // el primer titular no espera al scroll
        gsap.to(letras, { yPercent: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger: 0.022, delay: ESPERA + 0.15 });
        return;
      }
      gsap.to(letras, {
        yPercent: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
        stagger: { each: 0.022, from: 'start' },
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     4. Entradas sencillas
     ───────────────────────────────────────────────────────────────────── */
  if (motion) {
    var entradas = [
      ['[data-reveal-linea]', 18],
      ['.hero__foto', 26],
      ['.hornada', 24],
      ['.corte__ficha', 20],
      ['.cifras li', 22],
      ['.gente__ficha', 22],
      ['.carta__bloque', 24],
      ['.voz', 24],
      ['.banda__figura', 30]
    ];
    entradas.forEach(function (par) {
      $$(par[0]).forEach(function (el, i) {
        gsap.to(el, {
          opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: (i % 4) * 0.06,
          startAt: { y: par[1] },
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     5. Marquesina con velocidad ligada al scroll
     ───────────────────────────────────────────────────────────────────── */
  (function marquesina() {
    var pista = $('[data-marquesina-pista]');
    if (!pista || !motion) return;
    var x = 0, ancho = pista.scrollWidth / 2, dir = 1, extra = 0;

    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: function (self) {
        dir = self.direction || 1;
        extra = Math.min(Math.abs(self.getVelocity()) / 260, 14);
      }
    });

    gsap.ticker.add(function () {
      x -= (1.1 + extra) * dir;
      if (ancho > 0) {
        if (x <= -ancho) x += ancho;
        if (x > 0) x -= ancho;
      }
      pista.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });

    window.addEventListener('resize', function () { ancho = pista.scrollWidth / 2; });
  })();

  /* ─────────────────────────────────────────────────────────────────────
     6. Galería anclada de cortes (scrub horizontal)
     ───────────────────────────────────────────────────────────────────── */
  (function cortes() {
    var seccion = $('[data-cortes]');
    if (!seccion) return;
    var pista = $('[data-cortes-pista]', seccion);
    var pin = $('.cortes__pin', seccion);
    var numero = $('[data-corte-n]');
    var barra = $('[data-corte-barra]');
    var total = $$('.corte', pista).length;

    function pintarIndice(p) {
      var i = Math.min(total, Math.max(1, Math.round(p * (total - 1)) + 1));
      if (numero) numero.textContent = String(i).padStart(2, '0');
      if (barra) barra.style.transform = 'scaleX(' + (0.16 + p * 0.84).toFixed(3) + ')';
    }
    pintarIndice(0);

    if (!motion) {
      // sin movimiento la pista se recorre a mano; el índice lo lleva el scroll lateral
      pista.style.width = '100%';
      pista.style.overflowX = 'auto';
      pista.addEventListener('scroll', function () {
        var max = pista.scrollWidth - pista.clientWidth;
        pintarIndice(max > 0 ? pista.scrollLeft / max : 0);
      });
      return;
    }

    var recorrido = function () { return Math.max(0, pista.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(pista).paddingRight || 0)); };

    gsap.to(pista, {
      x: function () { return -recorrido(); },
      ease: 'none',
      scrollTrigger: {
        trigger: seccion,
        start: 'top top',
        end: function () { return '+=' + (recorrido() + window.innerHeight * 0.6); },
        pin: pin,
        scrub: 0.6,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: function (self) { pintarIndice(self.progress); }
      }
    });
  })();

  /* ─────────────────────────────────────────────────────────────────────
     7. Pila de pasos (sticky-stack). Sin tweens de opacidad: solo escala,
        para no dejar una tarjeta pegada e invisible.
     ───────────────────────────────────────────────────────────────────── */
  if (motion) {
    var items = $$('.pila__item');
    items.forEach(function (item, i) {
      if (i === items.length - 1) return;
      gsap.to($('.paso', item), {
        scale: 0.93,
        yPercent: -3,
        ease: 'none',
        scrollTrigger: {
          trigger: items[i + 1],
          start: 'top 78%',
          end: 'top 26%',
          scrub: true
        }
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     8. Contadores (también sin movimiento: se pintan de golpe)
     ───────────────────────────────────────────────────────────────────── */
  $$('[data-contador]').forEach(function (el) {
    var fin = parseFloat(el.getAttribute('data-contador'));
    var sufijo = el.getAttribute('data-sufijo') || '';
    if (!motion) { el.textContent = fin + sufijo; return; }
    var obj = { v: 0 };
    gsap.to(obj, {
      v: fin, duration: 1.4, ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(obj.v) + sufijo; },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  /* ─────────────────────────────────────────────────────────────────────
     9. Botones magnéticos
     ───────────────────────────────────────────────────────────────────── */
  if (motion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('[data-iman]').forEach(function (el) {
      var qx = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' });
      var qy = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' });
      el.addEventListener('pointermove', function (e) {
        var c = el.getBoundingClientRect();
        qx((e.clientX - (c.left + c.width / 2)) * 0.32);
        qy((e.clientY - (c.top + c.height / 2)) * 0.42);
      });
      el.addEventListener('pointerleave', function () { qx(0); qy(0); });
      el.addEventListener('blur', function () { qx(0); qy(0); });
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
     10. Cursor: una burbuja de miga que engorda sobre lo interactivo
     ───────────────────────────────────────────────────────────────────── */
  (function cursor() {
    var el = $('[data-cursor]');
    if (!el || !motion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var texto = $('.cursor__texto', el);
    var qx = gsap.quickTo(el, 'x', { duration: 0.22, ease: 'power3.out' });
    var qy = gsap.quickTo(el, 'y', { duration: 0.22, ease: 'power3.out' });

    window.addEventListener('pointermove', function (e) { qx(e.clientX); qy(e.clientY); });

    var zonas = [
      ['.corte', 'la miga'],
      ['.hero__foto', 'mírala'],
      ['figure img', 'obrador'],
      ['[data-mapa-boton]', 'cargar'],
      ['a, button', 'vamos']
    ];
    document.addEventListener('pointerover', function (e) {
      for (var i = 0; i < zonas.length; i++) {
        if (e.target.closest(zonas[i][0])) {
          el.classList.add('es-grande');
          texto.textContent = zonas[i][1];
          return;
        }
      }
      el.classList.remove('es-grande');
      texto.textContent = '';
    });
  })();

  /* ─────────────────────────────────────────────────────────────────────
     11. Reloj de hornadas y estado del mostrador (SIEMPRE en vivo)
     ───────────────────────────────────────────────────────────────────── */
  (function horno() {
    // Horario del obrador ficticio. 0 = domingo.
    var HORARIO = {
      0: [[540, 840]],                 // domingo 09:00–14:00
      1: [],                           // lunes cerrado
      2: [[450, 840], [1020, 1200]],   // martes a viernes
      3: [[450, 840], [1020, 1200]],
      4: [[450, 840], [1020, 1200]],
      5: [[450, 840], [1020, 1200]],
      6: [[480, 870]]                  // sábado 08:00–14:30
    };
    var HORNADAS = {
      0: [540],
      1: [],
      2: [450, 660, 1050],
      3: [450, 660, 1050],
      4: [450, 660, 1050],
      5: [450, 660, 1050],
      6: [480, 660]
    };

    var hora = $('[data-reloj-hora]');
    var cuenta = $('[data-reloj-cuenta]');
    var estado = $('[data-estado]');
    var filas = $$('[data-horario] li');
    var tarjetas = $$('[data-hornada]');

    function dosDigitos(n) { return String(n).padStart(2, '0'); }
    function enTexto(min) { return dosDigitos(Math.floor(min / 60)) + ':' + dosDigitos(min % 60); }

    function proxima(ahora) {
      var dia = ahora.getDay();
      var min = ahora.getHours() * 60 + ahora.getMinutes() + ahora.getSeconds() / 60;
      for (var salto = 0; salto < 8; salto++) {
        var d = (dia + salto) % 7;
        var lista = HORNADAS[d];
        for (var i = 0; i < lista.length; i++) {
          var falta = lista[i] - min + salto * 1440;
          if (falta > 0) return { dia: d, minuto: lista[i], falta: falta, hoy: salto === 0 };
        }
      }
      return null;
    }

    function abierto(ahora) {
      var tramos = HORARIO[ahora.getDay()];
      var min = ahora.getHours() * 60 + ahora.getMinutes();
      for (var i = 0; i < tramos.length; i++) {
        if (min >= tramos[i][0] && min < tramos[i][1]) return tramos[i][1];
      }
      return null;
    }

    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    function refrescar() {
      var ahora = new Date();
      var p = proxima(ahora);

      if (hora && cuenta) {
        if (p) {
          hora.textContent = enTexto(p.minuto);
          var h = Math.floor(p.falta / 60);
          var m = Math.floor(p.falta % 60);
          var s = Math.floor((p.falta * 60) % 60);
          cuenta.textContent = (p.hoy ? 'en ' : DIAS[p.dia] + ', en ')
            + (h > 0 ? h + ' h ' : '') + dosDigitos(m) + ' min ' + dosDigitos(s) + ' s';
        } else {
          hora.textContent = '—';
          cuenta.textContent = 'sin hornada programada';
        }
      }

      tarjetas.forEach(function (t) {
        var es = p && enTexto(p.minuto) === t.getAttribute('data-hornada');
        t.classList.toggle('es-proxima', !!es);
        var marca = $('[data-hornada-estado]', t);
        if (!marca) return;
        if (es) marca.textContent = p.hoy ? 'Es la próxima de hoy' : 'La próxima: ' + DIAS[p.dia];
        else {
          var propia = t.getAttribute('data-hornada').split(':');
          var minuto = parseInt(propia[0], 10) * 60 + parseInt(propia[1], 10);
          var ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
          var hoyHornea = HORNADAS[ahora.getDay()].length > 0;
          marca.textContent = !hoyHornea ? 'Hoy no se hornea'
            : (minuto < ahoraMin ? 'Ya salió del horno' : 'Sale más tarde');
        }
      });

      if (estado) {
        var cierre = abierto(ahora);
        if (cierre !== null) {
          estado.textContent = 'Abierto ahora · cierra a las ' + enTexto(cierre);
          estado.classList.add('esta-abierto');
        } else {
          estado.textContent = p ? 'Cerrado · próxima hornada ' + (p.hoy ? 'hoy' : 'el ' + DIAS[p.dia]) + ' a las ' + enTexto(p.minuto) : 'Cerrado';
          estado.classList.remove('esta-abierto');
        }
      }

      filas.forEach(function (f) {
        f.classList.toggle('es-hoy', parseInt(f.getAttribute('data-dia'), 10) === ahora.getDay());
      });
    }

    refrescar();
    setInterval(refrescar, 1000);
  })();

  /* ─────────────────────────────────────────────────────────────────────
     12. Cabecera pegada
     ───────────────────────────────────────────────────────────────────── */
  (function cabecera() {
    var el = $('[data-cabecera]');
    if (!el) return;
    function mirar() { el.classList.toggle('esta-pegada', window.scrollY > 20); }
    mirar();
    window.addEventListener('scroll', mirar, { passive: true });
  })();

  /* ─────────────────────────────────────────────────────────────────────
     13. Menú móvil
     ───────────────────────────────────────────────────────────────────── */
  var boton = $('[data-menu-boton]');
  var menu = $('[data-menu]');
  function cerrarMenu() {
    if (!boton || !menu) return;
    boton.setAttribute('aria-expanded', 'false');
    menu.classList.remove('esta-abierto');
  }
  if (boton && menu) {
    boton.addEventListener('click', function () {
      var abiertoYa = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', String(!abiertoYa));
      menu.classList.toggle('esta-abierto', !abiertoYa);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });
  }

  /* ─────────────────────────────────────────────────────────────────────
     14. Mapa solo bajo clic (nada de terceros hasta que se pide)
     ───────────────────────────────────────────────────────────────────── */
  (function mapa() {
    var caja = $('[data-mapa]');
    var btn = $('[data-mapa-boton]');
    if (!caja || !btn) return;
    btn.addEventListener('click', function () {
      var marco = document.createElement('iframe');
      marco.src = 'https://www.google.com/maps?q=' + encodeURIComponent('Rúa da Fornalla 7, A Coruña') + '&output=embed';
      marco.title = 'Mapa de la dirección de muestra: Rúa da Fornalla, 7, A Coruña';
      marco.loading = 'lazy';
      marco.referrerPolicy = 'no-referrer-when-downgrade';
      btn.remove();
      caja.insertBefore(marco, caja.firstChild);
      if (gsapReady) ScrollTrigger.refresh();
    });
  })();

  /* ─────────────────────────────────────────────────────────────────────
     15. Formulario de encargo (de muestra: no envía nada)
     ───────────────────────────────────────────────────────────────────── */
  (function encargo() {
    var form = $('[data-encargo]');
    if (!form) return;
    var salida = $('[data-encargo-estado]', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = form.querySelector('#nombre').value.trim();
      if (!nombre) {
        salida.textContent = 'Escribe un nombre para poder guardar la bolsa.';
        form.querySelector('#nombre').focus();
        return;
      }
      salida.textContent = 'Formulario de demostración: el encargo de ' + nombre + ' no se ha enviado a ningún sitio.';
    });
  })();

  /* ─────────────────────────────────────────────────────────────────────
     16. Aviso de cookies
     ───────────────────────────────────────────────────────────────────── */
  (function cookies() {
    var banner = $('[data-cookies]');
    if (!banner) return;
    var CLAVE = 'milmigas-cookies';
    var visto = null;
    try { visto = localStorage.getItem(CLAVE); } catch (err) { visto = null; }
    if (!visto) banner.hidden = false;
    var ok = $('[data-cookies-ok]', banner);
    if (ok) {
      ok.addEventListener('click', function () {
        banner.hidden = true;
        try { localStorage.setItem(CLAVE, '1'); } catch (err) { /* modo privado */ }
      });
    }
  })();

  /* ─────────────────────────────────────────────────────────────────────
     17. Refrescos de ScrollTrigger cuando cambian fuentes o imágenes
     ───────────────────────────────────────────────────────────────────── */
  if (gsapReady) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
})();
