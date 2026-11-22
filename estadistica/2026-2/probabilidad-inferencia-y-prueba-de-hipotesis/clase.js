/* clase.js: las figuras propias de la clase 13 (probabilidad, inferencia y prueba de hipótesis).
   Va después del motor y de datos/clase13.js. Cada figura se registra con Motor.diapositiva por el id de su section:
     moneda (D4)    diez monedas que caen: 9 caras y 1 sello
     galton (D8)    máquina de Galton con el histograma de caras debajo
     test (D9)      la misma máquina: un test de 10 preguntas respondido al azar (+1 si acierta, 0 si falla)
     normal (D11)   ejemplos de la curva normal que rotan solos
     memoria (D13)  curvas de memoria de jóvenes y mayores, con la diferencia movible
     binomial (D22) barras de 0 a 10 sellos con las colas sombreadas
     azar (D23)     curvas de los grupos arriba y curva del azar con el área abajo
   Cada paso es una línea de tiempo de GSAP: el modo instantáneo (retroceder, ?estatico, ?prueba) deja el estado final.
   Los colores van por clases de CSS (clase.css), nunca escritos aquí.
   Si algo de aquí sirve para otras clases, se sube al motor central (diapositivas-web/motor/). */
(() => {
'use strict';
const M = window.Motor, DAT = window.DATOS;
if (!M || !M.anim || !DAT) return;
const A = M.anim, S = M.svg, MOV = M.mov, fmt = M.fmt;
const $ = (s, r = document) => r.querySelector(s);
const texto = (padre, x, y, t, clase = '', attrs = {}) => {
  const e = S('text', Object.assign({ x, y, class: clase }, attrs), padre);
  e.textContent = t;
  return e;
};

/* ───────── utilidades numéricas ───────── */
const mulberry32 = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const normal01 = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
const dnorm = (x, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
/* acumulada normal con la aproximación de Abramowitz y Stegun (7.1.26), error < 1,5 · 10⁻⁷ */
const erf = x => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
const pnorm = (x, m = 0, s = 1) => 0.5 * (1 + erf((x - m) / (s * Math.SQRT2)));
const comb = (n, k) => { let c = 1; for (let i = 1; i <= k; i++) c = c * (n - k + i) / i; return c; };
const binom = (n, k) => comb(n, k) / 2 ** n;
const camino = (pts) => pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');

/* ═════════ D4 · monedas ═════════ */
const MON = {};
M.diapositiva('moneda', {
  preparar(el) {
    const svg = $('svg.monedas', el);
    const serie = [...DAT.monedas];
    MON.monedas = serie.map((c, i) => {
      const g = S('g', { class: 'moneda ' + (c === 'C' ? 'cara' : 'sello') }, svg);
      const cx = 82 + i * 164;
      S('circle', { cx, cy: 118, r: 62 }, g);
      texto(g, cx, 120, c, 'letra');
      return g;
    });
    const caras = serie.filter(c => c === 'C').length, sellos = serie.length - caras;
    MON.conteo = texto(svg, 820, 262, `${caras} caras · ${sellos} ${sellos === 1 ? 'sello' : 'sellos'}`, 'conteo');
  },
  entrada() { gsap.set(MON.monedas, { opacity: 0 }); gsap.set(MON.conteo, { opacity: 0 }); },
  pasos: [
    (el, tl) => {
      MON.monedas.forEach((g, i) => tl.fromTo(g, { y: -200, opacity: 0, scaleX: .15, transformOrigin: '50% 50%' },
        { y: 0, opacity: 1, scaleX: 1, duration: .55, ease: 'power3.out' }, .1 + i * .22));
      A.sube(MON.conteo, tl, .1 + 10 * .22 + .2);
    }
  ]
});

/* ═════════ D8 y D9 · máquina de Galton (monedas y test respondido al azar) ═════════ */
/* La misma máquina sirve para las dos diapositivas: cambian la semilla, las marcas de cada clavo y el rótulo del eje. */
function maquina(id, { semilla, si, no, rotulo }) {
  const G = {};
  M.diapositiva(id, {
    preparar(el) {
      const svg = $('svg.galton', el);
      const X0 = 820, DX = 72, Y0 = 40, DY = 30, FILAS = 10, BASE = 600, ALTO = 210, PMAX = 0.27, YB = 352;
      const xk = k => X0 + (k - 5) * DX;
      Object.assign(G, { X0, DX, Y0, DY, FILAS, BASE, ALTO, PMAX, YB, xk });
      G.clavos = [];
      for (let r = 0; r < FILAS; r++) for (let j = 0; j <= r; j++)
        G.clavos.push(S('circle', { cx: X0 + (j - r / 2) * DX, cy: Y0 + r * DY, r: 5, class: 'clavo' }, svg));
      G.divisores = Array.from({ length: 12 }, (_, k) => S('path', { d: `M${xk(k) - DX / 2} ${YB - 24} V${YB + 16}`, class: 'divisor' }, svg));
      G.eje = S('path', { d: `M${xk(0) - DX / 2} ${BASE} H${xk(10) + DX / 2}`, class: 'eje' }, svg);
      G.barras = Array.from({ length: 11 }, (_, k) => S('rect', { x: xk(k) - 26, y: BASE, width: 52, height: 0, class: 'barra' }, svg));
      G.nums = Array.from({ length: 11 }, (_, k) => texto(svg, xk(k), BASE + 28, k));
      G.nums.push(texto(svg, X0, BASE + 58, rotulo, 'rot'));
      const pts = [];
      for (let x = -0.5; x <= 10.5001; x += .05) pts.push([xk(x), BASE - dnorm(x, 5, Math.sqrt(2.5)) / PMAX * ALTO]);
      G.campana = S('path', { d: camino(pts), class: 'campana' }, svg);
      G.capa = S('g', {}, svg);
      /* 1.000 bolas con semilla fija: 1 = derecha (cara o acierto), 0 = izquierda (sello o error) */
      const r = mulberry32(semilla);
      G.caminos = Array.from({ length: 1000 }, () => Array.from({ length: FILAS }, () => (r() < .5 ? 1 : 0)));
      const conteos = (a, b) => { const c = Array(11).fill(0); G.caminos.slice(a, b).forEach(cm => c[cm.reduce((s, v) => s + v, 0)]++); return c; };
      G.p100 = conteos(0, 100).map(c => c / 100);
      G.p1000 = conteos(0, 1000).map(c => c / 1000);
    },
    entrada(el, tl) {
      G.capa.innerHTML = '';
      G.cont = Array(11).fill(0);
      alturas(G, Array(11).fill(0));
      A.ocultarTrazo(G.campana);
      tl.fromTo(G.clavos, { opacity: 0 }, { opacity: 1, duration: .3, stagger: .006 }, .3);
      tl.fromTo([...G.divisores, ...G.nums], { opacity: 0 }, { opacity: 1, duration: .4 }, .7);
      A.dibujar(G.eje, tl, .6, .8);
    },
    pasos: [
      /* 1 · una bola lenta, con lo que pasa en cada clavo */
      (el, tl) => {
        const cm = G.caminos[0], seg = .36;
        soltar(G, cm, tl, .2, seg, false);
        let h = 0;
        cm.forEach((c, r) => {
          const x = G.X0 + (h - r / 2) * G.DX, y = G.Y0 + r * G.DY;
          const l = texto(G.capa, x + (c ? 30 : -30), y - 6, c ? si : no, 'letra-gal ' + (c ? 'l-si' : 'l-no'));
          tl.fromTo(l, { opacity: 0 }, { opacity: 1, duration: .15 }, .2 + (r + 1) * seg - .1);
          h += c;
        });
      },
      /* 2 · caen 100 bolas y el histograma crece con cada una */
      (el, tl) => {
        tl.to(G.capa.children, { opacity: 0, duration: .3 }, 0);
        G.cont = Array(11).fill(0);
        for (let i = 0; i < 100; i++) {
          const t0 = .3 + i * .035, seg = .085;
          const { k } = soltar(G, G.caminos[i], tl, t0, seg, true);
          tl.call(() => { G.cont[k]++; alturas(G, G.cont.map(c => c / 100)); }, null, t0 + (G.FILAS + 1) * seg);
        }
      },
      /* 3 · caen 1.000 (se dibuja una muestra) y aparece la campana */
      (el, tl) => {
        for (let i = 0; i < 160; i++) soltar(G, G.caminos[100 + i], tl, i * .016, .07, true);
        const o = { t: 0 };
        tl.to(o, { t: 1, duration: 3.2, ease: 'none', onUpdate: () => alturas(G, G.p100.map((p, k) => p + (G.p1000[k] - p) * o.t)) }, 0);
        A.dibujar(G.campana, tl, 3.3, 1.2);
      }
    ]
  });
}
maquina('galton', { semilla: 2026, si: 'C', no: 'S', rotulo: 'Número de caras' });
maquina('test', { semilla: 2027, si: '+1', no: '0', rotulo: 'Puntaje (número de aciertos)' });
function alturas(G, props) {
  props.forEach((p, k) => {
    const h = p / G.PMAX * G.ALTO;
    G.barras[k].setAttribute('y', (G.BASE - h).toFixed(1));
    G.barras[k].setAttribute('height', h.toFixed(1));
  });
}
/* deja caer una bola por su camino de clavos; si «fugaz», desaparece al llegar a su cajón */
function soltar(G, cm, tl, t0, seg, fugaz) {
  const { X0, DX, Y0, DY, YB, xk } = G;
  const pts = [];
  let h = 0;
  cm.forEach((c, r) => { pts.push([X0 + (h - r / 2) * DX, Y0 + r * DY - 16]); h += c; });
  pts.push([xk(h), YB]);
  const bola = S('circle', { cx: X0, cy: Y0 - 44, r: 10, class: 'bola' }, G.capa);
  tl.fromTo(bola, { opacity: 0 }, { opacity: 1, duration: .1 }, t0);
  tl.to(bola, { keyframes: pts.map(([x, y]) => ({ attr: { cx: x, cy: y }, duration: seg, ease: 'power1.in' })) }, t0);
  if (fugaz) tl.to(bola, { opacity: 0, duration: .15 }, t0 + pts.length * seg);
  return { bola, k: h };
}

/* ═════════ D11 · la curva normal, con ejemplos que rotan solos ═════════ */
const NOR = {};
M.diapositiva('normal', {
  preparar(el) {
    const svg = $('svg.normal', el);
    const N = 200, ZMIN = -3.5, AZ = .25, BINS = 28, X0 = 120, ANCHO = 1400, BASE = 380, PASO = 11, R = 5;
    const xz = z => X0 + (z - ZMIN) / 7 * ANCHO;
    Object.assign(NOR, { N, BASE, xz });
    const bandas = S('g', { class: 'bandas' }, svg);
    S('rect', { x: xz(-2), y: 34, width: xz(2) - xz(-2), height: BASE + 6 - 34, class: 'banda-2' }, bandas);
    S('rect', { x: xz(-1), y: 34, width: xz(1) - xz(-1), height: BASE + 6 - 34, class: 'banda-1' }, bandas);
    S('path', { d: `M${xz(0)} ${BASE + 6} V32`, class: 'media' }, bandas);
    texto(bandas, xz(-1) + 12, 56, '68 %', 'rot-banda inicio');
    texto(bandas, xz(-2) + 12, 56, '95 %', 'rot-banda inicio');
    texto(bandas, xz(0), 14, 'M', 'rot-media');
    NOR.bandas = bandas;
    NOR.eje = S('path', { d: `M${X0} ${BASE + 6} H${X0 + ANCHO}`, class: 'eje' }, svg);
    NOR.ticks = [-3, -2, -1, 0, 1, 2, 3].map(z => texto(svg, xz(z), BASE + 34, ''));
    NOR.titulo = texto(svg, X0 + ANCHO, 24, '', 'titulo-ej fin');
    texto(svg, 0, 24, 'Datos simulados, con fines ilustrativos', 'nota-fig inicio');
    const capa = S('g', {}, svg);
    /* una muestra de 300 por ejemplo, con semilla fija; cada punto se apila en su barra del histograma */
    NOR.muestras = DAT.normales.map((ej, e) => {
      const r = mulberry32(100 + e), pila = Array(BINS).fill(0), pos = [];
      for (let i = 0; i < N; i++) {
        let z; do { z = normal01(r); } while (Math.abs(z) > 3.45);
        const b = Math.floor((z - ZMIN) / AZ), j = pila[b]++;
        pos.push([X0 + (b + .5) * ANCHO / BINS, BASE - R - j * PASO]);
      }
      return pos.sort((p, q) => p[0] - q[0] || q[1] - p[1]);
    });
    NOR.puntos = NOR.muestras[0].map(([x, y]) => S('circle', { cx: x, cy: y, r: R, class: 'punto' }, capa));
    const pts = [];
    for (let z = ZMIN; z <= 3.5001; z += .05) pts.push([xz(z), BASE - N * AZ * dnorm(z) * PASO]);
    NOR.campana = S('path', { d: camino(pts), class: 'campana' }, svg);
  },
  entrada(el, tl) {
    detenerNormal();
    rotular(0);
    NOR.e = 0;
    A.ocultarTrazo(NOR.campana);
    gsap.set(NOR.bandas, { opacity: 0 });
    A.dibujar(NOR.eje, tl, .3, .8);
    tl.fromTo([...NOR.ticks, NOR.titulo], { opacity: 0 }, { opacity: 1, duration: .4 }, .6);
    NOR.puntos.forEach((p, i) => {
      const [x, y] = NOR.muestras[0][i];
      tl.fromTo(p, { attr: { cx: x, cy: -30 }, opacity: 0 }, { attr: { cx: x, cy: y }, opacity: 1, duration: .7, ease: 'power2.in' }, .4 + Math.random() * 1.4);
    });
    if (!M.instantaneo) tl.call(() => { NOR.reloj = gsap.delayedCall(3.2, rotar); }, null, 2.6);
  },
  pasos: [
    (el, tl) => { A.dibujar(NOR.campana, tl, 0, 1.2); },
    (el, tl) => { tl.fromTo(NOR.bandas, { opacity: 0 }, { opacity: 1, duration: .6 }, 0); }
  ],
  detener: () => detenerNormal()
});
function rotular(e) {
  const ej = DAT.normales[e];
  NOR.titulo.textContent = ej.nombre + (ej.unidad ? ` (${ej.unidad})` : '');
  NOR.ticks.forEach((t, k) => { t.textContent = fmt(ej.M + (k - 3) * ej.DE, ej.decimales); });
}
function rotar() {
  NOR.e = (NOR.e + 1) % DAT.normales.length;
  const destino = NOR.muestras[NOR.e];
  gsap.to([...NOR.ticks, NOR.titulo], { opacity: 0, duration: .3, onComplete: () => { rotular(NOR.e); gsap.to([...NOR.ticks, NOR.titulo], { opacity: 1, duration: .3 }); } });
  NOR.puntos.forEach((p, i) => gsap.to(p, { attr: { cx: destino[i][0], cy: destino[i][1] }, duration: 1.1, ease: MOV.cambio, delay: Math.random() * .4 }));
  NOR.reloj = gsap.delayedCall(4.5, rotar);
}
function detenerNormal() {
  if (NOR.reloj) NOR.reloj.kill();
  NOR.reloj = null;
  if (NOR.puntos) gsap.killTweensOf(NOR.puntos);
}

/* ═════════ curvas de los grupos (D13 y D23): jóvenes y mayores ═════════ */
function curvasGrupos(svg, { izq = 60, der = 1060, base = 400, alto = 300, titulo = true }) {
  const { jovenes: J, mayores: Y } = DAT.memoria;
  const lo = 40, hi = 112, px = v => izq + (v - lo) / (hi - lo) * (der - izq);
  const medio = (J.M + Y.M) / 2, esc = alto / dnorm(0, 0, Math.min(J.DE, Y.DE));
  const eje = S('path', { d: `M${izq} ${base} H${der}`, class: 'eje' }, svg);
  const ticks = [];
  for (let v = 40; v <= 110; v += 10) {
    ticks.push(S('path', { d: `M${px(v)} ${base} v8`, class: 'tick' }, svg));
    ticks.push(texto(svg, px(v), base + 26, v));
  }
  if (titulo) ticks.push(texto(svg, (izq + der) / 2, base + 58, 'Puntaje de memoria', 'rot'));
  const capa = S('g', {}, svg);
  const g = clase => ({
    area: S('path', { class: 'area ' + clase }, capa),
    curva: S('path', { class: 'curva ' + clase }, capa),
    media: S('path', { class: 'media-g ' + clase }, capa),
    nombre: texto(capa, 0, 0, '', 'nombre-g ' + clase),
    valor: texto(capa, 0, 0, '', 'valor-g ' + clase)
  });
  const gj = g('x'), gy = g('y');
  const forma = (m, s) => { const p = []; for (let v = lo; v <= hi + .01; v += .5) p.push([px(v), base - dnorm(v, m, s) * esc]); return p; };
  const pinta = (gr, m, s, nombre, lado) => {
    const pts = forma(m, s), cima = base - dnorm(m, m, s) * esc;
    gr.curva.setAttribute('d', camino(pts));
    gr.area.setAttribute('d', camino(pts) + ` L${px(hi)} ${base} L${px(lo)} ${base} Z`);
    gr.media.setAttribute('d', `M${px(m)} ${base} V${cima}`);
    const x = px(m) + lado * 14, anc = lado > 0 ? 'start' : 'end';
    for (const [t, dy, txt] of [[gr.nombre, -46, nombre], [gr.valor, -18, 'M = ' + fmt(m, 1)]]) {
      t.setAttribute('x', x); t.setAttribute('y', cima + dy); t.style.textAnchor = anc; t.textContent = txt;
    }
  };
  const c = {
    d: J.M - Y.M, capa, eje, ticks, base, alAjustar: null,
    set(d) {
      c.d = d;
      pinta(gj, medio + d / 2, J.DE, 'Jóvenes', 1);
      pinta(gy, medio - d / 2, Y.DE, 'Mayores', -1);
      c.alAjustar?.(d);
    },
    hacia(tl, at, d, dur = 1.2) {
      const o = { v: c.d };
      tl.to(o, { v: d, duration: dur, ease: MOV.cambio, onUpdate: () => c.set(o.v), onComplete: () => c.set(d) }, at);
    }
  };
  c.set(c.d);
  return c;
}
/* el deslizador de la diferencia y su cifra */
function conectar(el, c) {
  const rango = $('input.deslizador', el), cifra = $('.dif', el);
  c.alAjustar = d => { cifra.textContent = fmt(d, 1); rango.value = d; c.alAjustar2?.(d); };
  rango.addEventListener('input', () => c.set(+rango.value));
  rango.addEventListener('change', () => rango.blur());
}
const REAL = DAT.memoria.jovenes.M - DAT.memoria.mayores.M;

/* ═════════ D13 · memoria y edad: ¿real o azar? ═════════ */
const MEM = {};
M.diapositiva('memoria', {
  preparar(el) {
    MEM.c = curvasGrupos($('svg.curvas', el), { base: 392, alto: 300 });
    conectar(el, MEM.c);
  },
  entrada(el, tl) {
    MEM.c.set(0);
    gsap.set(MEM.c.capa, { opacity: 0 });
    A.dibujar(MEM.c.eje, tl, .3, .8);
    tl.fromTo(MEM.c.ticks, { opacity: 0 }, { opacity: 1, duration: .4 }, .7);
  },
  pasos: [
    (el, tl) => { tl.to(MEM.c.capa, { opacity: 1, duration: .5 }, 0); MEM.c.hacia(tl, .2, REAL, 1.4); },
    (el, tl) => { MEM.c.hacia(tl, 0, 2, 1.4); },
    (el, tl) => { MEM.c.hacia(tl, 0, 24, 1.6); }
  ]
});

/* ═════════ D22 · barras de 0 a 10 sellos (la misma moneda del ejemplo 1) ═════════ */
const BIN = {};
M.diapositiva('binomial', {
  preparar(el) {
    const svg = $('svg.binomial', el);
    const BASE = 380, ALTO = 300, xk = k => 75 + k * 90, esc = ALTO / binom(10, 5);
    Object.assign(BIN, { BASE, xk, esc });
    BIN.eje = S('path', { d: `M30 ${BASE} H1040`, class: 'eje' }, svg);
    BIN.barras = Array.from({ length: 11 }, (_, k) => S('rect', { x: xk(k) - 31, y: BASE, width: 62, height: 0, class: 'barra' }, svg));
    BIN.rotulos = [...Array.from({ length: 11 }, (_, k) => texto(svg, xk(k), BASE + 28, k)),
                   texto(svg, 535, BASE + 66, 'Sellos en 10 lanzamientos', 'rot')];
    BIN.marca = S('g', { class: 'marcador' }, svg);
    S('path', { d: 'M-14 -26 H14 L0 -6 Z', class: 'flechita' }, BIN.marca);
    BIN.marcaTexto = texto(BIN.marca, 0, -48, '', 'rot-marcador');
  },
  entrada() {
    BIN.barras.forEach(b => { b.setAttribute('y', BIN.BASE); b.setAttribute('height', 0); b.classList.remove('marcada'); });
    gsap.set(BIN.marca, { opacity: 0 });
  },
  pasos: [
    (el, tl) => {
      BIN.barras.forEach((b, k) => {
        const h = binom(10, k) * BIN.esc;
        tl.fromTo(b, { attr: { y: BIN.BASE, height: 0 } }, { attr: { y: BIN.BASE - h, height: h }, duration: .7, ease: 'power3.out' }, k * .06);
      });
    },
    (el, tl) => { marcar(tl, 1, [0, 1, 9, 10]); },
    (el, tl) => { marcar(tl, 6, [0, 1, 2, 3, 4, 6, 7, 8, 9, 10]); }
  ]
});
function marcar(tl, k, colas) {
  const cima = BIN.BASE - binom(10, k) * BIN.esc;
  tl.call(() => { BIN.marcaTexto.textContent = `${k} ${k === 1 ? 'sello' : 'sellos'}`; }, null, 0);
  if (+gsap.getProperty(BIN.marca, 'opacity') === 0) {
    tl.fromTo(BIN.marca, { x: BIN.xk(k), y: cima, opacity: 0 }, { opacity: 1, duration: .4 }, 0);
  } else {
    tl.to(BIN.marca, { x: BIN.xk(k), y: cima, duration: .7, ease: MOV.cambio }, 0);
  }
  tl.call(() => BIN.barras.forEach((b, i) => b.classList.toggle('marcada', colas.includes(i))), null, .3);
}

/* ═════════ D23 · ¿dónde cae? curvas de los grupos y curva del azar ═════════ */
const AZ = {};
M.diapositiva('azar', {
  preparar(el) {
    const svg = $('svg.curvas-azar', el);
    const { jovenes: J, mayores: Y } = DAT.memoria;
    const SE = Math.sqrt(J.DE ** 2 / J.n + Y.DE ** 2 / Y.n);          // 2,36
    AZ.SE = SE;
    AZ.c = curvasGrupos(svg, { base: 190, alto: 130, titulo: false });
    const izq = 60, der = 1060, base = 466, alto = 180, lo = -12, hi = 24;
    const px = v => izq + (v - lo) / (hi - lo) * (der - izq), esc = alto / dnorm(0, 0, SE);
    Object.assign(AZ, { px, base, esc, lo, hi });
    AZ.eje = S('path', { d: `M${izq} ${base} H${der}`, class: 'eje' }, svg);
    AZ.ticks = [];
    for (let v = lo; v <= hi; v += 4) {
      AZ.ticks.push(S('path', { d: `M${px(v)} ${base} v8`, class: 'tick' }, svg));
      AZ.ticks.push(texto(svg, px(v), base + 26, fmt(v, 0)));
    }
    AZ.ticks.push(texto(svg, (izq + der) / 2, base + 52, 'Diferencias de medias que daría el azar si la hipótesis nula fuera cierta', 'rot'));
    const pts = [];
    for (let v = lo; v <= hi + .01; v += .1) pts.push([px(v), base - dnorm(v, 0, SE) * esc]);
    AZ.area = S('path', { d: camino(pts) + ` L${px(hi)} ${base} L${px(lo)} ${base} Z`, class: 'area-azar' }, svg);
    AZ.curva = S('path', { d: camino(pts), class: 'curva-azar' }, svg);
    AZ.marca = S('g', {}, svg);
    AZ.colaD = S('path', { class: 'cola' }, AZ.marca);
    AZ.colaI = S('path', { class: 'cola' }, AZ.marca);
    AZ.lineaD = S('path', { class: 'marca-dif' }, AZ.marca);
    AZ.lineaI = S('path', { class: 'marca-dif espejo' }, AZ.marca);
    AZ.valor = texto(AZ.marca, 0, 0, '', 'valor-dif');
    AZ.areaTexto = $('.area-valor', el);
    conectar(el, AZ.c);
    AZ.c.alAjustar2 = ubicar;
    ubicar(AZ.c.d);
  },
  entrada(el, tl) {
    AZ.c.set(REAL);
    A.ocultarTrazo(AZ.curva);
    gsap.set([AZ.area, AZ.marca], { opacity: 0 });
    A.dibujar(AZ.eje, tl, .3, .8);
    tl.fromTo(AZ.ticks, { opacity: 0 }, { opacity: 1, duration: .4 }, .6);
  },
  pasos: [
    (el, tl) => { A.dibujar(AZ.curva, tl, 0, 1.2); tl.to(AZ.area, { opacity: 1, duration: .6 }, .6); },
    (el, tl) => { tl.fromTo(AZ.marca, { opacity: 0 }, { opacity: 1, duration: .5 }, 0); }
  ]
});
/* la marca de la diferencia observada, las dos colas y su área */
function ubicar(d) {
  const { px, base, esc, lo, hi, SE } = AZ;
  const dd = Math.min(Math.max(d, 0), hi);
  const cola = (a, b) => {
    if (b <= a) return '';
    const pts = [[px(a), base]];
    for (let v = a; v <= b + .001; v += .1) pts.push([px(v), base - dnorm(v, 0, SE) * esc]);
    pts.push([px(b), base]);
    return camino(pts) + ' Z';
  };
  AZ.colaD.setAttribute('d', cola(dd, hi));
  AZ.colaI.setAttribute('d', cola(lo, -dd));
  const tope = base - 186;
  AZ.lineaD.setAttribute('d', `M${px(dd)} ${base} V${tope}`);
  AZ.lineaI.setAttribute('d', -dd >= lo ? `M${px(-dd)} ${base} V${tope}` : '');
  AZ.valor.setAttribute('x', px(dd)); AZ.valor.setAttribute('y', tope - 18);
  AZ.valor.textContent = fmt(dd, 1);
  const p = 2 * (1 - pnorm(dd / SE));
  if (AZ.areaTexto) AZ.areaTexto.textContent = p < .001 ? '< 0,001' : fmt(p, 3);
}
})();
