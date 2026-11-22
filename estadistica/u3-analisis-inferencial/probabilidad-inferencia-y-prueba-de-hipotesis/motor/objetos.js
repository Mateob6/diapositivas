/* objetos.js: los objetos del sistema (OBJETOS-GAMMA.md), registrados en el motor.
   - bloque: UN objeto con pieles. La misma lista cambia de forma con su clase y cada piel
     tiene su entrada propia (la que dice su forma). Con data-foco avanza celda por celda.
   - recta numérica, diagrama geométrico, cita, temporizador y tabla por pasos.
   Referencia de uso: MOTOR.md. */
(() => {
'use strict';
const M = window.Motor;
if (!M || !window.gsap || !M.anim) return;
const A = M.anim, MOV = M.mov, $$ = M.$$;

const nuevo = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};
/* mete el contenido de la celda en .cuerpo, para poner marcas o figuras al lado */
const envolver = li => {
  let c = li.querySelector(':scope > .cuerpo');
  if (c) return c;
  c = nuevo('div', 'cuerpo');
  while (li.firstChild) c.appendChild(li.firstChild);
  li.appendChild(c);
  return c;
};
const lista = s => (s || '').trim().split(/[\s]+/).filter(Boolean).map(M.numero);
const corto = v => (v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ',');
/* cifra con su unidad más pequeña: 68 %, 99,7 % */
const valorEl = (cls, v, dec, unidad) => {
  const e = nuevo('span', cls);
  e.append(document.createTextNode(M.fmt(v, dec)));
  if (unidad) e.append(nuevo('span', 'unidad', unidad));
  return e;
};
const columnas = n => n <= 4 ? n : n <= 6 ? 3 : 4;

/* ======================= el bloque ======================= */
const PIELES = {};
const MODO = { burbujas: 'acumular', anillos: 'acumular', barras: 'acumular', puntos: 'acumular' };
const BASE = {
  reset(x) { gsap.set(x.celdas, { opacity: 0 }); },
  celda(x, i, tl, at) { A.sube(x.celdas[i], tl, at); },
  todo(x, tl, at, cada = .12) { x.orden.forEach((i, k) => x.piel.celda(x, i, tl, at + k * cada)); }
};
const piel = (nombre, def) => { PIELES[nombre] = Object.assign({}, BASE, def); };

function bloque(b) {
  const nombre = Object.keys(PIELES).find(k => b.classList.contains(k)) || 'cajas';
  if (nombre === 'cajas') b.classList.add('cajas');
  const p = PIELES[nombre];
  const celdas = [...b.children].filter(n => n.tagName === 'LI');
  const foco = b.hasAttribute('data-foco') ? (b.dataset.foco || MODO[nombre] || 'pasos') : null;
  const x = { b, celdas, n: celdas.length, partes: [], foco, piel: p, orden: celdas.map((_, i) => i) };
  b.style.setProperty('--n', b.dataset.columnas || columnas(celdas.length));
  b.style.setProperty('--n-celdas', celdas.length);
  b.style.setProperty('--filas', celdas.length);
  p.preparar?.(x);
  const fijo = celdas.findIndex(c => c.classList.contains('es-foco'));
  const ponerFoco = i => {
    celdas.forEach((c, k) => { c.classList.toggle('es-foco', k === i); x.partes[k]?.classList.toggle('es-foco', k === i); });
    b.classList.toggle('hay-foco', i != null && i >= 0);
  };
  if (foco) celdas.forEach(c => c.setAttribute('data-m-interno', ''));
  const c = {
    reset() { ponerFoco(foco ? null : fijo); p.reset(x); },
    entrada(tl, at) {
      if (!foco || foco === 'mover') p.todo(x, tl, at);
      else p.estructura?.(x, tl, at);
    }
  };
  if (foco) c.pasos = () => x.orden.map((i, k) => ({
    paso: celdas[i].dataset.paso && /^\d+$/.test(celdas[i].dataset.paso) ? +celdas[i].dataset.paso : null,
    entrar(tl, at) {
      tl.call(ponerFoco, [i], at);
      if (foco === 'mover') return;
      if (foco === 'pasos' && k > 0) A.atenuar(celdas[x.orden[k - 1]], tl, at);
      p.celda(x, i, tl, at);
    }
  }));
  return c;
}

/* --- cajas: sólidas (por defecto), .delineadas, .con-linea, .numeradas --- */
piel('cajas', {
  preparar(x) {
    if (x.b.classList.contains('con-linea')) x.celdas.forEach(li => li.prepend(nuevo('i', 'barra')));
    if (x.b.classList.contains('numeradas')) x.celdas.forEach((li, i) => li.prepend(nuevo('span', 'marca', i + 1)));
  },
  celda(x, i, tl, at) {
    const li = x.celdas[i];
    A.sube(li, tl, at);
    const barra = li.querySelector(':scope > .barra');
    if (barra) tl.fromTo(barra, { scaleY: 0 }, { scaleY: 1, duration: .7, ease: MOV.cambio }, at + .1);
    const marca = li.querySelector(':scope > .marca');
    if (marca) tl.fromTo(marca, { scale: .5, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: 'power3.out' }, at + .05);
  }
});

/* --- texto con línea lateral: la línea se dibuja; con foco, la actual en color --- */
piel('linea-lateral', {
  preparar(x) { x.celdas.forEach(li => li.prepend(nuevo('i', 'barra'))); },
  celda(x, i, tl, at) {
    const li = x.celdas[i];
    A.sube(li, tl, at);
    tl.fromTo(li.querySelector(':scope > .barra'), { scaleY: 0 }, { scaleY: 1, duration: .6, ease: MOV.cambio }, at);
  }
});

/* --- etapas: número y línea que avanza de columna en columna --- */
piel('etapas', {
  preparar(x) {
    x.celdas.forEach((li, i) => {
      const trazo = nuevo('i', 'trazo'); trazo.append(nuevo('i'));
      li.prepend(nuevo('span', 'num', i + 1), trazo);
    });
  },
  celda(x, i, tl, at) {
    const li = x.celdas[i];
    A.sube(li, tl, at);
    tl.fromTo(li.querySelector('.trazo > i'), { scaleX: 0 }, { scaleX: 1, duration: .6, ease: MOV.cambio }, at + .15);
  },
  todo(x, tl, at) { BASE.todo(x, tl, at, .35); }
});

/* --- flechas: chevrones que entran en orden --- */
piel('flechas', {
  preparar(x) {
    x.celdas.forEach((li, i) => {
      const f = nuevo('div', 'forma');
      f.append(nuevo('span', 'marca', i + 1));
      const h = li.querySelector(':scope > h3');
      if (h) f.append(h);
      li.prepend(f);
    });
  },
  celda(x, i, tl, at) { tl.fromTo(x.celdas[i], { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: .6, ease: 'power3.out' }, at); },
  todo(x, tl, at) { BASE.todo(x, tl, at, .15); }
});

/* --- línea de tiempo: el eje se dibuja y los hitos aparecen al pasar --- */
piel('linea-tiempo', {
  preparar(x) {
    x.vertical = x.b.classList.contains('vertical');
    x.eje = nuevo('div', 'eje');
    x.b.prepend(x.eje);
    x.celdas.forEach(li => { envolver(li); li.prepend(nuevo('span', 'rotulo', li.dataset.rotulo || ''), nuevo('span', 'punto')); });
  },
  reset(x) { gsap.set(x.celdas, { opacity: 0 }); gsap.set(x.eje, x.vertical ? { scaleY: 0 } : { scaleX: 0 }); },
  eje(x, tl, at, d) { tl.to(x.eje, { [x.vertical ? 'scaleY' : 'scaleX']: 1, duration: d, ease: MOV.cambio }, at); },
  estructura(x, tl, at) { x.piel.eje(x, tl, at, .9); },
  celda(x, i, tl, at) {
    const li = x.celdas[i];
    A.sube(li, tl, at);
    tl.fromTo(li.querySelector('.punto'), { scale: 0 }, { scale: 1, duration: .45, ease: 'power3.out' }, at);
  },
  todo(x, tl, at) {
    x.piel.eje(x, tl, at, 1.2);
    x.orden.forEach((i, k) => x.piel.celda(x, i, tl, at + .15 + k * (1.05 / x.n)));
  }
});

/* --- ciclo: los sectores giran a su lugar y un pulso recorre el ciclo --- */
piel('ciclo', {
  preparar(x) {
    const S = 600, c = S / 2, rO = 292, rI = 178, rM = (rO + rI) / 2, hueco = 2.4, punta = 9;
    const s = M.svg('svg', { viewBox: `0 0 ${S} ${S}` });
    x.b.prepend(s); x.svg = s;
    const pol = (r, a) => [c + r * Math.sin(a * Math.PI / 180), c - r * Math.cos(a * Math.PI / 180)];
    const P = (r, a) => pol(r, a).map(v => v.toFixed(2)).join(' ');
    x.celdas.forEach((li, i) => {
      const a0 = i * 360 / x.n + hueco / 2, a1 = (i + 1) * 360 / x.n - hueco / 2, g = a1 - a0 > 180 ? 1 : 0;
      const d = `M${P(rO, a0)} A${rO} ${rO} 0 ${g} 1 ${P(rO, a1)} L${P(rM, a1 + punta)} L${P(rI, a1)} A${rI} ${rI} 0 ${g} 0 ${P(rI, a0)} L${P(rM, a0 + punta)} Z`;
      const grupo = M.svg('g', { class: 'sector' }, s);
      M.svg('path', { d, class: 'forma-sector' }, grupo);
      const [tx, ty] = pol(rM, (a0 + a1) / 2 + punta / 2);
      M.svg('text', { x: tx.toFixed(1), y: ty.toFixed(1), class: 'sector-num' }, grupo).textContent = i + 1;
      x.partes[i] = grupo;
      envolver(li);
      li.prepend(nuevo('span', 'marca', i + 1));
    });
    if (x.b.dataset.centro) { x.centro = M.svg('text', { x: c, y: c, class: 'centro' }, s); x.centro.textContent = x.b.dataset.centro; }
  },
  reset(x) { gsap.set([...x.celdas, ...x.partes, x.centro].filter(Boolean), { opacity: 0 }); },
  estructura(x, tl, at) {
    gsap.set(x.partes, { svgOrigin: '300 300' });
    x.partes.forEach((g, i) => tl.fromTo(g, { rotation: -40, opacity: 0 }, { rotation: 0, opacity: 1, duration: .8, ease: 'power3.out' }, at + i * .12));
    if (x.centro) A.aparece(x.centro, tl, at + .5);
  },
  todo(x, tl, at) {
    x.piel.estructura(x, tl, at);
    BASE.todo(x, tl, at + .3, .12);
    if (x.foco) return;
    const t = at + .9 + x.n * .12;
    x.partes.forEach((g, i) => {
      tl.call(() => g.classList.add('es-foco'), null, t + i * .32);
      tl.call(() => g.classList.remove('es-foco'), null, t + i * .32 + .45);
    });
  }
});

/* --- pirámide y embudo: franjas que se apilan (o caen) con el texto a la derecha --- */
function franjas(x, embudo) {
  const W = 600, H = 600, h = 7;
  const s = M.svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });
  x.b.prepend(s);
  const media = y => embudo ? W / 2 * (1 - .8 * y / H) : W / 2 * (y / H);
  x.celdas.forEach((li, i) => {
    const y0 = i * H / x.n + (i ? h / 2 : 0), y1 = (i + 1) * H / x.n - (i < x.n - 1 ? h / 2 : 0);
    const pts = [[W / 2 - media(y0), y0], [W / 2 + media(y0), y0], [W / 2 + media(y1), y1], [W / 2 - media(y1), y1]];
    x.partes[i] = M.svg('polygon', { points: pts.map(q => q.map(v => v.toFixed(1)).join(',')).join(' '), class: 'franja' }, s);
  });
}
const FRANJAS = {
  reset(x) { gsap.set([...x.celdas, ...x.partes], { opacity: 0 }); },
  todo(x, tl, at) { BASE.todo(x, tl, at, .18); }
};
piel('piramide', Object.assign({}, FRANJAS, {
  preparar(x) { franjas(x, false); if (x.b.dataset.orden !== 'desde-arriba') x.orden.reverse(); },
  celda(x, i, tl, at) {
    tl.fromTo(x.partes[i], { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power3.out' }, at);
    A.sube(x.celdas[i], tl, at + .1);
  }
}));
piel('embudo', Object.assign({}, FRANJAS, {
  preparar(x) { franjas(x, true); if (x.b.dataset.orden === 'desde-abajo') x.orden.reverse(); },
  celda(x, i, tl, at) {
    tl.fromTo(x.partes[i], { y: -36, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'power3.out' }, at);
    A.sube(x.celdas[i], tl, at + .1);
  }
}));

/* --- escalera: los peldaños crecen uno por uno --- */
piel('escalera', {
  preparar(x) {
    x.celdas.forEach((li, i) => {
      envolver(li);
      li.style.setProperty('--k', i + 1);
      li.prepend(nuevo('span', 'peldano', i + 1));
    });
  },
  celda(x, i, tl, at) {
    const li = x.celdas[i];
    tl.set(li, { opacity: 1 }, at);
    tl.fromTo(li.querySelector('.peldano'), { scaleX: 0 }, { scaleX: 1, duration: .6, ease: 'power3.out' }, at);
    A.sube(li.querySelector('.cuerpo'), tl, at + .2);
  },
  todo(x, tl, at) { BASE.todo(x, tl, at, .22); }
});

/* --- anillos: el anillo se llena mientras la cifra cuenta (data-valor, data-max, data-unidad) --- */
const unidadDe = (li, b, def) => li.dataset.unidad ?? b.dataset.unidad ?? def;
piel('anillos', {
  preparar(x) {
    const max = M.numero(x.b.dataset.max || 100);
    x.celdas.forEach(li => {
      envolver(li);
      const v = M.numero(li.dataset.valor || 0), r = 120, L = 2 * Math.PI * r;
      const caja = nuevo('div', 'anillo');
      const s = M.svg('svg', { viewBox: '0 0 260 260' });
      M.svg('circle', { cx: 130, cy: 130, r, class: 'pista' }, s);
      const arco = M.svg('circle', { cx: 130, cy: 130, r, class: 'arco' }, s);
      arco.style.strokeDasharray = `${L} ${L}`;
      const centro = nuevo('div', 'centro-anillo');
      centro.append(valorEl('valor', v, M.decimales(li.dataset.valor), unidadDe(li, x.b, '%')));
      caja.append(s, centro);
      li.prepend(caja);
      li._anillo = { arco, L, f: Math.max(0, Math.min(1, v / max)) };
    });
  },
  celda(x, i, tl, at) {
    const li = x.celdas[i], { arco, L, f } = li._anillo;
    A.sube(li, tl, at);
    tl.fromTo(arco, { strokeDashoffset: L }, { strokeDashoffset: L * (1 - f), duration: 1.2, ease: MOV.cambio }, at + .1);
    A.contar(li.querySelector('.valor'), tl, at + .1, 1.2);
  },
  todo(x, tl, at) { BASE.todo(x, tl, at, .18); }
});

/* --- barras: las barras crecen mientras la cifra cuenta --- */
piel('barras', {
  preparar(x) {
    const max = M.numero(x.b.dataset.max || 100);
    x.celdas.forEach(li => {
      envolver(li);
      const v = M.numero(li.dataset.valor || 0);
      const pista = nuevo('div', 'pista'), lleno = nuevo('i', 'lleno');
      lleno.style.width = Math.max(0, Math.min(100, v / max * 100)) + '%';
      pista.append(lleno);
      li.append(pista, valorEl('valor', v, M.decimales(li.dataset.valor), unidadDe(li, x.b, '%')));
    });
  },
  celda(x, i, tl, at) {
    const li = x.celdas[i];
    A.sube(li, tl, at);
    tl.fromTo(li.querySelector('.lleno'), { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: MOV.cambio }, at + .1);
    A.contar(li.querySelector('.valor'), tl, at + .1, 1.1);
  },
  todo(x, tl, at) { BASE.todo(x, tl, at, .15); }
});

/* --- cuadrícula de puntos: «95 de cada 100»; los puntos se encienden uno a uno --- */
piel('puntos', {
  preparar(x) {
    x.b.style.setProperty('--n', x.b.dataset.columnas || Math.min(x.n, 2));
    x.celdas.forEach(li => {
      const cuerpo = envolver(li);
      const total = Math.round(M.numero(li.dataset.total || x.b.dataset.total || 100));
      const v = Math.round(M.numero(li.dataset.valor || 0));
      const cols = Math.round(M.numero(li.dataset.porFila || x.b.dataset.porFila || Math.ceil(Math.sqrt(total))));
      const filas = Math.ceil(total / cols), d = 44, r = 15;
      const s = M.svg('svg', { viewBox: `0 0 ${cols * d} ${filas * d}`, class: 'rejilla' });
      const llenos = [];
      for (let k = 0; k < total; k++) {
        const cx = (k % cols) * d + d / 2, cy = Math.floor(k / cols) * d + d / 2;
        M.svg('circle', { cx, cy, r, class: 'vacio' }, s);
        if (k < v) llenos.push(M.svg('circle', { cx, cy, r, class: 'lleno' }, s));
      }
      li.prepend(s);
      cuerpo.prepend(valorEl('valor', v, 0, unidadDe(li, x.b, '')));
      li._puntos = llenos;
    });
  },
  celda(x, i, tl, at) {
    const li = x.celdas[i], p = li._puntos;
    A.sube(li, tl, at);
    if (p.length) tl.fromTo(p, { opacity: 0, scale: .3, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .3, ease: 'power2.out', stagger: Math.min(.02, 1.4 / p.length) }, at + .2);
    A.contar(li.querySelector('.valor'), tl, at + .2, 1.6);
  },
  todo(x, tl, at) { BASE.todo(x, tl, at, .3); }
});

/* --- burbujas de diálogo: cada voz con su color y su lado (data-quien) --- */
piel('burbujas', {
  preparar(x) {
    const voces = [];
    x.celdas.forEach(li => {
      const q = li.dataset.quien || '';
      if (!voces.includes(q)) voces.push(q);
      li.classList.add('voz-' + (voces.indexOf(q) % 2 + 1));
      if (q) li.prepend(nuevo('span', 'quien', q));
    });
  },
  celda(x, i, tl, at) { tl.fromTo(x.celdas[i], { opacity: 0, y: 14, scale: .97 }, { opacity: 1, y: 0, scale: 1, duration: .5, ease: 'power3.out' }, at); },
  todo(x, tl, at) { BASE.todo(x, tl, at, .35); }
});

M.componente('.bloque', bloque);
M.pieles = PIELES;

/* ======================= recta numérica ======================= */
/* <figure class="recta" data-de="-1" data-a="1" data-marcas="…" data-menores="…"
     data-zonas="A|B|…"                       nombres entre marcas consecutivas
     data-rotulos="0=Imposible; 1=Seguro"     o rótulos en posiciones exactas
     data-activa="a b; c d; …" o "x; y; …"    tramos o puntos; el primero entra con la recta y cada uno más es un paso
     data-espera>                             el primero también espera su paso */
M.componente('.recta', fig => {
  const de = M.numero(fig.dataset.de ?? -1), a = M.numero(fig.dataset.a ?? 1);
  const marcas = lista(fig.dataset.marcas), menores = lista(fig.dataset.menores);
  const zonas = fig.dataset.zonas ? fig.dataset.zonas.split('|').map(s => s.trim()) : [];
  const rotulos = (fig.dataset.rotulos || '').split(';').map(r => r.split('=')).filter(r => r.length === 2)
    .map(([v, t]) => [M.numero(v.trim()), t.trim()]);
  const tramos = (fig.dataset.activa || '').split(';').map(lista).filter(t => t.length === 1 || t.length === 2)
    .map(t => t.length === 1 ? [t[0], t[0]] : t);
  const punto = tramos.length && tramos[0][0] === tramos[0][1];
  const espera = fig.hasAttribute('data-espera');
  const W = fig.clientWidth || 1640, Y = 60;
  const px = v => (v - de) / (a - de) * W;
  const s = M.svg('svg', { viewBox: `0 0 ${W} 120` });
  fig.prepend(s);
  const eje = M.svg('path', { d: `M0 ${Y} H${W}`, class: 'eje' }, s);
  const rayas = [...marcas.map(m => M.svg('path', { d: `M${px(m)} ${Y - 13} V${Y + 13}`, class: 'marca-mayor' }, s)),
                 ...menores.map(m => M.svg('path', { d: `M${px(m)} ${Y - 7} V${Y + 7}`, class: 'marca-menor' }, s))];
  const nums = marcas.map(m => {
    const t = M.svg('text', { x: px(m), y: 24, class: 'numero', 'text-anchor': m === de ? 'start' : m === a ? 'end' : 'middle' }, s);
    t.textContent = m === 0 ? '0' : corto(m);
    return t;
  });
  const activa = !tramos.length ? null : punto
    ? M.svg('circle', { cx: px(tramos[0][0]), cy: Y, r: 15, class: 'activa-punto' }, s)
    : M.svg('line', { x1: px(tramos[0][0]), x2: px(tramos[0][1]), y1: Y, y2: Y, class: 'activa' }, s);
  const lugar = t => punto ? { cx: px(t[0]) } : { x1: px(t[0]), x2: px(t[1]) };
  const etiquetas = zonas.map((z, k) => {
    const d = nuevo('div', 'zona', z);
    d.style.left = (px(marcas[k]) + px(marcas[k + 1] ?? a)) / 2 + 'px';
    fig.append(d);
    return d;
  });
  const fijos = rotulos.map(([v, t]) => {
    const d = nuevo('div', 'zona', t);
    d.style.left = px(v) + 'px';
    if (v === de) d.style.transform = 'none';
    if (v === a) d.style.transform = 'translateX(-100%)';
    fig.append(d);
    return d;
  });
  const zonaDe = t => { const m = (t[0] + t[1]) / 2; return marcas.findIndex((b, k) => k < marcas.length - 1 && m >= b && m <= marcas[k + 1]); };
  const masCerca = t => {
    const m = (t[0] + t[1]) / 2;
    return rotulos.reduce((mej, [v], k) => Math.abs(v - m) < Math.abs(rotulos[mej][0] - m) ? k : mej, 0);
  };
  const marcar = t => {
    etiquetas.forEach((d, k) => d.classList.toggle('on', !!t && k === zonaDe(t)));
    fijos.forEach((d, k) => d.classList.toggle('on', !!t && k === masCerca(t)));
  };
  const c = {
    reset() {
      if (activa) gsap.set(activa, { attr: lugar(tramos[0]), opacity: espera ? 0 : 1 });
      marcar(espera ? null : tramos[0]);
    },
    entrada(tl, at) {
      A.dibujar(eje, tl, at, .9);
      tl.fromTo(rayas, { opacity: 0 }, { opacity: 1, duration: .3, stagger: .04 }, at + .4);
      tl.fromTo(nums, { opacity: 0 }, { opacity: 1, duration: .4 }, at + .5);
      if (activa && !espera) tl.fromTo(activa, { opacity: 0 }, { opacity: 1, duration: .4 }, at + .7);
      const todas = [...etiquetas, ...fijos];
      if (todas.length) tl.fromTo(todas, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .5, ease: MOV.entrada, stagger: .05 }, at + .6);
    }
  };
  const siguientes = espera ? tramos : tramos.slice(1);
  if (siguientes.length) c.pasos = () => siguientes.map((t, k) => ({
    paso: null,
    entrar(tl, at) {
      if (espera && k === 0) tl.fromTo(activa, { opacity: 0, scale: punto ? .3 : 1, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: .45, ease: 'power3.out' }, at);
      else tl.to(activa, { attr: lugar(t), duration: .6, ease: MOV.cambio }, at);
      tl.call(marcar, [t], at + (espera && k === 0 ? 0 : .3));
    }
  }));
  return c;
});

/* ======================= diagrama geométrico ======================= */
/* <svg class="diagrama" viewBox="0 0 1640 H"> con rect, path.flecha, text…; los grupos con data-paso entran en su paso */
M.componente('svg.diagrama', s => {
  $$('.flecha', s).forEach(M.flecha);
  const libres = A.hojas(s).filter(h => !h.closest('[data-paso]:not([data-paso="0"])'));
  return {
    reset() { A.ocultarGrupo(libres); },
    entrada(tl, at) { A.dibujarGrupo(libres, tl, at); }
  };
});

/* ======================= cita de autor ======================= */
M.componente('.cita', q => {
  const abre = nuevo('span', 'comillas abre', '“'), cierra = nuevo('span', 'comillas cierra', '”');
  q.append(abre, cierra);
  return {
    entrada(tl, at) {
      A.sube(q, tl, at);
      tl.fromTo([abre, cierra], { opacity: 0, scale: .6 }, { opacity: 1, scale: 1, duration: .5, ease: 'power3.out', stagger: .2 }, at + .3);
    }
  };
});

/* ======================= temporizador ======================= */
/* <div class="temporizador" data-minutos="3" data-paso>: arranca al entrar en su paso; un clic lo pausa o lo reanuda */
M.componente('.temporizador', t => {
  const total = Math.max(1, Math.round(M.numero(t.dataset.minutos || 1) * 60));
  const txt = nuevo('span', 't'), barra = nuevo('span', 'barra-t'), lleno = nuevo('i');
  barra.append(lleno); t.append(txt, barra);
  let resta = total, reloj = null;
  const pinta = () => {
    txt.textContent = Math.floor(resta / 60) + ':' + String(resta % 60).padStart(2, '0');
    gsap.set(lleno, { scaleX: resta / total });
    t.classList.toggle('fin', resta === 0);
  };
  const detener = () => { clearInterval(reloj); reloj = null; };
  const iniciar = () => {
    if (reloj || !resta) return;
    reloj = setInterval(() => { resta--; pinta(); if (!resta) detener(); }, 1000);
  };
  t.addEventListener('click', () => { if (reloj) detener(); else { if (!resta) { resta = total; pinta(); } iniciar(); } });
  pinta();
  return {
    reset() { detener(); resta = total; pinta(); },
    entrada(tl, at) {
      A.sube(t, tl, at);
      if (t.hasAttribute('data-paso') && !M.instantaneo) tl.call(iniciar, null, at + .5);
    },
    detener
  };
});

/* ======================= tabla por pasos ======================= */
/* <table class="tabla" data-foco>: cada fila del cuerpo entra en un paso, resaltada */
M.componente('table.tabla[data-foco]', t => {
  const filas = t.tBodies[0] ? [...t.tBodies[0].rows] : [];
  filas.forEach(f => f.setAttribute('data-m-interno', ''));
  const marcar = f => filas.forEach(x => x.classList.toggle('es-foco', x === f));
  return {
    reset() { marcar(null); gsap.set(filas, { opacity: 0 }); },
    entrada(tl, at) { A.sube(t, tl, at); },
    pasos: () => filas.map(f => ({
      paso: f.dataset.paso && /^\d+$/.test(f.dataset.paso) ? +f.dataset.paso : null,
      entrar(tl, at) { tl.call(marcar, [f], at); A.aparece(f, tl, at, .45); }
    }))
  };
});
})();
