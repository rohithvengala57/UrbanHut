# Urban-Hut Delivery Backlog Pack

Prepared: April 15, 2026

## Purpose

This document converts the product gap analysis into:

- a Jira-style epic/story backlog with priorities and acceptance criteria
- a phased MVP / Phase 2 / Phase 3 implementation plan
- a technical architecture checklist for the top 10 stories

---

## Priority Scale

- `P0`: Critical to product credibility or conversion
- `P1`: Important for retention, operating quality, or trust
- `P2`: Differentiators and growth features

---

## Jira-Style Epic and Story Backlog

## Epic EH-01: Listing Owner Funnel Management

### Goal

Give hosts the tools to manage listings after publishing, including demand review, decisioning, and listing quality controls.

### Stories

#### `UH-101` My Listings Dashboard

- `Epic`: EH-01
- `Priority`: P0
- `Story`: As a host, I want a My Listings dashboard so that I can manage all my active, paused, draft, and closed listings from one place.

Acceptance Criteria:

- The user can access a `My Listings` screen from the app.
- Listings are grouped or filterable by status: `draft`, `active`, `paused`, `closed`.
- Each listing card shows title, rent, city, occupancy, view count, and interest count.
- Tapping a listing opens a host management view instead of the public seeker view.
- Empty states exist for each status bucket.

#### `UH-102` Listing Interest Inbox

- `Epic`: EH-01
- `Priority`: P0
- `Story`: As a host, I want to see incoming interests for each listing so that I can review potential roommates without leaving the app.

Acceptance Criteria:

- Each listing has an `Incoming Interests` section.
- The section shows interested user summary, trust score, compatibility score, and timestamp.
- The host can filter by `new`, `shortlisted`, `accepted`, `rejected`, and `archived`.
- The host can open an applicant detail view for each interest.
- Interest counts update after host actions without app restart.

#### `UH-103` Host Decision Workflow

- `Epic`: EH-01
- `Priority`: P0
- `Story`: As a host, I want to accept, reject, shortlist, or archive incoming interest so that I can manage my roommate pipeline.

Acceptance Criteria:

- Hosts can perform `shortlist`, `accept`, `reject`, and `archive` actions on an interest.
- Each action updates the interest status in the backend.
- Accepted interests transition into a `mutual` or next-step-ready state.
- Rejected interests are hidden from the default active queue.
- A confirmation prompt appears for destructive actions.

#### `UH-104` Listing Performance Insights

- `Epic`: EH-01
- `Priority`: P1
- `Story`: As a host, I want listing performance metrics so that I can improve my listing quality and response rate.

Acceptance Criteria:

- The host can view listing view count, interest count, shortlist count, and accept count.
- The host can view a simple conversion funnel from views to interest to accepted.
- Metrics are shown per listing.
- Metrics respect listing ownership and are not visible to non-host users.

#### `UH-105` Listing Edit and Control Panel

- `Epic`: EH-01
- `Priority`: P0
- `Story`: As a host, I want to edit listing details and control listing availability so that my published supply remains accurate.

Acceptance Criteria:

- Hosts can edit listing content after posting.
- Hosts can pause or close a listing.
- Hosts can update occupancy, available spots, rules, and lease details.
- Hosts cannot edit listings they do not own.
- Public seekers do not see paused or closed listings in search results.

---

## Epic EH-02: Seeker Discovery and Evaluation

### Goal

Help seekers evaluate both the home and the people before expressing interest.

### Stories

#### `UH-201` Advanced Listing Filters

- `Epic`: EH-02
- `Priority`: P0
- `Story`: As a seeker, I want richer filters so that I can narrow the listings to realistic options quickly.

Acceptance Criteria:

- Search supports filters for price range, room type, property type, availability date, utilities included, and minimum trust band.
- Applied filters are visible in the UI.
- Filters can be cleared individually or all at once.
- Filter state persists while navigating between search and listing details.

#### `UH-202` Functional Map Search

- `Epic`: EH-02
- `Priority`: P1
- `Story`: As a seeker, I want a map view so that I can evaluate commute and neighborhood tradeoffs visually.

Acceptance Criteria:

- Search results can be viewed on a map.
- Listings with coordinates render as pins.
- Tapping a pin opens a listing preview.
- The map and list views share the same filter state.

#### `UH-203` Roommate Summary on Listing Detail

- `Epic`: EH-02
- `Priority`: P0
- `Story`: As a seeker, I want anonymized roommate summaries on a listing so that I can assess social fit before expressing interest.

Acceptance Criteria:

- Listing detail shows household size, average trust score, and high-level roommate breakdown.
- Listing detail shows anonymized occupant cards such as `Roommate A`, `Roommate B`.
- Each occupant summary shows trust band, lifestyle snapshot, and move-in/tenure signal if available.
- No personally sensitive data is exposed without a mutual match.

#### `UH-204` Listing Save and Compare

- `Epic`: EH-02
- `Priority`: P1
- `Story`: As a seeker, I want to save and compare listings so that I can make a better housing decision.

Acceptance Criteria:

- A seeker can save or unsave a listing.
- Saved listings are accessible from a dedicated screen.
- A seeker can compare at least two saved listings on rent, transit, occupancy, trust summary, and amenities.

#### `UH-205` Saved Search Alerts

- `Epic`: EH-02
- `Priority`: P1
- `Story`: As a seeker, I want saved search alerts so that I know when a matching listing becomes available.

Acceptance Criteria:

- A seeker can save a search with filters.
- The user can enable or disable alert notifications for a saved search.
- New matching listings generate a notification event.

---

## Epic EH-03: Matching and Communication Lifecycle

### Goal

Move users from passive interest to active conversation and coordinated next steps.

### Stories

#### `UH-301` Received Interests Inbox

- `Epic`: EH-03
- `Priority`: P0
- `Story`: As a user, I want a received-interests inbox so that I can act on people who are interested in me or my listings.

Acceptance Criteria:

- The inbox shows listing-based interest and direct user-to-user interest.
- Interest cards show source context, trust, compatibility, and status.
- The user can open an interest detail view from the inbox.

#### `UH-302` Mutual Match State Machine

- `Epic`: EH-03
- `Priority`: P0
- `Story`: As a user, I want relationship states such as interested, shortlisted, mutual, touring, approved, and closed so that each lead has a clear lifecycle.

Acceptance Criteria:

- Statuses are represented consistently in API and mobile UI.
- Valid transitions are enforced server-side.
- Invalid transitions return a clear API error.

#### `UH-303` In-App Chat for Mutual Matches

- `Epic`: EH-03
- `Priority`: P1
- `Story`: As a matched user, I want secure in-app chat so that I can coordinate safely before sharing personal contact information.

Acceptance Criteria:

- Only mutual matches can access chat.
- Each chat is scoped to a match or listing context.
- Users can send and receive text messages.
- Basic unread indicators are available.

#### `UH-304` Tour and Call Scheduling

- `Epic`: EH-03
- `Priority`: P1
- `Story`: As a matched user, I want to schedule tours or calls so that I can move toward a decision.

Acceptance Criteria:

- A user can propose time slots.
- The other user can accept, reject, or request a different time.
- Confirmed appointments are visible in both users' views.

---

## Epic EH-04: Trust, Verification, and Safety

### Goal

Make trust persistent, explainable, and operationally useful.

### Stories

#### `UH-401` Persistent Verification State

- `Epic`: EH-04
- `Priority`: P0
- `Story`: As a user, I want completed verification actions to persist on my profile and trust score so that verification is meaningful.

Acceptance Criteria:

- Email verification updates a persistent backend field.
- Verification status is returned in the user profile response.
- Trust score reflects completed verification events.
- Verified state remains after logout/login.

#### `UH-402` Phone OTP Verification

- `Epic`: EH-04
- `Priority`: P1
- `Story`: As a user, I want phone verification by OTP so that I can prove account authenticity.

Acceptance Criteria:

- Users can request an OTP to their phone number.
- Users can submit the OTP for verification.
- Failed attempts are rate-limited.
- Successful verification updates verification state and trust events.

#### `UH-403` ID Verification Workflow

- `Epic`: EH-04
- `Priority`: P1
- `Story`: As a user, I want ID verification so that I can increase trust with future roommates and hosts.

Acceptance Criteria:

- Users can upload identity verification assets.
- Verification submissions store status as `pending`, `approved`, or `rejected`.
- Users can see verification status in the app.
- Trust score is updated only after approval.

#### `UH-404` Lease / Rental History Verification

- `Epic`: EH-04
- `Priority`: P1
- `Story`: As a user, I want to verify my lease or rental history so that my housing reliability is more credible.

Acceptance Criteria:

- Users can upload a lease or proof of tenancy.
- The system stores review status and document metadata.
- The UI surfaces whether rental-history verification is pending or approved.

#### `UH-405` Trust Score Transparency

- `Epic`: EH-04
- `Priority`: P1
- `Story`: As a user, I want to understand why my trust score changed so that the system feels fair and actionable.

Acceptance Criteria:

- Users can see recent trust events.
- Users can see the contribution of each trust pillar.
- Users can see trend direction and a short explanation of recent movement.

---

## Epic EH-05: Household Finance Depth

### Goal

Turn the basic split flow into a reliable shared-house finance tool.

### Stories

#### `UH-501` Recurring Expenses

- `Epic`: EH-05
- `Priority`: P1
- `Story`: As a household member, I want recurring bills so that I do not recreate the same monthly expenses each cycle.

Acceptance Criteria:

- A user can mark an expense as recurring.
- The user can select recurrence cadence.
- Future instances are generated automatically or queued for approval.

#### `UH-502` Receipt Upload and Attachments

- `Epic`: EH-05
- `Priority`: P1
- `Story`: As a household member, I want to attach receipts so that expenses are transparent and auditable.

Acceptance Criteria:

- A user can attach one or more receipt files to an expense.
- Receipt previews are visible in expense detail.
- Receipt metadata is retained after refresh.

#### `UH-503` Expense Search, History, and Settlements Ledger

- `Epic`: EH-05
- `Priority`: P1
- `Story`: As a household member, I want searchable expense history and settlement records so that I can resolve disputes and audit household spending.

Acceptance Criteria:

- A user can search expenses by description, category, payer, and date range.
- A settlement ledger is visible for completed settlements.
- Expense history paginates reliably.

---

## Epic EH-06: Household Chore Operations

### Goal

Add accountability, exports, and fairness diagnostics to the chore system.

### Stories

#### `UH-601` Chore Completion Log

- `Epic`: EH-06
- `Priority`: P1
- `Story`: As a household member, I want a chore completion log so that household work is visible over time.

Acceptance Criteria:

- Completed chores are stored as historical records.
- Users can view completed vs missed chores by week.
- Admins can review household-level logs.

#### `UH-602` Chore Reminder Notifications

- `Epic`: EH-06
- `Priority`: P1
- `Story`: As a household admin, I want reminders for pending chores so that schedule adherence improves without manual follow-up.

Acceptance Criteria:

- Reminder events can be scheduled for assigned chores.
- Assigned users receive push or email reminders.
- Reminders do not fire for already completed chores.

#### `UH-603` Chore Calendar Export

- `Epic`: EH-06
- `Priority`: P1
- `Story`: As a household admin, I want calendar exports so that roommates can view chores in their personal calendars.

Acceptance Criteria:

- Users can export household or per-user chore schedules.
- Export formats include at least `.ics`.
- Export respects the current schedule version.

#### `UH-604` Fairness Dashboard

- `Epic`: EH-06
- `Priority`: P1
- `Story`: As a household member, I want fairness and performance dashboards so that schedule quality is transparent.

Acceptance Criteria:

- The UI shows current week effort balance.
- The UI shows historical completion rates by member.
- The UI highlights over-assignment or under-assignment risk.

#### `UH-605` Constraint Approval Workflow

- `Epic`: EH-06
- `Priority`: P2
- `Story`: As a household admin, I want sensitive constraints to require approval so that one person cannot quietly bias the schedule.

Acceptance Criteria:

- New constraints can be marked pending approval.
- Approvers can accept or reject them.
- Pending constraints are not used in generation until approved.

---

## Epic EH-07: Community Utility and Moderation

### Goal

Turn the community feed into a real neighborhood interaction layer.

### Stories

#### `UH-701` Community Replies

- `Epic`: EH-07
- `Priority`: P1
- `Story`: As a community member, I want replies and threaded discussion so that posts become useful conversations.

Acceptance Criteria:

- Users can reply to posts.
- Replies are visible in a post detail view.
- Reply counts are shown in feed cards.

#### `UH-702` Safe Voting and Moderation

- `Epic`: EH-07
- `Priority`: P1
- `Story`: As a community member, I want protected voting and moderation tools so that the feed remains credible and healthy.

Acceptance Criteria:

- Users can upvote a post only once.
- Users can report inappropriate content.
- Reported content enters a moderation queue.

#### `UH-703` Bookmark and Share

- `Epic`: EH-07
- `Priority`: P2
- `Story`: As a community member, I want to bookmark or share useful content so that local knowledge compounds over time.

Acceptance Criteria:

- Posts can be bookmarked.
- Posts can be shared using native share flows where supported.

---

## Epic EH-08: Services Marketplace Transactions

### Goal

Convert service discovery into service fulfillment.

### Stories

#### `UH-801` Service Booking MVP

- `Epic`: EH-08
- `Priority`: P1
- `Story`: As a user, I want to book a provider for a date and time so that the services section becomes actionable.

Acceptance Criteria:

- Users can select a provider, date, and time slot.
- The backend stores a booking record with status.
- The user can view booking confirmation in the app.

#### `UH-802` Reschedule and Cancel Booking

- `Epic`: EH-08
- `Priority`: P1
- `Story`: As a user, I want to reschedule or cancel a booking so that plans remain flexible.

Acceptance Criteria:

- Users can reschedule a future booking.
- Users can cancel a future booking.
- Status history remains auditable.

#### `UH-803` Provider Chat and Support Escalation

- `Epic`: EH-08
- `Priority`: P2
- `Story`: As a user, I want in-app coordination with providers and support escalation so that service completion is smoother.

Acceptance Criteria:

- Users can message an assigned provider for an active booking.
- Users can raise a service issue from the booking detail screen.

---

## Epic EH-09: Notifications and Lifecycle Automation

### Goal

Make Urban-Hut proactive instead of requiring users to poll the app.

### Stories

#### `UH-901` Push and Email Notification Foundation

- `Epic`: EH-09
- `Priority`: P0
- `Story`: As a user, I want push and email notifications for important events so that I do not miss time-sensitive actions.

Acceptance Criteria:

- The system can send push notifications and email notifications through configurable providers.
- Notification templates exist for interest received, interest accepted, chore reminder, expense due, and booking updates.
- Delivery failures are logged.

#### `UH-902` Notification Preferences

- `Epic`: EH-09
- `Priority`: P1
- `Story`: As a user, I want notification preferences so that I can control which events reach me and how.

Acceptance Criteria:

- Users can enable or disable push and email by category.
- Preferences are applied before sending notifications.

---

## Phased Implementation Plan

## MVP / Phase 1

### Objective

Fix the most visible end-to-end product credibility gaps.

### Included Stories

- `UH-101` My Listings Dashboard
- `UH-102` Listing Interest Inbox
- `UH-103` Host Decision Workflow
- `UH-105` Listing Edit and Control Panel
- `UH-201` Advanced Listing Filters
- `UH-203` Roommate Summary on Listing Detail
- `UH-301` Received Interests Inbox
- `UH-302` Mutual Match State Machine
- `UH-401` Persistent Verification State
- `UH-901` Push and Email Notification Foundation

### Phase 1 Deliverables

- A host can post a listing and manage responses.
- A seeker can evaluate both apartment and household.
- Interest states are visible and actionable.
- Trust verification is no longer a placeholder.
- Core notifications work.

### Suggested Milestones

1. Data model and API hardening
2. Owner and seeker listing experience
3. Match lifecycle and notifications
4. Verification persistence and trust update

---

## Phase 2

### Objective

Improve retention and operational quality after the first successful matches and household setups.

### Included Stories

- `UH-202` Functional Map Search
- `UH-204` Listing Save and Compare
- `UH-205` Saved Search Alerts
- `UH-303` In-App Chat for Mutual Matches
- `UH-304` Tour and Call Scheduling
- `UH-402` Phone OTP Verification
- `UH-403` ID Verification Workflow
- `UH-404` Lease / Rental History Verification
- `UH-405` Trust Score Transparency
- `UH-501` Recurring Expenses
- `UH-502` Receipt Upload and Attachments
- `UH-503` Expense Search, History, and Settlements Ledger
- `UH-601` Chore Completion Log
- `UH-602` Chore Reminder Notifications
- `UH-603` Chore Calendar Export
- `UH-604` Fairness Dashboard
- `UH-701` Community Replies
- `UH-702` Safe Voting and Moderation
- `UH-801` Service Booking MVP
- `UH-802` Reschedule and Cancel Booking
- `UH-902` Notification Preferences

### Phase 2 Deliverables

- A more complete roommate search and conversion journey
- Stronger household finance and chores retention loops
- Community interactions with real utility
- Service bookings become transactional

---

## Phase 3

### Objective

Differentiate Urban-Hut with deeper trust, household intelligence, and ecosystem features.

### Included Stories

- `UH-104` Listing Performance Insights
- `UH-605` Constraint Approval Workflow
- `UH-703` Bookmark and Share
- `UH-803` Provider Chat and Support Escalation

Additional recommended Phase 3 initiatives:

- host conversion analytics and ranking insights
- household fit scoring beyond host-to-seeker compatibility
- recurring service packages and favorites
- neighborhood intelligence and event participation signals

### Phase 3 Deliverables

- Better product defensibility
- More differentiated trust-aware roommate decisioning
- Better operational intelligence for hosts and households

---

## Technical Architecture Checklist for the Top 10 Stories

The top 10 stories for architecture planning are:

- `UH-101`
- `UH-102`
- `UH-103`
- `UH-105`
- `UH-201`
- `UH-203`
- `UH-301`
- `UH-302`
- `UH-401`
- `UH-901`

### `UH-101` My Listings Dashboard

- Add `GET /listings/mine` endpoint with pagination and status filters.
- Include aggregated counts for views and interests.
- Add mobile navigation entry point for hosts.
- Define listing status enum consistently in model, schema, and UI.
- Ensure index coverage on `host_id` and `status`.

### `UH-102` Listing Interest Inbox

- Extend `GET /matching/received` response with seeker summary, listing title, trust score, and compatibility score.
- Join listing and user metadata server-side rather than client fan-out.
- Add list and detail UI states for inbox views.
- Add query invalidation strategy after decisions.

### `UH-103` Host Decision Workflow

- Replace free-form status updates with validated state transitions.
- Add server-side authorization: only recipient/host can decide.
- Add audit timestamps such as `shortlisted_at`, `accepted_at`, `rejected_at`.
- Add status transition rules to service layer.

### `UH-105` Listing Edit and Control Panel

- Add edit forms for schema fields currently unused in listing creation.
- Add pause/close behavior without deleting records.
- Ensure search excludes non-active listings.
- Version or log significant host edits if analytics is needed later.

### `UH-201` Advanced Listing Filters

- Expand mobile filter UI and state handling.
- Normalize query parameter mapping between UI and backend.
- Add optional filter support for utilities, availability, trust band, occupancy, transit distance if desired.
- Ensure backend sorting and pagination remain stable under compound filters.

### `UH-203` Roommate Summary on Listing Detail

- Define a listing-occupant summary DTO that excludes sensitive PII.
- Decide data source for occupant membership and occupant-to-listing relation.
- Add household aggregate trust computation.
- Add per-occupant anonymized lifestyle projection fields.
- Update listing detail UI to render household composition blocks.

### `UH-301` Received Interests Inbox

- Unify direct user interest and listing interest into a common inbox response model.
- Add grouping/filtering by type and status.
- Ensure pagination support.
- Add unread/read metadata if future notification badge support is needed.

### `UH-302` Mutual Match State Machine

- Introduce explicit status enum and transition table.
- Move transition logic out of raw router mutation into a service layer.
- Add tests for valid and invalid state transitions.
- Document which events trigger notifications.

### `UH-401` Persistent Verification State

- Add persistent user verification fields or a dedicated verification table.
- On email verification success, update stored verification state and create a trust event.
- Return verification state via `/users/me`.
- Align mobile verification UI with backend truth, not placeholder logic.

### `UH-901` Push and Email Notification Foundation

- Replace the notification stub with provider integrations behind interfaces.
- Store push tokens and email delivery preferences.
- Create templated notification event types.
- Add retry/error logging strategy.
- Trigger notifications from match, listing, chores, expenses, and booking events.

---

## Implementation Notes

- Prefer service-layer orchestration for matching, verification, and notifications instead of placing business rules directly in routers.
- Introduce typed response contracts for inbox, listing host views, and roommate summaries to avoid repeated client-side composition.
- Keep seeker and host views separate where workflows differ materially.
- Treat trust and notifications as platform capabilities used by multiple features, not one-off add-ons.
