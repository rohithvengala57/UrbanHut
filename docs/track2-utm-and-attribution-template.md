# URB-49 UTM and Attribution Template

Prepared: April 27, 2026  
Owner: CMO

Use this template to standardize tracking links for Week 1 and to map campaign metadata into the launch tracker.

## 1. Naming Conventions

- `utm_source`: `instagram` | `tiktok` | `reddit` | `whatsapp` | `discord` | `linkedin` | `referral`
- `utm_medium`: `paid` | `organic` | `community` | `creator` | `referral`
- `utm_campaign`: `urbhut_launch_w1_<city>_<theme>`
- `utm_content`: Creative variant ID, e.g. `v1_hook_trust` or `v2_hook_speed`
- `utm_term`: Optional audience segment, e.g. `students`, `young_professionals`

## 2. Link Build Table

| City | Source | Medium | Campaign | Content | Term | Landing URL | Final URL |
| --- | --- | --- | --- | --- | --- | --- | --- |
| jersey_city | instagram | paid | `urbhut_launch_w1_jc_trust` | `v1_hook_trust` | `students` | `/signup?city=jersey-city` | `https://urbanhut.app/signup?city=jersey-city&utm_source=instagram&utm_medium=paid&utm_campaign=urbhut_launch_w1_jc_trust&utm_content=v1_hook_trust&utm_term=students` |
| jersey_city | tiktok | paid | `urbhut_launch_w1_jc_speed` | `v1_hook_speed` | `young_professionals` | `/signup?city=jersey-city` | fill before publish |
| manhattan | instagram | paid | `urbhut_launch_w1_manhattan_fit` | `v1_hook_fit` | `young_professionals` | `/signup?city=manhattan` | fill before publish |
| manhattan | reddit | community | `urbhut_launch_w1_manhattan_cost` | `v1_hook_cost` | `budget_shared_living` | `/signup?city=manhattan` | fill before publish |

## 3. Attribution Capture Requirements

- Persist first-touch UTM fields on first app open/session.
- Preserve last-touch UTM fields at signup completion.
- Attach both first-touch and last-touch values to:
  - `signup_completed`
  - first activation event (`listing_created`, `interest_sent`, or `chat_message_sent`)
- Mirror campaign/city dimensions into daily reporting.

## 4. Pre-Publish QA Checklist

- Final URL resolves and loads in under 3 seconds on mobile.
- UTM keys are lowercase and underscore-delimited.
- Campaign ID matches content calendar row exactly.
- Final URL is recorded in the launch operations tracker notes.
