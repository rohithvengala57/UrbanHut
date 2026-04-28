# UrbanHut Marketing Hand-off Document

This document contains the layouts, assets, and design specifications for the CMO hand-off, as requested in [URB-50](/URB/issues/URB-50).

## 1. Landing Page UI Specifications

### Hero Section
- **Background**: Full-bleed gradient (`#0ea5e9` to `#10b981`).
- **Headline**: "Live Better, Together." (Font: Inter Bold, 48px/64px).
- **Subheadline**: "The all-in-one platform to find compatible roommates, manage shared expenses, and coordinate home life." (Font: Inter Regular, 18px).
- **CTA Buttons**: [Download on App Store] [Get it on Google Play] (Radius: 16px).

### Social Proof Section
- **Headline**: "Join 10,000+ roommates finding their perfect match."
- **Trust Badges**: Row of icons representing:
  - ★★★★★ App Store Rating
  - Verified Users Badge
  - Secure Payments Shield

### How it Works Section (3-step)
1. **Create your profile**: 30 seconds to set your vibe.
2. **Browse matches**: AI-powered compatibility scoring.
3. **Move in confidently**: Use built-in tools to manage your new home.

### Feature Spotlights
- **Compatibility Scoring**: Animated progress ring (Primary Green `#10b981`) showing a percentage match.
- **Shared Expenses**: Screenshot showing "Rent Split" and "Utility Tracker" with balanced ledgers.
- **Community**: Screenshot showing "Roommate Wanted" and "Neighborhood Tips" posts with upvotes.

---

## 2. Testimonials (High-Conversion Social Proof)

Each card should include an avatar, name, city, and a short quote.

| Name | City | Quote |
|------|------|-------|
| Sarah J. | Jersey City | "Found my current roommate in 3 days. The trust score made me feel so much safer." |
| Mark T. | Manhattan | "Split expenses finally stopped being a monthly argument. UrbanHut is a lifesaver." |
| Elena R. | Hoboken | "The lifestyle matching is scarily accurate. We actually both love quiet mornings!" |

---

## 3. Footer CTA

- **Headline**: "Ready to find your perfect roommate?"
- **Subheadline**: "Join thousands of verified users in Jersey City and New York."
- **Button**: [Get Started Free] (Primary Gradient Button)

---

## 4. Onboarding Wizard (Post-Signup Flow)

The new 5-step onboarding wizard is implemented in the mobile app to maximize user conversion and data collection for the matching engine.

| Step | Title | Purpose |
|------|-------|---------|
| 1 | Welcome | Value proposition and friendly greeting. |
| 2 | Intent | Categorizes user into (Find room / List space / Manage house). |
| 3 | Lifestyle | Collects matching data (Sleep, Pets, Cleanliness, Work). |
| 4 | Location | Sets primary discovery area and requests location permissions. |
| 5 | Ready! | Animated success state and entry to the main feed. |

---

## 5. Design Tokens (Single Source of Truth)

All assets should follow these consolidated tokens from `theme.ts`:

### Colors
- **Primary**: `#0ea5e9`
- **Accent**: `#10b981`
- **Surface**: `#ffffff`
- **Background**: `#f8fafc`
- **Typography**: `#0f172a` (Primary), `#64748b` (Secondary)

### Shadows
- **Elevated**: `0 4px 16px rgba(15, 23, 42, 0.08)`
- **Card**: `0 2px 8px rgba(15, 23, 42, 0.06)`

---

## 6. Web Component Snippets (CSS/HTML)

### Primary Gradient Button
```html
<button class="uh-btn-primary">Get Started</button>

<style>
.uh-btn-primary {
  background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 14px 0 rgba(14, 165, 233, 0.39);
  transition: all 0.2s ease;
}
.uh-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.23);
}
</style>
```

### Feature Card
```html
<div class="uh-card">
  <h3>Smart Matching</h3>
  <p>Our engine finds people who share your values and lifestyle.</p>
</div>

<style>
.uh-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
}
</style>
```
