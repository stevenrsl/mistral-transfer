import './styles/reset.css';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './app';
import { registerSW } from 'virtual:pwa-register';

const root = document.getElementById('app');
if (!root) throw new Error('Mount point #app missing.');

new App(root);

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
