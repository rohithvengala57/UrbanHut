# Admin Dashboard Design System Extensions

This document defines the design system extensions for the UrbanHut Admin Dashboard, building upon the core design language established in the mobile application.

## 1. Color Palette

### 1.1 Core Colors (Inherited)
- **Primary (Blue):** `#0ea5e9` (Blue 500) - Primary actions, active states.
- **Accent (Emerald):** `#10b981` (Emerald 500) - Success, positive growth.
- **Background:** `#f8fafc` (Slate 50) - Page background.
- **Surface:** `#ffffff` - Card and sidebar backgrounds.
- **Slate (Text/Borders):** 
    - Text Main: `#0f172a` (Slate 900)
    - Text Secondary: `#64748b` (Slate 500)
    - Border/Divider: `#e2e8f0` (Slate 200)

### 1.2 Dashboard Specific Colors
- **Sidebar Background:** `#1e293b` (Slate 800) - Dark sidebar for contrast.
- **Sidebar Text (Inactive):** `#94a3b8` (Slate 400)
- **Sidebar Text (Active/Hover):** `#ffffff`
- **Sidebar Item Active Bg:** `#334155` (Slate 700)
- **Warning:** `#f59e0b` (Amber 500)
- **Danger:** `#ef4444` (Red 500)
- **Info:** `#3b82f6` (Blue 500)

### 1.3 Chart Colors
For data visualization, use a distinct palette to ensure clarity:
1. `#0ea5e9` (Primary Blue)
2. `#10b981` (Emerald)
3. `#f59e0b` (Amber)
4. `#8b5cf6` (Violet)
5. `#ec4899` (Pink)
6. `#f97316` (Orange)

## 2. Layout Constants

- **Sidebar Width:** 260px (expanded), 80px (collapsed)
- **Topbar Height:** 64px
- **Content Max-Width:** 1440px (centered or fluid)
- **Grid Gap:** 24px (standard spacing between widgets)
- **Card Border Radius:** 12px (matches mobile `radii.md`)

## 3. Typography

- **Dashboard Heading:** 24px, Semi-Bold (Slate 900)
- **Widget Title:** 16px, Semi-Bold (Slate 500)
- **Metric Value:** 32px, Bold (Slate 900)
- **Metric Label:** 14px, Regular (Slate 500)
- **Table Header:** 12px, Bold, Uppercase (Slate 400)

## 4. Components

### 4.1 Sidebar
- **Logo Area:** Branding at the top.
- **Navigation Links:** Icon + Label.
- **Section Headers:** Small, uppercase labels for grouping (e.g., "MARKETPLACE", "SYSTEM").
- **Collapse Toggle:** Button at the bottom to save screen real estate.

### 4.2 Metric KPI Cards
- **Structure:** Title (top left), Value (center left), Trend (bottom left), Icon (top right).
- **Trend Indicator:** Percentage change + Arrow (Green for up, Red for down - context dependent).

### 4.3 Data Tables
- **Header:** Sticky header with Slate 200 bottom border.
- **Rows:** Alternating subtle background or hover effect.
- **Actions:** Icon buttons (View, Edit, More).

### 4.4 Charts
- **Line Chart:** For trends (e.g., User growth).
- **Bar Chart:** For comparisons (e.g., Features usage, Trust distribution).
- **Pie/Donut:** For distributions (e.g., User roles, Filter usage).
- **Funnel Chart:** For conversion journeys (e.g., Onboarding, Marketplace).
- **Cohort Table:** For retention analysis with color-coded density.
- **Heatmap:** For activity peaks.
