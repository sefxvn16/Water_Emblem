/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { defaultRNG } from './core/combat/rng';

// ?seed=<int> makes combat RNG reproducible for browser tests (dev server only).
const seedParam = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('seed') : null;
if (seedParam !== null && /^-?\d+$/.test(seedParam)) {
  defaultRNG.setSeed(Number(seedParam));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
