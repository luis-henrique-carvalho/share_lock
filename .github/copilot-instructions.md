# Copilot instructions for this repo

Use these notes to be productive immediately in this NestJS + Drizzle + Redis codebase.

## Big picture

- NestJS modular app. Core wiring in `src/main.ts` and `src/app.module.ts`.
- Persistence via Drizzle ORM (Postgres) with typed schema in `src/common/drizzle/schema.ts` and a DI token `DrizzleAsyncProvider` from `src/common/drizzle/drizzle.provider.ts`.
- Auth via Better Auth + `@thallesp/nestjs-better-auth` configured in `src/lib/auth.ts`; controllers protect routes with `@UseGuards(AuthGuard)` and get the user from `@Session()`.
- Caching via Redis using `CacheService` and provider token `REDIS_CLIENT` (see `src/common/cache`).
- Global error handling: `DrizzleExceptionFilter` maps PG error codes to structured errors; `HttpExceptionFilter` standardizes HTTP errors (registered globally in `main.ts`).

## How we run things

- Scripts (see `package.json`):
  - Dev: `pnpm start:dev` | Build: `pnpm build` | Lint: `pnpm lint` | Tests: `pnpm test`, `pnpm test:e2e`.
  - Drizzle: `pnpm generate` (SQL from schema), `pnpm migrate`, `pnpm studio`.
- Required env vars: `DATABASE_URL`, `REDIS_URL`, optional `PORT`, `BETTER_AUTH_BASE_PATH`.
- Docker: `docker-compose.yml` spins up Postgres (17) and Redis (7) and the app (port 3000). The app image runs `node dist/main.js`.

## Database & migrations (Drizzle)

- Source of truth: `src/common/drizzle/schema.ts` (tables, enums, relations). Example: `rewardTypeEnum`, `campaignStatusEnum`, relations via `relations(...)`.
- IMPORTANT: Keep `drizzle.config.ts` schema path in sync with the actual schema. In this repo, the schema lives at `src/common/drizzle/schema.ts` (update config if needed). Migrations output in `./drizzle/`.
- Inject DB with the token `DrizzleAsyncProvider`:
  - `constructor(@Inject(DrizzleAsyncProvider) private db: NodePgDatabase<typeof schema>) {}`
  - Compose queries with `eq`, `and`, etc. Use `.returning()` to get inserted/updated rows (Drizzle returns arrays).

## Auth pattern

- AppModule: `AuthModule.forRoot(auth)` from `src/lib/auth.ts` (Better Auth + Drizzle adapter).
- In controllers: `@UseGuards(AuthGuard)` and get the user with `@Session() session: UserSession`; use `session.user.id`.

## Caching pattern

- Use `CacheService` (DI provided by `CacheModule`). Methods: `set(key, value, ttl)`, `get<T>(key)`, `del(key)`.
- Common keys and TTLs (examples from `CampainsService`):
  - `campaign:${id}` (TTL 300s), `campaigns:user:${userId}`. Invalidate list keys on create/update/delete.

## Error handling & responses

- Don’t catch DB errors in services—let `DrizzleExceptionFilter` map them to `{ errors: FieldError[] }` with appropriate status codes.
- For explicit 404s, use Nest exceptions (e.g., `NotFoundException` in services). `HttpExceptionFilter` wraps into `{ errors: { message } }`.

## API/module conventions

- Feature modules follow `campains/` as an example: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `dto/*`, `entities/*`.
- Controllers:
  - Validate inputs with DTOs (`class-validator`); parse ids with `ParseUUIDPipe`.
  - Use auth guard and session injection. Example in `campains.controller.ts`.
- Services:
  - Inject DB and Cache; invalidate cache on writes; prefer typed schema imports: `import * as schema from 'src/common/drizzle/schema'`.

## Handy examples

- Insert and return:
  - `const [row] = await this.db.insert(schema.campaign).values({...}).returning();`
- Query by owner with cache:
  - Read cached list, DB fallback with `where(eq(schema.campaign.userId, userId))`, then cache for 300s.

If anything here seems outdated (e.g., schema path in `drizzle.config.ts`), update the doc and config together. Share unclear areas and we’ll refine this file.
