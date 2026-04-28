# URB-49 Track 2: Marketing Strategy and Execution

Prepared: April 27, 2026  
Owner: CMO

## 1. Objective

Acquire the first 100 active households on Urban Hut by building a measurable acquisition funnel across social, community, and SEO, then running weekly experiments that improve conversion and retention.

Active household definition (launch metric):

- At least 1 verified member
- At least 1 meaningful action in last 14 days (`listing_published`, `interest_sent`, `chat_message_sent`, `expense_created`, or `chore_completed`)

## 2. Growth Model

North Star for Track 2:

- `Active Households (14d)`

Primary funnel:

1. Visitor lands on app/web content
2. Visitor signs up
3. User completes profile + trust baseline
4. User triggers marketplace intent (`listing_created` or `interest_sent`)
5. User reaches activation (`chat_message_sent` or `mutual_match_created`)
6. Household becomes active (definition above)

Launch targets (first 6 weeks):

- 2,500 unique visitors
- 450 signups (18% visitor->signup)
- 270 activated users (60% signup->activation)
- 100 active households

## 3. Channel Strategy

### 3.1 Social (top-of-funnel demand)

Channels:

- Instagram Reels + TikTok short videos (roommate pain points, trust/safety hooks)
- Reddit posts in city-specific housing/roommate communities
- LinkedIn founder storytelling for credibility and referral spillover

Cadence:

- 5 short-form videos/week
- 3 community posts/week
- 1 case-study post/week

CTA pattern:

- "Find a compatible roommate in minutes" -> city landing page -> app signup

### 3.2 Community (high-intent acquisition)

Plays:

- Campus ambassador pilot in 2 universities
- Local co-living/host referrals with onboarding bonus
- Partner WhatsApp/Discord housing groups

Offer:

- Limited launch referral: both inviter and invitee receive a trust-boost badge and premium profile highlight for 30 days

### 3.3 SEO (compounding demand)

Content clusters:

- "Best neighborhoods for roommates in <city>"
- "Roommate agreement templates"
- "How to screen roommates safely"
- "Move-in checklists and shared-home budgeting guides"

Execution:

- 2 SEO pages/week
- 1 programmatic city page template with local rent + commute context
- Internal links from educational content to conversion pages

## 4. Analytics and Tracking Setup

## 4.1 Event Taxonomy (must instrument first)

Acquisition:

- `landing_page_viewed` (source, medium, campaign, city)
- `signup_started`
- `signup_completed`

Activation:

- `profile_completed`
- `verification_started`
- `verification_submitted`
- `listing_created`
- `listing_published`
- `interest_sent`
- `mutual_match_created`
- `chat_room_created`
- `chat_message_sent`

Household value:

- `household_created`
- `household_member_joined`
- `expense_created`
- `chore_completed`

Conversion attribution:

- Persist first-touch and last-touch UTM values through signup and first activation event

## 4.2 Dashboard Requirements

Daily dashboard slices:

- Funnel conversion by channel (`Visitor -> Signup -> Activation -> Active Household`)
- CAC by paid/organic/community source
- Activation time-to-value (median hours from signup to first activation event)
- Week-1 retention by signup cohort
- City-level performance

## 4.3 Launch Guardrails

- Cost per activated user: target <= $18
- Signup fraud/low-intent threshold: < 8% disposable/duplicate patterns
- 7-day activation rate: target >= 45%

## 5. Execution Plan (6 Weeks)

Week 1:

- Finalize event instrumentation + dashboard
- Create social content bank (15 short videos)
- Publish first 2 city landing pages

Week 2:

- Launch social cadence + UTM discipline
- Start ambassador pilot outreach
- Run first referral test (A/B offer framing)

Week 3:

- Launch community partnerships in 2 local hubs
- Publish 2 additional SEO guides
- Optimize signup flow friction points from analytics

Week 4:

- Double down on top-performing channel mix
- Launch re-engagement nudges for incomplete activations
- Add creator collaboration in best-performing city

Week 5:

- Scale referral and ambassador cohorts
- Publish "roommate safety" flagship guide and city variants
- Improve activation with in-app onboarding checklist prompts

Week 6:

- Run conversion sprint to close gap to 100 active households
- Consolidate learnings into channel playbook
- Recommend post-launch budget allocation by CAC and retention quality

## 6. Community Engagement Program

Program structure:

- "Urban Hut Founding Households" cohort
- Private community channel for early users
- Weekly office hours (safety, matching best practices, move-in prep)
- User-generated stories featured across social + product testimonials

Engagement metrics:

- Invite acceptance rate
- Referral conversion rate
- Community post/reply participation
- NPS from first 30 active households

## 7. Ownership and Cadence

Weekly operating rhythm:

- Monday: channel metrics review + experiment selection
- Wednesday: creative + content production checkpoint
- Friday: funnel and retention readout with CEO

Single source of truth:

- This file defines Track 2 execution decisions
- Metrics snapshots and experiment outcomes should be appended weekly in issue comments and linked to this strategy

## 8. Immediate Next Actions

1. Engineering: instrument the required event taxonomy and attribution fields in mobile + backend telemetry.
2. Product/Design: ship onboarding checklist and referral entry points for activation uplift.
3. Marketing: launch week-1 content calendar and ambassador outreach list.
4. Leadership: **Approved** (see Section 9 for details).

## 9. Approved Launch Decisions (April 27, 2026)

**1. Budget Envelope (Track 2):**
- Total 6-week sprint budget: **$7,500**
- Targets: 270 activated users (target CAC <= $18) and 100 active households.
- Allocation guidance: Prioritize high-intent community channels and Reddit acquisition over broad social spend if CAC exceeds $20 in Week 2.

**2. City Priority:**
- **Primary:** Jersey City, NJ (Focus on downtown/PATH-accessible neighborhoods)
- **Secondary:** New York, NY (Focus on Manhattan/FiDi)
- Reasoning: Seed data and current marketplace listings show highest density in these hubs, maximizing match probability for the first 100 households.

**3. Guardrails:**
- CMO has authority to shift budget between social and community channels based on weekly ROAS.
- Any single influencer or partner spend > $1,500 requires additional approval.
