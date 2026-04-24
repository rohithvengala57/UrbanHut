# Urban Hut Architecture Diagram

This diagram is intentionally stored as editable Mermaid text.

You can edit it in:

- this Markdown file directly
- Mermaid Live Editor
- GitHub / GitLab Mermaid previews
- IDEs with Mermaid support

## System Architecture

```mermaid
flowchart LR
    U[Users]

    subgraph Mobile["Mobile App (Expo / React Native)"]
        NAV[Expo Router Navigation]
        UI[Screen Layer\nHome, Listings, Matches, Household,\nCommunity, Services, Profile]
        RQ[React Query\nServer State + Cache]
        ZS[Zustand Stores\nAuth + UI Filters]
        AX[Axios API Client\nJWT Attach + Refresh Retry]
        MAP[Map Layer\nreact-native-maps / react-leaflet]
    end

    subgraph API["Backend API (FastAPI)"]
        MW[Middleware\nLogging, App Version,\nRate Limit, Auth]
        RT[Route Layer\nAuth, Users, Listings, Matching,\nChat, Households, Expenses,\nChores, Community, Saved,\nServices, Trust, Verifications]
        SC[Pydantic Schemas\nValidation + Response Models]
        SV[Domain Services\nMatching Engine,\nTrust Engine,\nChore Scheduler,\nNotification Service]
        UT[Utilities\nS3 Media Pipeline,\nSanitization,\nSecurity,\nGeocoding]
        SCH[APScheduler Jobs\nWeekly Trust Recalc]
    end

    subgraph Data["Data and Storage"]
        PG[(PostgreSQL + PostGIS)]
        RD[(Redis)]
        S3[(AWS S3)]
    end

    subgraph External["External Integrations"]
        NOM[Nominatim / OpenStreetMap\nAddress Geocoding]
        RES[Resend Email\nPlanned / Partial]
        EXPO[Expo Push\nPlanned]
    end

    U --> UI
    UI --> NAV
    UI --> RQ
    UI --> ZS
    UI --> MAP
    RQ --> AX
    ZS --> AX
    AX --> MW

    MW --> RT
    RT --> SC
    RT --> SV
    RT --> UT
    SCH --> SV

    RT --> PG
    SV --> PG
    MW --> RD
    RT --> S3
    UT --> S3

    UT --> NOM
    SV -. planned .-> RES
    SV -. planned .-> EXPO

    classDef mobile fill:#e0f2fe,stroke:#0284c7,color:#0f172a
    classDef api fill:#dcfce7,stroke:#16a34a,color:#0f172a
    classDef data fill:#fef3c7,stroke:#d97706,color:#0f172a
    classDef ext fill:#f3e8ff,stroke:#9333ea,color:#0f172a

    class NAV,UI,RQ,ZS,AX,MAP mobile
    class MW,RT,SC,SV,UT,SCH api
    class PG,RD,S3 data
    class NOM,RES,EXPO ext
```

## Reading Notes

- The mobile app is built around Expo Router for navigation, React Query for remote data, Zustand for lightweight local state, and Axios for authenticated API calls.
- The FastAPI backend is organized by route modules and backed by Pydantic schemas, SQLAlchemy models, and domain services.
- PostgreSQL is the source of truth, Redis supports rate limiting, and S3 is used for image/document storage.
- Geocoding currently uses OpenStreetMap Nominatim.
- Notification integrations are architected but still partial compared with the rest of the system.

## Suggested Future Diagram Splits

If you want more detailed editable diagrams later, the next best breakdown is:

1. Auth and session lifecycle
2. Listing and matching lifecycle
3. Household, expenses, and chores domain
4. Trust and verification engine
5. Media upload and storage pipeline
