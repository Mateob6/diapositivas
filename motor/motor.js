/* motor.js: el núcleo del sistema de diapositivas web.
   Escenario de 1920 × 1080, navegación, pasos declarativos (data-paso, data-foco, data-sale)
   y utilidades de animación. Los objetos (bloque con pieles, recta, diagrama, cita,
   temporizador, tabla) se registran en objetos.js. Referencia de uso: MOTOR.md.

   Orden en la clase:  vendor/gsap.min.js → motor.js → objetos.js → (script propio de la clase) */
(() => {
'use strict';

const M = window.Motor = window.Motor || {};
const lienzo = document.getElementById('lienzo');
if (!window.gsap) {
  document.body.innerHTML = '<p style="font:20px sans-serif;padding:40px">No se encontró GSAP. La clase debe enlazar <code>motor/vendor/gsap.min.js</code> antes de <code>motor/motor.js</code>.</p>';
  return;
}
if (!lienzo) { console.error('Motor: falta <main id="lienzo">.'); return; }

const NS = 'http://www.w3.org/2000/svg';
const params = new URLSearchParams(location.search);
/* ?prueba: la herramienta de revisión recorre la clase; se guardan los errores desde el primer momento */
const errores = [];
if (params.has('prueba')) {
  addEventListener('error', e => errores.push(`${e.message} (${(e.filename || '').split('/').pop()}:${e.lineno})`));
  addEventListener('unhandledrejection', e => errores.push(String(e.reason)));
  const ce = console.error.bind(console);
  console.error = (...a) => { errores.push(a.map(String).join(' ')); ce(...a); };
}
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
M.$ = $; M.$$ = $$;

/* ---------- modo claro u oscuro: el botón de la portada lo cambia y el navegador lo recuerda ---------- */
const CLAVE_TEMA = 'motor-tema';
const temaGuardado = (() => { try { return localStorage.getItem(CLAVE_TEMA); } catch (e) { return null; } })();
document.documentElement.dataset.tema = params.has('oscuro') ? 'oscuro' : params.has('claro') ? 'claro' : (temaGuardado || 'claro');
M.tema = t => {
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem(CLAVE_TEMA, t); } catch (e) { /* sin almacenamiento: vale solo para esta vez */ }
  rotularTema();
};
function rotularTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  $$('.boton-tema').forEach(b => { b.setAttribute('aria-pressed', oscuro); b.lastChild.textContent = oscuro ? 'Modo claro' : 'Modo oscuro'; });
}
function botonTema() {
  const portada = $('.diapositiva.portada', lienzo);
  if (!portada || $('.boton-tema', portada)) return;
  const b = Object.assign(document.createElement('button'), { type: 'button', className: 'boton-tema' });
  b.innerHTML = '<span class="icono-tema" aria-hidden="true"></span><span></span>';
  b.addEventListener('click', e => { e.stopPropagation(); M.tema(document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro'); b.blur(); });
  portada.append(b);
  rotularTema();
}

/* ---------- paleta: se lee de paleta.css; aquí no se escribe ningún color ---------- */
M.color = nombre => getComputedStyle(document.documentElement).getPropertyValue('--' + nombre).trim();
const atenuado = () => parseFloat(M.color('atenuado')) || .6;

/* ---------- movimiento (DESIGN-v2: la entrada de Gamma, más corta; el texto nunca rebota) ---------- */
const MOV = M.mov = { entrada: 'power4.out', cambio: 'power2.inOut', duracion: .7, cascada: .12, fundido: .3 };

/* ---------- números en español: coma decimal y signo menos tipográfico ---------- */
const NUM = /[−-]?\d+(?:,\d+)?/;
M.numero = s => parseFloat(String(s).replace('−', '-').replace(',', '.'));
M.fmt = (v, dec = 2) => {
  const t = Math.abs(v).toFixed(dec).replace('.', ',');
  return (v < 0 && /[1-9]/.test(t) ? '−' : '') + t;
};
M.decimales = s => ((String(s).split(/[.,]/)[1]) || '').length;

/* ---------- SVG ---------- */
M.svg = (tag, attrs = {}, padre) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (padre) padre.appendChild(e);
  return e;
};
/* Convierte un path (o line) de clase «flecha» en trazo + punta triangular llena. */
M.flecha = p => {
  if (p._m) return p;
  if (p.tagName === 'line') {
    const q = M.svg('path', { d: `M${p.getAttribute('x1')} ${p.getAttribute('y1')} L${p.getAttribute('x2')} ${p.getAttribute('y2')}` });
    for (const a of p.attributes) if (!/^(x1|y1|x2|y2)$/.test(a.name)) q.setAttribute(a.name, a.value);
    p.replaceWith(q); p = q;
  }
  const T = p.getTotalLength(), H = 24, W = 11;
  const fin = p.getPointAtLength(T), antes = p.getPointAtLength(Math.max(0, T - 2));
  const a = Math.atan2(fin.y - antes.y, fin.x - antes.x);
  const bx = fin.x - H * Math.cos(a), by = fin.y - H * Math.sin(a);
  const punta = M.svg('path', {
    d: `M${fin.x} ${fin.y} L${bx - W * Math.sin(a)} ${by + W * Math.cos(a)} L${bx + W * Math.sin(a)} ${by - W * Math.cos(a)} Z`,
    class: ['punta', ...[...p.classList].filter(c => c !== 'flecha')].join(' ')
  });
  p.after(punta);
  p._m = { largo: Math.max(0, T - H + 2), punta };
  p.style.strokeDasharray = `${p._m.largo} ${T + 1}`;
  return p;
};

/* ---------- utilidades de animación ---------- */
const HOJAS = 'rect, path, line, circle, ellipse, polyline, polygon, text';
const A = M.anim = {
  /* entrada base: sube 20 px y aparece */
  sube(el, tl, at = 0, d = MOV.duracion) {
    return tl.fromTo(el, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: d, ease: MOV.entrada }, at);
  },
  aparece(el, tl, at = 0, d = .5) {
    return tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d, ease: 'power1.out' }, at);
  },
  /* títulos: el texto sube desde abajo dentro de su máscara */
  mascara(h, tl, at = 0) {
    const s = h.querySelector(':scope > .m');
    if (!s) return A.sube(h, tl, at);
    tl.set(h, { opacity: 1 }, at);
    return tl.fromTo(s, { yPercent: 115 }, { yPercent: 0, duration: .9, ease: 'expo.out' }, at);
  },
  /* pregunta grande: palabra por palabra */
  palabras(el) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodos = [];
    while (w.nextNode()) nodos.push(w.currentNode);
    nodos.forEach(t => {
      const frag = document.createDocumentFragment();
      t.textContent.split(/(\s+)/).forEach(p => {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
        const o = document.createElement('span'); o.className = 'w';
        const i = document.createElement('span'); i.textContent = p;
        o.appendChild(i); frag.appendChild(o);
      });
      t.replaceWith(frag);
    });
  },
  palabrasEntran(el, tl, at = 0) {
    tl.set(el, { opacity: 1 }, at);
    return tl.fromTo($$('.w > span', el), { yPercent: 110 }, { yPercent: 0, duration: .8, ease: 'expo.out', stagger: .045 }, at);
  },
  /* foco por pasos: lo anterior baja a --atenuado (60 %) y se sigue leyendo; en la lectura del celular no se atenúa nada */
  atenuar(el, tl, at = 0) { return M.lectura ? tl : tl.to(el, { opacity: atenuado(), duration: .45 }, at); },
  ocultar(el, tl, at = 0) { return tl.to(el, { opacity: 0, duration: .3 }, at); },
  /* trazos que se dibujan */
  largo(el) { return el._m ? el._m.largo : el.getTotalLength(); },
  ocultarTrazo(el) {
    const L = A.largo(el);
    el.style.strokeDasharray = `${L} ${el.getTotalLength() + 1}`;
    el.style.strokeDashoffset = L;
    if (el._m) gsap.set(el._m.punta, { opacity: 0 });
  },
  dibujar(el, tl, at = 0, d = .9) {
    const L = A.largo(el);
    el.style.strokeDasharray = `${L} ${el.getTotalLength() + 1}`;
    tl.fromTo(el, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: d, ease: MOV.cambio }, at);
    if (el._m) tl.fromTo(el._m.punta, { opacity: 0 }, { opacity: 1, duration: .2 }, at + d - .1);
    return tl;
  },
  /* grupos SVG: los trazos se dibujan y los textos y rellenos aparecen, en orden */
  hojas(nodo) { return (nodo.matches(HOJAS) ? [nodo] : $$(HOJAS, nodo)).filter(h => !h.classList.contains('punta')); },
  esTrazo(h) { if (h.tagName === 'text') return false; const s = getComputedStyle(h); return s.stroke !== 'none' && s.fill === 'none'; },
  ocultarGrupo(hojas) { hojas.forEach(h => A.esTrazo(h) ? A.ocultarTrazo(h) : gsap.set(h, { opacity: 0 })); },
  dibujarGrupo(hojas, tl, at = 0) {
    hojas.forEach((h, k) => {
      const t = at + k * .1;
      if (A.esTrazo(h)) A.dibujar(h, tl, t, .7); else A.aparece(h, tl, t + .15);
    });
    return tl;
  },
  /* contador: busca el último número del texto y cuenta hasta él */
  contar(el, tl, at = 0, d = 1.2, desde = 0) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let nodo = null;
    while (w.nextNode()) if (NUM.test(w.currentNode._orig ?? w.currentNode.textContent)) nodo = w.currentNode;
    if (!nodo) return tl;
    const orig = nodo._orig ??= nodo.textContent;
    /* el último número del texto: en «P(cara) = 1/2 = 0,50» cuenta el 0,50 */
    const m = [...orig.matchAll(new RegExp(NUM.source, 'g'))].pop();
    const fin = M.numero(m[0]), dec = (m[0].split(',')[1] || '').length;
    const antes = orig.slice(0, m.index), despues = orig.slice(m.index + m[0].length);
    const pinta = v => { nodo.textContent = antes + M.fmt(v, dec) + despues; };
    const o = { v: desde };
    pinta(desde);
    return tl.fromTo(o, { v: desde }, { v: fin, duration: d, ease: MOV.cambio, onUpdate: () => pinta(o.v), onComplete: () => pinta(fin) }, at);
  }
};

/* ---------- registro: diapositivas con JavaScript propio y objetos ---------- */
const defs = {};
/* Motor.diapositiva('id', { preparar(el), entrada(el, tl), pasos: [fn, …] o {1: fn, …}, detener(el), automatico: true }) */
M.diapositiva = (id, def) => { defs[id] = Object.assign(defs[id] || {}, def); };
const componentes = [];
/* Motor.componente(selector, el => ({ reset(), entrada(tl, at), pasos?() → [{paso, entrar(tl, at)}], detener?() })) */
M.componente = (selector, construir) => { componentes.push({ selector, construir }); };
const ctl = new WeakMap();
M.controlador = el => ctl.get(el);

/* ---------- preparación y plan de cada diapositiva ---------- */
let slides = [];
const planes = new Map();
const CONTENEDORES = '.columnas, .pila, .relevo, .grupo';
const INTERACTIVO = 'input, button, a, select, textarea, video, iframe, .temporizador, [data-interactivo], [data-explica]';
const esPaso = n => n.hasAttribute('data-paso') && n.dataset.paso !== '0';
const pasoDe = n => { const v = n.dataset.paso; return v && /^\d+$/.test(v) ? +v : null; };
/* ¿el nodo entra con su contenedor, o tiene un paso propio en el camino? */
const libre = (n, raiz) => { const p = n.closest('[data-paso]:not([data-paso="0"])'); return !p || p === raiz || !raiz.contains(p); };

function preparar() {
  slides = $$(':scope > .diapositiva', lienzo);
  slides.forEach((el, i) => { if (!el.id) el.id = 'd' + (i + 1); });
  slides.forEach(el => {
    $$(':scope > h1, :scope > h2', el).forEach(h => {
      if (!h.querySelector(':scope > .m')) h.innerHTML = `<span class="m">${h.innerHTML}</span>`;
      h.classList.add('mascara');
    });
    $$('.pregunta', el).forEach(A.palabras);
    $$('.subraya', el).forEach(s => { if (!s.querySelector(':scope > .trazo-sub')) s.append(Object.assign(document.createElement('i'), { className: 'trazo-sub' })); });
    $$('.etiqueta[data-letra]', el).forEach(e => { if (!e.querySelector(':scope > i')) e.prepend(Object.assign(document.createElement('i'), { textContent: e.dataset.letra })); });
    const propios = [];
    componentes.forEach(({ selector, construir }) => $$(selector, el).forEach(n => {
      if (ctl.has(n)) return;
      const c = construir(n, el);
      if (!c) return;
      ctl.set(n, c); propios.push(c);
      if (c.pasos) n.setAttribute('data-m-pasos', '');
    }));
    defs[el.id]?.preparar?.(el);
    planes.set(el, planear(el, propios));
  });
}

function normalizarPasos(p) {
  const out = {};
  if (Array.isArray(p)) p.forEach((f, i) => { if (f) out[i + 1] = f; });
  else if (p) for (const k in p) out[+k] = p[k];
  return out;
}

function planear(el, ctls) {
  const def = defs[el.id] || {};
  const auto = def.automatico !== false;
  const unidades = [], items = [];
  if (auto) {
    const recorrer = padre => [...padre.children].forEach(h => {
      if (h.matches('script, template')) return;
      if (esPaso(h)) return;
      if (h.matches(CONTENEDORES)) return recorrer(h);
      unidades.push(h);
    });
    recorrer(el);
    let n = 0;
    $$('[data-paso], [data-m-pasos]', el).forEach(nodo => {
      if (nodo.hasAttribute('data-m-interno')) return;
      if (nodo.dataset.paso === '0') {
        if (nodo.dataset.sale) items.push(itemInicial(nodo));
      } else if (nodo.hasAttribute('data-paso')) {
        const k = pasoDe(nodo) ?? n + 1; n = Math.max(n, k);
        items.push(itemDe(nodo, k));
      }
      if (nodo.hasAttribute('data-m-pasos')) ctl.get(nodo).pasos().forEach(p => {
        const k = p.paso ?? n + 1; n = Math.max(n, k);
        items.push(Object.assign({}, p, { paso: k }));
      });
    });
  }
  const propios = normalizarPasos(def.pasos);
  const total = Math.max(0, ...items.map(i => i.paso), ...Object.keys(propios).map(Number));
  return { def, auto, unidades, items, propios, total, ctls };
}

/* un elemento con data-paso: entra en su paso y, si tiene data-sale, se atenúa u oculta en el siguiente */
function itemDe(nodo, k) {
  return {
    paso: k, sale: nodo.dataset.sale,
    reset: () => resetNodo(nodo),
    entrar: (tl, at) => entrarNodo(nodo, tl, at),
    salir: (tl, at) => nodo.dataset.sale === 'ocultar' ? A.ocultar(nodo, tl, at) : A.atenuar(nodo, tl, at)
  };
}
/* data-paso="0" con data-sale: entra con la diapositiva y sale en el paso 1 */
function itemInicial(nodo) {
  return { paso: 0, sale: nodo.dataset.sale, reset: () => gsap.set(nodo, { opacity: 1 }), entrar() {}, salir: itemDe(nodo, 0).salir };
}

function resetNodo(nodo) {
  ctl.get(nodo)?.reset?.();
  if (nodo.matches('.subraya')) return gsap.set(nodo.querySelector(':scope > .trazo-sub'), { scaleX: 0 });
  if (nodo instanceof SVGElement && !nodo.matches('svg')) { gsap.set(nodo, { opacity: 1 }); return A.ocultarGrupo(A.hojas(nodo)); }
  gsap.set(nodo, { opacity: 0 });
}

function entrarNodo(nodo, tl, at) {
  if (nodo.matches('.subraya')) return tl.to(nodo.querySelector(':scope > .trazo-sub'), { scaleX: 1, duration: .7, ease: 'expo.inOut' }, at);
  if (nodo instanceof SVGElement && !nodo.matches('svg')) return A.dibujarGrupo(A.hojas(nodo), tl, at);
  const padre = nodo.parentElement;
  if (padre && padre.matches('.relevo')) {
    [...padre.children].forEach(h => { if (h !== nodo) A.ocultar(h, tl, at); });
    return entradaUnidad(nodo, tl, at + .3);
  }
  entradaUnidad(nodo, tl, at);
}

/* cómo entra cada pieza según lo que es */
function entradaUnidad(u, tl, at) {
  const c = ctl.get(u);
  if (c) { tl.set(u, { opacity: 1 }, at); c.entrada(tl, at); return; }
  if (u.matches('h1, h2')) return A.mascara(u, tl, at);
  if (u.matches('.pregunta')) {
    A.palabrasEntran(u, tl, at);
    $$('.subraya', u).forEach(s => { if (libre(s, u)) tl.to(s.querySelector('.trazo-sub'), { scaleX: 1, duration: .7, ease: 'expo.inOut' }, at + .9); });
    return;
  }
  if (u.matches('hr.regla')) return tl.fromTo(u, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'expo.inOut' }, at);
  A.sube(u, tl, at);
  if (u.matches('[data-contar]')) A.contar(u, tl, at + .1);
  $$('[data-contar]', u).forEach(n => { if (libre(n, u)) A.contar(n, tl, at + .1); });
  $$('.subraya', u).forEach(s => { if (libre(s, u)) tl.to(s.querySelector('.trazo-sub'), { scaleX: 1, duration: .7, ease: 'expo.inOut' }, at + .5); });
  $$('*', u).forEach(n => { const k = ctl.get(n); if (k && libre(n, u)) k.entrada(tl, at + .1); });
}

/* ---------- entrada y pasos ---------- */
function entrada(el) {
  const p = planes.get(el), tl = gsap.timeline();
  if (p.auto) {
    p.ctls.forEach(c => c.reset?.());
    $$('.subraya > .trazo-sub', el).forEach(t => gsap.set(t, { scaleX: 0 }));
    p.items.forEach(i => i.reset?.());
    let t = 0;
    p.unidades.forEach(u => { entradaUnidad(u, tl, t); t = u.matches('h1, h2') ? Math.max(t, .25) : t + MOV.cascada; });
  }
  p.def.entrada?.(el, tl);
  return tl;
}

function paso(el, k) {
  const p = planes.get(el), tl = gsap.timeline();
  p.items.filter(i => i.paso === k - 1 && i.sale).forEach(i => i.salir(tl, 0));
  p.items.filter(i => i.paso === k).forEach((i, n) => i.entrar(tl, .05 + n * MOV.cascada));
  p.propios[k]?.(el, tl);
  return tl;
}

/* ---------- navegación ---------- */
const estatico = params.has('estatico') || params.has('prueba');
let cur = 0, step = 0, corriendo = [];
let pieIzq, pieDer, progreso, titulo;
M.instantaneo = false;

/* al cambiar de diapositiva se paran temporizadores y animaciones que se repiten solas (detener de objetos y de diapositivas propias) */
function detenerTodo() { planes.forEach((p, el) => { p.ctls.forEach(c => c.detener?.()); p.def.detener?.(el); }); }
function terminar() { corriendo.forEach(t => t && t.progress(1)); corriendo = []; }
function sinTransicion() {
  lienzo.classList.add('sin-transicion');
  requestAnimationFrame(() => requestAnimationFrame(() => lienzo.classList.remove('sin-transicion')));
}

function mostrar(i, hasta = 0, instant = estatico) {
  corriendo.forEach(t => t && t.kill()); corriendo = [];
  detenerTodo();
  sinTransicion();
  slides.forEach((s, k) => s.classList.toggle('on', k === i));
  cur = i; step = 0;
  const el = slides[i], p = planes.get(el);
  const n = Math.min(hasta, p.total);
  if (instant || n > 0) {
    M.instantaneo = true;
    entrada(el).progress(1);
    for (let k = 1; k <= n; k++) paso(el, k).progress(1);
    M.instantaneo = false;
    step = n;
    gsap.set(el, { opacity: 1 });
  } else {
    corriendo.push(entrada(el), gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: MOV.fundido, ease: 'power1.out' }));
  }
  marco();
}

function siguiente() {
  const el = slides[cur], p = planes.get(el);
  if (step < p.total) {
    terminar();
    step++;
    const t = paso(el, step);
    if (estatico) t.progress(1); else corriendo.push(t);
    marco();
  } else if (cur < slides.length - 1) mostrar(cur + 1);
}
function anterior() {
  if (step > 0) mostrar(cur, step - 1, true);
  else if (cur > 0) mostrar(cur - 1, Infinity, true);
}
M.siguiente = siguiente;
M.anterior = anterior;
M.ir = (n, k = 0) => mostrar(Math.max(0, Math.min(slides.length - 1, n - 1)), k, k > 0 || estatico);
M.estado = () => ({ diapositiva: cur + 1, paso: step, pasos: planes.get(slides[cur]).total, total: slides.length });

function marco() {
  const total = planes.get(slides[cur]).total;
  pieDer.textContent = `${cur + 1} / ${slides.length}`;
  pieIzq.textContent = cur === 0 ? 'Flechas, espacio o clic para avanzar · F pantalla completa' : titulo;
  gsap.to(progreso, { width: (cur + (total ? step / total : 1)) / slides.length * 1920, duration: estatico ? 0 : .4, ease: 'power2.out' });
  history.replaceState(null, '', location.pathname + location.search + '#' + (cur + 1) + (step ? '.' + step : ''));
}

function leerHash() {
  const [s, k] = location.hash.slice(1).split('.').map(v => parseInt(v, 10));
  return [s >= 1 && s <= slides.length ? s - 1 : 0, k > 0 ? k : 0];
}

/* ---------- escenario ---------- */
const movilMQ = matchMedia('(orientation: portrait) and (max-width: 760px)');
const esMovil = () => movilMQ.matches || params.has('movil');
function ajustar() {
  if (esMovil()) return;
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  lienzo.style.transform = `translate(-50%,-50%) scale(${s})`;
}

/* celular en vertical: todas las diapositivas completas, una debajo de otra */
/* ?imprimir: todas las diapositivas en su estado final, a tamaño real, una por página (clase.py pdf las imprime con Chrome) */
const imprimir = params.has('imprimir');
function modoImprimir() {
  document.documentElement.classList.add('imprimir'); document.body.classList.add('imprimir');
  document.documentElement.dataset.tema = 'claro';
  M.instantaneo = true; M.lectura = true;
  slides.forEach(el => {
    entrada(el).progress(1);
    for (let k = 1; k <= planes.get(el).total; k++) paso(el, k).progress(1);
  });
  M.instantaneo = false;
}

function modoDesplazar() {
  document.documentElement.classList.add('desplazar'); document.body.classList.add('desplazar');
  const s = innerWidth / 1920;
  M.instantaneo = true; M.lectura = true;
  slides.forEach(el => {
    el.style.transform = `scale(${s})`;
    el.style.marginBottom = (1080 * s - 1080) + 'px';
    entrada(el).progress(1);
    for (let k = 1; k <= planes.get(el).total; k++) paso(el, k).progress(1);
  });
  M.instantaneo = false;
}

function crearMarco() {
  const div = id => Object.assign(document.createElement('div'), { id });
  pieIzq = div('pie-izq'); pieDer = div('pie-der'); progreso = div('progreso');
  lienzo.append(pieIzq, pieDer, progreso);
  titulo = lienzo.dataset.titulo || document.title.split('·')[0].trim();
}

function escuchar() {
  addEventListener('resize', ajustar);
  movilMQ.addEventListener('change', () => location.reload());
  addEventListener('keydown', e => {
    const k = e.key, enCtl = e.target.closest && e.target.closest('input, button, select, textarea');
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { if (enCtl && k !== 'PageDown') return; e.preventDefault(); siguiente(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { if (enCtl && k !== 'PageUp') return; e.preventDefault(); anterior(); }
    else if (k === 'Home') mostrar(0);
    else if (k === 'End') mostrar(slides.length - 1, Infinity, true);
    else if (k === 'f' || k === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
  });
  lienzo.addEventListener('click', e => { if (!e.target.closest(INTERACTIVO)) siguiente(); });
  let tx = null;
  addEventListener('touchstart', e => { tx = e.target.closest(INTERACTIVO) ? null : e.touches[0].clientX; }, { passive: true });
  addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) dx < 0 ? siguiente() : anterior();
  });
  addEventListener('hashchange', () => {
    const [s, k] = leerHash();
    if (s !== cur || k !== step) mostrar(s, k, k > 0 || estatico);
  });
}

/* ---------- arranque: cuando las fuentes estén (las medidas dependen de ellas) ---------- */
function arrancar() {
  preparar();
  botonTema();
  crearMarco();
  if (imprimir) { modoImprimir(); M.listo = true; document.dispatchEvent(new Event('motor:listo')); return; }
  if (esMovil()) { modoDesplazar(); M.listo = true; return; }
  ajustar();
  escuchar();
  if (params.has('prueba')) { prueba(); return; }
  const [s, k] = leerHash();
  mostrar(s, k, k > 0 || estatico);
  M.listo = true;
  document.dispatchEvent(new Event('motor:listo'));
}

/* ---------- ?prueba: revisión automática (la usa herramientas/clase.py revisar) ----------
   Muestra cada diapositiva en su último paso y mide si algo se sale del área útil
   (140 px a los lados, nada por debajo de 1000 px) y cuántas palabras tiene.
   Después recorre todos los estados hacia adelante y hacia atrás.
   El resultado queda en <pre id="motor-prueba"> como JSON. */
function prueba() {
  const res = { diapositivas: slides.length, pasos: [], ida: 0, vuelta: 0, fuera: [], palabras: [], errores };
  try {
    const L = lienzo.getBoundingClientRect(), e = L.width / 1920;
    slides.forEach((el, i) => {
      mostrar(i, Infinity, true);
      res.pasos.push(planes.get(el).total);
      let abajo = 0, derecha = 0, izquierda = 1920;
      el.querySelectorAll('*').forEach(x => {
        if (x.closest('svg') && x.tagName.toLowerCase() !== 'svg') return;
        if (getComputedStyle(x).position === 'absolute' && x.closest('.mascara')) return;
        const r = x.getBoundingClientRect();
        if (!r.width || !r.height) return;
        abajo = Math.max(abajo, (r.bottom - L.top) / e);
        derecha = Math.max(derecha, (r.right - L.left) / e);
        izquierda = Math.min(izquierda, (r.left - L.left) / e);
      });
      if (abajo > 1000 || derecha > 1800 || izquierda < 120)
        res.fuera.push({ diapositiva: i + 1, abajo: Math.round(abajo), derecha: Math.round(derecha), izquierda: Math.round(izquierda) });
      const cuenta = t => (t || '').split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
      /* las palabras que se leen: sin los rótulos y números de las figuras SVG */
      res.palabras.push(cuenta(el.innerText) - [...el.querySelectorAll('svg')].reduce((n, s) => n + cuenta(s.textContent), 0));
    });
    mostrar(0, 0, true);
    let n = 0;
    while (!(cur === slides.length - 1 && step === planes.get(slides[cur]).total) && n < 5000) { siguiente(); n++; }
    res.ida = n + 1;
    n = 0;
    while (!(cur === 0 && step === 0) && n < 5000) { anterior(); n++; }
    res.vuelta = n + 1;
  } catch (err) { errores.push('prueba: ' + (err && err.stack || err)); }
  const pre = document.createElement('pre');
  pre.id = 'motor-prueba'; pre.hidden = true; pre.textContent = JSON.stringify(res);
  document.body.append(pre);
  console.log('MOTOR-PRUEBA ' + pre.textContent);
}
const FUENTES = [['400 36px "IBM Plex Sans"', 'aá'], ['700 36px "IBM Plex Sans"', 'aá'], ['italic 400 36px "IBM Plex Sans"', 'a'],
  ['600 72px "Source Serif 4"', 'aá'], ['400 92px "Source Serif 4"', 'a¿'], ['italic 400 40px "Source Serif 4"', 'rρ'], ['500 40px "IBM Plex Mono"', '0,−']];
const fuentes = () => Promise.all(FUENTES.map(([f, t]) => document.fonts.load(f, t))).then(() => document.fonts.ready);
const inicio = () => Promise.race([fuentes(), new Promise(r => setTimeout(r, 3000))]).catch(() => {}).then(arrancar);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicio); else inicio();
})();
