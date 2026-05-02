# Panic Button — Backend API

API REST para el servicio de botón de pánico. Permite a usuarios registrar contactos de emergencia y activar alertas por WhatsApp vía Brevo, con geolocalización por Google Maps.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 LTS |
| MySQL | 8.0+ |
| Redis | 7.0+ |
| npm | 10+ |

---

## Instalación

```bash
# 1. Clonar e ir al directorio
cd panicButton/backend

# 2. Instalar dependencias
npm install

# 3. Copiar y completar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales reales

# 4. Crear la base de datos MySQL (si no existe)
mysql -u root -p -e "CREATE DATABASE panicbutton_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Arrancar en desarrollo
npm run dev
```

> En `NODE_ENV=development` TypeORM ejecuta `synchronize: true` y crea las tablas automáticamente.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno | `development` |
| `PORT` | Puerto HTTP | `3000` |
| `DB_HOST` | Host MySQL | `localhost` |
| `DB_PORT` | Puerto MySQL | `3306` |
| `DB_USER` | Usuario MySQL | `root` |
| `DB_PASSWORD` | Contraseña MySQL | `secret` |
| `DB_NAME` | Nombre de la base de datos | `panicbutton_db` |
| `JWT_SECRET` | Secreto para firmar access tokens (min 32 chars) | `...` |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (min 32 chars) | `...` |
| `REDIS_URL` | URL de conexión Redis | `redis://localhost:6379` |
| `BREVO_API_KEY` | API key de Brevo | `xkeysib-...` |
| `BREVO_WHATSAPP_TEMPLATE` | Nombre del template de WhatsApp | `nomada_panico_alerta` |
| `BREVO_SENDER_NUMBER` | Número remitente Brevo (+código país) | `+521XXXXXXXXXX` |
| `SENTRY_DSN` | DSN de Sentry (opcional) | `https://...` |
| `CORS_ORIGINS` | Orígenes CORS permitidos (coma-separados) | `http://localhost:3001` |
| `GPS_RETENTION_DAYS` | Días para retener coordenadas GPS | `90` |

---

## Comandos

```bash
npm run dev        # Desarrollo con hot-reload (nodemon + ts-node)
npm run build      # Compilar a dist/
npm run start      # Ejecutar build producción
npm run typecheck  # Verificar tipos TypeScript sin compilar
```

---

## Endpoints

### Auth
```
POST /api/auth/register   { phone_number, alias, email, password }
POST /api/auth/login      { phone_number, password }
POST /api/auth/refresh    { refresh_token }
```

### Users  *(requiere JWT)*
```
GET    /api/users/me
PATCH  /api/users/me      { alias?, panic_message? }
DELETE /api/users/me      (soft delete)
```

### Emergency Contacts  *(requiere JWT)*
```
GET    /api/contacts
POST   /api/contacts              { alias, whatsapp_number, notify_order }
PATCH  /api/contacts/reorder      [{ id, notify_order }]
PATCH  /api/contacts/:id
DELETE /api/contacts/:id
```

### Panic  *(requiere JWT)*
```
POST /api/panic/trigger    { lat?, lng?, device_os? }   — rate limit: 3/10min
POST /api/panic/test       { lat?, lng?, device_os? }   — marca alias con [TEST]
GET  /api/panic/history
```

### Health check
```
GET /health
```

---

## Autenticación

Todos los endpoints protegidos requieren el header:

```
Authorization: Bearer <access_token>
```

El access token expira en **7 días**. Para renovarlo, usa `POST /api/auth/refresh` con el `refresh_token` (válido 30 días). Los refresh tokens son **rotativos**: cada uso invalida el anterior.

---

## Arquitectura

```
src/
├── config/       Variables de entorno, TypeORM DataSource, Redis client
├── entities/     Entidades TypeORM (User, EmergencyContact, PanicEvent, Plan)
├── modules/      Lógica por dominio (auth, users, contacts, panic)
│   └── <módulo>/
│       ├── *.controller.ts   Parseo de request/response
│       ├── *.service.ts      Lógica de negocio
│       ├── *.routes.ts       Registro de rutas Express
│       └── *.schema.ts       Validaciones Zod
├── middleware/   auth JWT, rate limit Redis, error handler global
├── services/     brevo.service.ts — WhatsApp API
├── utils/        logger Winston, buildMapsUrl
└── app.ts        Bootstrap: DB → Redis → Express → listen
```

---

## Seguridad

- Contraseñas hasheadas con **bcrypt** (salt 12)
- JWT firmado HS256, **access token 7d** + **refresh token rotativo 30d**
- Refresh tokens almacenados en Redis (revocación inmediata al rotar)
- Rate limit en `/panic/trigger`: **3 req / 10 min por userId** (Redis)
- **Helmet.js** para headers HTTP seguros
- **CORS** restringido a `CORS_ORIGINS`
- **Zod** valida toda entrada de usuario en tiempo de ejecución
- Soft delete en usuarios (nunca se borran físicamente)
- `PanicEvent` es inmutable: **solo INSERT**, nunca UPDATE ni DELETE
# panic-button-backend
