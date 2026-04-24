# CLAUDE.md

## Project Overview

Urban Hut is a roommate discovery and household management app with:

- `mobile/`: Expo Router React Native client
- `backend/`: FastAPI + SQLAlchemy + Alembic API
- `docs/`: product and delivery notes

Core product areas currently implemented:

- authentication and token refresh
- listing search, create, detail, and host management
- roommate matching and interests
- household expenses and chores
- community posts
- services directory
- trust score and verification scaffolding
- in-app chat

## Repo Structure

### Mobile

- `mobile/app/(auth)`: signup/login flows
- `mobile/app/(tabs)`: home, matches, household, community, profile
- `mobile/app/listing`: create, detail, my listings, manage listing
- `mobile/components`: reusable UI, map, listing, trust, household pieces
- `mobile/hooks`: React Query hooks for API access

### Backend

- `backend/app/routers`: FastAPI route modules
- `backend/app/models`: SQLAlchemy models
- `backend/app/schemas`: Pydantic request/response schemas
- `backend/app/services`: matching, trust, and domain logic
- `backend/app/middleware`: auth, rate limit
- `backend/alembic/versions`: database migrations

## Local Dev Commands

### Backend

```bash
cd backend
source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Useful Alembic commands:

```bash
alembic current
alembic history
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

### Mobile

```bash
cd mobile
npm install
npm run start
```

Typecheck:

```bash
cd mobile
npx tsc --noEmit
```

## Important Implementation Notes

### Listings and map behavior

- The home map only renders listings with non-null `latitude` and `longitude`.
- New listing creation now geocodes addresses server-side in `backend/app/utils/geocoding.py`.
- Listing creation also invalidates `["listings"]` and `["my-listings"]` queries so the UI refreshes after a successful post.
- Older listings created before geocoding may still need coordinate backfill if they do not show on the map.

### Listing create form expectations

Backend `ListingCreate` requires:

- `title` min length 5
- `description` min length 20
- `rent_monthly > 0`
- `total_bedrooms > 0`
- `total_bathrooms > 0`
- `available_spots > 0`
- `current_occupants >= 0`
- `available_from` must be a valid date

The mobile create form now validates these constraints before POSTing and surfaces backend validation messages with field names where possible.

### API route conventions

- FastAPI listing create route is `POST /api/v1/listings/`
- Posting to `/api/v1/listings` can trigger a `307` redirect depending on client behavior
- Prefer explicit trailing-slash route usage from the mobile client

### Auth and rate limit behavior

- Refresh tokens are persisted in `refresh_tokens`
- Local development is allowed to continue if Redis is unavailable; rate limiting fails open instead of crashing requests
- The rate-limit middleware must replay consumed request bodies for login/signup routes

### User model split

Profile and search preference data have been split from `users` into:

- `user_profiles`
- `user_search_preferences`

Be careful when changing user-related schema or eager loading:

- import all related models in `backend/app/models/__init__.py`
- ensure migrations create split tables before code depends on them

## Current Product Reality

The codebase has strong breadth, but several flows are still mid-hardening:

- listing owner workflows are better, but image upload on create is still incomplete
- verification and trust are partially implemented
- notifications are still shallow
- some community and services actions remain lighter than the UI implies

Before adding new product surface area, prefer strengthening end-to-end flows that already exist.

## Known Good Checks

When touching backend request handling:

- run `python -m compileall app`

When touching mobile listing flows:

- run `npx tsc --noEmit`
- test create listing
- verify the new listing appears in:
  - My Listings
  - Home list
  - Home map

## Files Worth Checking First For Listing Bugs

- `mobile/app/listing/create.tsx`
- `mobile/app/listing/[id].tsx`
- `mobile/app/listing/manage/[id].tsx`
- `mobile/app/(tabs)/home.tsx`
- `mobile/hooks/useListings.ts`
- `backend/app/routers/listings.py`
- `backend/app/schemas/listing.py`
- `backend/app/models/listing.py`
