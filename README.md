# Mistral Transfer

> **Transférez vos fichiers vers WebDAV avec élégance et simplicité**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Pure Client-Side](https://img.shields.io/badge/Client--Side-Only-brightgreen.svg)](https://developer.mozilla.org/en-US/docs/Web/API)
[![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-100%-yellow.svg)](https://vanilla.js.org/)
[![Eco Design](https://img.shields.io/badge/Eco_Design-%F0%9F%8C%8F-22C55E.svg)](https://developer.mozilla.org/)

---

## 🌿 **Aperçu**

Mistral Transfer est une application web **100% côté client** qui permet de se connecter à des serveurs **WebDAV** et de transférer vos fichiers directement dans votre navigateur, sans serveur intermédiaire. Avec un **design écolo/bobo** ultra-clean et moderne, inspiré par les meilleurs outils comme **Squoosh**, **TinyPNG** et **Raycast**.

| Light Mode | Dark Mode |
|------------|-----------|
| ![Light Mode](https://img.shields.io/badge/Light-White?style=for-the-badge&color=white) | ![Dark Mode](https://img.shields.io/badge/Dark-Deep_Green?style=for-the-badge&color=062010) |

---

## ✨ **Fonctionnalités**

### 🔐 **Connexion Sécurisée**
- ✅ **Authentification Basic Auth** : Connexion avec nom d'utilisateur et mot de passe
- ✅ **URL personnalisable** : Support de n'importe quel serveur WebDAV compatible
- ✅ **Connexions sauvegardées** : Historique des dernières connexions (sans mot de passe)
- ✅ **Détection automatique** : Vérification de la compatibilité du serveur

### 📁 **Explorateur de Fichiers**
- ✅ **Navigation arborescente** : Parcourez vos dossiers WebDAV
- ✅ **Breadcrumb** : Navigation intuitive avec fil d'Ariane
- ✅ **Liste des fichiers/dossiers** : Affichage clair avec icônes spécifiques
- ✅ **Métadonnées** : Taille, date de modification, type de fichier
- ✅ **Rafraîchissement** : Actualisation manuelle du contenu

### 📤 **Upload de Fichiers**
- ✅ **Glisser-déposer** : Ajout multiple de fichiers
- ✅ **Sélection via dialogue** : Bouton de parcours classique
- ✅ **File d'attente** : Gestion des uploads multiples
- ✅ **Progression en temps réel** : Barre de progression par fichier
- ✅ **Statut des uploads** : Succès, erreur, en attente

### 📥 **Téléchargement**
- ✅ **Téléchargement individuel** : Un clic pour télécharger un fichier
- ✅ **Téléchargement direct** : Pas de stockage intermédiaire

### 📂 **Gestion des Dossiers**
- ✅ **Création de dossiers** : Nouveau dossier dans le chemin courant
- ✅ **Navigation** : Double-clic ou clic pour ouvrir un dossier
- ✅ **Retour arrière** : Via le breadcrumb

### 🗑️ **Gestion des Fichiers**
- ✅ **Renommage** : Modification du nom des fichiers/dossiers
- ✅ **Suppression** : Avec confirmation de sécurité
- ✅ **Actions rapides** : Boutons d'action sur chaque élément

### 📊 **Statistiques**
- ✅ **Compteur d'uploads** : Nombre total de fichiers uploadés
- ✅ **Compteur de téléchargements** : Nombre total de fichiers téléchargés
- ✅ **Compteur de dossiers/fichiers** : Dans le répertoire courant

### 🎨 **Design & Expérience**
- ✅ **Thème clair/sombre** avec détection automatique
- ✅ Design **ultra-clean** et moderne
- ✅ **Responsive** (mobile-first)
- ✅ **Animations fluides** et feedback visuel
- ✅ **Icônes écolo** : feuille, nuage, dossier
- ✅ **Pattern végétal** très subtil en background
- ✅ **Notifications toast** : Feedback immédiat des actions

### 🔒 **Sécurité & Vie privée**
- ✅ **100% côté client** – Aucun fichier ne transite par nos serveurs
- ✅ **Authentification directe** – Connexion directe au serveur WebDAV
- ✅ **Pas de stockage** – Les mots de passe ne sont pas sauvegardés
- ✅ **Chiffrement** – HTTPS requis pour la connexion
- ✅ **Pas de tracking** – Aucune donnée n'est collectée

---

## 🚀 **Utilisation**

### Pré-requis
- Un **serveur WebDAV** accessible (Nextcloud, OwnCloud, Seafile, Apache avec mod_dav, etc.)
- Un **navigateur moderne** (Chrome, Firefox, Safari, Edge)
- Une **connexion HTTPS** (recommandée pour la sécurité)

### Méthode 1 : Ouverture locale
1. Téléchargez ou clonez ce dépôt
2. Ouvrez le fichier `index.html` dans votre navigateur
3. Entrez l'URL de votre serveur WebDAV, votre nom d'utilisateur et mot de passe
4. Cliquez sur "Se connecter"

### Méthode 2 : Serveur local (pour le développement)
```bash
cd mistral-transfer
python -m http.server 8000
# Ouvrez http://localhost:8000 dans votre navigateur
```

### Méthode 3 : Déploiement
Déployez simplement les 3 fichiers (`index.html`, `style.css`, `script.js`) sur n'importe quel hébergement web (Netlify, Vercel, GitHub Pages, etc.).

---

## 📋 **Configuration du Serveur WebDAV**

### Serveurs Compatibles
| Serveur | URL WebDAV typique | Remarques |
|---------|---------------------|-----------|
| **Nextcloud** | `https://votre-nextcloud.com/remote.php/dav/files/VOTRE_USER/` | Accès aux fichiers personnels |
| **OwnCloud** | `https://votre-owncloud.com/remote.php/dav/files/VOTRE_USER/` | Similaire à Nextcloud |
| **Seafile** | `https://votre-seafile.com/seafdav/` | Accès complet |
| **Apache** | `https://votre-serveur.com/webdav/` | Nécessite mod_dav activé |
| **IIS** | `https://votre-serveur.com/webdav/` | WebDAV activé sur IIS |
| **Synology** | `https://votre-nas.synology.me/webdav/` | DSM avec WebDAV activé |
| **QNAP** | `https://votre-nas.qnapcloud.com:5006/webdav/` | QTS avec WebDAV activé |

### Configuration Nextcloud/OwnCloud
1. Activez WebDAV dans les paramètres du serveur
2. L'URL est généralement : `https://[votre-domaine]/remote.php/dav/files/[votre-utilisateur]/`
3. Utilisez votre nom d'utilisateur et mot de passe

### Configuration Apache
```apache
# Dans votre configuration Apache
<Location /webdav>
    DAV On
    AuthType Basic
    AuthName "WebDAV"
    AuthUserFile /chemin/vers/.htpasswd
    Require valid-user
</Location>
```

---

## 🛠️ **Stack Technique**

| Composant | Technologie |
|-----------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Polices** | [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts) |
| **Icônes** | [Font Awesome 6](https://fontawesome.com/) |
| **WebDAV** | Fetch API + XML parsing |
| **Aucun framework** | Zero dependency |

### Fonctionnalités du navigateur requises
- API Fetch
- DOM Parser (pour analyser les réponses XML WebDAV)
- Blob API (pour les téléchargements)
- File API (pour les uploads)

### Méthodes WebDAV implémentées
| Méthode | Usage |
|---------|-------|
| `PROPFIND` / `SEARCH` | Lister les fichiers/dossiers |
| `GET` | Télécharger un fichier |
| `PUT` | Uploader un fichier |
| `MKCOL` | Créer un dossier |
| `DELETE` | Supprimer un fichier/dossier |
| `MOVE` | Renommer un fichier/dossier |
| `HEAD` | Obtenir les métadonnées |

---

## 📂 **Structure du Projet**

```
mistral-transfer/
├── index.html          # Structure HTML + interfaces
├── style.css           # Design system + composants
└── script.js           # Logique applicative + client WebDAV
```

---

## 🎨 **Design System**

### Couleurs

#### Palette Neutre (Light Mode)
| Variable | Couleur | Usage |
|----------|---------|-------|
| `--color-white` | `#ffffff` | Fond principal |
| `--color-gray-50` | `#f9fafb` | Fond secondaire |
| `--color-gray-200` | `#e5e7eb` | Bordures |
| `--color-gray-700` | `#374151` | Texte secondaire |
| `--color-gray-900` | `#111827` | Texte principal |

#### Couleurs Écolo (Accent)
| Variable | Couleur | Usage |
|----------|---------|-------|
| `--color-accent` | `#22C55E` | Boutons, états actifs |
| `--color-accent-light` | `#4ADE80` | Survol, accents clairs |
| `--color-accent-dark` | `#16A34A` | Clic, accents foncés |

#### Couleurs Nature
| Variable | Couleur | Usage |
|----------|---------|-------|
| `--color-nature-light` | `#86EFAC` | Fond pattern |
| `--color-nature-medium` | `#4ADE80` | Accents moyens |
| `--color-nature-dark` | `#059669` | Accents profonds |

#### Couleurs sémantiques
| Variable | Couleur | Usage |
|----------|---------|-------|
| `--color-success` | `#16A34A` | Succès |
| `--color-warning` | `#FDE047` | Avertissements |
| `--color-error` | `#DC2626` | Erreurs |

### Thème Écolo/Bobo

- **Light Mode** : Fond blanc avec motif végétal subtil (points verts clairs `#86EFAC`)
- **Dark Mode** : Palette de verts profonds pour un look naturel et apaisant
  - Fond principal : `#062010` (vert très foncé)
  - Fond secondaire : `#0F351F` (vert forêt)
  - Bordures : Teintes de vert terreux
- **Icônes** : Feuille (`fa-leaf`) pour le logo, nuage (`fa-cloud`) pour la connexion
- **Effet visuel** : Motif radial végétal en background très discret

---

## 🌿 **Thème Écolo/Bobo**

L'outil Mistral Transfer adopte un design inspiré par la nature :

- **Couleurs vertes apaisantes** : Palette de verts lumineux et profonds
- **Motif végétal** : Background subtil avec des points verts
- **Icônes naturelles** : Feuilles, nuages, dossiers
- **Ambiance zen** : Design épuré et rassurant
- **Respect de l'environnement** : Comme votre approche du développement !

---

## 🎯 **Workflow Typique**

1. **Connexion** : Entrez l'URL du serveur, nom d'utilisateur et mot de passe
2. **Navigation** : Parcourez vos dossiers via le breadcrumb ou en cliquant sur les dossiers
3. **Upload** : Glissez-déposez des fichiers ou cliquez sur "Uploader"
4. **Validation** : Cliquez sur "Uploader" pour lancer le transfert
5. **Gestion** : Renommez, supprimez, téléchargez les fichiers
6. **Déconnexion** : Quand vous avez terminé

---

## 📱 **Responsive Design**

| Taille écran | Disposition |
|--------------|-------------|
| Mobile (< 640px) | Affichage vertical, une colonne |
| Tablette (640px - 1024px) | Grille 2 colonnes pour les fichiers |
| Desktop (> 1024px) | Grille 3-4 colonnes, navigation optimisée |

---

## 🔧 **Personnalisation**

### Thème
Le thème est persistant via `localStorage` :
- `mistralTransferTheme` : `'light'` ou `'dark'`

### Connexions
Les connexions récentes sont sauvegardées (sans mot de passe) :
- `mistralTransferConfig` : Objet JSON avec les connexions (URL + username)

---

## 🐛 **Dépannage**

### Problèmes connus
| Problème | Solution |
|----------|----------|
| Connexion échoue | Vérifiez l'URL, le nom d'utilisateur et le mot de passe |
| Serveur non détecté | Assurez-vous que WebDAV est activé sur le serveur |
| Upload échoue | Vérifiez les permissions d'écriture sur le serveur |
| Téléchargement bloqué | Acceptez les popups dans votre navigateur |
| CORS errors | Le serveur doit autoriser votre origine via CORS |

### Erreurs CORS
Si vous obtenez des erreurs CORS, votre serveur WebDAV doit être configuré pour accepter les requêtes depuis votre origine. Exemple pour Apache :

```apache
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS, PROPFIND, MKCOL, MOVE"
Header set Access-Control-Allow-Headers "Authorization, Content-Type, Depth, Destination"
Header set Access-Control-Allow-Credentials "true"
```

### Compatibilité navigateur
| Navigateur | Support | Remarques |
|------------|---------|-----------|
| Chrome | ✅ Complete | Recommandé |
| Firefox | ✅ Complete | |
| Safari | ⚠️ Partiel | Problèmes avec certaines méthodes WebDAV |
| Edge | ✅ Complete | |
| Mobile Chrome | ✅ Complete | |
| Mobile Safari | ⚠️ Limité | Problèmes avec WebDAV |

---

## 🤝 **Contribution**

Les contributions sont les bienvenues ! Voici comment contribuer :

1. **Fork** le projet
2. Créez une branche (`git checkout -b feature/amazing-feature`)
3. **Commit** vos changements (`git commit -m 'Add amazing feature'`)
4. **Push** vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrez une **Pull Request**

### Idées de contribution
- Support de WebDAV avancé (PROPPATCH, LOCK, etc.)
- Gestion des permissions
- Synchronisation automatique
- Historique des transferts
- Support du chunked upload pour les gros fichiers

---

## 📄 **Licence**

Distribué sous la licence **MIT**. Voir le fichier `LICENSE` pour plus d'informations.

---

## 🙏 **Remerciements**

- **Squoosh** - Pour l'inspiration de l'interface et de l'UX
- **TinyPNG** - Pour le design épuré
- **Raycast** - Pour l'inspiration des pill buttons et du style moderne
- **Inter** - Une police open-source exceptionnelle
- **Font Awesome** - Des icônes ouvertes et de qualité
- **La nature** 🌿 - Pour l'inspiration du design écolo/bobo

---

## 📞 **Contact & Support**

Pour toute question ou suggestion, n'hésitez pas à ouvrir une **Issue** ou une **Pull Request**.

---

<p align="center">
  Made with ❤️ and <a href="https://mistral.ai">Mistral AI</a> · Design Écolo/Bobo
</p>
