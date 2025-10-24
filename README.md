# IOL Calculator App

Application minimaliste de calcul de lentilles intraoculaires (IOL) avec authentification.

## Fonctionnalités

✅ **Authentification** : Page de login sécurisée avec Supabase Auth
✅ **IOL Calculator** : Interface complète pour le calcul de lentilles intraoculaires
✅ **Supabase Local** : Développement en local avec Supabase CLI
✅ **Déploiement Cloud** : Migration facile vers Supabase Cloud

## Prérequis

- **Node.js** (v18 ou supérieur)
- **npm** ou **yarn**
- **Supabase CLI** (pour le développement local)

### Installation de Supabase CLI

#### Windows (avec Scoop)
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### macOS (avec Homebrew)
```bash
brew install supabase/tap/supabase
```

#### Linux
```bash
npm install -g supabase
```

## Installation du projet

### 1. Installer les dépendances

```bash
npm install
```

### 2. Démarrer Supabase en local

```bash
supabase start
```

Cette commande va :
- Démarrer une instance Postgres locale
- Démarrer l'API Supabase
- Appliquer les migrations
- Afficher les credentials (API URL, anon key, etc.)

**⚠️ Important** : Copiez l'URL et la clé `anon key` affichées dans le terminal.

### 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet et ajoutez-y les informations de Supabase :

```bash
# Copier le fichier .env.local et mettre à jour avec les vraies valeurs
cp .env.local .env
```

Modifiez `.env` avec les valeurs affichées par `supabase start` :

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<votre-anon-key-ici>
```

### 4. Démarrer l'application

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:5173](http://localhost:5173)

## Structure du projet

```
IOL_APP_MINIMAL/
├── src/
│   ├── components/
│   │   ├── auth/          # Composants d'authentification
│   │   └── ui/            # Composants UI (shadcn/ui)
│   ├── pages/
│   │   ├── Login.tsx      # Page de connexion
│   │   └── IOLCalculator.tsx  # Page calculateur IOL
│   ├── hooks/             # React hooks personnalisés
│   ├── lib/
│   │   ├── auth.tsx       # Contexte d'authentification
│   │   ├── utils.ts       # Utilitaires
│   │   └── supabase.ts    # Configuration Supabase
│   ├── integrations/
│   │   └── supabase/      # Types et client Supabase
│   ├── utils/
│   │   └── pdfTextExtraction.ts  # Extraction de texte PDF
│   ├── App.tsx            # Composant principal
│   ├── main.tsx           # Point d'entrée
│   └── index.css          # Styles globaux
├── supabase/
│   ├── functions/
│   │   └── calculate-iol/ # Edge function pour calcul IOL
│   ├── migrations/        # Migrations de base de données
│   └── config.toml        # Configuration Supabase
├── package.json
└── README.md
```

## Utilisation

### Connexion

1. Accédez à [http://localhost:5173/login](http://localhost:5173/login)
2. Créez un compte ou connectez-vous avec vos identifiants
3. Vous serez redirigé vers l'IOL Calculator

### IOL Calculator

1. Téléchargez vos fichiers PDF (Biométrie et/ou MS 39)
2. Les données seront automatiquement extraites
3. Vérifiez et modifiez les valeurs si nécessaire
4. Sélectionnez le manufacturier et le type d'IOL
5. Cliquez sur "Soumettre à IOL Calculator" pour obtenir le résultat

## Commandes Supabase

### Arrêter Supabase local
```bash
supabase stop
```

### Réinitialiser la base de données
```bash
supabase db reset
```

### Créer une nouvelle migration
```bash
supabase migration new <nom_de_la_migration>
```

### Voir les logs
```bash
supabase logs
```

### Accéder au Studio local
Après `supabase start`, ouvrez [http://localhost:54323](http://localhost:54323)

## Déploiement sur Supabase Cloud

### 1. Créer un projet Supabase Cloud

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez votre **Project URL** et **anon key**

### 2. Lier votre projet local au cloud

```bash
supabase link --project-ref <votre-project-id>
```

### 3. Pusher les migrations vers le cloud

```bash
supabase db push
```

### 4. Déployer les edge functions

```bash
supabase functions deploy calculate-iol
```

### 5. Mettre à jour les variables d'environnement

Créez un fichier `.env.production` avec vos credentials cloud :

```
VITE_SUPABASE_URL=https://votre-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=<votre-anon-key-cloud>
```

### 6. Build et déploiement

```bash
npm run build
```

Déployez le contenu du dossier `dist/` sur votre plateforme de hosting (Vercel, Netlify, etc.)

## Scripts disponibles

- `npm run dev` : Démarre le serveur de développement
- `npm run build` : Compile l'application pour la production
- `npm run preview` : Prévisualise la version de production
- `npm run lint` : Lance ESLint pour vérifier le code

## Technologies utilisées

- **React 18** - Framework frontend
- **Vite** - Build tool
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS
- **Supabase** - Backend (Auth + Database + Edge Functions)
- **TanStack Query** - Gestion des requêtes
- **React Router** - Routing
- **shadcn/ui** - Composants UI
- **Radix UI** - Primitives UI accessibles
- **React Hook Form** - Gestion des formulaires
- **Zod** - Validation de schémas

## Troubleshooting

### Erreur : "Supabase URL is not configured"

Vérifiez que votre fichier `.env` contient bien les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

### Erreur de connexion à la base de données

Assurez-vous que Supabase est bien démarré :
```bash
supabase status
```

Si aucun service n'est en cours, démarrez Supabase :
```bash
supabase start
```

### Port 54321 déjà utilisé

Si le port est déjà utilisé, vous pouvez :
1. Arrêter le service qui utilise le port
2. Modifier le port dans `supabase/config.toml`

### Problème avec les Edge Functions

Pour tester l'edge function localement :
```bash
supabase functions serve calculate-iol
```

## Support

Pour toute question ou problème, consultez la [documentation Supabase](https://supabase.com/docs) ou ouvrez une issue sur GitHub.

## Licence

Ce projet est sous licence MIT.
