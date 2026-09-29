import "server-only";

// Postgres access. Uses DATABASE_URL (any hosted Postgres) when set; otherwise
// falls back to an embedded PGlite database in ./.data for local development.

type Row = Record<string, unknown>;
type Query = <T extends Row = Row>(text: string, params?: unknown[]) => Promise<T[]>;

const SCHEMA = `
create table if not exists users (
  id uuid primary key,
  email text not null unique,
  phone text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists otp_requests (
  id uuid primary key,
  phone text not null,
  email text not null,
  code_hash text not null,
  ip text,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists otp_requests_phone_idx on otp_requests (phone, created_at desc);
create index if not exists otp_requests_ip_idx on otp_requests (ip, created_at desc);
create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists applications (
  user_id uuid primary key references users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  updated_at timestamptz not null default now(),
  submitted_at timestamptz
);
`;

const globalForDb = globalThis as unknown as { gscDb?: Promise<Query> };

async function connect(): Promise<Query> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: url,
      ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
    await pool.query(SCHEMA);
    return async (text, params = []) => (await pool.query(text, params)).rows;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. A hosted Postgres database is required in production.");
  }
  const { mkdirSync } = await import("fs");
  mkdirSync("./.data", { recursive: true });
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite("./.data/pglite");
  await db.exec(SCHEMA);
  return async (text, params = []) => (await db.query(text, params)).rows as never;
}

export function db(): Promise<Query> {
  if (!globalForDb.gscDb) {
    // Don't cache a failed connection; the next request retries.
    globalForDb.gscDb = connect().catch((err) => {
      globalForDb.gscDb = undefined;
      throw err;
    });
  }
  return globalForDb.gscDb;
}
