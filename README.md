# jubilant-lamp

a next.js project

backend database is hosted on supabase (note: supabase automatically puts projects to sleep after about 1 week of inactivity)

uses prisma for database connection and queries

uses bcryptjs for password hashing

database is setup with the following commands in sequence (prerequisite: `DATABASE_URL` must be set, see `.env.example`):
1. `npx prisma contract emit`: compiles `src/prisma/contract.prisma` into generated contract files
2. `npx prisma db init`: creates the tables in an empty database
3. `npm run seed`: seeds/re-seeds database with demo data (WARNING: this deletes all pre-existing data within the tables)