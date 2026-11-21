/* Datos de la clase 13. Van en .js (no en .csv) porque fetch no funciona al abrir el archivo desde el disco. */
window.DATOS = {
  /* Memoria y edad: salida de JAMOVI de la clase 12 de Estadística PUJ 2026-01
     (fuente/reciclado/JAMOVI memoria y edad - descriptivos.png y - prueba t.png).
     Prueba t de Student para muestras independientes: t(58) = 3,95, p < 0,001; Hₐ μ jóvenes ≠ μ mayores. */
  memoria: {
    jovenes: { M: 78.1, DE: 9.00, n: 30 },
    mayores: { M: 68.8, DE: 9.31, n: 30 },
    t: 3.95, gl: 58
  },
  /* Curva normal: ejemplos simulados (ilustrativos) con valores realistas. Se generan en clase.js con semilla fija. */
  normales: [
    { nombre: 'Calificaciones de un examen', unidad: '', M: 3.5, DE: 0.5, decimales: 1 },
    { nombre: 'Peso levantado en sentadilla', unidad: 'kg', M: 80, DE: 15, decimales: 0 },
    { nombre: 'Estatura', unidad: 'cm', M: 168, DE: 8, decimales: 0 },
    { nombre: 'Puntaje de CI', unidad: '', M: 100, DE: 15, decimales: 0 }
  ],
  /* Moneda de la actividad ancla: el orden fijo de los 10 lanzamientos (C = cara, S = sello) */
  monedas: 'CCCSCCCCCC'
};
