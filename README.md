# jubilant-lamp

a full-stack next.js project

backend database is hosted on supabase (note: supabase automatically puts projects to sleep after about 1 week of inactivity)

uses prisma for database connection and queries

uses bcryptjs for password hashing

env variables:
- `DATABASE_URL`: postgres URL for database connection
- `DEMO_PASSWORD`: password assigned to all accounts when running the mock data seeding script
- `SESSION_SECRET`: secret key, at least 32 characters

database is setup with the following commands in sequence:
1. `npx prisma contract emit`: compiles `src/prisma/contract.prisma` into generated contract files
2. `npx prisma db init`: creates the tables in an empty database
3. `npm run seed`: seeds/re-seeds database with demo data (WARNING: this deletes all pre-existing data within the tables)

due to scope limitations, the following data can only be added or modified via the database or seed (prisma/seed.ts):
- customers
- staff statuses and ratings

authentication uses stateless JWTs (each valid for 7 days). this is a known security vulnerability; no plans to fix (just don't let hackers steal your jwt lol?)