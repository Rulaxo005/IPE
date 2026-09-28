/* Navegación de la presentación — Empleabilidad I */
(function () {
  'use strict';

  var mazo = document.querySelector('.mazo');
  if (!mazo) return;
  var pantallas = Array.prototype.slice.call(mazo.querySelectorAll('.pantalla'));
  if (!pantallas.length) return;

  var actual = 0;
  var barra = document.querySelector('.progreso');
  var indice = document.querySelector('.indice');
  var contadores = document.querySelectorAll('[data-contador]');
  var sonidoOn = false;
  var ctxAudio = null;

  /* ---------- clic suave, sin ficheros de audio ---------- */
  function clic() {
    if (!sonidoOn) return;
    try {
      ctxAudio = ctxAudio || new (window.AudioContext || window.webkitAudioContext)();
      var o = ctxAudio.createOscillator(), g = ctxAudio.createGain(), t = ctxAudio.currentTime;
      o.type = 'sine'; o.frequency.setValueAtTime(760, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g); g.connect(ctxAudio.destination); o.start(t); o.stop(t + 0.1);
    } catch (e) { /* sin audio disponible */ }
  }

  /* ---------- notas de glosario al pie de cada pantalla ---------- */
  function notasDe(pantalla) {
    var lista = pantalla.querySelector('.notas-pie');
    if (!lista || lista.dataset.hecho) return;
    var fijo = lista.innerHTML.trim();
    var vistos = {}, salida = [];
    Array.prototype.forEach.call(pantalla.querySelectorAll('.term'), function (t) {
      var clave = (t.textContent || '').trim().toLowerCase();
      if (vistos[clave]) return;
      vistos[clave] = 1;
      salida.push('<li><b>' + t.textContent.trim() + ':</b> ' + (t.dataset.def || '') + '</li>');
    });
    lista.innerHTML = salida.join('') + fijo;
    lista.dataset.hecho = '1';
  }

  /* ---------- cifras que cuentan una vez ---------- */
  function contar(pantalla) {
    Array.prototype.forEach.call(pantalla.querySelectorAll('.cifra[data-valor]'), function (el) {
      if (el.dataset.contado) return;
      el.dataset.contado = '1';
      var destino = parseFloat(el.dataset.valor);
      var dec = (el.dataset.dec ? parseInt(el.dataset.dec, 10) : 0);
      var mil = el.dataset.mil !== 'no';
      var sufijo = el.dataset.sufijo || '';
      var prefijo = el.dataset.prefijo || '';
      if (isNaN(destino)) { el.textContent = ''; return; }
      if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) {
        el.textContent = prefijo + fmt(destino, dec, mil) + sufijo; return;
      }
      var ini = null, dur = 520;
      function paso(ts) {
        if (ini === null) ini = ts;
        var p = Math.min(1, (ts - ini) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = prefijo + fmt(destino * e, dec, mil) + sufijo;
        if (p < 1) requestAnimationFrame(paso);
        else el.textContent = prefijo + fmt(destino, dec, mil) + sufijo;
      }
      requestAnimationFrame(paso);
    });
  }
  function fmt(n, dec, mil) {
    var s = (dec ? n.toFixed(dec) : Math.round(n).toString());
    var partes = s.split('.');
    if (mil) partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return partes.join(',');
  }

  /* ---------- que la pantalla quepa siempre ---------- */
  function sobrante(p, c) {
    var pie = p.querySelector('.pie');
    var abajo = pie ? pie.getBoundingClientRect().top - 2
                    : p.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(p).paddingBottom) || 0);
    var barra = document.querySelector('.barra-inf');
    if (barra) {
      var tb = barra.getBoundingClientRect().top - 6;
      if (tb < abajo) abajo = tb;
    }
    var max = c.getBoundingClientRect().top;
    var todos = c.querySelectorAll('*');
    for (var j = 0; j < todos.length; j++) {
      var e = todos[j], cs = getComputedStyle(e);
      if (cs.position === 'absolute' || cs.position === 'fixed' || cs.display === 'none') continue;
      var r = e.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.bottom > max) max = r.bottom;
    }
    return max - abajo;
  }
  function ajustar(p) {
    var c = p.querySelector('.cuerpo');
    if (!c) return;
    c.style.transform = '';
    c.style.width = '';
    c.style.transformOrigin = 'top left';
    c.style.rowGap = '';
    for (var r = 0; r < c.children.length; r++) c.children[r].style.minHeight = '';
    var prev = p.querySelectorAll('.cuerpo .cols > *');
    for (var q = 0; q < prev.length; q++) prev[q].style.alignSelf = '';
    for (var g = 0; g < c.children.length; g++) c.children[g].style.flexGrow = '';
    c.style.alignSelf = 'start';
    c.style.marginTop = '';
    /* si sobra sitio, ampliar el cuerpo hasta llenar la pantalla */
    function escala(v) {
      if (v > 1.001 || v < 0.999) {
        c.style.transform = 'scale(' + v + ')';
        c.style.width = (100 / v) + '%';
      } else { c.style.transform = ''; c.style.width = ''; }
    }
    /* los bloques dejan de estirarse para poder medir el contenido de verdad */
    for (var d = 0; d < c.children.length; d++) c.children[d].style.flexGrow = '0';
    var z = 1, pasos = 0;
    while (z < 1.24 && pasos < 24 && sobrante(p, c) < -10) {
      z = Math.round((z + 0.03) * 1000) / 1000;
      escala(z);
      pasos++;
    }
    if (z > 1 && sobrante(p, c) > 0) {
      z = Math.round((z - 0.03) * 1000) / 1000;
      escala(z);
    }
    /* si todavia no cabe, se reduce paso a paso: monotono y sin saltos */
    var k = z, vueltas = 0;
    while (k > 0.74 && vueltas < 60 &&
           sobrante(p, c) > 2) {
      k = Math.round((k - 0.025) * 1000) / 1000;
      if (k < 0.74) k = 0.74;
      escala(k);
      vueltas++;
    }
    /* sin ampliar, los bloques que deben crecer vuelven a estirarse: los graficos llenan */
    var estirado = false;
    if (k > 0.999 && k < 1.001) {
      c.style.transform = ''; c.style.width = '';
      for (var e = 0; e < c.children.length; e++) c.children[e].style.flexGrow = '';
      if (p.querySelector('.cuerpo .crece')) {
        c.style.alignSelf = '';
        estirado = true;
        if (sobrante(p, c) > 2) {
          c.style.alignSelf = 'start';
          estirado = false;
        }
      }
    }
    /* el reparto vertical lo hace el CSS: .cols usa align-items:start */
    var tope = p.querySelector('.pie');
    var hasta = tope ? tope.getBoundingClientRect().top - 2
                     : p.getBoundingClientRect().bottom;
    var bi = document.querySelector('.barra-inf');
    if (bi && bi.getBoundingClientRect().top - 6 < hasta) hasta = bi.getBoundingClientRect().top - 6;
    repartirHueco(c, k, (hasta - c.getBoundingClientRect().top) / (k || 1));
    if (sobrante(p, c) > 2) {
      c.style.rowGap = '';
      for (var t = 0; t < c.children.length; t++) c.children[t].style.minHeight = '';
      var col = p.querySelectorAll('.cuerpo .cols > *');
      for (var u = 0; u < col.length; u++) col[u].style.alignSelf = '';
    }
    /* si aun queda mucho blanco abajo, una parte pasa arriba para que quede centrado */
    var resto = estirado ? 0 : -sobrante(p, c);
    if (resto > 60) c.style.marginTop = Math.round(Math.min(resto * 0.5, 300)) + 'px';
    ajustarGraficos(p);
  }
  /* el sitio que sobra se reparte en los huecos, con tope, y el resto queda abajo */
  function repartirHueco(c, k, disponible) {
    var hijos = c.children, n = hijos.length;
    c.style.rowGap = '';
    for (var i = 0; i < n; i++) hijos[i].style.minHeight = '';
    if (!n) return;
    if (!k || k <= 0) k = 1;
    var base = parseFloat(getComputedStyle(c).rowGap) || 0, suma = 0;
    for (var j = 0; j < n; j++) suma += hijos[j].getBoundingClientRect().height / k;
    var huecos = n - 1;
    var hay = disponible || (c.getBoundingClientRect().height / k);
    var sobra = hay - (suma + base * huecos) - 4;
    if (sobra < 10) return;
    if (huecos > 0) {
      var extra = Math.min(sobra / huecos, 40);
      c.style.rowGap = Math.floor(base + extra) + 'px';
      sobra -= extra * huecos;
    }
  }

  /* dos columnas de alturas muy dispares no deben estirarse a la misma altura */
  function equilibrarColumnas(p) {
    var filas = p.querySelectorAll('.cuerpo .cols');
    for (var i = 0; i < filas.length; i++) {
      var f = filas[i], h = f.children, n = h.length, j;
      if (n < 2) continue;
      if (f.classList.contains('arriba')) continue;
      for (j = 0; j < n; j++) h[j].style.alignSelf = 'flex-start';
      var min = Infinity, max = 0;
      for (j = 0; j < n; j++) {
        var v = h[j].getBoundingClientRect().height;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (max > 0 && min >= max * 0.5) {
        for (j = 0; j < n; j++) h[j].style.alignSelf = '';
      }
    }
  }

  /* que el marco del grafico no quede mas ancho que el dibujo */
  function ajustarGraficos(p) {
    var figs = p.querySelectorAll('.grafico');
    for (var i = 0; i < figs.length; i++) {
      var f = figs[i], im = f.querySelector('img');
      f.style.maxWidth = ''; f.style.marginLeft = ''; f.style.marginRight = ''; f.style.maxHeight = '';
      if (!im || !im.naturalWidth || !im.naturalHeight) continue;
      var r = im.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      var anchoDibujo = r.height * (im.naturalWidth / im.naturalHeight);
      if (anchoDibujo < r.width - 8) {
        var extra = f.getBoundingClientRect().width - r.width;
        f.style.maxWidth = Math.ceil(anchoDibujo + extra + 2) + 'px';
        f.style.marginLeft = 'auto';
        f.style.marginRight = 'auto';
      }
      var cf = getComputedStyle(f), sumaV = 0;
      for (var h = 0; h < f.children.length; h++) sumaV += f.children[h].getBoundingClientRect().height;
      sumaV += (parseFloat(cf.rowGap) || 0) * Math.max(0, f.children.length - 1);
      sumaV += (parseFloat(cf.paddingTop) || 0) + (parseFloat(cf.paddingBottom) || 0);
      if (f.getBoundingClientRect().height > sumaV + 6) f.style.maxHeight = Math.ceil(sumaV + 4) + 'px';
    }
  }
  function ajustarTodas() {
    pantallas.forEach(function (p) {
      var activa = p.classList.contains('activa');
      if (!activa) { p.style.visibility = 'hidden'; p.classList.add('activa'); }
      ajustar(p);
      if (!activa) { p.classList.remove('activa'); p.style.visibility = ''; }
    });
  }
  function medirBarra() {
    var b = document.querySelector('.barra-inf');
    if (!b) return;
    document.documentElement.style.setProperty('--ancho-barra', Math.round(b.offsetWidth) + 'px');
  }
  medirBarra();
  window.addEventListener('resize', medirBarra);
  window.__ajustarTodas = ajustarTodas;
  window.__ajustar = ajustar;

  var temporizador = null;
  window.addEventListener('resize', function () {
    clearTimeout(temporizador);
    temporizador = setTimeout(ajustarTodas, 160);
  });

  /* ---------- mover ---------- */
  function ir(n, silencio) {
    n = Math.max(0, Math.min(pantallas.length - 1, n));
    if (n === actual && pantallas[actual].classList.contains('activa')) return;
    pantallas[actual].classList.remove('activa');
    actual = n;
    var p = pantallas[actual];
    p.classList.add('activa');
    p.scrollTop = 0;
    notasDe(p);
    ajustar(p);
    contar(p);
    if (barra) barra.style.width = (pantallas.length > 1 ? (actual / (pantallas.length - 1)) * 100 : 100) + '%';
    Array.prototype.forEach.call(contadores, function (c) {
      c.innerHTML = '<b>' + dos(actual + 1) + '</b> / ' + dos(pantallas.length);
    });
    if (indice) {
      Array.prototype.forEach.call(indice.querySelectorAll('button[data-ir]'), function (b) {
        b.classList.toggle('aqui', parseInt(b.dataset.ir, 10) === actual);
      });
    }
    if (p.dataset.ancla) {
      try { history.replaceState(null, '', '#' + p.dataset.ancla); } catch (e) {}
    }
    if (!silencio) clic();
  }
  function dos(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- índice ---------- */
  function pintarIndice() {
    if (!indice) return;
    var ol = indice.querySelector('ol');
    if (!ol) return;
    var html = '';
    pantallas.forEach(function (p, i) {
      if (p.dataset.grupo) html += '<li class="grupo">' + p.dataset.grupo + '</li>';
      var t = p.dataset.titulo || (p.querySelector('h1,h2') ? p.querySelector('h1,h2').textContent.trim() : 'Pantalla');
      html += '<li><button data-ir="' + i + '"><span>' + dos(i + 1) + '</span><span>' + t + '</span></button></li>';
    });
    ol.innerHTML = html;
    ol.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-ir]');
      if (!b) return;
      cerrarIndice();
      ir(parseInt(b.dataset.ir, 10));
    });
  }
  function abrirIndice() { if (indice) { indice.classList.add('abierto'); document.body.classList.add('indice-abierto'); } }
  function cerrarIndice() { if (indice) { indice.classList.remove('abierto'); document.body.classList.remove('indice-abierto'); } }
  function alternarIndice() { indice && (indice.classList.contains('abierto') ? cerrarIndice() : abrirIndice()); }

  /* ---------- pantalla completa ---------- */
  function completa() {
    var d = document;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      (d.documentElement.requestFullscreen || d.documentElement.webkitRequestFullscreen).call(d.documentElement);
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    }
  }

  /* ---------- desplazamiento dentro de la pantalla ---------- */
  function desplazar(d) {
    var p = pantallas[actual];
    if (!p) return;
    if (p.scrollHeight - p.clientHeight < 2) return;
    if (p.scrollBy) p.scrollBy({ top: d, behavior: 'smooth' });
    else p.scrollTop += d;
  }

  /* ---------- teclado ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (indice && indice.classList.contains('abierto')) {
      if (k === 'Escape') { e.preventDefault(); cerrarIndice(); }
      return;
    }
    if (k === 'ArrowRight' || k === 'PageDown') {
      e.preventDefault(); ir(actual + 1);
    } else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') {
      e.preventDefault(); ir(actual - 1);
    } else if (k === 'ArrowDown') { e.preventDefault(); desplazar(96); }
    else if (k === 'ArrowUp') { e.preventDefault(); desplazar(-96); }
    else if (k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      var pa = pantallas[actual];
      desplazar(pa ? pa.clientHeight * 0.82 : 400);
    }
    else if (k === 'Home') { e.preventDefault(); ir(0); }
    else if (k === 'End') { e.preventDefault(); ir(pantallas.length - 1); }
    else if (k === 'Escape') { e.preventDefault(); alternarIndice(); }
    else if (k === 'f' || k === 'F') { e.preventDefault(); completa(); }
  });

  /* ---------- botones ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-accion]');
    if (!b) return;
    var a = b.dataset.accion;
    if (a === 'antes') ir(actual - 1);
    else if (a === 'despues') ir(actual + 1);
    else if (a === 'indice') alternarIndice();
    else if (a === 'cerrar-indice') cerrarIndice();
    else if (a === 'completa') completa();
    else if (a === 'sonido') {
      sonidoOn = !sonidoOn;
      b.textContent = sonidoOn ? 'Sonido activado' : 'Sonido apagado';
      b.setAttribute('aria-pressed', sonidoOn ? 'true' : 'false');
      medirBarra();
      if (sonidoOn) clic();
    }
    else if (a === 'moneda') {
      enAud = !enAud;
      pintarMoneda();
      if (pantallas[actual]) ajustar(pantallas[actual]);
      b.textContent = enAud ? 'Ver en euros' : 'Ver en dólares australianos';
      b.setAttribute('aria-pressed', enAud ? 'true' : 'false');
      if (sonidoOn) clic();
    }
  });

  /* ---------- interruptor de moneda ---------- */
  var enAud = false;
  function pintarMoneda() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-eur][data-aud]'), function (el) {
      el.textContent = enAud ? el.dataset.aud : el.dataset.eur;
    });
  }

  /* ---------- deslizamiento tactil: solo horizontal ---------- */
  var tocaY = null, tocaX = null;
  mazo.addEventListener('touchstart', function (e) {
    tocaY = e.touches[0].clientY; tocaX = e.touches[0].clientX;
  }, { passive: true });
  mazo.addEventListener('touchend', function (e) {
    if (tocaY === null) return;
    var dy = tocaY - e.changedTouches[0].clientY, dx = tocaX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.6) ir(actual + (dx > 0 ? 1 : -1));
    tocaY = null; tocaX = null;
  }, { passive: true });

  /* ---------- arranque ---------- */
  pintarIndice();
  var inicio = 0;
  if (location.hash) {
    var h = location.hash.slice(1);
    pantallas.forEach(function (p, i) { if (p.dataset.ancla === h || p.id === h) inicio = i; });
  }
  pantallas.forEach(function (p) { p.classList.remove('activa'); });
  actual = inicio;
  pantallas[inicio].classList.add('activa');
  notasDe(pantallas[inicio]);
  contar(pantallas[inicio]);
  if (barra) barra.style.width = (pantallas.length > 1 ? (inicio / (pantallas.length - 1)) * 100 : 100) + '%';
  Array.prototype.forEach.call(contadores, function (c) {
    c.innerHTML = '<b>' + dos(inicio + 1) + '</b> / ' + dos(pantallas.length);
  });

  /* al arrancar: esperar a fuentes y graficos y medir todas */
  function arranqueAjuste() { try { ajustarTodas(); } catch (e) {} }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(arranqueAjuste);
  window.addEventListener('load', arranqueAjuste);
  setTimeout(arranqueAjuste, 60);
  setTimeout(arranqueAjuste, 500);

  /* imprimir: que se vea todo */
  window.addEventListener('beforeprint', function () {
    pantallas.forEach(function (p) {
      var c = p.querySelector('.cuerpo');
      if (c) { c.style.transform = ''; c.style.width = ''; }
      notasDe(p); Array.prototype.forEach.call(p.querySelectorAll('.cifra[data-valor]'), function (el) {
      el.dataset.contado = '1';
      el.textContent = (el.dataset.prefijo || '') + fmt(parseFloat(el.dataset.valor), el.dataset.dec ? parseInt(el.dataset.dec, 10) : 0, el.dataset.mil !== 'no') + (el.dataset.sufijo || '');
    });
    });
  });
})();
