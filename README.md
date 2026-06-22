# Mistral Transfer

> Client WebDAV 100 % navigateur — multi-sélection, aperçu inline, upload chunké avec reprise.

Vos identifiants et vos fichiers ne quittent jamais votre machine : le navigateur parle directement à votre serveur WebDAV (Nextcloud, ownCloud, Apache mod_dav, Synology, Seafile…). Aucun back-end Mistral Transfer, aucune télémétrie, aucun CDN tiers.

---

## ✨ Fonctionnalités

- **Explorer WebDAV** — `PROPFIND` Depth: 1 avec parsing namespace-safe, tri colonnable (nom / taille / date), fil d'Ariane intelligent, raccourcis clavier (`⌘A`, `Escape`, `Delete`).
- **Multi-sélection** — `clic`, `⌘/Ctrl-clic`, `Shift-clic` (range). Barre d'actions contextuelle pour téléchargement, déplacement (`MOVE`) et suppression en lot.
- **Aperçu inline** — images, vidéos, audio, PDF, texte, code, Markdown rendu en HTML sûr. Limite 25 Mio (configurable).
- **Téléversement chunké** — `Content-Range PUT` pour les fichiers > 100 Mio, retries exponentiels sur erreurs réseau / 5xx, file persistante dans la session, fallback automatique en PUT simple si le serveur ne supporte pas le chunking. Glisser-déposer direct sur la grille.
- **PWA installable** — service worker via `vite-plugin-pwa`, fonctionne hors-ligne pour l'interface.
- **Thème clair / sombre** — détection système + override persistant.

---

## 🧰 Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Bundler | **Vite 5** | Build statique optimisé, dev server instantané. |
| Langage | **TypeScript strict** | `noUncheckedIndexedAccess`, `strict`, zéro `any` toléré. |
| UI | **DOM natif** | Pas de framework — l'app reste sous 50 ko de JS gzipé. |
| Icônes | **SVG inline** | Pas de FontAwesome, pas de Google Fonts, pas de CDN tiers. |
| PWA | **vite-plugin-pwa** + Workbox | Service worker prêt à installer. |

```
src/
├── webdav/        # Client (PROPFIND, MKCOL, MOVE, COPY, DELETE, PUT chunké…)
│   ├── client.ts
│   ├── parser.ts  # multistatus namespace-safe
│   ├── path.ts    # encode/decode segment-by-segment
│   ├── uploader.ts
│   └── types.ts
├── ui/            # Composants vanilla (toast, modal, breadcrumb, file grid…)
├── state/         # Store + persistance localStorage
├── utils/         # format, mime, dom helpers
└── styles/        # tokens.css, reset.css, app.css
```

---

## 🚀 Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build  →  dist/
npm run preview    # sert dist/ localement
npm run typecheck  # tsc --noEmit
```

Le dossier `dist/` est purement statique : déployable sur n'importe quel hébergement (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3…).

---

## 📡 Compatibilité serveur

Le client n'utilise que des verbes WebDAV standards (RFC 4918) :

| Verbe | Usage |
|---|---|
| `PROPFIND` (Depth: 1) | Lister un dossier |
| `GET` | Télécharger / aperçu |
| `PUT` | Téléverser (avec `Content-Range` pour le chunked) |
| `MKCOL` | Créer un dossier |
| `MOVE` / `COPY` | Renommer, déplacer |
| `DELETE` | Supprimer |

Testé contre les implémentations courantes : Nextcloud, ownCloud, Apache `mod_dav`, Synology DSM, Seafile, Caddy `file_server`.

### CORS

Le serveur doit autoriser l'origine d'où vous chargez l'app. Exemple Apache :

```apache
Header set Access-Control-Allow-Origin "https://votre-app.example"
Header set Access-Control-Allow-Methods "GET, PUT, DELETE, OPTIONS, PROPFIND, MKCOL, MOVE, COPY"
Header set Access-Control-Allow-Headers "Authorization, Content-Type, Depth, Destination, Overwrite, Content-Range, If, Lock-Token"
Header set Access-Control-Allow-Credentials "true"
```

Si vous hébergez Mistral Transfer sur la même origine que votre serveur WebDAV, aucune configuration CORS n'est nécessaire.

---

## ⌨️ Raccourcis

| Raccourci | Action |
|---|---|
| `⌘/Ctrl + A` | Sélectionner tout le dossier courant |
| `Shift + clic` | Sélection en plage |
| `⌘/Ctrl + clic` | Ajouter / retirer de la sélection |
| `Espace` | Cocher/décocher la ligne focus |
| `Entrée` | Ouvrir le dossier / afficher l'aperçu |
| `Delete` / `Backspace` | Supprimer la sélection |
| `Escape` | Fermer l'aperçu, vider la sélection |

---

## 🔒 Sécurité & vie privée

- Aucun back-end, aucun proxy : votre navigateur parle directement au serveur WebDAV via HTTPS.
- Le mot de passe reste en mémoire pendant la session, jamais persisté.
- Les connexions récentes (URL + utilisateur uniquement) sont stockées dans `localStorage`.
- Rendu Markdown réalisé avec un parser maison qui échappe l'HTML : pas de pass-through, pas d'`<a href="javascript:…">`.
- Tous les noms de fichiers sont insérés via `textContent` (jamais `innerHTML`) côté UI.

---

## 📦 Build & taille

```
dist/index.html                                   0.98 kB │ gzip:  0.51 kB
dist/assets/index-*.css                          20.3 kB  │ gzip:  4.3 kB
dist/assets/index-*.js                           45.1 kB  │ gzip: 15.2 kB
```

Pas de polices web, pas de runtime, pas de polyfills inutiles.

---

## 📄 Licence

MIT.
