import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import i18n from './i18n';
import './hooks/useTheme';

document.documentElement.lang = i18n.language?.slice(0, 2) ?? 'de';
i18n.on('languageChanged', (lng) => { document.documentElement.lang = lng.slice(0, 2); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
