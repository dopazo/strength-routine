import { useCallback, useState } from 'react';

// Tema de la app: claro por defecto, oscuro si la persona lo elige (se
// recuerda en este dispositivo).
const THEME_KEY = 'tema';
const THEME_COLOR = { claro: '#F7F3EA', oscuro: '#1F1C16' };

export function readTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'oscuro' ? 'oscuro' : 'claro';
  } catch {
    return 'claro';
  }
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('theme-dark', theme === 'oscuro');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'oscuro' ? 'claro' : 'oscuro';
      applyTheme(next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        // Sin almacenamiento: vuelve al tema claro la próxima vez.
      }
      return next;
    });
  }, []);
  return [theme, toggle];
}
