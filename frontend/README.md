# Tripwise CRM Frontend

React + Vite client for the full Tripwise CRM project. The backend API is in `../backend`.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. By default, the frontend calls `http://localhost:5001/api`. To change this, copy `.env.example` to `.env` and set `VITE_API_URL`.

## Role-specific workspaces

- **Admin:** all leads, bookings, reports, team performance, and the demo user directory.
- **Manager:** team leads, bookings, reports, and team performance.
- **Agent:** own assigned leads, own follow-ups, and task list only.

The client sends a JWT after sign-in. The backend also validates roles and lead ownership; hiding a page or menu item is not the only access check.

See the root `README.md` for backend configuration, demo credentials, database setup, and optional sample data.
