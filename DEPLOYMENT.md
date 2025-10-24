# Guide de Déploiement - IOL Calculator Frontend

## 📋 Prérequis

- Accès SSH au VPS: `ssh -i "C:\Users\micha\OneDrive\infomaniak\privée.txt" ubuntu@83.228.210.230`
- Domaine configuré dans DNS (ex: `iol.vps.allia-solutions.ch`)
- Docker et Docker Compose installés sur le VPS

## 🚀 Étapes de Déploiement

### 1. Créer un Repository GitHub

```bash
# Sur votre machine locale
cd C:\Users\micha\OneDrive\IOL_APP\IOL_APP_MINIMAL
git init
git add .
git commit -m "Initial commit - IOL Calculator"
git branch -M main
git remote add origin https://github.com/VotreUsername/iol-calculator-frontend.git
git push -u origin main
```

### 2. Se Connecter au VPS

```bash
ssh -i "C:\Users\micha\OneDrive\infomaniak\privée.txt" ubuntu@83.228.210.230
```

### 3. Créer la Structure sur le VPS

```bash
# Créer le dossier pour l'application
sudo mkdir -p /opt/docker-stack/iol-frontend
cd /opt/docker-stack/iol-frontend

# Cloner le repository
sudo git clone https://github.com/VotreUsername/iol-calculator-frontend.git .

# Ou si vous préférez transférer les fichiers manuellement via SCP:
# Sur votre machine locale:
# scp -i "C:\Users\micha\OneDrive\infomaniak\privée.txt" -r C:\Users\micha\OneDrive\IOL_APP\IOL_APP_MINIMAL/* ubuntu@83.228.210.230:/tmp/iol-frontend/
# Puis sur le VPS:
# sudo mv /tmp/iol-frontend/* /opt/docker-stack/iol-frontend/
```

### 4. Construire l'Image Docker

```bash
cd /opt/docker-stack/iol-frontend
sudo docker build -t iol-frontend:latest .
```

### 5. Créer docker-compose.yml

```bash
sudo nano /opt/docker-stack/iol-frontend/docker-compose.yml
```

Contenu:
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

### 6. Lancer le Conteneur

```bash
cd /opt/docker-stack/iol-frontend
sudo docker-compose up -d
```

### 7. Configurer Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/iol-frontend
```

Contenu:
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

    # SSL Configuration (will be added by certbot)
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

Activer le site:
```bash
sudo ln -s /etc/nginx/sites-available/iol-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. Obtenir le Certificat SSL

```bash
sudo certbot --nginx -d iol.vps.allia-solutions.ch
```

### 9. Configurer DNS chez Infomaniak

Ajouter un enregistrement A dans la zone DNS:
- Type: `A`
- Nom: `iol`
- Valeur: `83.228.210.230`
- TTL: `3600`

Et si IPv6:
- Type: `AAAA`
- Nom: `iol`
- Valeur: `2001:1600:18:100::a4`

## 🔄 Script de Mise à Jour Automatique

```bash
sudo nano /opt/docker-stack/iol-frontend/update-frontend.sh
```

Contenu:
```bash
#!/bin/bash

echo "$(date): Starting IOL Frontend update..." >> /var/log/iol-frontend-updates.log

cd /opt/docker-stack/iol-frontend

# Pull latest changes
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

Rendre exécutable:
```bash
sudo chmod +x /opt/docker-stack/iol-frontend/update-frontend.sh
```

## 🔧 Commandes Utiles

### Voir les logs
```bash
sudo docker logs -f iol-frontend
```

### Redémarrer le conteneur
```bash
cd /opt/docker-stack/iol-frontend
sudo docker-compose restart
```

### Rebuild après modification
```bash
cd /opt/docker-stack/iol-frontend
sudo docker-compose down
sudo docker build -t iol-frontend:latest .
sudo docker-compose up -d
```

### Vérifier l'état
```bash
sudo docker ps | grep iol-frontend
curl http://localhost:8080/health
```

### Voir les logs Nginx
```bash
sudo tail -f /var/log/nginx/iol-frontend.access.log
sudo tail -f /var/log/nginx/iol-frontend.error.log
```

## 📊 Monitoring

### Health Check
```bash
curl https://iol.vps.allia-solutions.ch/health
```

### État du conteneur
```bash
sudo docker stats iol-frontend
```

## 🔐 Sécurité

- ✅ HTTPS avec Let's Encrypt
- ✅ Headers de sécurité configurés
- ✅ Redirection HTTP → HTTPS
- ✅ Rate limiting au niveau Nginx (optionnel)

## 🚨 Dépannage

### Le site ne charge pas
1. Vérifier que le conteneur tourne: `sudo docker ps`
2. Vérifier les logs: `sudo docker logs iol-frontend`
3. Vérifier Nginx: `sudo nginx -t`
4. Vérifier le firewall: `sudo ufw status`

### Erreur SSL
```bash
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
- Repository: https://github.com/VotreUsername/iol-calculator-frontend
