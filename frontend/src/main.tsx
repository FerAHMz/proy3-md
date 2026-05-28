import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Sin <StrictMode>: su doble-mount duplica entradas en el Log de Cypher.
createRoot(document.getElementById('root')!).render(<App />);
