# MOTOR.md: cómo se usa el motor de diapositivas web

El motor es lo que comparten todas las clases: el estilo (`DESIGN-v3.md`), los objetos (`OBJETOS-GAMMA.md`), las animaciones y la navegación. Funciona sin internet, porque GSAP y las fuentes están en la carpeta. Este archivo viaja con cada copia del motor.

El motor central vive en `~/Desktop/Cursos/diapositivas-web/motor/` y sus objetos andando están en `diapositivas-web/muestrario/index.html`.

## Una clase es una carpeta autocontenida

Cada clase vive en la carpeta de su curso y tiene adentro todo lo que necesita. Se arma con la herramienta y no se copia a mano.

```
<curso>/Clase NN - Tema/
├── Clase NN - Tema.docx                 Word base (el docente escribe aquí sus notas)
├── Clase NN - Tema (diapositivas).html  un solo archivo para compartir (Classroom, correo, USB)
├── CLAUDE.md                            decisiones y estado de la clase
├── diapositivas/                        la clase web; se abre index.html y se publica tal cual
│   ├── index.html · clase.js · clase.css
│   ├── datos/ · medios/
│   └── motor/                           copia fija del motor (VERSION dice de cuándo); no se edita
├── fuente/                              generador del Word, respaldos y material reciclado
└── revision/                            capturas, hojas e informe de la última revisión
```

- **El motor se copia, no se enlaza.** Cuesta unos 700 KB por clase y deja cada clase estable: si el motor central cambia, las clases ya hechas siguen iguales hasta que se actualicen a propósito.
- **`diapositivas/` nunca lleva datos de estudiantes.** Publicar es copiar esa carpeta.
- **Lo propio de la clase** (una figura, una simulación) va en `clase.js` y `clase.css`. Si sirve para otras clases, se sube al motor central.
- **Los datos de la clase** van en `datos/*.js` (`window.DATOS = …`), porque `fetch` no funciona al abrir el archivo desde el disco.

### La herramienta `clase.py`

```bash
C=~/Desktop/Cursos/diapositivas-web/herramientas/clase.py
uv run $C nueva "<carpeta de la clase>"      # arma la carpeta (o completa una existente)
uv run $C revisar "<carpeta>"                # capturas, recorrido de pasos e informe en revision/
uv run $C revisar "<carpeta>" --pasos        # además, una captura por cada paso
uv run $C empaquetar "<carpeta>"             # el .html único, con fuentes y GSAP adentro
uv run $C motor "<carpeta>"                  # copia el motor central actual y vuelve a revisar
uv run $C pdf "<carpeta>"            # el PDF de la clase (una diapositiva por página, estado final)
uv run $C publicar "<carpeta>"       # al sitio público, en curso/unidad/clase, con su PDF; Materiales se actualiza solo
uv run $C cursos                     # sube cursos.json (los cursos y sus unidades) y reconstruye Materiales
uv run $C estado                             # lista las clases y si su motor está al día
```

- **`nueva`** copia la plantilla (`diapositivas-web/plantilla/`) y el motor. Si en la carpeta hay un generador del Word suelto, lo mueve a `fuente/` y lo deja escribiendo el Word en la carpeta de la clase.
- **`revisar` es el paso fijo después de cada cambio.**
  - Abre la clase con `?prueba`, que la recorre entera de ida y vuelta.
  - Anota los errores, lo que se sale del área útil (140 px a los lados y nada por debajo de 1000 px) y las diapositivas con más de 110 palabras (sin contar el texto de las figuras).
  - Captura cada diapositiva en su último paso y arma hojas de seis.
  - Todo queda en `revision/informe.md`, `revision/hoja-NN.png` y `revision/capturas/`. Tarda unos 10 segundos con 26 diapositivas.
- **`pdf`** imprime la clase con Chrome sin ventana sobre `index.html?imprimir`: todas las diapositivas en su estado final (sin atenuar), una por página de 1920 × 1080, con el texto seleccionable y los enlaces activos. Deja `<Clase> (diapositivas).pdf` en la carpeta de la clase.
- **`publicar`** lee `<carpeta>/publicacion.json` (curso, unidad, clase, orden, resumen y resumen_en, rutas_anteriores; la plantilla está en `plantilla/publicacion.json`) y valida curso y unidad contra `herramientas/cursos.json`, el registro de cursos con sus unidades en español e inglés. Si el curso no está, se agrega ahí primero. Después:
  - copia `diapositivas/`, el PDF y dos miniaturas (`miniatura.webp` y `miniatura-oscura.webp`, 960 × 540, de la diapositiva que dice `miniatura` en `publicacion.json`; por defecto la 2) a `curso/unidad/clase/` del repositorio público [Mateob6/diapositivas](https://github.com/Mateob6/diapositivas) (copia local en `diapositivas-web/publicacion/`). Cada semestre la clase se reemplaza en la misma dirección;
  - rehace `clases.json` y copia `cursos.json`, deja un desvío en cada ruta anterior y en la portada del sitio, que lleva a https://mateob6.github.io/materials;
  - sube los cambios, espera a que GitHub Pages sirva el índice nuevo y pide la reconstrucción del perfil (`gh workflow run deploy.yml -R Mateob6/Mateob6.github.io`). La página Materiales del perfil lee esos dos archivos al construirse.
  La dirección no lleva la universidad ni el semestre, y antes de publicar se revisa que no haya datos de estudiantes ni rutas del disco. Lo que se publica es la presentación y su PDF; el `.html` único no se ofrece para descargar.
- **El Word no se pierde al regenerarlo.** Si ya existe, el generador lo copia antes a `fuente/respaldos/` con la fecha, por si tenía notas del docente.

## Archivos del motor

| Archivo | Qué tiene |
|---|---|
| `paleta.css` | **la paleta y las fuentes, en un solo lugar**. El CSS la usa con `var(--nombre)` y el JavaScript la lee con `Motor.color('nombre')`; cambiar la paleta es cambiar este archivo |
| `fuentes.css`, `fuentes/` | Source Serif 4, IBM Plex Sans (con itálica) e IBM Plex Mono, en latino, latino extendido y griego (ρ, χ, α, σ) |
| `motor.css` | lo base: lienzo, títulos, texto, portada, pregunta, recuadro, cifra, etiquetas, tabla, columnas, marco y modo celular. Importa los otros tres CSS |
| `objetos.css` | las pieles del bloque y los demás objetos |
| `motor.js` | el núcleo: escenario, navegación, pasos declarativos, utilidades de animación y el modo `?prueba` |
| `objetos.js` | el bloque con sus pieles, la recta numérica, el diagrama, la cita, el temporizador y la tabla por pasos |
| `vendor/gsap.min.js` | GSAP 3.15.1 (licencia estándar gratuita de GSAP) |

El `index.html` de una clase enlaza, en este orden:

```html
<link rel="stylesheet" href="motor/motor.css">
<link rel="stylesheet" href="clase.css">
…
<script src="motor/vendor/gsap.min.js"></script>
<script src="motor/motor.js"></script>
<script src="motor/objetos.js"></script>
<script src="clase.js"></script>
```

## Navegación

- **Avanzar.** Flecha derecha o abajo, espacio, Enter, Av Pág (clicker), clic o deslizar en pantalla táctil.
- **Retroceder.** Flecha izquierda o arriba, Re Pág o Retroceso. Al volver, el paso queda dibujado sin animar.
- **F** pone pantalla completa; **Inicio** y **Fin** van a la primera y a la última.
- **La dirección guarda diapositiva y paso.** `#7` es la diapositiva 7 y `#7.2`, su paso 2. Recargar deja todo donde estaba.
- `?estatico` muestra todo sin animación (para revisar o capturar), `?prueba` es el recorrido automático de `revisar`, y `?movil` fuerza la lectura con desplazamiento, que es la que sale sola en un celular en vertical. En esa lectura cada diapositiva aparece en su último paso y nada queda atenuado.

## Estructura de una diapositiva

```html
<section class="diapositiva">
  <h2>Título</h2>
  <p class="bajada">Una línea bajo el título (opcional)</p>
  …contenido…
</section>
```

- **El contenido se centra** en el espacio que queda bajo el título, un poco por encima del centro. Con `class="diapositiva arriba"` queda pegado al título.
- **Portada.** `<section class="diapositiva portada">` con `p.antetitulo` (**el curso**, obligatorio), `h1`, `hr.regla`, `p.sub`, `p.pie` (el nombre) y `p.titulos` (**los títulos abreviados**, obligatorio); `h1.largo` para títulos largos y `.motivo` para una figura a la derecha. El curso y los títulos los pone `clase.py portada` desde `publicacion.json`, `cursos.json` y `herramientas/autor.json`; `revisar` avisa si faltan o no coinciden.
- **Pregunta grande.** `<p class="pregunta">`, que entra palabra por palabra. Las variables van en `<span class="subraya x">` o `y`, y el subrayado se dibuja.
- **Composición.** `.columnas` reparte en columnas iguales (`style="--n:3"`) o con medidas propias (`style="--plantilla: 620px 1fr"`). `.pila` apila con separación y `.abajo` empuja un elemento al fondo.

## De la marca del Word al HTML

La marca de cada diapositiva del Word base (skill `contenido-clase`) dice qué escribir.

| Objeto (marca) | HTML |
|---|---|
| pregunta grande | `<p class="pregunta">` |
| texto | `<p>`; las palabras clave en `<b>`, y las variables en `<b class="x">` o `<b class="y">` |
| lista | `<ul class="lista">` con viñetas, con la misma letra del texto (36 px). **Se prefiere a los párrafos**: una idea por línea (decisión del 21 nov). `lista ancho` usa todo el ancho y funciona también dentro de un bloque |
| línea lateral con foco | `<ul class="bloque linea-lateral" data-foco>` |
| cajas sólidas | `<ol class="bloque cajas">` |
| cajas delineadas | `<ol class="bloque cajas delineadas">` |
| cajas con línea lateral | `<ul class="bloque cajas con-linea">` |
| cajas con número | `<ol class="bloque cajas numeradas">` |
| etapas | `<ol class="bloque etapas">` |
| flechas | `<ol class="bloque flechas">` |
| línea de tiempo | `<ol class="bloque linea-tiempo">` con `data-rotulo` en cada `li`; `linea-tiempo vertical` para el eje vertical |
| ciclo | `<ol class="bloque ciclo" data-centro="Texto del centro">` |
| pirámide | `<ol class="bloque piramide">`, de la cúspide a la base |
| embudo | `<ol class="bloque embudo">`, de arriba abajo |
| escalera | `<ol class="bloque escalera">` |
| cifra grande | `<div class="cifra" data-contar>` (`mediana`, `principal`) |
| anillo | `<ul class="bloque anillos">` con `data-valor` en cada `li` |
| barras | `<ul class="bloque barras" data-max="…">` con `data-valor` |
| cuadrícula de puntos | `<ul class="bloque puntos">` con `data-valor` (y `data-total`, 100 por defecto) |
| recta numérica | `<figure class="recta" data-de data-a data-marcas data-activa>`. `data-activa` admite tramos («a b; c d») o **puntos** («0; 0,5; 1»); `data-rotulos="0=Imposible; 1=Seguro"` pone rótulos en posiciones exactas (el más cercano al punto activo va en negrilla) y `data-espera` hace que el primero también espere su paso |
| fórmula con fracción | `<span class="fraccion"><span>numerador</span><span>denominador</span></span>`, dentro de una cifra o de un texto |
| burbuja explicativa | `<span data-explica="las medias son iguales">=</span>`: al pasar el puntero sale la burbuja (solo CSS) |
| deslizador | `<div class="control"><span class="rotulo-control">…</span><input type="range" class="deslizador"></div>`; lo conecta el `clase.js` |
| tabla | `<table class="tabla">` (APA, solo líneas horizontales) |
| dos columnas | `<div class="columnas">` |
| cita de autor | `<blockquote class="cita"><p>…</p><cite>Autor (año, p. N)</cite></blockquote>` |
| burbujas de diálogo | `<ol class="bloque burbujas">` con `data-quien` en cada `li` |
| botón de modo oscuro | no se escribe: el motor lo pone en la `section.portada`. Cambia `data-tema` en `<html>` y lo guarda en el navegador; `?oscuro` o `?claro` en la dirección lo fuerzan. En `paleta.css` está la paleta oscura; si una figura propia mezcla áreas, usa `mix-blend-mode: var(--mezcla)`, y el texto sobre el color principal, `var(--sobre-principal)` |
| recuadro | `<p class="recuadro">` (`secundario` para el otro tono). Debajo de una fila de cajas, flechas, etapas, anillos o línea de tiempo horizontal **va centrado solo** (regla del 22 nov); en cualquier otro lugar queda alineado a la izquierda |
| subíndices | `H<sub>0</sub>`, `μ<sub>1</sub>`. **Nunca los subíndices Unicode** (₀, ₁): las fuentes no los traen y en los títulos con serif «H₀» sale como «Ho» |
| diagrama geométrico | `<svg class="diagrama" viewBox="0 0 1640 H">` escrito a mano (ver abajo) |
| figura del motor, video, lámina | `<figure class="medio"><img o video o iframe><figcaption>` |
| actividad | `<ol class="instrucciones">` (el `.temporizador` existe en el motor, pero por decisión del docente no se usa) |
| etiquetas de variable | `<div class="etiquetas"><span class="etiqueta x" data-letra="X">…</span></div>` |
| referencias | `<ul class="referencias">` (sangría francesa) |

**Cada celda del bloque** es un `<li>` con `<h3>` y `<p>`, o solo texto. `data-columnas` cambia el número de columnas; `class="secundario"` en el bloque o en una celda cambia su tono (por ejemplo, castigo frente a refuerzo); `class="es-foco"` en una celda la deja resaltada sin pasos.

## Pasos: la animación de la marca

| Animación (marca) | Cómo se escribe |
|---|---|
| entrada | nada: todo entra con la diapositiva, en cascada |
| foco por pasos | `data-foco` en el bloque: una celda por paso, la actual resaltada y las anteriores al 60 % (`--atenuado`), que se siguen leyendo |
| (acumular) | `data-foco="acumular"`: una celda por paso, sin atenuar las anteriores (es lo que usan burbujas, anillos, barras y puntos) |
| (Emphasize) | `data-foco="mover"`: todas visibles; cada paso mueve el resaltado |
| trazo que se dibuja | `svg.diagrama`, `hr.regla`, `.subraya`, la recta y los ejes se dibujan solos |
| los puntos cambian | la recta con `data-activa="a b; c d; …"`; un tramo por paso |
| contador | `data-contar` en una cifra; anillos, barras y puntos cuentan solos |
| proceso por clic | grupos `<g data-paso>` en un diagrama o JavaScript propio |

**Cualquier elemento con `data-paso` entra en el siguiente paso**, en orden de documento. `data-paso="2"` lo pone en el paso 2, junto con lo que ya esté ahí. `data-sale="atenuar"` o `"ocultar"` lo baja en el paso siguiente, y con `data-paso="0"` entra con la diapositiva y sale en el paso 1.

**`.relevo`** pone a sus hijos en el mismo lugar. El que tiene `data-paso` reemplaza al anterior, como los pies de un diagrama que cambian con cada paso.

## Diagramas geométricos

Se escriben en SVG con medidas exactas, en un `viewBox` de 1640 de ancho (el ancho útil de la diapositiva). El motor los dibuja trazo a trazo.

```html
<svg class="diagrama" viewBox="0 0 1640 470">
  <rect x="80" y="320" width="480" height="130"/>
  <text x="320" y="385">Variable A</text>
  <g data-paso="0" data-sale="atenuar"><path class="flecha" d="M580 385 L1078 385"/></g>
  <g data-paso> … lo que entra en el paso 1 … </g>
</svg>
```

- `class="flecha"` en un `path` o `line` le pone la punta triangular llena.
- **Clases de color.** `principal`, `secundario` y `tenue`. `grueso` da 6 px, y `relleno` es una superficie de tinte sin borde.
- **Texto.** Va centrado en su punto. `inicio` o `fin` cambian el anclaje, y `nota` es la sans itálica gris de los rótulos de las flechas.

## JavaScript propio de una clase

Para lo que no es declarativo (un gráfico de datos, una actividad interactiva), en `clase.js`, que va después de `objetos.js`:

```html
<script>
Motor.diapositiva('id-de-la-section', {
  preparar(el) { /* una vez, al cargar: construir el SVG */ },
  entrada(el, tl) { /* se suma a la entrada automática */ },
  pasos: [ (el, tl) => { /* paso propio */ } ]   // o { 3: fn } para sumarse al paso 3
});
</script>
```

`detener(el)` se llama al salir de la diapositiva, para parar lo que se repite solo (un carrusel, una simulación); lo que se arranca en la entrada se arranca solo si `!Motor.instantaneo`. `automatico: false` apaga la entrada y los pasos declarativos de esa diapositiva. Las utilidades están en `Motor.anim`:
- **Entradas.** `sube`, `aparece`, `mascara` y `atenuar`.
- **Trazos.** `dibujar` y `ocultarTrazo`.
- **Grupos SVG.** `dibujarGrupo` y `ocultarGrupo`.
- **Cifras.** `contar`.

También están:
- `Motor.svg(tag, attrs, padre)` y `Motor.flecha(path)` para dibujar.
- `Motor.fmt(v, decimales)`, que escribe con coma y signo menos tipográfico.
- `Motor.color('principal')` para leer la paleta.
- `Motor.componente(selector, construir)`, para registrar un objeto nuevo.

## Lo que el motor ya cumple

- **Movimiento.** La entrada sube 20 px en 0,7 s con `power4.out`, en cascada de 0,12 s. El cambio de diapositiva es un fundido de 0,3 s, lo anterior queda al 60 % (se sigue leyendo) y el texto nunca rebota.
- **Color.** Sale solo de `paleta.css`. X va en el principal y Y en el secundario, y sobre los rellenos solo va tinta.
- **Escritura.** Los números van en español (0,05; −0,59; 99,7 %).
