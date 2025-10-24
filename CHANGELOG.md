# Changelog

## Version 1.0.0 (2024-10-24)

### Fonctionnalités initiales

✅ **Authentification**
- Page de login avec email/mot de passe
- Création de compte
- Gestion de session avec Supabase Auth
- Contexte d'authentification global

✅ **IOL Calculator**
- Interface complète pour le calcul de lentilles intraoculaires
- Upload de fichiers PDF (Biométrie et MS 39)
- Extraction automatique de données depuis les PDF
- Sélection de manufacturier et type d'IOL
- Support des lentilles toriques et non-toriques
- Intégration avec l'API de calcul IOL
- Affichage du résultat en image
- Téléchargement du résultat

✅ **Base de données**
- Table `users` pour la gestion des utilisateurs
- Table `iol_manufacturers` pour les fabricants de lentilles
- Table `iol_lenses` pour le catalogue des lentilles
- Politiques RLS (Row Level Security) pour sécuriser les données

✅ **Edge Functions**
- `calculate-iol` : Fonction edge pour le calcul IOL via API externe

✅ **Configuration**
- Support Supabase local pour le développement
- Configuration pour déploiement sur Supabase Cloud
- Variables d'environnement pour local et cloud
- Migrations de base de données versionnées

### Technologies

- React 18.3.1
- Vite 5.4.1
- TypeScript 5.5.3
- Tailwind CSS 3.4.11
- Supabase (Auth + Database + Edge Functions)
- shadcn/ui pour les composants
- TanStack Query pour la gestion des requêtes
- React Router pour le routing
- PDF.js pour l'extraction de texte des PDF

### Documentation

- README.md complet avec instructions détaillées
- QUICK_START.md pour démarrage rapide
- CHANGELOG.md pour suivre l'évolution
- Commentaires dans le code

## Prochaines versions

### Version 1.1.0 (À venir)

- [ ] Historique des calculs IOL
- [ ] Export des résultats en PDF
- [ ] Profil utilisateur avec préférences
- [ ] Mode sombre
- [ ] Optimisation mobile

### Version 1.2.0 (À venir)

- [ ] Recherche et filtres dans l'historique
- [ ] Statistiques d'utilisation
- [ ] Support de plusieurs langues
- [ ] API REST pour intégration externe
