#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# build_panic_button_development.sh
# Levanta el stack completo de Panic Button en entorno de desarrollo.
# Uso: ./build_panic_button_development.sh [--clean]
#
# Flags:
#   --clean   Elimina volúmenes y reconstruye imágenes desde cero
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

COMPOSE_FILE="Docker-compose-development.yml"
ENV_FILE=".env.development"
PROJECT_NAME="panicbutton"

# ── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Validaciones previas ─────────────────────────────────────────────────────

# Verificar que Docker está corriendo
if ! docker info >/dev/null 2>&1; then
  log_error "Docker no está corriendo. Inicia Docker Desktop y vuelve a intentarlo."
  exit 1
fi

# Verificar que existe el archivo docker-compose
if [ ! -f "$COMPOSE_FILE" ]; then
  log_error "No se encontró $COMPOSE_FILE en el directorio actual."
  log_error "Ejecuta este script desde la raíz del proyecto backend."
  exit 1
fi

# Verificar que existe el archivo de entorno
if [ ! -f "$ENV_FILE" ]; then
  log_error "No se encontró $ENV_FILE."
  log_warn  "Copia .env.example a .env.development y completa tus credenciales."
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

# ── Build y levantamiento ────────────────────────────────────────────────────
log_info "Construyendo imágenes y levantando servicios..."
echo ""

sudo docker-compose \
  -f "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  --project-name "$PROJECT_NAME" \
  up --build

# Nota: el comando up sin -d muestra los logs en primer plano.
# Para correr en background agrega -d al final y descomenta las líneas siguientes:
#
# log_success "Servicios levantados en background."
# log_info "Ver logs del API:   sudo docker logs -f panicbutton-development-api"
# log_info "Ver logs de MySQL:  sudo docker logs -f panicbutton-development-mysqldb"
# log_info "Ver logs de Redis:  sudo docker logs -f panicbutton-development-redis"
