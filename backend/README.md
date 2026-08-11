# Backend Pago de Infracciones

Arquitectura sencilla para pasar la maqueta a backend real:

- Node.js + Express
- PostgreSQL
- Login con JWT y bcrypt
- Alta vehicular con folio unico de 6 digitos
- QR generado como Data URL
- Consulta publica por folio

## 1. Crear base en PostgreSQL

En pgAdmin crea una base llamada:

```sql
pago_infracciones
```

Luego ejecuta en Query Tool:

1. `database/schema.sql`
2. `database/seed.sql`

## 2. Configurar variables

Copia `.env.example` como `.env` y cambia:

```env
DATABASE_URL=postgres://postgres:TU_PASSWORD@localhost:5432/pago_infracciones
JWT_SECRET=pon_un_secreto_largo
```

## 3. Instalar y correr

```bash
npm install
npm run dev
```

API:

```text
http://localhost:4000/api/health
```

Login demo:

```json
{
  "email": "admin@example.com",
  "password": "Admin12345"
}
```

## Endpoints

`POST /api/auth/login`

`GET /api/auth/me`

`GET /api/vehicles`

`POST /api/vehicles`

`GET /api/public/folios/:folio`

## Payload alta vehicular

```json
{
  "issueDate": "2026-04-03",
  "expirationDate": "2026-05-03",
  "brand": "VOLKSWAGEN",
  "line": "JETTA",
  "modelYear": 2018,
  "serialNumber": "3VWDB7AJ7JM239701",
  "engineNumber": "S"
}
```
