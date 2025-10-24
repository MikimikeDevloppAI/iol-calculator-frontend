#!/bin/bash

# ============================================
# Script de Déploiement IOL Calculator
# Domaine: iol-calculator.allia-solutions.ch
# VPS: 83.228.210.230
# ============================================

set -e  # Arrêt en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="iol-calculator.allia-solutions.ch"
APP_DIR="/opt/docker-stack/iol-frontend"
GITHUB_REPO="https://github.com/MikimikeDevloppAI/iol-calculator-frontend.git"
CONTAINER_PORT="8080"
EMAIL="michael.enry@olia-solution.com"

# Fonction pour afficher les messages
print_step() {
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Header
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Déploiement IOL Calculator Frontend               ║"
echo "║         Domaine: iol-calculator.allia-solutions.ch        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Vérification: Est-on sur le VPS?
if [ ! -f "/etc/lsb-release" ]; then
    print_error "Ce script doit être exécuté sur le VPS Ubuntu!"
    exit 1
fi

print_success "Exécution sur Ubuntu détectée"
echo ""

# ============================================
# ÉTAPE 1: Création de la structure
# ============================================
print_step "Étape 1/10: Création de la structure de dossiers"
sudo mkdir -p $APP_DIR
cd $APP_DIR
print_success "Dossier créé: $APP_DIR"
echo ""

# ============================================
# ÉTAPE 2: Clone ou mise à jour du repository
# ============================================
print_step "Étape 2/10: Clone/Mise à jour du repository GitHub"
if [ -d ".git" ]; then
    print_info "Repository existant, mise à jour..."
    sudo git pull origin main
    print_success "Repository mis à jour"
else
    print_info "Clonage du repository..."
    sudo git clone $GITHUB_REPO .
    print_success "Repository cloné"
fi
echo ""

# ============================================
# ÉTAPE 3: Construction de l'image Docker
# ============================================
print_step "Étape 3/10: Construction de l'image Docker"
print_info "Cela peut prendre quelques minutes..."
sudo docker build -t iol-frontend:latest . || {
    print_error "Erreur lors du build Docker"
    exit 1
}
print_success "Image Docker construite"
echo ""

# ============================================
# ÉTAPE 4: Création du docker-compose.yml
# ============================================
print_step "Étape 4/10: Création du fichier docker-compose.yml"
sudo tee docker-compose.yml > /dev/null <<EOF
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
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  iol-network:
    external: false
EOF
print_success "docker-compose.yml créé"
echo ""

# ============================================
# ÉTAPE 5: Arrêt et démarrage du conteneur
# ============================================
print_step "Étape 5/10: Démarrage du conteneur Docker"
sudo docker-compose down 2>/dev/null || true
sudo docker-compose up -d
print_success "Conteneur démarré"
echo ""

# Attendre que le conteneur soit prêt
print_info "Attente du démarrage du conteneur..."
sleep 5

# ============================================
# ÉTAPE 6: Vérification du conteneur
# ============================================
print_step "Étape 6/10: Vérification du conteneur"
if sudo docker ps | grep -q iol-frontend; then
    print_success "Conteneur en cours d'exécution"
else
    print_error "Le conteneur n'est pas démarré!"
    sudo docker logs iol-frontend
    exit 1
fi

# Test du health check
if curl -s http://localhost:$CONTAINER_PORT/health > /dev/null; then
    print_success "Health check OK"
else
    print_error "Health check échoué!"
    exit 1
fi
echo ""

# ============================================
# ÉTAPE 7: Configuration Nginx
# ============================================
print_step "Étape 7/10: Configuration Nginx"
sudo tee /etc/nginx/sites-available/iol-frontend > /dev/null <<'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name iol-calculator.allia-solutions.ch;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name iol-calculator.allia-solutions.ch;

    # SSL Configuration (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/iol-calculator.allia-solutions.ch/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/iol-calculator.allia-solutions.ch/privkey.pem;

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
EOF
print_success "Configuration Nginx créée"
echo ""

# ============================================
# ÉTAPE 8: Activation du site Nginx
# ============================================
print_step "Étape 8/10: Activation du site Nginx"
sudo ln -sf /etc/nginx/sites-available/iol-frontend /etc/nginx/sites-enabled/
sudo nginx -t || {
    print_error "Erreur dans la configuration Nginx!"
    exit 1
}
print_success "Configuration Nginx valide"

sudo systemctl reload nginx
print_success "Nginx rechargé"
echo ""

# ============================================
# ÉTAPE 9: Configuration SSL
# ============================================
print_step "Étape 9/10: Configuration SSL avec Let's Encrypt"
print_info "Vérification du DNS..."

# Vérifier que le DNS pointe bien vers ce serveur
DNS_IP=$(dig +short $DOMAIN | head -n1)
SERVER_IP=$(curl -s ifconfig.me)

if [ "$DNS_IP" != "$SERVER_IP" ]; then
    print_error "ATTENTION: Le DNS ne pointe pas encore vers ce serveur!"
    print_info "DNS pointe vers: $DNS_IP"
    print_info "IP du serveur: $SERVER_IP"
    print_info "Attendez quelques minutes que le DNS se propage..."

    read -p "Voulez-vous continuer quand même? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Déploiement mis en pause. Relancez le script quand le DNS sera propagé."
        exit 0
    fi
fi

# Obtenir le certificat SSL
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    print_info "Obtention du certificat SSL..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL || {
        print_error "Erreur lors de l'obtention du certificat SSL"
        print_info "Vous pouvez le faire manuellement avec:"
        print_info "sudo certbot --nginx -d $DOMAIN"
        exit 1
    }
    print_success "Certificat SSL obtenu"
else
    print_info "Certificat SSL déjà existant"
    print_success "SSL configuré"
fi
echo ""

# ============================================
# ÉTAPE 10: Création du script de mise à jour
# ============================================
print_step "Étape 10/10: Création du script de mise à jour"
sudo tee $APP_DIR/update-frontend.sh > /dev/null <<'EOF'
#!/bin/bash
echo "$(date): Starting IOL Frontend update..." >> /var/log/iol-frontend-updates.log

cd /opt/docker-stack/iol-frontend
git pull origin main
docker build -t iol-frontend:latest .
docker-compose down
docker-compose up -d
docker image prune -f

echo "$(date): IOL Frontend update completed" >> /var/log/iol-frontend-updates.log
EOF

sudo chmod +x $APP_DIR/update-frontend.sh
print_success "Script de mise à jour créé"
echo ""

# ============================================
# NETTOYAGE
# ============================================
print_step "Nettoyage des images Docker inutilisées"
sudo docker image prune -f > /dev/null
print_success "Nettoyage terminé"
echo ""

# ============================================
# RÉSUMÉ ET VÉRIFICATIONS
# ============================================
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              Déploiement Terminé avec Succès!             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📊 Informations du Déploiement:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓${NC} URL du site:        https://$DOMAIN"
echo -e "${GREEN}✓${NC} Conteneur Docker:   iol-frontend"
echo -e "${GREEN}✓${NC} Port local:         $CONTAINER_PORT"
echo -e "${GREEN}✓${NC} Dossier:            $APP_DIR"
echo -e "${GREEN}✓${NC} Repository:         GitHub (MikimikeDevloppAI/iol-calculator-frontend)"
echo ""

echo -e "${BLUE}🔍 Commandes de Vérification:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "• État du conteneur:    sudo docker ps | grep iol-frontend"
echo "• Logs du conteneur:    sudo docker logs -f iol-frontend"
echo "• Health check local:   curl http://localhost:$CONTAINER_PORT/health"
echo "• Test du site:         curl -I https://$DOMAIN"
echo "• Logs Nginx:           sudo tail -f /var/log/nginx/iol-frontend.access.log"
echo ""

echo -e "${BLUE}🔄 Mise à Jour de l'Application:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Pour mettre à jour après un push GitHub:"
echo "sudo $APP_DIR/update-frontend.sh"
echo ""

echo -e "${BLUE}🎯 Prochaines Étapes:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Testez votre site: https://$DOMAIN"
echo "2. Vérifiez le disclaimer au premier chargement"
echo "3. Testez l'upload de fichiers PDF"
echo "4. Vérifiez le footer avec vos informations de contact"
echo ""

print_success "Déploiement terminé! 🎉"
