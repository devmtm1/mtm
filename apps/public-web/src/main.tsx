import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { initPwa } from './utils/pwa';

initPwa();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Élément racine #root introuvable');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
