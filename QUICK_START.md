# Guide de démarrage rapide - IOL Calculator App

## Installation en 5 étapes

### 1. Installer Supabase CLI

**Windows (avec Scoop)** :
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**macOS** :
```bash
brew install supabase/tap/supabase
```

### 2. Installer les dépendances

```bash
cd IOL_APP_MINIMAL
npm install
```

### 3. Démarrer Supabase

```bash
supabase start
```

**⚠️ Important** : Notez bien l'URL de l'API et l'`anon key` affichées !

Exemple de sortie :
```
API URL: http://localhost:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Configurer les variables d'environnement

Créez un fichier `.env` à la racine avec le contenu suivant (remplacez par vos vraies valeurs) :

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<copiez-l-anon-key-ici>
```

### 5. Démarrer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173) dans votre navigateur !

## Première connexion

1. Allez sur [http://localhost:5173/login](http://localhost:5173/login)
2. Créez un compte avec votre email et mot de passe
3. Vous serez automatiquement redirigé vers l'IOL Calculator !

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre l'app en mode développement |
| `supabase start` | Démarre Supabase local |
| `supabase stop` | Arrête Supabase local |
| `supabase status` | Vérifie l'état de Supabase |
| `supabase db reset` | Réinitialise la BDD locale |

## Accès au Supabase Studio

Une fois Supabase démarré, accédez au Studio (interface d'administration de la BDD) :

👉 [http://localhost:54323](http://localhost:54323)

## Problèmes fréquents

### "Supabase not configured"
→ Vérifiez que votre fichier `.env` existe et contient les bonnes valeurs

### "Port 54321 already in use"
→ Un autre service utilise ce port. Arrêtez-le ou modifiez le port dans `supabase/config.toml`

### "Cannot connect to database"
→ Exécutez `supabase status` pour vérifier que Supabase tourne bien

## Prochaines étapes

- Consultez le [README.md](README.md) complet pour plus de détails
- Explorez le code dans `src/pages/IOLCalculator.tsx`
- Testez les edge functions dans `supabase/functions/`

Bon développement ! 🚀
