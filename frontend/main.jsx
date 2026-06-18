/**
 * Main Entry Point - Kain & Kasa Frontend
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// ==========================================
// RENDER APP
// ==========================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found!');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// ==========================================
// HOT MODULE RELOAD (Development)
// ==========================================

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('App reloaded');
  });
}