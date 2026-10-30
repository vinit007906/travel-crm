# Travel CRM – Lead-to-Booking Management System

A proof-of-concept CRM for managing travel leads, follow-ups, assignments, duplicate detection, bookings, and pipeline statistics.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose

## Requirements
- Node.js 20.19+ or 22.12+
- npm
- MongoDB local instance or MongoDB Atlas connection string

## 1. Configure the backend
Open a terminal:

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set `MONGODB_URI` to your own MongoDB connection string. Keep `.env` private and never commit it.

Start the API:

```bash
npm run dev
```

The API defaults to `http://localhost:5000`.

## 2. Configure the frontend
Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## Features
- Dashboard statistics calculated from stored leads
- Create, list, search, filter, and update leads
- Assign leads to demo team members
- Record follow-up activities and notes
- Warn about possible duplicate phone numbers or emails
- Convert a lead into one booking; repeat conversion is rejected
- View bookings

## API endpoints
- `GET /api/health`
- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/:id`
- `PUT /api/leads/:id`
- `PATCH /api/leads/:id/status`
- `POST /api/leads/:id/activities`
- `POST /api/leads/:id/convert`
- `GET /api/bookings`
- `GET /api/dashboard/stats`

## Demo team
The prototype uses predefined team members in the frontend. Full authentication and real user accounts are not included.

## Assumptions and limitations
- This is a prototype, not a production-ready system.
- No authentication or authorisation is implemented; do not put real customer data into it.
- Duplicate detection is based on normalized phone/email values and should be reviewed by a user.
- Booking conversion uses a MongoDB transaction when supported by the database deployment. MongoDB transactions generally require a replica set (Atlas supports this). If running a standalone local MongoDB server, use Atlas or configure a local replica set for conversion transactions.
- Add authentication, role permissions, rate limiting, stronger validation, logging, tests, and deployment configuration before production use.

## Suggested demo
1. Add a lead.
2. Edit its status and assignment.
3. Add a follow-up note.
4. Attempt to add the same email/phone and observe the duplicate warning.
5. Convert the lead into a booking.
6. Try converting it again.
7. View dashboard statistics and bookings.
