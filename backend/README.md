# Backend for Pet Health Interface

A simple Express-based backend serves data for the React frontend and includes authentication backed by SQLite (via Prisma).

The server uses JWT tokens for auth. You can set a custom secret using the `JWT_SECRET` environment variable; otherwise a default value is used (not suitable for production).

## Setup

```bash
cd backend
npm install
```

You'll also need to generate the Prisma client and run the migration:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

A demo user (`demo@example.com` / `password`) along with a couple of pets
will be created automatically the first time the server runs.

The database file (`dev.db`) is stored in `backend/prisma` and persists
between restarts.

```bash
# optionally open a REPL to inspect data
npx prisma studio
```

## Development

```bash
npm run dev
```

This will start the server on `http://localhost:4000` with automatic reload.

## Production

```bash
npm run build
npm start
```

## Available endpoints

- `GET /pets` – list all pets
- `GET /pets/:id` – single pet
- `POST /pets` – add a pet (JSON body)
- `GET /alerts` – list alerts
- `GET /alerts/:id` – single alert
- `PUT /alerts/:id/read` – mark alert read
- `GET /logs` – list logs, optional `?petId=` filter
