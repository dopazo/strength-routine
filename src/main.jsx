import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const root = createRoot(document.getElementById('root'));

// Pose Lab: solo en desarrollo (`bun run dev` → http://localhost:5173/strength-routine/?lab).
// En el build de producción esta rama se elimina.
const devParams = new URLSearchParams(window.location.search);
if (import.meta.env.DEV && devParams.has('lab')) {
  import('./dev/PoseLab.jsx').then(({ PoseLab }) => root.render(<PoseLab />));
} else if (import.meta.env.DEV && devParams.has('headlab')) {
  // Head Lab: láminas de deglución (`?headlab`).
  import('./dev/HeadLab.jsx').then(({ HeadLab }) => root.render(<HeadLab />));
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
