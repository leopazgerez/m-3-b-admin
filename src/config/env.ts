/**
 * Configuración centralizada de variables de entorno del cliente / frontend.
 * Todas las variables expuestas al navegador en Next.js deben tener el prefijo NEXT_PUBLIC_.
 */

const normalizeUrl = (url: string | undefined, fallback: string): string => {
  if (!url || url.trim() === "") return fallback;
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const env = {
  /**
   * URL base completa de los endpoints de la API (ej: 'http://localhost:8000/api')
   */
  apiUrl: normalizeUrl(process.env.NEXT_PUBLIC_API_URL, "http://localhost:8000/api"),

  /**
   * Host base del servidor backend sin prefijo de ruta (ej: 'http://localhost:8000')
   */
  apiHost: normalizeUrl(process.env.NEXT_PUBLIC_API_HOST, "http://localhost:8000"),

  /**
   * Sub-ruta base si se aloja en un subdominio/subdirectorio (ej: GitHub Pages '/m-3-b-admin')
   */
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",

  /**
   * Indica si la aplicación se está ejecutando en entorno de producción
   */
  isProduction: process.env.NODE_ENV === "production",
} as const;

export default env;
