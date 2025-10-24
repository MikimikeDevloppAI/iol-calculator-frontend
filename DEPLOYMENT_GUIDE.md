# Guide de déploiement sur Supabase Cloud

Ce guide vous explique comment déployer votre application IOL Calculator sur Supabase Cloud.

## Prérequis

✅ Compte Supabase (créer sur [supabase.com](https://supabase.com))
✅ Supabase CLI installé
✅ Application fonctionnelle en local
✅ Git (pour le versioning)

## Étape 1 : Créer un projet Supabase Cloud

1. Allez sur [https://supabase.com](https://supabase.com)
2. Connectez-vous ou créez un compte
3. Cliquez sur "New Project"
4. Remplissez les informations :
   - **Name** : IOL Calculator App
   - **Database Password** : Choisissez un mot de passe fort (notez-le !)
   - **Region** : Choisissez la région la plus proche de vos utilisateurs
5. Cliquez sur "Create new project"
6. Attendez quelques minutes que le projet soit créé

## Étape 2 : Récupérer vos credentials

Une fois le projet créé :

1. Allez dans **Settings** > **API**
2. Notez ces valeurs :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **Project API keys** > **anon/public** : `eyJhbG...`
   - **Project Reference ID** : `xxxxx`

## Étape 3 : Lier votre projet local au cloud

Dans votre terminal, à la racine du projet :

```bash
supabase link --project-ref <votre-project-reference-id>
```

Entrez le mot de passe de votre base de données quand demandé.

## Étape 4 : Pusher les migrations

Appliquez vos migrations sur la base de données cloud :

```bash
supabase db push
```

Cette commande va :
- Créer les tables `users`, `iol_manufacturers`, `iol_lenses`
- Appliquer les politiques RLS
- Insérer les données initiales (manufacturiers, lentilles)

## Étape 5 : Déployer les Edge Functions

Déployez la fonction `calculate-iol` :

```bash
supabase functions deploy calculate-iol
```

Si vous avez besoin de secrets (API keys, etc.) :

```bash
supabase secrets set MY_SECRET_KEY=value
```

## Étape 6 : Configurer les variables d'environnement pour la production

### Option A : Fichier .env.production

Créez un fichier `.env.production` :

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

### Option B : Variables d'environnement de votre hébergeur

Si vous déployez sur Vercel, Netlify, etc., ajoutez ces variables dans leur interface :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Étape 7 : Build de production

```bash
npm run build
```

Cette commande crée un dossier `dist/` avec votre application compilée.

## Étape 8 : Déployer sur un hébergeur

### Option A : Vercel

1. Installez Vercel CLI :
   ```bash
   npm i -g vercel
   ```

2. Déployez :
   ```bash
   vercel
   ```

3. Suivez les instructions
4. Ajoutez vos variables d'environnement dans le dashboard Vercel

### Option B : Netlify

1. Installez Netlify CLI :
   ```bash
   npm i -g netlify-cli
   ```

2. Déployez :
   ```bash
   netlify deploy --prod
   ```

3. Sélectionnez le dossier `dist/`
4. Ajoutez vos variables d'environnement dans le dashboard Netlify

### Option C : Cloudflare Pages

1. Connectez votre repo Git à Cloudflare Pages
2. Build command : `npm run build`
3. Output directory : `dist`
4. Ajoutez vos variables d'environnement

## Étape 9 : Configurer l'authentification

Dans Supabase Cloud, allez dans **Authentication** > **URL Configuration** :

1. **Site URL** : Votre URL de production (ex: `https://iol-calculator.vercel.app`)
2. **Redirect URLs** : Ajoutez votre URL + `/auth/callback`

Exemple :
```
https://iol-calculator.vercel.app
https://iol-calculator.vercel.app/auth/callback
```

## Étape 10 : Tester en production

1. Ouvrez votre URL de production
2. Créez un compte
3. Testez le login
4. Testez l'IOL Calculator
5. Vérifiez que tout fonctionne correctement

## Configuration avancée

### Activer l'Email Confirmation

Dans **Authentication** > **Email** :
- Activez "Enable email confirmations"
- Personnalisez les templates d'email si besoin

### Configurer les politiques RLS

Vérifiez les politiques dans **Database** > **Policies** :
- `users` : Vérifier que les users peuvent lire/modifier leur profil
- `iol_manufacturers` : Lecture publique autorisée
- `iol_lenses` : Lecture publique autorisée

### Monitoring

Dans **Logs & Monitoring** :
- **API Logs** : Voir les requêtes API
- **Edge Functions Logs** : Debug des fonctions
- **Database Logs** : Requêtes SQL

## Mise à jour continue

### Pour mettre à jour les migrations

```bash
# 1. Créer une nouvelle migration
supabase migration new ma_nouvelle_migration

# 2. Éditer la migration
# Ouvrir supabase/migrations/<timestamp>_ma_nouvelle_migration.sql

# 3. Tester localement
supabase db reset

# 4. Pusher vers le cloud
supabase db push
```

### Pour mettre à jour les Edge Functions

```bash
# Modifier votre fonction dans supabase/functions/calculate-iol/

# Redéployer
supabase functions deploy calculate-iol
```

### Pour mettre à jour l'application

```bash
# 1. Build
npm run build

# 2. Déployer (selon votre hébergeur)
vercel --prod
# ou
netlify deploy --prod
```

## Sécurité

### ✅ Bonnes pratiques

1. **Ne jamais commiter** les fichiers `.env` avec de vraies credentials
2. **Utiliser des secrets** pour les API keys sensibles
3. **Activer RLS** sur toutes les tables
4. **Limiter les permissions** avec des politiques strictes
5. **Activer l'email confirmation** pour éviter les faux comptes

### ✅ Vérifications de sécurité

- [ ] RLS activé sur toutes les tables
- [ ] Politiques RLS testées
- [ ] Email confirmation activé
- [ ] Variables d'environnement sécurisées
- [ ] Secrets dans Supabase pour les edge functions
- [ ] CORS configuré correctement

## Troubleshooting

### Erreur "Invalid API key"

→ Vérifiez que vous utilisez bien l'`anon key` et non la `service_role key`

### Erreur "RLS policy violation"

→ Vérifiez vos politiques RLS dans le dashboard Supabase

### Edge function ne répond pas

→ Vérifiez les logs : `supabase functions logs calculate-iol`

### Problème de CORS

→ Vérifiez que vos URLs de redirection sont bien configurées dans Auth > URL Configuration

## Support

- [Documentation Supabase](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/supabase)

---

**Félicitations ! Votre application est maintenant en production ! 🎉**
