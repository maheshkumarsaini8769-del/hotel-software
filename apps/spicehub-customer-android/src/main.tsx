import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { I18nProvider, installGlobalNumericInputGuard } from '@spicehub/ui';
import './index.css';

installGlobalNumericInputGuard();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
