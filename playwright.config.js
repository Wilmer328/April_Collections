/**
 * Pruebas de extremo a extremo con Playwright.
 *
 * Son la punta de la pirámide: pocas, lentas comparadas con las unitarias, y
 * cada una recorre un flujo completo como lo haría una persona. Las 214
 * unitarias de Vitest cubren la lógica; estas cinco comprueban que la
 * aplicación compilada, en un navegador real, la expone bien.
 *
 * Corren contra el BUILD DE PRODUCCIÓN servido con `vite preview`, no contra
 * el servidor de desarrollo. Probar lo que se despliega, no una aproximación.
 *
 * Supabase se intercepta en la red (ver e2e/ayudas/supabase-doble.js). El
 * navegador, la interfaz y toda la lógica del cliente son reales; solo el
 * servidor es un doble. La decisión y su alternativa descartada están en
 * docs/adr/0005-e2e-contra-supabase-interceptado.md.
 */

import { defineConfig, devices } from '@playwright/test';

const PUERTO = 4173;

/**
 * Credenciales de mentira para el build de pruebas.
 *
 * La aplicación exige VITE_SUPABASE_URL y una clave para arrancar; sin ellas
 * muestra «Supabase todavía no está configurado». Estas apuntan a un dominio
 * que no existe: ninguna petición debe salir de verdad, y si alguna lo hiciera
 * fallaría de forma visible en lugar de tocar un proyecto real.
 */
const ENTORNO_DE_PRUEBA = {
  VITE_SUPABASE_URL: 'https://e2e.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'clave-e2e-no-es-real',
};

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',

  // Sin reintentos en local: un fallo debe verse a la primera. En CI se
  // permite uno, porque un navegador en una máquina compartida puede tener
  // un tropiezo de arranque que no dice nada del código.
  retries: process.env.CI ? 1 : 0,

  // Todas en paralelo salvo en CI, donde el runner tiene pocos núcleos y el
  // paralelismo real es menor de lo que parece.
  workers: process.env.CI ? 2 : undefined,

  // Falla la ejecución si alguien deja un test.only olvidado: en CI eso
  // pasaría en verde con una sola prueba y nadie lo notaría.
  forbidOnly: Boolean(process.env.CI),

  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: `http://localhost:${PUERTO}`,

    // El service worker se bloquea a propósito. Aunque el de esta aplicación
    // ignora las peticiones a otros orígenes, es una variable más entre la
    // prueba y la red, y Playwright no intercepta lo que un service worker
    // pida por su cuenta. Fuera de aquí sigue funcionando igual.
    serviceWorkers: 'block',

    // Rastro solo cuando algo falla: es lo único que hace falta para entender
    // un fallo en CI sin poder reproducirlo a mano.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',

    locale: 'es-HN',
    timezoneId: 'America/Tegucigalpa',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Compila con las credenciales de mentira y sirve el resultado. Es el
    // mismo `vite build` que corre en producción, con otras variables.
    command: `npm run build && npm run preview -- --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}/`,
    env: ENTORNO_DE_PRUEBA,
    // En local, si ya hay un preview levantado se reutiliza; en CI siempre
    // se arranca uno limpio.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
