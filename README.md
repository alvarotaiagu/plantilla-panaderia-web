# Milmigas — plantilla de panadería / obrador

> **Sitio de demostración.** «Milmigas, obrador de pan» es un **negocio ficticio**.
> El nombre, la dirección (Rúa da Fornalla, 7 · A Coruña), el teléfono (981 00 00 12),
> el correo, los horarios, los precios, el equipo y las opiniones son **datos de
> muestra inventados** para esta plantilla. No corresponden a ningún negocio real.
> La página lleva `noindex, nofollow` a propósito.

**Demo:** https://alvarotaiagu.github.io/plantilla-panaderia-web/

---

## El concepto: «La miga»

Una panadería se juzga cuando el pan se parte. La miga —los alvéolos, su tamaño, su
irregularidad— es la prueba de todo lo que pasó antes: la masa madre, la hidratación,
las horas de frío. Así que la miga es aquí el **sistema visual completo**:

- El **hero** es un canvas de fermentación: burbujas que nacen abajo, crecen y suben.
  Es literalmente lo que ocurre dentro de la masa mientras duerme.
- El **símbolo de marca** es un círculo con alvéolos dentro: un corte de pan.
- La **sección protagonista** (02 — Cortes) es una galería anclada donde seis panes
  pasan de largo **en sección transversal**, cada uno con su alvéolo dibujado.
- Los **bordes** de tarjetas y fotos son gruesos y redondeados como una corteza; el
  primer plano de la hogaza se recorta en forma de hogaza.
- El **color** viene del horno: crema de harina, corteza tostada, un rojo de hornada
  saturado y el amarillo del maíz de la broa.

El movimiento sale de ahí, no de una lista: la masa sube (letras que entran desde
abajo), las burbujas crecen, el pan pasa y se parte, los pasos se apilan como horas.

## Mapa de secciones

| # | Sección | Qué hace |
|---|---|---|
| — | Hero | Canvas de fermentación, titular letra a letra, reloj **en vivo** con la cuenta atrás hasta la próxima hornada |
| — | Marquesina | Tira roja con la velocidad ligada al scroll |
| 01 | Hornadas | Las tres hornadas del día; la próxima se resalta sola según la hora real |
| 02 | Cortes | Galería anclada con scrub horizontal: 6 cortes de pan en SVG + ficha técnica |
| 03 | 72 horas | Sticky-stack de los cinco pasos del proceso, con lámina dibujada por paso |
| — | Banda | Dos fotografías del obrador |
| 04 | Carta | Cuatro bloques con precios de mostrador |
| 05 | Obrador | Contadores, las cuatro personas del equipo y los molinos que surten |
| — | Voces | Tres testimonios, marcados como de muestra |
| 06 | Visítanos | Horario semanal en franjas con estado «abierto ahora», dirección, mapa bajo clic y formulario de encargo de muestra |

## Recursos de movimiento

**0. Cortina de entrada.** **«Greña»** — la marca sube como la masa, se le da el corte encima y el pan se abre en dos: la mitad de arriba se va hacia arriba y la de abajo hacia abajo, cada una con su borde curvo de hogaza.

Es obligatoria en todas las plantillas (§5 del pliego) y está hecha para no dejar la
página tapada nunca: se retira al terminar la animación, se retira igual si el CDN de
GSAP no carga, se retira con `prefers-reduced-motion` y hay además un `setTimeout` de
5 s de red de seguridad. El `display` va en `.cortina:not([hidden])`, nunca en
`.cortina` a secas —si fuera a secas ganaría al atributo `hidden` y no se iría jamás.
El hero no entra hasta que la cortina va por la mitad (la constante `ESPERA` de
`main.js`), para que el relevo se vea como una sola cosa y no como dos animaciones
pegadas.

1. **Lenis** como único motor de scroll (`lerp: 0.17`, subido a propósito por la
   galería horizontal).
2. **Canvas de fermentación** en el hero — el recurso protagonista.
3. **Char-reveal** en todos los titulares, con la palabra en `inline-block` + `nowrap`.
4. **Marquesina** infinita con velocidad ligada a la del scroll.
5. **Galería anclada** con scrub horizontal e índice 01/06.
6. **Sticky-stack** de cinco pasos (el `<li>` es el sticky; el recorrido es su
   `margin-bottom`).
7. **Botones magnéticos** y **cursor** que engorda y cambia de texto por zona.
8. **Contadores** que suben al entrar en pantalla.

## Rendimiento medido

El hero es un canvas vivo, así que se midió con `PerformanceObserver` de `longtask`
(Chromium, 1440×900), no mirando los FPS:

- **Al arrancar (primeros 3 s): 4 tareas largas, la peor de 145 ms.** Son GSAP y la
  webfont, no el canvas: es el patrón conocido de las cargas con CDN.
- **Rodando (≈25 s con el canvas animando, subiendo y bajando la página): 0 tareas
  largas.** Es la prueba de que cachear la burbuja como sprite y pintarla con
  `drawImage` funciona: si el degradado radial se recalculara por fotograma, aquí
  saldrían decenas.

Para repetir la medida hace falta observar `longtask` **antes** de cargar la página
(`addInitScript`), o las entradas del arranque se pierden.

- **La cortina no añade tarea larga propia**: en la medición con cortina la tarea de
  arranque es de **147 ms**, del mismo orden que antes de ponerla, porque el gesto son
  transformaciones y opacidades, sin `blur` ni sombras por fotograma.

## Cómo reskinearlo a un cliente real

Todo lo específico del negocio está agrupado; no hay que tocar el motor.

1. **Datos del negocio** — en `index.html`: el bloque `application/ld+json` del
   `<head>`, la sección `#visita` (dirección, teléfono, correo), el `<footer>` y el
   `data-mapa` (la consulta del mapa está en `js/main.js`, sección 14).
   Quitar `<meta name="robots" content="noindex, nofollow">` y el sello de demo.
2. **Horario y hornadas** — en `js/main.js`, sección 11: los objetos `HORARIO` y
   `HORNADAS` están en minutos desde medianoche, con `0 = domingo`. Hay que cambiarlos
   a la vez que las franjas `--a` / `--b` de `#visita` (son porcentajes sobre una
   ventana de 6:00 a 21:00: `(minuto − 360) / 900`).
3. **Carta** — sección `#carta`, cuatro bloques `<div class="carta__bloque">`. Añadir
   o quitar `<li>` es seguro: la rejilla se recoloca sola.
4. **Cortes** — los seis SVG de `assets/cortes/` se generaron con un script de
   alvéolos. Para un cliente con fotografía buena, se sustituye el `<img>` por una foto
   con `srcset` y el resto de la ficha sigue igual.
5. **Fotos** — `assets/foto/w800` y `w1600`. Mantener los dos anchos y actualizar
   `width`/`height` reales en el HTML.
6. **Paleta y tipografía** — las variables de `:root` en `css/estilo.css` y el `<link>`
   de Google Fonts. Cambiar `--rojo` y `--grano` reorienta el sitio entero.
7. **Textos legales** — `legal.html`, incluida la parte de cookies.

## Decisiones tomadas

- **Sin `aggregateRating` ni `review`** en el marcado estructurado, aunque la página
  tenga testimonios: son inventados y no deben sembrar datos falsos en buscadores.
- **Las opiniones no se atribuyen a ninguna plataforma.** Van firmadas con nombre de
  pila ficticio y con un aviso explícito debajo.
- **Ilustración antes que foto mediocre.** Los seis cortes de pan y las cinco láminas
  del proceso están dibujados en SVG; las fotos de archivo solo aparecen donde aportan
  textura real (miga, manos, obrador, barras).
- **Nadie identificable en las fotos.** Ninguna imagen muestra caras y no hay menores.
- **El mapa no existe hasta que se pide**, para no contradecir el aviso de cookies.
- **El contenido sigue vivo con `prefers-reduced-motion`**: la cuenta atrás, el estado
  del mostrador, el día resaltado y los contadores siguen funcionando; lo que se apaga
  es el movimiento.
- **Sin GSAP la página se lee entera**: los estados «vacíos» viven bajo `.has-motion`,
  clase que solo se añade si GSAP y ScrollTrigger han cargado de verdad.

## Créditos de imágenes

Ver [`CREDITOS.md`](CREDITOS.md). Las ilustraciones son propias; las fotografías son de
Pexels bajo su licencia gratuita.

## Técnico

HTML + CSS + un `main.js`. Sin framework, sin build, sin backend, sin npm. GSAP,
ScrollTrigger y Lenis por CDN. Se abre con doble clic en `index.html` y se publica tal
cual en GitHub Pages.
