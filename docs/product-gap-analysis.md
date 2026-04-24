# Urban-Hut Product Review, Gap Analysis, and User Stories

Prepared: April 15, 2026

## 1. Executive Summary

Urban-Hut already has a promising foundation:

- Roommate discovery and listing search
- Listing creation and detail pages
- Compatibility-based matching
- Household management with expenses and chores
- Community posts
- Service provider directory
- Trust score scaffolding

The main issue is not lack of modules, but lack of complete journeys. The codebase contains several partial implementations where:

- backend endpoints exist without corresponding owner-facing UI
- UI screens exist without production-grade backend support
- schema/model fields exist but are not captured in forms or displayed in detail pages
- important trust, notifications, and workflow states are placeholders

This means Urban-Hut currently demonstrates breadth, but not enough depth in the highest-value user journeys:

1. Find a room and evaluate the household
2. Post a listing and manage incoming demand
3. Move from mutual interest to confirmed roommate conversation
4. Run the household after move-in
5. Book trusted services when issues arise

The best next step is to stop adding new surface area for a moment and harden end-to-end flows.

---

## 2. What Exists Today

### Mobile app modules

- Auth: signup, login, email verification flow
- Home: listing search by city, basic list/map toggle
- Listing detail: description, amenities, rules, transit, interest CTA
- Matching: recommendations, mutual connections banner
- Household: create/join, balances, expenses, chores, service shortcut
- Community: feed, create post, upvote
- Services: provider search, provider detail, rating/review
- Profile: edit profile, trust score display, verification screen

### Backend modules

- Auth and token refresh
- User profile CRUD
- Listings CRUD and search
- Match interest creation, received interests, connections
- Households and invite generation
- Expenses, balances, splits, settlements
- Chore templates, constraints, schedules, points
- Community posts and upvotes
- Service providers and reviews
- Trust engine, vouches, score history

---

## 3. Code Review Findings

### Critical product issues

1. **No listing owner workflow**
   - Users can post listings, and backend can return received interests via `/matching/received`, but there is no mobile screen to review incoming interests, accept/reject them, or progress to a mutual match.
   - Result: the supply side can create inventory but cannot manage demand.

2. **Listing evaluation is incomplete for roommate decisions**
   - Listing details show room and property facts, but not household composition quality.
   - There is no roommate summary, average household trust score, compatibility preview against current occupants, or anonymized co-tenant traits.
   - Result: users can evaluate the apartment, but not the people, which is the core product promise.

3. **Trust verification is mostly a placeholder**
   - Mobile verification offers email, phone, ID, and lease actions, but phone/ID/lease are placeholder alerts.
   - Backend email verification does not persist a verified state to the user model or trust events.
   - Result: trust feels central in the UX but is not enforceable or auditable.

4. **Notifications are not implemented**
   - The notification service is a stub for both push and email.
   - Result: interest submissions, chore reminders, expense dues, and service updates rely on users reopening the app manually.

### Major implementation gaps

1. **Listing creation underuses the schema**
   - The listing schema supports `available_spots`, `current_occupants`, `amenities`, `house_rules`, `available_until`, `lease_duration`, `nearby_universities`, `utilities_included`, and more.
   - The create listing screen captures only a subset.

2. **Search and discovery are shallow**
   - Home search supports only city, while backend search supports more filters.
   - Filter button has no behavior.
   - Map mode is explicitly “coming soon.”

3. **Community interaction is shallow**
   - UI shows Reply and Share actions, but they do nothing.
   - Backend supports only post creation and blind upvote increments.
   - No comments, no moderation, no report/block, no duplicate-vote protection.

4. **Services is a directory, not a booking flow**
   - Users can browse providers and leave reviews.
   - No booking, slot selection, quote request, reschedule, cancellation, chat, ETA, or issue resolution.

5. **Matching lifecycle is incomplete**
   - Users can express interest and see recommendations.
   - There is no inbox for received listing interest, no accept/reject UI, no move to mutual connection workflow, no chat, no visit scheduling, no saved leads pipeline.

6. **Household operations are basic compared to mature roommate tools**
   - Urban-Hut has expenses and chores basics, but lacks approval workflows, exports, task history, richer fairness/performance diagnostics, and nudges/reminders.

### Quality and architecture issues

1. **Placeholder-heavy UX creates false completeness**
   - Multiple screens show actions that imply production support but only present alerts.

2. **N+1-style data assembly exists in places**
   - Community posts and recommendations resolve related records in loops instead of returning richer joined responses.

3. **No owner/admin operational dashboards**
   - Hosts and household admins lack management views.

4. **No visible analytics loop**
   - There is no sign of saved searches, search history, listing performance, funnel conversion, or provider performance analytics.

---

## 4. Incomplete End-to-End Flows

### A. Post a listing -> manage responses

What exists:

- Create listing
- Browse listing
- Express interest
- Backend received-interest endpoint

What is missing:

- My listings page
- Listing analytics and view counts UI
- Received-interest inbox
- Accept/reject/archive pipeline
- Mutual match confirmation
- Chat or secure contact reveal
- Visit scheduling / next-step orchestration

### B. Search for a room -> evaluate roommates -> take action

What exists:

- Search by city
- Listing detail
- Compatibility score in recommendations

What is missing:

- Full filters
- Map experience
- Saved searches and alerts
- Co-tenant summaries on listing details
- Average household trust score
- Individual anonymized roommate snapshots
- Compare listings
- Shortlist / save listing

### C. Match -> conversation -> conversion

What exists:

- Interest submission
- Mutual connection concept in backend

What is missing:

- Received interests UI
- Mutual match UI
- Messaging
- Safety controls
- Meeting/tour scheduling
- Status transitions such as interested, shortlisted, mutually interested, touring, approved, closed

### D. Community

What exists:

- Feed
- Create post
- Upvote

What is missing:

- Replies/comments
- Share workflow
- Post detail view
- Moderation/reporting
- Bookmark/follow topics
- Neighborhood event attendance or utility

### E. Trust and verification

What exists:

- Trust engine scaffold
- Trust score UI
- Vouch API
- Email verification screen

What is missing:

- Persistent verification state
- Phone verification
- ID verification
- Lease/rental-history verification
- Background checks / screening equivalents
- Trust event transparency for users
- Trust score usage in listing and matching decisions

### F. Household operations

What exists:

- Household create/join
- Expenses, balances, splits
- Chore tasks, rules, schedule, points

What is missing:

- Invite links and richer invite management
- Constraint approval / roommate consensus
- Chore completion history
- Export to calendar or CSV
- Performance dashboards
- Notifications and reminders
- Expense attachments, receipts, settlements history, dispute flows

### G. Services

What exists:

- Provider discovery
- Provider detail
- Review submission

What is missing:

- Book service
- Select slot
- Live provider assignment
- Chat with provider
- Reschedule/cancel
- Service package flows
- Support/escalation flows
- Repeat booking / favorites

---

## 5. Market Analysis

This section uses official product pages reviewed on April 15, 2026.

### Splitwise

Official source:

- [Splitwise homepage](https://www.splitwise.com/)

Visible capabilities from official product messaging:

- shared expenses for housemates, trips, friends, and family
- balances and settle-up workflows
- equal, unequal, percentage, and share-based splitting
- recurring expenses
- debt simplification
- categories and spending totals
- receipt scanning, itemization, charts/graphs, transaction import, search, defaults, currencies, and payment integrations under broader feature set/pro tier

What Urban-Hut has relative to Splitwise:

- basic household expenses and balances
- custom exact/equal split
- settle flow

What Urban-Hut is missing:

- recurring bills and reminders
- receipts and attachments
- itemized expenses
- expense search/filter/history
- debt simplification visualization
- export and reports
- richer settlement methods and integrations
- stronger audit trail for household finance trust

### Zillow

Official sources:

- [Zillow Rental Manager](https://www.zillow.com/rental-manager/)
- [Apply for Rentals](https://www.zillow.com/rent/apply-for-rentals/)

Visible capabilities from official product messaging:

- listing creation and distribution
- rental applications
- leases and e-signing
- online rent and fee collection
- renter screening
- tour management
- pricing tools
- vacancy/funnel management

What Urban-Hut has relative to Zillow:

- listing posting
- search and detail view
- compatibility angle Zillow does not emphasize

What Urban-Hut is missing:

- owner dashboard for listing lifecycle
- applications/responses management
- screening pipeline
- tours/visit scheduling
- pricing recommendations
- listing performance analytics
- leasing and post-match workflow
- saved search and alerts sophistication

### Urban Company (India)

Official sources:

- [Urban Company service page example](https://www.urbancompany.com/bangalore-ac-service-repair-7th-block-koramangala)
- [Urban Company app accessibility update](https://www.urbancompany.com/blog/urban-company-latest-app-update-for-disable-people)

Visible capabilities from official product messaging:

- time-slot based booking
- secure transactions
- automatic professional assignment
- in-app chat with the assigned professional
- reschedule/cancel support
- repeat booking / rebook the same professional
- help center support
- accessible app improvements

What Urban-Hut has relative to Urban Company:

- local provider discovery
- provider rating/review

What Urban-Hut is missing:

- actual booking workflow
- assignment and dispatch logic
- appointment lifecycle
- service packages/subscriptions
- issue handling and support
- repeat booking and favorites
- real transactional trust for service completion

### Synthesis: where Urban-Hut is lagging most

Urban-Hut is not weak on ideas. It is lagging on **operational depth**:

1. workflow completion
2. owner/admin tooling
3. trust enforcement
4. reminders/notifications
5. service transaction flows
6. search and conversion tooling

---

## 6. Chores Reference Project Learnings

Reference reviewed: `/Users/rohithvengala/Desktop/Chores/ChoreScheduler`

Notable capabilities present there but missing or underdeveloped in Urban-Hut:

- constraint approval panel
- export panel for CSV and calendar
- invite panel
- task log / completion history
- performance dashboard
- richer schedule editing and manual override
- richer fairness visualization
- default task templates

What Urban-Hut should borrow first:

1. chore completion history and admin review
2. calendar export for chores
3. invite management improvements
4. fairness/performance dashboards
5. controlled approval workflow for constraints and schedule edits

---

## 7. Scope of Improvements

### Phase 1: Must fix for product credibility

- My listings dashboard
- Received-interest inbox
- accept/reject/mutual workflow
- roommate trust summary on listings
- complete verification persistence
- notifications for core events
- search filters + functional map/list parity

### Phase 2: Must fix for retention

- recurring expenses, receipts, history
- chore logs, reminders, exports
- community replies and moderation
- provider booking flow
- shortlist/saved listings and alerts

### Phase 3: Must fix for differentiation

- household trust aggregation and roommate-fit summaries
- guided move-in journey
- service-provider trust overlays
- richer host analytics and supply-quality metrics
- neighborhood intelligence and community utility

---

## 8. Prioritized User Stories for Development

### Epic A: Listing owner tools

1. **As a host, I want a “My Listings” dashboard so that I can see all active, draft, paused, and closed listings in one place.**
2. **As a host, I want to view incoming interests for each listing so that I can review potential roommates without leaving the app.**
3. **As a host, I want to accept, reject, short-list, and archive incoming interests so that I can manage my funnel.**
4. **As a host, I want listing-level analytics such as views, interest count, and conversion rate so that I can improve my listing.**
5. **As a host, I want to edit occupancy, available spots, rules, amenities, and lease details after posting so that my listing stays accurate.**

### Epic B: Roommate evaluation

6. **As a seeker, I want to see anonymized roommate summaries on a listing so that I can evaluate the social fit before expressing interest.**
7. **As a seeker, I want to see household trust averages and individual roommate trust bands so that I can assess reliability without revealing private identities too early.**
8. **As a seeker, I want to see compatibility against the host and current household so that I understand whether the living situation fits me.**
9. **As a seeker, I want to save listings and compare them later so that I can make a better decision.**
10. **As a seeker, I want alerts for new listings that match my saved criteria so that I do not miss good opportunities.**

### Epic C: Matching lifecycle

11. **As a user, I want a received-interests inbox so that I can act on people who are interested in me or my listings.**
12. **As a user, I want mutual matches to move into a dedicated conversation state so that promising leads are easy to identify.**
13. **As a matched user, I want secure in-app chat so that I can coordinate safely before sharing personal contact information.**
14. **As a matched user, I want to schedule tours or calls so that I can move from browsing to decision-making.**
15. **As a user, I want status labels such as interested, shortlisted, mutual, touring, approved, and closed so that every conversation has a clear state.**

### Epic D: Listing quality

16. **As a host, I want to enter amenities, house rules, move-in constraints, nearby universities, utility settings, and lease duration during listing creation so that my listing is complete and trustworthy.**
17. **As a host, I want to specify available spots and current occupants so that seekers understand the household structure.**
18. **As a host, I want to describe roommate preferences and current household lifestyle norms so that I attract compatible applicants.**
19. **As a seeker, I want richer search filters for price, room type, property type, availability, utilities, and lifestyle factors so that I can narrow results quickly.**
20. **As a seeker, I want a functional map search so that I can evaluate commute and neighborhood tradeoffs visually.**

### Epic E: Trust and verification

21. **As a user, I want verification status to persist on my profile and trust score so that completed verification actions are meaningful.**
22. **As a user, I want phone verification by OTP so that I can prove account authenticity.**
23. **As a user, I want government ID verification so that I can build confidence with future roommates and hosts.**
24. **As a user, I want lease or rental-history verification so that I can substantiate my housing track record.**
25. **As a user, I want to understand why my trust score changed so that the system feels fair and actionable.**
26. **As a seeker, I want listing and profile trust data to affect ranking and safety indicators so that trust has practical value in the product.**

### Epic F: Household finance

27. **As a household member, I want recurring bills for rent, internet, and utilities so that I do not recreate the same expense every month.**
28. **As a household member, I want receipt upload and itemized expenses so that shared spending is transparent.**
29. **As a household member, I want searchable expense history and settlement records so that disputes are easier to resolve.**
30. **As a household member, I want reminders for unpaid balances so that shared finances do not drift.**
31. **As a household admin, I want downloadable finance summaries so that we can reconcile monthly household costs.**

### Epic G: Household chores

32. **As a household member, I want a chore completion log so that work done is visible over time.**
33. **As a household admin, I want reminders for pending chores so that schedule adherence improves without manual follow-up.**
34. **As a household admin, I want to export chores to calendar formats so that roommates can see tasks in their personal calendars.**
35. **As a household member, I want a fairness dashboard with weekly and historical trends so that schedule quality is transparent.**
36. **As a household admin, I want to approve or reject sensitive constraints so that one person cannot quietly bias the schedule.**

### Epic H: Community

37. **As a community member, I want replies/comments on posts so that discussions can continue beyond a single post.**
38. **As a community member, I want per-user vote protection so that upvotes are credible.**
39. **As a community member, I want to share or bookmark useful posts so that neighborhood knowledge compounds over time.**
40. **As a moderator or user, I want report/block tools so that community quality stays high.**

### Epic I: Services marketplace

41. **As a user, I want to book a provider for a date and time so that the services directory becomes actionable.**
42. **As a user, I want to reschedule or cancel service bookings so that plans are flexible.**
43. **As a user, I want in-app messaging with the assigned provider so that I can clarify access, timing, and scope.**
44. **As a user, I want service package and repeat-booking options so that common household needs are easier to handle.**
45. **As a household admin, I want booking history and provider performance records so that we can reuse trusted professionals.**

### Epic J: Notifications and lifecycle orchestration

46. **As a user, I want push and email notifications for match events, listing responses, chores, expenses, and service updates so that I do not need to poll the app.**
47. **As a host, I want immediate alerts for new listing interest so that I can respond while intent is warm.**
48. **As a household member, I want due-date nudges for bills and chores so that household operations stay healthy.**

---

## 9. Recommended Roadmap Order

### Sprint block 1

- My Listings
- Received Interests
- Accept/Reject flow
- Roommate trust summary on listing detail
- Verification persistence

### Sprint block 2

- Search filters
- Saved listings and alerts
- Community replies
- Notifications foundation

### Sprint block 3

- Recurring expenses
- Chore logs and exports
- Services booking MVP

### Sprint block 4

- Messaging and scheduling
- Analytics dashboards
- Advanced trust workflows

---

## 10. Closing Recommendation

Urban-Hut should position itself as:

**“The trusted operating system for finding roommates and running the shared home.”**

To support that positioning, the team should prioritize:

1. complete listing-response workflow
2. trust-rich roommate evaluation
3. operational household tools with reminders and logs
4. transactional services flow beyond static discovery

If these are implemented well, Urban-Hut will stop looking like multiple interesting demos and start behaving like a coherent product system.

---

## 11. External Market References

- Splitwise: [https://www.splitwise.com/](https://www.splitwise.com/)
- Zillow Rental Manager: [https://www.zillow.com/rental-manager/](https://www.zillow.com/rental-manager/)
- Zillow Apply for Rentals: [https://www.zillow.com/rent/apply-for-rentals/](https://www.zillow.com/rent/apply-for-rentals/)
- Urban Company service flow example: [https://www.urbancompany.com/bangalore-ac-service-repair-7th-block-koramangala](https://www.urbancompany.com/bangalore-ac-service-repair-7th-block-koramangala)
- Urban Company accessibility/app update: [https://www.urbancompany.com/blog/urban-company-latest-app-update-for-disable-people](https://www.urbancompany.com/blog/urban-company-latest-app-update-for-disable-people)
