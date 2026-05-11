# Urban Hut Complete Project Guide

Prepared: April 20, 2026

## 1. Purpose of This Document

This document explains Urban Hut from both a product and technical perspective. It is intended to be the single best orientation document for:

- founders and product stakeholders
- new engineers joining the project
- designers and PMs reviewing user journeys
- AI agents or contributors working inside the repo

It covers:

- what Urban Hut is trying to solve
- the current product surface area
- the actual user flows that exist in the repo today
- the backend and mobile architecture
- the database and domain model
- what is production-ready, what is partially implemented, and what is still scaffolded

---

## 2. What Urban Hut Is

Urban Hut is a roommate discovery and shared-living platform with two linked goals:

1. Help people find a room, roommate, or household that fits both practical and social preferences.
2. Help housemates manage life after move-in through expenses, chores, communication, community, and trusted services.

The core thesis is that roommate fit is not only about rent and location. It is also about:

- compatibility
- trust
- household reliability
- communication
- ongoing coordination after move-in

That is why the product combines a housing marketplace with household operations and trust infrastructure.

---

## 3. Product Vision

Urban Hut is not just a listings app and not just a household ledger. It sits between:

- Zillow / Craigslist style housing supply
- Bumble / roommate matching style compatibility
- Splitwise / Flatastic style household operations
- local community and trusted home services

The long-term product can become a full roommate operating system:

- discover a place
- evaluate the people
- express interest
- match safely
- chat and schedule tours
- move in
- run the household
- hire trusted vendors when things break

The codebase already contains foundations for most of this, but some journeys are currently broader than they are deep.

---

## 4. Target Users

### Primary users

- young professionals looking for rooms or roommates
- graduate students and recent grads moving to shared housing
- hosts or leaseholders trying to fill open spots
- current housemates managing a shared home

### Secondary users

- service providers like plumbers, electricians, cleaners, movers
- admins or internal reviewers handling document verification

---

## 5. Product Surface Area at a Glance

### Current app modules

- Auth
- Listings and search
- Host listing management
- Matching and interests
- Chat and appointment scheduling
- Saved listings and saved searches
- Household management
- Expenses
- Chores
- Community
- Services directory
- Profile and trust
- Verification

### Current backend modules

- authentication and token rotation
- profile and public user APIs
- listing search, CRUD, metrics, and image management
- matching recommendations, interests, connections, and status machine
- household creation, membership, and invite generation
- expense tracking and settlement
- chore scheduling and points
- community posts and replies
- service provider search and reviews
- trust history, score, events, and vouching
- verification upload/review flows
- chat rooms, messages, unread counts, and appointments

---

## 6. Current Product Reality

Urban Hut has strong breadth. Many major modules already exist in both mobile and backend. The current challenge is depth and flow completion.

The best way to understand the repo is:

- several flows are already real and useful
- several flows are good MVPs but still need hardening
- several flows have backend support ahead of the UI
- a few areas still contain placeholder or partial behavior

Examples:

- listing creation, my listings, and listing management now exist and are functional
- matching recommendations and received interests exist
- in-app chat and appointment scheduling exist
- community replies now exist
- map view exists, but only listings with coordinates appear there
- notification infrastructure is still mostly a stub
- trust and verification are partially real, partially evolving

---

## 7. High-Level User Journey Map

### Journey A: New user joins the platform

1. User opens app.
2. App checks secure storage for access token.
3. If logged out, user is redirected to login or signup.
4. If logged in, user lands on Home.
5. User can verify email, complete profile, and build trust.

### Journey B: Seeker looks for a room

1. User lands on Home.
2. User searches listings by city and filters.
3. User browses list or map.
4. User opens listing detail.
5. User evaluates price, amenities, rules, transit, and roommate summary.
6. User saves listing, compares listings, or expresses interest.

### Journey C: Host posts and manages a listing

1. User creates listing from modal flow.
2. Listing is saved and geocoded.
3. Listing appears in My Listings and search.
4. Host views metrics and incoming interests.
5. Host shortlists, accepts, rejects, or archives.
6. Accepted flows can progress into connection/chat.

### Journey D: Match becomes conversation

1. Interest is created against a listing or user.
2. Inbox and connections reflect relationship state.
3. A chat room can be created from a match.
4. Users exchange messages.
5. Users propose tours or calls.

### Journey E: Household operations after move-in

1. User creates or joins household.
2. Members share invite code.
3. Expenses and balances are tracked.
4. Chore templates, constraints, and schedule are managed.
5. Members earn points and develop trust history.

### Journey F: Community and services

1. User reads or posts community content.
2. User replies to neighborhood conversations.
3. User searches local service providers.
4. User reads provider details and reviews.
5. User leaves reviews for providers.

---

## 8. Mobile App Architecture

### Stack

- Expo Router
- React Native
- React Query for server state
- Zustand for auth and UI state
- Axios for API calls
- NativeWind / Tailwind-style utility classes
- `react-native-maps` on native
- `react-leaflet` + OpenStreetMap on web

### Entry and navigation

Main files:

- `mobile/app/index.tsx`
- `mobile/app/_layout.tsx`
- `mobile/app/(tabs)/_layout.tsx`

Routing behavior:

- logged-out users are redirected to `/(auth)/login`
- logged-in users are redirected to `/(tabs)/home`
- top-level stack also includes listing details, listing create/manage, saved screens, services, chat, and profile modals

### State management

#### Auth state

`mobile/stores/authStore.ts`

Stores:

- current user
- auth status
- loading state

Actions:

- login
- signup
- logout
- load current user
- update profile

Tokens are stored via secure storage helpers and attached to API requests by Axios interceptors.

#### UI state

`mobile/stores/uiStore.ts`

Stores:

- listing view mode: list or map
- listing filters
- compare selection IDs
- light/dark theme flag
- onboarding complete flag

---

## 9. Backend Architecture

### Stack

- FastAPI
- SQLAlchemy async ORM
- PostgreSQL with PostGIS image in Docker
- AsyncPG
- Alembic
- Redis
- Structlog
- APScheduler
- Boto3 + S3 utilities
- Pillow / pillow-heif for image processing
- HTTPX for outbound HTTP calls like geocoding

### App boot

Main file:

- `backend/app/main.py`

Responsibilities:

- create FastAPI app
- register middleware
- configure structured logging
- enforce minimum app version
- register all route modules
- expose `/health` and `/api/status`
- start and stop scheduler in lifespan

### Middleware

#### Logging middleware

- generates request IDs
- logs method, path, status code, and latency

#### App version middleware

- reads `X-App-Version`
- can reject outdated clients with `426 Upgrade Required`

#### Rate limiting middleware

- protects auth-sensitive endpoints
- uses Redis when available
- fails open in local development if Redis is unavailable
- must replay consumed request bodies for login/signup

### Background jobs

`backend/app/tasks/worker.py`

Current scheduler approach:

- APScheduler instead of Celery for MVP
- weekly trust score recalculation job

This reflects a deliberate MVP simplification: cron-like jobs without a heavy distributed queue system.

---

## 10. Infrastructure and Environment

### Docker services

`docker-compose.yml`

Services:

- `postgres`
- `redis`
- `backend`

### Backend config

`backend/app/config.py`

Important settings:

- `DATABASE_URL`
- `REDIS_URL`
- JWT config
- AWS S3 config
- Resend config
- OAuth placeholders
- maps key placeholder

### Run commands

Backend:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Mobile:

```bash
cd mobile
npm install
npm run start
```

Useful checks:

```bash
cd backend && source venv/bin/activate && python -m compileall app
cd mobile && npx tsc --noEmit
```

---

## 11. Core Domain Model

Important backend model files:

- `user.py`
- `user_profile.py`
- `user_search_preferences.py`
- `listing.py`
- `match.py`
- `chat.py`
- `appointment.py`
- `household.py`
- `expense.py`
- `chore.py`
- `community.py`
- `service_provider.py`
- `saved_listing.py`
- `saved_search.py`
- `trust_score.py`
- `verification.py`
- `refresh_token.py`

### User domain

The user domain is split across:

- `users`
- `user_profiles`
- `user_search_preferences`

This is important architecturally. The project moved away from a single overloaded `users` table to reduce schema coupling and separate:

- auth identity
- lifestyle/profile details
- search preferences

### Listing domain

Listings include:

- property type
- room type
- address
- optional coordinates
- financial fields
- occupancy fields
- amenities and rules
- availability
- transit details
- nearby universities
- images
- status and metrics

### Match domain

Match interest records connect:

- user to listing
- or user to user

They carry:

- source context
- message
- compatibility score
- lifecycle status

### Household domain

Households connect:

- members
- shared listing context
- invite codes
- household operations

### Trust domain

Trust consists of:

- trust events
- trust snapshots
- cached score on user
- vouches
- verification-driven trust inputs

---

## 12. Product Module Deep Dive

## 12.1 Auth Flow

### Product purpose

Authenticate users securely and establish a session that can survive app restarts.

### Mobile surfaces

- `mobile/app/(auth)/login.tsx`
- `mobile/app/(auth)/signup.tsx`
- `mobile/app/(auth)/verify-email.tsx`

### Backend routes

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/phone/request-otp`
- `POST /api/v1/auth/phone/verify-otp`
- `DELETE /api/v1/auth/account`

### How it works

1. User signs up or logs in.
2. Backend creates access token and refresh token.
3. Refresh token is stored in `refresh_tokens`.
4. Mobile stores both tokens in secure storage.
5. Axios automatically attaches access token to future requests.
6. On `401`, Axios attempts refresh and retries original request.

### Technical notes

- refresh tokens are hashed before storage
- device/user-agent metadata is stored with refresh tokens
- session revocation exists
- account deletion exists

### Product maturity

Strong MVP. This is one of the more complete flows in the app.

---

## 12.2 Profile Flow

### Product purpose

Let users maintain a profile that drives trust, compatibility, and public presentation.

### Mobile surfaces

- `mobile/app/(tabs)/profile.tsx`
- `mobile/app/profile/edit.tsx`

### Backend routes

- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `POST /api/v1/users/me/avatar`
- `GET /api/v1/users/{user_id}`

### What users can manage

- full name
- bio
- occupation
- avatar
- lifestyle fields
- city and state
- budget range
- search preferences

### Technical notes

- avatar upload is supported
- user data powers both search and compatibility
- profile completeness contributes to trust score logic

### Product maturity

Good baseline. Important because many other systems depend on this data.

---

## 12.3 Trust Flow

### Product purpose

Make trust a visible, explainable, behavior-based system instead of a vague star rating.

### Mobile surfaces

- `mobile/app/(tabs)/profile.tsx`
- trust badge usage across listing and matching UI

### Backend routes

- `GET /api/v1/trust/score`
- `GET /api/v1/trust/score/{user_id}`
- `GET /api/v1/trust/history`
- `GET /api/v1/trust/events`
- `POST /api/v1/trust/vouch/{user_id}`
- `GET /api/v1/trust/vouches`

### Trust engine design

`backend/app/services/trust_engine.py`

Five pillars:

- verification
- financial
- household
- tenure
- community

Important design choices:

- objective event-based scoring
- negative events decay over time
- positive consistency compounds
- baseline score for cold start
- user table keeps cached `trust_score` for read-heavy flows

### Product maturity

Architecturally strong, but product usage is still growing into the design. Some trust inputs are already real, while others still need more end-to-end activation.

---

## 12.4 Verification Flow

### Product purpose

Turn identity and reliability signals into persistent, reviewable trust evidence.

### Mobile surfaces

- `mobile/app/profile/verification.tsx`

### Backend routes

- `GET /api/v1/verifications/me`
- `POST /api/v1/verifications/upload-url`
- `POST /api/v1/verifications/id`
- `POST /api/v1/verifications/lease`
- `GET /api/v1/verifications/{verification_id}/document-url`
- `PATCH /api/v1/verifications/{verification_id}/review`

### Security model

`backend/app/utils/s3.py`

Verification files are:

- stored privately in S3
- addressed by object key, not public URL
- accessed through presigned URLs
- covered by a retention/deletion approach after approval review windows

### Product maturity

Partially real. The backend supports meaningful verification records and review flows, but the full user experience and operational tooling can still be hardened further.

---

## 12.5 Home and Discovery Flow

### Product purpose

Provide the central listing search experience for seekers.

### Mobile surfaces

- `mobile/app/(tabs)/home.tsx`
- `mobile/components/listing/ListingCard.tsx`
- `mobile/components/map/ListingsMap.native.tsx`
- `mobile/components/map/ListingsMap.web.tsx`

### Backend routes

- `GET /api/v1/listings/`

### How discovery works

Users can:

- search by city
- toggle between list and map
- apply filters
- view listing cards

Supported filter model in UI store:

- city
- price min/max
- room type
- property type
- available from date
- utilities included
- minimum trust
- sort

### Map behavior

Map only renders listings with valid coordinates.

Important implementation detail:

- listing creation now geocodes addresses on the backend
- older listings created before geocoding may still not appear on map until backfilled

### Product maturity

Strong and improving. This is one of the highest-value surfaces in the app.

---

## 12.6 Listing Detail Flow

### Product purpose

Let a seeker evaluate a listing in enough depth to decide whether to save or express interest.

### Mobile surfaces

- `mobile/app/listing/[id].tsx`

### Backend routes

- `GET /api/v1/listings/{listing_id}`
- `GET /api/v1/listings/roommate-summary/{listing_id}`

### Listing detail includes

- title
- pricing
- location
- description
- amenities
- house rules
- transit details
- image gallery
- occupancy details
- roommate summary

### Roommate summary includes

- household size
- available spots
- average trust score
- anonymized occupants
- lifestyle snapshot
- tenure signal

### Product maturity

Much stronger than a plain real-estate detail page because it includes household context, not just room facts.

---

## 12.7 Listing Create Flow

### Product purpose

Allow hosts to publish room supply and make it visible in search.

### Mobile surfaces

- `mobile/app/listing/create.tsx`

### Backend routes

- `POST /api/v1/listings/`
- `POST /api/v1/listings/{listing_id}/images`

### Current create form captures

- title
- description
- property type
- room type
- address
- city/state/zip
- rent
- deposit
- utilities
- utility estimate
- bedrooms and bathrooms
- available spots
- current occupants
- availability dates
- lease duration
- transit details
- amenities
- house rules
- nearby universities

### Validation behavior

The mobile create flow now validates key schema constraints before sending:

- title length
- description length
- positive numeric fields
- date format
- date ordering

Backend schema still enforces final truth.

### Important implementation note

The create flow stores listing record data successfully, but image upload is still not fully end-to-end on first create submit. The API supports listing image upload separately.

### Product maturity

Good functional MVP with room for media and polish improvements.

---

## 12.8 Host Listing Management Flow

### Product purpose

Give hosts visibility and control after publishing.

### Mobile surfaces

- `mobile/app/listing/my-listings.tsx`
- `mobile/app/listing/manage/[id].tsx`

### Backend routes

- `GET /api/v1/listings/mine`
- `GET /api/v1/listings/{listing_id}/interests`
- `GET /api/v1/listings/{listing_id}/metrics`
- `PATCH /api/v1/listings/{listing_id}`
- `PATCH /api/v1/listings/{listing_id}/status`
- `PATCH /api/v1/listings/{listing_id}/interests/{interest_id}`
- `DELETE /api/v1/listings/{listing_id}`
- `POST /api/v1/listings/{listing_id}/images`
- `DELETE /api/v1/listings/{listing_id}/images`

### Host capabilities

- view own listings
- filter by status
- inspect listing performance
- review incoming interests
- accept, reject, shortlist, archive
- edit listing fields
- pause or close listing

### Product maturity

This used to be one of the biggest gaps in the product. It is now meaningfully present and is one of the more important hardening wins in the current codebase.

---

## 12.9 Matching Flow

### Product purpose

Move users from passive browsing into intentional compatibility-based interest.

### Mobile surfaces

- `mobile/app/(tabs)/matches.tsx`

Tabs:

- Recommendations
- Inbox
- Connections

### Backend routes

- `GET /api/v1/matching/recommendations`
- `POST /api/v1/matching/interest`
- `GET /api/v1/matching/interests`
- `GET /api/v1/matching/received`
- `PATCH /api/v1/matching/interest/{interest_id}`
- `GET /api/v1/matching/connections`
- `GET /api/v1/matching/status-machine`

### Matching engine

`backend/app/services/matching_engine.py`

Compatibility score includes:

- lifestyle dimensions
- budget overlap
- trust similarity

Lifestyle dimensions considered:

- diet
- smoking
- drinking
- sleep schedule
- noise tolerance
- guests
- cleanliness
- work schedule
- pet friendliness

### Product maturity

Solid middle layer. Recommendations, inbox, and connections all exist, though lifecycle polish and richer orchestration can continue improving.

---

## 12.10 Chat and Appointment Flow

### Product purpose

Turn a match into actual conversation and logistics.

### Mobile surfaces

- `mobile/app/chat/index.tsx`
- `mobile/app/chat/[id].tsx`

### Backend routes

- `GET /api/v1/chat/rooms`
- `POST /api/v1/chat/rooms/from-match/{interest_id}`
- `GET /api/v1/chat/rooms/{room_id}/messages`
- `POST /api/v1/chat/rooms/{room_id}/messages`
- `GET /api/v1/chat/unread-count`
- `POST /api/v1/chat/rooms/{room_id}/appointments`
- `GET /api/v1/chat/rooms/{room_id}/appointments`
- `PATCH /api/v1/chat/appointments/{appointment_id}`

### Current behavior

- chat rooms are linked to match context
- unread counts are polled
- messages are polled every few seconds
- appointments support proposing and responding to tours or calls

### Technical note

For MVP, real-time messaging is approximated with polling rather than sockets.

### Product maturity

Surprisingly strong for an MVP-stage shared-housing app. This is a differentiator if polished further.

---

## 12.11 Saved Listings and Saved Searches

### Product purpose

Give seekers a planning workflow instead of forcing one-shot decisions.

### Mobile surfaces

- `mobile/app/saved/index.tsx`
- `mobile/app/saved/compare.tsx`

### Backend routes

- `POST /api/v1/saved/listings/{listing_id}`
- `DELETE /api/v1/saved/listings/{listing_id}`
- `GET /api/v1/saved/listings`
- `GET /api/v1/saved/listings/ids`
- `POST /api/v1/saved/listings/compare`
- `POST /api/v1/saved/searches`
- `GET /api/v1/saved/searches`
- `PATCH /api/v1/saved/searches/{search_id}`
- `DELETE /api/v1/saved/searches/{search_id}`

### Supported actions

- save and unsave listing
- list saved items
- compare listings across key criteria
- save a search definition
- toggle alerts on saved search

### Product maturity

Strong supporting flow. This is useful product depth for serious housing decisions.

---

## 12.12 Household Flow

### Product purpose

Support post-move-in coordination.

### Mobile surfaces

- `mobile/app/(tabs)/household.tsx`
- `mobile/components/household/ExpensesTab.tsx`
- `mobile/components/household/ChoresTab.tsx`

### Backend routes

- `POST /api/v1/households`
- `GET /api/v1/households/mine`
- `POST /api/v1/households/join`
- `GET /api/v1/households/members`
- `POST /api/v1/households/invite`

### Flow

1. User creates a household or joins with invite code.
2. Members are shown in overview.
3. Invite code can be generated and shared.
4. Household becomes the hub for expenses and chores.

### Detailed documentation

See [docs/household-module-flows.md](household-module-flows.md) for end-to-end UX flows and diagrams.

### Product maturity

Solid household workspace with automated scheduling and ledger tracking.

---

## 12.13 Expense Flow

### Product purpose

Track shared bills and who owes whom.

### Mobile surfaces

- expenses tab inside Household

### Backend routes

- `GET /api/v1/expenses/`
- `POST /api/v1/expenses/`
- `GET /api/v1/expenses/my-splits`
- `GET /api/v1/expenses/balances`
- `POST /api/v1/expenses/{expense_id}/settle`
- `GET /api/v1/expenses/{expense_id}`
- `POST /api/v1/expenses/{expense_id}/receipt-upload-url` (UH-502)

### Supported behavior

- create expense (Equal or Exact splits)
- inspect pending splits and net balances
- settle owed items
- attach and view receipts (S3 integration)

### Product maturity

Practical and scalable. Future depth: dispute resolution and monthly PDF exports.

---

## 12.14 Chore Flow

### Product purpose

Distribute household labor fairly.

### Mobile surfaces

- chores tab inside Household

### Backend routes

- `GET /api/v1/chores/tasks`
- `POST /api/v1/chores/tasks`
- `PATCH /api/v1/chores/tasks/{task_id}`
- `DELETE /api/v1/chores/tasks/{task_id}`
- `GET /api/v1/chores/constraints`
- `POST /api/v1/chores/constraints`
- `DELETE /api/v1/chores/constraints/{constraint_id}`
- `POST /api/v1/chores/generate`
- `GET /api/v1/chores/schedule`
- `POST /api/v1/chores/schedule/{assignment_id}/complete`
- `GET /api/v1/chores/points`
- `POST /api/v1/chores/remind` (UH-602)

### Supported behavior

- Define recurring chore templates with weights.
- Individual member constraints (preferences, restrictions, fixed days).
- Automated week-ahead schedule generation using constraint-satisfaction algorithm.
- Points and performance tracking linked to Trust Score.

### Product maturity

Highly functional. Outperforms basic list-based alternatives with its fairness algorithm.

`backend/app/services/chore_scheduler.py`

Approach:

- greedy assignment with bounded backtracking
- fixed assignments and restrictions first
- fairness weighting
- preference and frequency constraints
- max backtrack safety cap to avoid timeouts

### Product maturity

This is one of the more technically interesting modules in the project. It is already useful and can become a distinctive differentiator with more UX polish.

---

## 12.15 Community Flow

### Product purpose

Create local trust and neighborhood utility beyond roommate matching.

### Mobile surfaces

- `mobile/app/(tabs)/community.tsx`

### Backend routes

- `GET /api/v1/community/posts`
- `POST /api/v1/community/posts`
- `POST /api/v1/community/posts/{post_id}/upvote`
- `GET /api/v1/community/posts/{post_id}/replies`
- `POST /api/v1/community/posts/{post_id}/replies`

### What users can do

- browse local posts
- filter by type
- create posts
- upvote posts
- read replies
- create replies

### Product maturity

Better than a placeholder feed now that replies exist, but still lighter than the marketplace and household systems.

---

## 12.16 Services Flow

### Product purpose

Help households discover trusted local providers for home-related needs.

### Mobile surfaces

- `mobile/app/services/index.tsx`
- `mobile/app/services/[id].tsx`

### Backend routes

- `GET /api/v1/services/providers`
- `GET /api/v1/services/providers/{provider_id}`
- `POST /api/v1/services/providers/{provider_id}/review`

### Current experience

- browse providers by city and category
- inspect provider detail
- see ratings and review counts
- submit review

### Product maturity

Directory and review system are present, but booking workflow is not yet the main experience.

---

## 12.17 Notifications

### Product purpose

Eventually keep users informed about matches, chores, bills, and search alerts.

### Current technical status

`backend/app/services/notification_service.py`

The service exists as a placeholder with methods for:

- push notifications
- email notifications
- chore reminders
- bill due reminders

Actual delivery integrations are still TODOs.

### Product maturity

Scaffold only. Important future infrastructure area.

---

## 13. API Design Patterns

### Versioning

All main routes are under:

- `/api/v1/...`

The app also exposes:

- `/api/status`

to communicate:

- minimum app version
- latest version
- maintenance mode

### Error shape

The backend standardizes error responses as:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field required",
    "field": "body.city"
  }
}
```

This is especially useful for mobile forms.

### Authentication model

- Bearer JWT access token
- refresh token rotation
- revocation support
- auth-aware Axios interceptor on mobile

---

## 14. Media and File Handling

### Listing images

The backend supports:

- upload to S3
- processing to thumbnail/medium/full sizes
- EXIF stripping
- JPEG normalization

### Verification documents

The backend supports:

- private object storage
- presigned upload and review access
- safer key-only storage in DB

### Current state

- listing image backend pipeline exists
- mobile create listing image upload can be improved further end-to-end

---

## 15. Security and Safety Model

Current important pieces:

- JWT auth with refresh token persistence
- rate limiting on auth routes
- fail-open local dev behavior when Redis is down
- standardized authorization checks in route modules
- private S3 object handling for verification docs
- hashed refresh tokens
- server-side sanitization utilities for text fields

Areas still worth future hardening:

- deeper role/permission abstraction
- production notification and moderation systems
- stricter operational observability
- more exhaustive audit trails

---

## 16. Data Flow by Layer

### Mobile flow

1. Screen renders.
2. Hook calls React Query query or mutation.
3. Axios request is sent to FastAPI.
4. Token interceptor adds auth header if present.
5. Response is cached in React Query.
6. Mutations invalidate related query keys.

### Backend flow

1. Request passes middleware.
2. Auth dependency resolves current user if needed.
3. Pydantic schema validates input.
4. Router performs SQLAlchemy queries and mutations.
5. Domain services run where appropriate.
6. Session commits via `get_db`.
7. Response model is returned.

---

## 17. Product Strengths

The project already has several unusually strong attributes:

- broad cross-functional product surface area
- real trust engine design instead of a vanity score
- actual host management flow, not just listing creation
- in-app chat and appointments
- saved listings and compare workflow
- chore scheduling with algorithmic fairness
- community and services layers that extend beyond roommate search

---

## 18. Main Product Gaps Still Remaining

Based on the codebase and the planning docs, the most important remaining gaps are:

- notification delivery is still mostly stubbed
- services lacks booking and operations depth
- verification and trust can be pushed further into the visible UX
- some listing media flows need fuller polishing
- certain lifecycle transitions and analytics can still be made more explicit
- older records created before recent hardening may need backfill, especially coordinates/media consistency

---

## 19. Recommended Way to Read the Repo

If someone is onboarding and wants to understand the system quickly, this is the best order:

1. `CLAUDE.md`
2. `docs/product-gap-analysis.md`
3. `docs/delivery-backlog.md`
4. `mobile/app/_layout.tsx`
5. `mobile/app/(tabs)/home.tsx`
6. `mobile/app/listing/create.tsx`
7. `mobile/app/listing/[id].tsx`
8. `mobile/app/listing/manage/[id].tsx`
9. `backend/app/main.py`
10. `backend/app/routers/listings.py`
11. `backend/app/routers/matching.py`
12. `backend/app/routers/chat.py`
13. `backend/app/services/trust_engine.py`
14. `backend/app/services/matching_engine.py`
15. `backend/app/services/chore_scheduler.py`

---

## 20. File Map by Business Area

### Auth

- `mobile/app/(auth)/*`
- `mobile/stores/authStore.ts`
- `mobile/hooks/useAuth.ts`
- `backend/app/routers/auth.py`

### Listings

- `mobile/app/(tabs)/home.tsx`
- `mobile/app/listing/create.tsx`
- `mobile/app/listing/[id].tsx`
- `mobile/app/listing/my-listings.tsx`
- `mobile/app/listing/manage/[id].tsx`
- `mobile/hooks/useListings.ts`
- `mobile/hooks/useHostListings.ts`
- `backend/app/routers/listings.py`
- `backend/app/schemas/listing.py`
- `backend/app/models/listing.py`

### Matching and chat

- `mobile/app/(tabs)/matches.tsx`
- `mobile/app/chat/index.tsx`
- `mobile/app/chat/[id].tsx`
- `mobile/hooks/useMatching.ts`
- `mobile/hooks/useChat.ts`
- `backend/app/routers/matching.py`
- `backend/app/routers/chat.py`
- `backend/app/services/matching_engine.py`

### Household

- `mobile/app/(tabs)/household.tsx`
- `mobile/components/household/*`
- `mobile/hooks/useHousehold.ts`
- `backend/app/routers/households.py`
- `backend/app/routers/expenses.py`
- `backend/app/routers/chores.py`
- `backend/app/services/chore_scheduler.py`

### Trust and verification

- `mobile/app/(tabs)/profile.tsx`
- `mobile/app/profile/verification.tsx`
- `mobile/hooks/useTrustScore.ts`
- `mobile/hooks/useVerifications.ts`
- `backend/app/routers/trust.py`
- `backend/app/routers/verifications.py`
- `backend/app/services/trust_engine.py`

### Community and services

- `mobile/app/(tabs)/community.tsx`
- `mobile/app/services/index.tsx`
- `mobile/app/services/[id].tsx`
- `backend/app/routers/community.py`
- `backend/app/routers/services.py`

---

## 21. Final Summary

Urban Hut is already much more than a prototype marketplace. It is a multi-module shared-living platform with real logic in:

- discovery
- host supply management
- matching
- trust
- chat
- household operations
- saved planning tools

Its biggest opportunity is not inventing new modules. It is making the existing journeys feel complete, reliable, and unmistakably better than a generic listings app.

That makes the current project strategy very clear:

- keep hardening the best existing flows
- connect the remaining partial journeys end to end
- preserve the trust + compatibility + household differentiation that makes the product unique
