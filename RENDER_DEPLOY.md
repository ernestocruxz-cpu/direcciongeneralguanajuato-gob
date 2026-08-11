# Despliegue en Render

## 1. Base de datos

Ya creada en Render como `pago-infracciones-db`.

En Render, entra a la base y copia:

- `Internal Database URL` para usarla dentro del Web Service.
- `External Database URL` solo si necesitas conectarte desde pgAdmin/local.

## 2. Web Service

Crear un nuevo `Web Service` conectado al repo de GitHub.

Configurar:

```text
Name: pago-infracciones
Root Directory: backend
Runtime: Node
Build Command: npm install
Start Command: npm start
```

## 3. Variables de entorno

En Render > Web Service > Environment:

```env
NODE_ENV=production
DATABASE_URL=pega_aqui_la_internal_database_url
JWT_SECRET=cambia_esto_por_un_secreto_largo_y_privado
JWT_EXPIRES_IN=8h
PUBLIC_APP_URL=https://tu-web-service.onrender.com
CORS_ORIGIN=https://tu-web-service.onrender.com
```

Cuando Render te dé la URL real del servicio, actualiza `PUBLIC_APP_URL` y `CORS_ORIGIN`.

## 4. Crear tablas y usuario inicial

Despues del primer deploy, abre la Shell del Web Service en Render y ejecuta:

```bash
npm run setup-db
```

Esto ejecuta:

- `backend/database/schema.sql`
- `backend/database/seed.sql`

Usuario inicial:

```text
admin@example.com
Admin12345
```

Cambia esta contrasena antes de usarlo en produccion.

## 5. URLs de prueba

```text
https://tu-web-service.onrender.com/api/health
https://tu-web-service.onrender.com/admin/login.html
```

