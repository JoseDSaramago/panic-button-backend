#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# build_panic_button_production.sh
# Levanta el stack completo de Panic Button en entorno de producción.
# Uso: ./build_panic_button_production.sh [--clean]
#
# Flags:
#   --clean   Elimina volúmenes y reconstruye imágenes desde cero
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

COMPOSE_FILE="Docker-compose-production.yml"
ENV_FILE=".env.production"
PROJECT_NAME="panicbutton-prod"

# ── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Validaciones previas ─────────────────────────────────────────────────────

if ! docker info >/dev/null 2>&1; then
  log_error "Docker no está corriendo. Inicia Docker Desktop y vuelve a intentarlo."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  log_error "No se encontró $COMPOSE_FILE en el directorio actual."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  log_error "No se encontró $ENV_FILE."
  log_warn  "Copia .env.production.example a .env.production y completa tus credenciales."
  exit 1
fi

# ── Modo limpio (opcional) ───────────────────────────────────────────────────
CLEAN_BUILD=false
for arg in "$@"; do
  if [ "$arg" = "--clean" ]; then
    CLEAN_BUILD=true
  fi
done

if [ "$CLEAN_BUILD" = true ]; then
  log_warn "Modo --clean: bajando servicios y eliminando volúmenes..."
  sudo docker-compose \
    -f "$COMPOSE_FILE" \
    --env-file "$ENV_FILE" \
    --project-name "$PROJECT_NAME" \
    down --volumes --remove-orphans
  log_success "Limpieza completada."
fi

# ── Pull de cambios desde main ───────────────────────────────────────────────
log_info "Descargando últimos cambios desde origin/main..."
git pull origin main
log_success "Código actualizado."
echo ""

# ── Build y levantamiento en background ─────────────────────────────────────
log_info "Construyendo imagen de producción y levantando servicios..."
echo ""

sudo docker-compose \
  -f "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  --project-name "$PROJECT_NAME" \
  up --build -d

echo ""
log_success "Servicios levantados en background."
echo ""
log_info "Ver logs del API:   sudo docker logs -f panicbutton-production-api"
log_info "Ver logs de MySQL:  sudo docker logs -f panicbutton-production-mysqldb"
log_info "Detener servicios:  sudo docker-compose -f $COMPOSE_FILE --project-name $PROJECT_NAME down"
