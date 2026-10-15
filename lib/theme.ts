export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "fc-theme";

/** Theme rendered on the server; the inline script corrects it before first paint. */
export const SERVER_DEFAULT_THEME: Theme = "dark";

/**
 * Runs synchronously in <head> before paint: stored choice wins, otherwise the OS preference.
 * Wrapped in try/catch because localStorage can throw (private mode, blocked storage).
 */
export const themeInitScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.setAttribute("data-theme",t)}catch(e){}})()`;
