# SpiceHub — Hospitality ERP Monorepo

Multi-tenant hotel + restaurant platform built with Node.js/Express, MongoDB, Socket.IO and eight React micro-frontends.

## Ports

| Service | Port | Command |
| --- | --- | --- |
| Backend API + Socket.IO | 5000 | `npm run dev:backend` |
| Customer QR Table App | 3001 | `npm run dev:customer` |
| Waiter Mobile App | 3002 | `npm run dev:waiter` |
| Kitchen KDS | 3003 | `npm run dev:kds` |
| Guest Room Portal | 3004 | `npm run dev:guest` |
| Hotel Admin ERP | 3005 | `npm run dev:admin` |
| SuperAdmin SaaS | 3006 | `npm run dev:superadmin` |
| Cashier POS | 3007 | `npm run dev:cashier` |
| Reception Front Desk | 3008 | `npm run dev:reception` |

## Prerequisites

- Node.js 20+ (tested on Node 22)
- Docker with Compose (for MongoDB replica set + Redis)

## First run

```bash
npm install
npm run docker:up        # MongoDB (rs0) + Redis
npm run seed             # demo hotel, staff, menu, rooms, tables
npm run dev:backend      # terminal 1
npm run dev:customer     # terminal 2 (and the other apps you need)
```

Health check: `curl http://localhost:5000/health`

## Demo credentials

| Role | Email | Password | PIN |
| --- | --- | --- | --- |
| Super Admin | superadmin@spicehub.com | `SpiceHub@123` | — |
| Hotel Admin | admin@tajgateway.com | `SpiceHub@123` | 1111 |
| Waiter | ramesh@tajgateway.com | `SpiceHub@123` | 1234 |
| Chef | vikram@tajgateway.com | `SpiceHub@123` | 2222 |
| Cashier | priya@tajgateway.com | `SpiceHub@123` | 3333 |

The Waiter app also supports a **1-Tap Login** from its staff picker.

## Configuration

Copy `backend/.env.example` to `backend/.env` to override defaults. The app runs
without a `.env` file using localhost defaults.

## Testing

```bash
npm run test:backend     # 89 Jest suites (uses the isolated `spicehub_test` DB)
npm run build:all        # type-check + production build for every workspace
npm run integrity:check  # monorepo structure / security gates
npm run test:luxury      # live Socket.IO + API end-to-end flow (backend must be running)
npm run verify:emulator  # Puppeteer audit of all 8 portals (all dev servers must be running)
```

Backend tests deliberately wipe their database. They always run against
`spicehub_test` unless `MONGO_URI` is explicitly provided, so the development
database is never destroyed.

## Layout

```
backend/          Express API, Socket.IO, Mongoose models, Jest suites
apps/             Eight Vite + React micro-frontends
packages/         Shared UI, API client and TypeScript types
scripts/          Seeding verification, E2E, emulator and health-gate tooling
docs/             Operational policies and workflow specifications
```
