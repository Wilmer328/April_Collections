/*
 * Plantilla de configuración en tiempo de ejecución.
 *
 * COPIA este archivo como `config.js` (que está en .gitignore) y rellena los
 * valores con los de TU proyecto de Supabase:
 *   Dashboard -> Project Settings -> API
 *
 * Luego enlázalo ANTES de los módulos, en login.html y app.html:
 *   <script src="./config.js"></script>
 *
 * La URL y la anon key son públicas por diseño (viajan al navegador en
 * cualquier app Supabase; la seguridad real la dan las políticas RLS).
 * Aun así se mantienen fuera del repositorio para no fijar el entorno en el
 * código. NUNCA pongas aquí la service_role key.
 */

window.__APP_CONFIG__ = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
