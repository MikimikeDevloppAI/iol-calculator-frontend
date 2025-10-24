# 🚀 Instructions de Déploiement - IOL Calculator Frontend

## Étape 1: Configurer le DNS chez Infomaniak

1. Allez sur le panel Infomaniak: https://manager.infomaniak.com/
2. Sélectionnez votre domaine `allia-solutions.ch`
3. Allez dans "Zone DNS"
4. Ajoutez un nouvel enregistrement:
   - **Type**: `A`
   - **Nom**: `iol`
   - **Valeur**: `83.228.210.230`
   - **TTL**: `3600`
5. Si vous voulez l'IPv6, ajoutez aussi:
   - **Type**: `AAAA`
   - **Nom**: `iol`
   - **Valeur**: `2001:1600:18:100::a4`
6. Sauvegardez et attendez 5-10 minutes pour la propagation

## Étape 2: Se connecter au VPS

```bash
ssh -i "C:\Users\micha\OneDrive\infomaniak\privée.txt" ubuntu@83.228.210.230
```

## Étape 3: Créer le dossier et cloner le repository

```bash
# Créer le dossier
sudo mkdir -p /opt/docker-stack/iol-frontend
cd /opt/docker-stack/iol-frontend

# Cloner le repository GitHub
sudo git clone https://github.com/MikimikeDevloppAI/iol-calculator-frontend.git .
```

## Étape 4: Construire l'image Docker

```bash
cd /opt/docker-stack/iol-frontend
sudo docker build -t iol-frontend:latest .
```

## Étape 5: Créer le fichier docker-compose.yml

```bash
sudo nano /opt/docker-stack/iol-frontend/docker-compose.yml
```

Collez ce contenu:
```yaml
version: '3.8'

services:
  iol-frontend:
    image: iol-frontend:latest
    container_name: iol-frontend
    restart: unless-stopped
    ports:
      - "8080:80"
    networks:
      - iol-network

networks:
  iol-network:
    external: false
```

Sauvegardez: `Ctrl+X`, puis `Y`, puis `Enter`

## Étape 6: Lancer le conteneur

```bash
sudo docker-compose up -d
```

Vérifiez que ça fonctionne:
```bash
sudo docker ps | grep iol-frontend
curl http://localhost:8080/health
```

## Étape 7: Configurer Nginx

```bash
sudo nano /etc/nginx/sites-available/iol-frontend
```

Collez ce contenu:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name iol.vps.allia-solutions.ch;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name iol.vps.allia-solutions.ch;

    # SSL Configuration (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/iol.vps.allia-solutions.ch/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iol.vps.allia-solutions.ch/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Logs
    access_log /var/log/nginx/iol-frontend.access.log;
    error_log /var/log/nginx/iol-frontend.error.log;
}
```

Sauvegardez: `Ctrl+X`, puis `Y`, puis `Enter`

## Étape 8: Activer le site Nginx

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/iol-frontend /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

## Étape 9: Obtenir le certificat SSL

```bash
sudo certbot --nginx -d iol.vps.allia-solutions.ch
```

Suivez les instructions:
- Entrez votre email: `michael.enry@olia-solution.com`
- Acceptez les termes: `Y`
- Partagez l'email (optionnel): `N`

## Étape 10: Créer le script de mise à jour

```bash
sudo nano /opt/docker-stack/iol-frontend/update-frontend.sh
```

Collez ce contenu:
```bash
#!/bin/bash

echo "$(date): Starting IOL Frontend update..." >> /var/log/iol-frontend-updates.log

cd /opt/docker-stack/iol-frontend

# Pull latest changes from GitHub
git pull origin main

# Rebuild Docker image
docker build -t iol-frontend:latest .

# Restart container
docker-compose down
docker-compose up -d

# Clean old images
docker image prune -f

echo "$(date): IOL Frontend update completed" >> /var/log/iol-frontend-updates.log
```

Sauvegardez et rendez exécutable:
```bash
sudo chmod +x /opt/docker-stack/iol-frontend/update-frontend.sh
```

## Étape 11: Ouvrir le port dans le firewall (si nécessaire)

```bash
# Vérifier le firewall
sudo ufw status

# Si le port 8080 n'est pas ouvert, l'ouvrir (normalement pas nécessaire car Nginx est déjà ouvert)
# Le port 8080 est accessible uniquement en local (localhost), pas besoin de l'ouvrir dans UFW
```

## ✅ Vérifications Finales

```bash
# 1. Vérifier que le conteneur tourne
sudo docker ps | grep iol-frontend

# 2. Vérifier les logs du conteneur
sudo docker logs iol-frontend

# 3. Tester en local
curl http://localhost:8080/health

# 4. Tester le site web
curl -I https://iol.vps.allia-solutions.ch
```

## 🌐 Accès au Site

Votre site est maintenant accessible à:
**https://iol.vps.allia-solutions.ch**

## 🔄 Pour Mettre à Jour l'Application

Quand vous faites des modifications:

1. Sur votre machine locale:
```bash
cd "C:\Users\micha\OneDrive\IOL_APP\IOL_APP_MINIMAL"
git add .
git commit -m "Description des changements"
git push origin main
```

2. Sur le VPS:
```bash
sudo /opt/docker-stack/iol-frontend/update-frontend.sh
```

## 🛠️ Commandes Utiles

```bash
# Voir les logs en temps réel
sudo docker logs -f iol-frontend

# Redémarrer le conteneur
cd /opt/docker-stack/iol-frontend
sudo docker-compose restart

# Arrêter le conteneur
sudo docker-compose down

# Démarrer le conteneur
sudo docker-compose up -d

# Voir l'état
sudo docker stats iol-frontend

# Voir les logs Nginx
sudo tail -f /var/log/nginx/iol-frontend.access.log
sudo tail -f /var/log/nginx/iol-frontend.error.log
```

## 🚨 En cas de problème

### Le site ne charge pas
```bash
# Vérifier que le conteneur tourne
sudo docker ps

# Vérifier les logs
sudo docker logs iol-frontend

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# Vérifier le DNS
nslookup iol.vps.allia-solutions.ch
```

### Erreur SSL
```bash
# Renouveler le certificat
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

### Reconstruire depuis zéro
```bash
cd /opt/docker-stack/iol-frontend
sudo docker-compose down
sudo docker rmi iol-frontend:latest
sudo docker build --no-cache -t iol-frontend:latest .
sudo docker-compose up -d
```

## 📞 Support

- Email: michael.enry@olia-solution.com
- GitHub: https://github.com/MikimikeDevloppAI/iol-calculator-frontend
