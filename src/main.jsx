import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const root = createRoot(document.getElementById('root'));

// Pose Lab: solo en desarrollo (`bun run dev` → http://localhost:5173/strength-routine/?lab).
// En el build de producción esta rama se elimina.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('lab')) {
  import('./dev/PoseLab.jsx').then(({ PoseLab }) => root.render(<PoseLab />));
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
