import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Resuelve una ruta relativa a este archivo. */
const desdeRaiz = (ruta) => fileURLToPath(new URL(ruta, import.meta.url));

export default defineConfig({
  build: {
    // El sitio tiene tres páginas independientes, no una SPA. Cada una es un
    // punto de entrada propio: Vite las procesa y las publica por separado.
    rollupOptions: {
      input: {
        landing: desdeRaiz('./index.html'),
        login: desdeRaiz('./login.html'),
        app: desdeRaiz('./app.html'),
      },
    },
  },

  test: {
    // La capa de dominio es JavaScript puro: sin DOM, sin red. No hace falta
    // simular un navegador, así que las pruebas corren directamente en Node.
    environment: 'node',
    include: ['tests/**/*.test.js'],

    coverage: {
      provider: 'v8',
      // 'text' para leerla en consola y en el pipeline; 'lcov' porque es el
      // formato que consume SonarCloud.
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      // `all: true` incluye también los archivos que ninguna prueba importa,
      // para que el porcentaje sea el real del proyecto y no solo el de lo
      // que ya está cubierto.
      all: true,
      include: ['src/**/*.js'],
    },
  },
});
