// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// import {type lang, LOCALES} from './locales'
// import { LOCALES } from './locales'

// const ya = true;

// const t = LOCALES[lang];

// async function start() {
//   await initSDK();
//   let lang = (window as any)?.ysdk?.environment.i18n.lang;
//   if (!isValidLanguage(lang)) {
//     lang = null;
//   }
//   initLanguage(lang);
//   window.document.title = t('TITLE');
// }
//
// async function initSDK() {
//   if ((window as any)?.YaGames) {
//     (window as any).ysdk = await (window as any)?.YaGames?.init();
//   }
// }
//
//
// document.addEventListener('DOMContentLoaded', async () => {
//   if (ya) {
//     const script = document.createElement('script');
//     script.src = '/sdk.js';
//     script.async = true;
//     script.onload = start;
//     script.onerror = start;
//     document.body.append(script);
//   } else {
//     await start();
//   }
// });

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
