#!/bin/bash

# Script de déploiement IOL Calculator Frontend
# À exécuter sur le serveur VPS

set -e

echo "=== Déploiement IOL Calculator Frontend ==="
echo "Date: $(date)"

# Variables
APP_DIR="/opt/docker-stack/iol-frontend"
GITHUB_REPO="https://github.com/VotreUsername/iol-calculator-frontend.git"
DOMAIN="iol.vps.allia-solutions.ch"
CONTAINER_PORT="8080"

# Couleurs pour l'output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Étape 1: Création de la structure${NC}"
sudo mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${YELLOW}Étape 2: Clonage ou mise à jour du repository${NC}"
if [ -d ".git" ]; then
    echo "Repository existe déjà, mise à jour..."
    sudo git pull origin main
else
    echo "Clonage du repository..."
    sudo git clone $GITHUB_REPO .
fi

echo -e "${YELLOW}Étape 3: Construction de l'image Docker${NC}"
sudo docker build -t iol-frontend:latest .

echo -e "${YELLOW}Étape 4: Création du fichier docker-compose.yml${NC}"
sudo cat > docker-compose.yml <<EOF
version: '3.8'

services:
  iol-frontend:
    image: iol-frontend:latest
    container_name: iol-frontend
    restart: unless-stopped
    ports:
      - "$CONTAINER_PORT:80"
    networks:
      - iol-network

networks:
  iol-network:
    external: false
EOF

echo -e "${YELLOW}Étape 5: Démarrage du conteneur${NC}"
sudo docker-compose down 2>/dev/null || true
sudo docker-compose up -d

echo -e "${YELLOW}Étape 6: Configuration Nginx${NC}"
sudo cat > /etc/nginx/sites-available/iol-frontend <<EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

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
        proxy_pass http://localhost:$CONTAINER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Logs
    access_log /var/log/nginx/iol-frontend.access.log;
    error_log /var/log/nginx/iol-frontend.error.log;
}
EOF

# Activer le site
sudo ln -sf /etc/nginx/sites-available/iol-frontend /etc/nginx/sites-enabled/

echo -e "${YELLOW}Étape 7: Test de la configuration Nginx${NC}"
sudo nginx -t

echo -e "${YELLOW}Étape 8: Rechargement Nginx${NC}"
sudo systemctl reload nginx

echo -e "${YELLOW}Étape 9: Obtention du certificat SSL${NC}"
echo "IMPORTANT: Assurez-vous que le DNS pointe vers ce serveur avant de continuer!"
read -p "Le DNS est-il configuré? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m michael.enry@olia-solution.com || {
        echo "Erreur lors de l'obtention du certificat SSL"
        echo "Vous pouvez le faire manuellement avec: sudo certbot --nginx -d $DOMAIN"
    }
fi

echo -e "${YELLOW}Étape 10: Nettoyage${NC}"
sudo docker image prune -f

echo -e "${GREEN}=== Déploiement terminé! ===${NC}"
echo ""
echo "Vérifications:"
echo "1. État du conteneur: sudo docker ps | grep iol-frontend"
echo "2. Logs: sudo docker logs iol-frontend"
echo "3. Health check: curl http://localhost:$CONTAINER_PORT/health"
echo "4. Site web: https://$DOMAIN"
echo ""
echo "Script de mise à jour: /opt/docker-stack/iol-frontend/update-frontend.sh"
