import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/lilita-one/latin-400.css';
import './styles/index.css';
import './styles/arcade.css';
import { useGameStore } from './store/gameStore';

// Dev-only handle for manual QA from the console (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { naira: typeof useGameStore }).naira = useGameStore;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
