
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

let root: ReactDOM.Root | null = null;

const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("No se pudo encontrar el elemento root para montar la aplicación.");
    return;
  }

  try {
    if (!root) {
      root = ReactDOM.createRoot(rootElement);
    }
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error crítico al renderizar la aplicación:", error);
    rootElement.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
      <h2>Error al cargar la aplicación</h2>
      <p>Ocurrió un error inesperado. Por favor, recarga la página o revisa la consola para más detalles.</p>
    </div>`;
  }
};

// Asegurar que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
