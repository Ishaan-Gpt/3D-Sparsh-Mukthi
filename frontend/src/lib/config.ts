// The classroom app is a separate deployment; this URL is set at build time
// (VITE_CLASSROOM_URL) so the landing page always links to the right place
// in both dev (localhost:5174) and production (its real deployed URL).
export const CLASSROOM_URL = import.meta.env.VITE_CLASSROOM_URL || "http://localhost:5174/";
