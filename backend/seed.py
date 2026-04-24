"""
Seed script — comprehensive test data covering ALL Urban Hut features.
5 records per feature test case, multiple test cases per feature.

Usage:
    cd backend
    venv/bin/python seed.py

All test users have password: "password123"
"""

import asyncio
import secrets
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text

from app.database import async_session
from app.models.appointment import Appointment
from app.models.chat import ChatRoom, ChatMessage
from app.models.chore import ChoreAssignment, ChoreConstraint, ChoreTemplate
from app.models.community import CommunityPost, CommunityReply, PostUpvote
from app.models.expense import Expense, ExpenseSplit
from app.models.household import Household
from app.models.listing import Listing
from app.models.match import MatchInterest, Vouch
from app.models.saved_listing import SavedListing
from app.models.saved_search import SavedSearch
from app.models.service_provider import ServiceProvider, ServiceReview
from app.models.trust_score import TrustEvent, TrustSnapshot
from app.models.user import User
from app.models.verification import Verification
from app.utils.security import hash_password

PASSWORD_HASH = hash_password("password123")

# ── Fixed UUIDs (deterministic relationships) ────────────────────────────────
user_ids            = [uuid.uuid4() for _ in range(15)]
household_ids       = [uuid.uuid4() for _ in range(3)]
listing_ids         = [uuid.uuid4() for _ in range(16)]
chore_template_ids  = [uuid.uuid4() for _ in range(15)]   # 5 per household
provider_ids        = [uuid.uuid4() for _ in range(10)]
post_ids            = [uuid.uuid4() for _ in range(15)]
match_interest_ids  = [uuid.uuid4() for _ in range(25)]
chat_room_ids       = [uuid.uuid4() for _ in range(5)]

# Household member groups
hh0_members = [user_ids[0], user_ids[1], user_ids[2]]
hh1_members = [user_ids[3], user_ids[6], user_ids[13]]
hh2_members = [user_ids[8], user_ids[9], user_ids[11]]


def days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)

def days_future(n: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=n)

def date_ahead(n: int) -> date:
    return date.today() + timedelta(days=n)

def date_ago(n: int) -> date:
    return date.today() - timedelta(days=n)


# ════════════════════════════════════════════════════════════════════════════
# USERS  (15 total)
# ════════════════════════════════════════════════════════════════════════════

USERS = [
    # ── Household 0: Grove Street Crew (JC) ─────────────────────────────────
    User(id=user_ids[0], email="rohith@test.com", password_hash=PASSWORD_HASH,
         full_name="Rohith Vengala", phone="+12015551001",
         bio="Software engineer at Capital One. Looking for a clean, quiet place in JC.",
         gender="male", occupation="Software Engineer", diet_preference="vegetarian",
         smoking=False, drinking="social", pet_friendly=True,
         sleep_schedule="normal", noise_tolerance="moderate",
         guest_frequency="sometimes", cleanliness_level=4, work_schedule="wfh",
         current_city="Jersey City", current_state="NJ",
         looking_in=["Jersey City", "Hoboken", "New York"],
         budget_min=100000, budget_max=180000, move_in_date=date_ahead(30),
         role="member", household_id=household_ids[0], trust_score=72),

    User(id=user_ids[1], email="priya@test.com", password_hash=PASSWORD_HASH,
         full_name="Priya Sharma", phone="+12015551002",
         bio="Data scientist, early bird, love cooking Indian food.",
         gender="female", occupation="Data Scientist", diet_preference="vegetarian",
         smoking=False, drinking="never", pet_friendly=True,
         sleep_schedule="early_bird", noise_tolerance="quiet",
         guest_frequency="rarely", cleanliness_level=5, work_schedule="office_9to5",
         current_city="Jersey City", current_state="NJ",
         looking_in=["Jersey City", "Hoboken"],
         budget_min=90000, budget_max=160000, move_in_date=date_ahead(15),
         role="member", household_id=household_ids[0], trust_score=85),

    User(id=user_ids[2], email="alex@test.com", password_hash=PASSWORD_HASH,
         full_name="Alex Chen", phone="+12015551003",
         bio="Grad student at NYU. Night owl, gamer, clean freak.",
         gender="male", occupation="Graduate Student", diet_preference="non_vegetarian",
         smoking=False, drinking="social", pet_friendly=False,
         sleep_schedule="night_owl", noise_tolerance="moderate",
         guest_frequency="sometimes", cleanliness_level=4, work_schedule="student",
         current_city="New York", current_state="NY",
         looking_in=["New York", "Jersey City"],
         budget_min=80000, budget_max=150000, move_in_date=date_ahead(45),
         role="member", household_id=household_ids[0], trust_score=58),

    # ── Household 1: Hoboken Heights House ──────────────────────────────────
    User(id=user_ids[3], email="sarah@test.com", password_hash=PASSWORD_HASH,
         full_name="Sarah Miller", phone="+12015551004",
         bio="Nurse at Hackensack Hospital. Looking for a calm, pet-friendly household.",
         gender="female", occupation="Registered Nurse", diet_preference="non_vegetarian",
         smoking=False, drinking="social", pet_friendly=True,
         sleep_schedule="early_bird", noise_tolerance="quiet",
         guest_frequency="rarely", cleanliness_level=5, work_schedule="shift_work",
         current_city="Hoboken", current_state="NJ",
         looking_in=["Hoboken", "Jersey City"],
         budget_min=100000, budget_max=170000, move_in_date=date_ahead(20),
         role="host", household_id=household_ids[1], trust_score=91),

    User(id=user_ids[4], email="mike@test.com", password_hash=PASSWORD_HASH,
         full_name="Mike Johnson", phone="+12015551005",
         bio="Finance bro working in FiDi. Gym rat, social butterfly.",
         gender="male", occupation="Financial Analyst", diet_preference="non_vegetarian",
         smoking=False, drinking="regular", pet_friendly=True,
         sleep_schedule="normal", noise_tolerance="loud_ok",
         guest_frequency="often", cleanliness_level=3, work_schedule="office_9to5",
         current_city="New York", current_state="NY",
         looking_in=["New York", "Hoboken"],
         budget_min=150000, budget_max=250000,
         role="host", trust_score=45),

    User(id=user_ids[5], email="anita@test.com", password_hash=PASSWORD_HASH,
         full_name="Anita Patel", phone="+12015551006",
         bio="UX designer, remote worker. Love yoga, cooking, and quiet evenings.",
         gender="female", occupation="UX Designer", diet_preference="vegan",
         smoking=False, drinking="never", pet_friendly=True,
         sleep_schedule="early_bird", noise_tolerance="quiet",
         guest_frequency="rarely", cleanliness_level=5, work_schedule="wfh",
         current_city="Jersey City", current_state="NJ",
         looking_in=["Jersey City"],
         budget_min=100000, budget_max=160000,
         role="host", trust_score=68),

    User(id=user_ids[6], email="james@test.com", password_hash=PASSWORD_HASH,
         full_name="James Wilson", phone="+12015551007",
         bio="Teacher at PS 33. Easygoing, plays guitar on weekends.",
         gender="male", occupation="High School Teacher", diet_preference="non_vegetarian",
         smoking=False, drinking="social", pet_friendly=True,
         sleep_schedule="normal", noise_tolerance="moderate",
         guest_frequency="sometimes", cleanliness_level=3, work_schedule="office_9to5",
         current_city="Hoboken", current_state="NJ",
         looking_in=["Hoboken", "Jersey City", "New York"],
         budget_min=90000, budget_max=140000,
         role="member", household_id=household_ids[1], trust_score=52),

    User(id=user_ids[7], email="deepa@test.com", password_hash=PASSWORD_HASH,
         full_name="Deepa Krishnan", phone="+12015551008",
         bio="Product manager at Google. Recently moved to NYC.",
         gender="female", occupation="Product Manager", diet_preference="eggetarian",
         smoking=False, drinking="social", pet_friendly=True,
         sleep_schedule="normal", noise_tolerance="moderate",
         guest_frequency="sometimes", cleanliness_level=4, work_schedule="office_9to5",
         current_city="New York", current_state="NY",
         looking_in=["New York", "Jersey City", "Hoboken"],
         budget_min=120000, budget_max=200000,
         role="host", trust_score=77),

    # ── Household 2: Newport NYC Crew ────────────────────────────────────────
    User(id=user_ids[8], email="marcus@test.com", password_hash=PASSWORD_HASH,
         full_name="Marcus Johnson", phone="+12015551009",
         bio="Software architect at Amazon. Clean, quiet, professional.",
         gender="male", occupation="Software Architect", diet_preference="non_vegetarian",
         smoking=False, drinking="social", pet_friendly=False,
         sleep_schedule="normal", noise_tolerance="quiet",
         guest_frequency="rarely", cleanliness_level=5, work_schedule="hybrid",
         current_city="Jersey City", current_state="NJ",
         looking_in=["Jersey City", "Hoboken"],
         budget_min=140000, budget_max=220000, move_in_date=date_ahead(10),
         role="host", household_id=household_ids[2], trust_score=63),

    User(id=user_ids[9], email="emma@test.com", password_hash=PASSWORD_HASH,
         full_name="Emma Rodriguez", phone="+12015551010",
         bio="Graphic designer at a boutique studio. Love art, coffee, and my cat.",
         gender="female", occupation="Graphic Designer", diet_preference="vegetarian",
         smoking=False, drinking="social", pet_friendly=True,
         sleep_schedule="normal", noise_tolerance="moderate",
         guest_frequency="sometimes", cleanliness_level=4, work_schedule="hybrid",
         current_city="Jersey City", current_state="NJ",
         looking_in=["Jersey City", "Hoboken"],
         budget_min=90000, budget_max=150000, move_in_date=date_ahead(20),
         role="member", household_id=household_ids[2], trust_score=79),

    User(id=user_ids[10], email="david@test.com", password_hash=PASSWORD_HASH,
         full_name="David Kim", phone="+12015551011",
         bio="Recent college grad, starting at Goldman Sachs next month.",
         gender="male", occupation="Investment Banking Analyst", diet_preference="non_vegetarian",
         smoking=False, drinking="regular", pet_friendly=True,
         sleep_schedule="normal", noise_tolerance="loud_ok",
         guest_frequency="often", cleanliness_level=3, work_schedule="office_9to5",
         current_city="New York", current_state="NY",
         looking_in=["New York", "Jersey City", "Hoboken"],
         budget_min=120000, budget_max=200000, move_in_date=date_ahead(14),
         role="member", trust_score=44),

    User(id=user_ids[11], email="fatima@test.com", password_hash=PASSWORD_HASH,
         full_name="Fatima Al-Hassan", phone="+12015551012",
         bio="Medical resident at NYU Langone. Very busy but super clean and considerate.",
         gender="female", occupation="Medical Resident", diet_preference="halal",
         smoking=False, drinking="never", pet_friendly=False,
         sleep_schedule="early_bird", noise_tolerance="quiet",
         guest_frequency="rarely", cleanliness_level=5, work_schedule="shift_work",
         current_city="New York", current_state="NY",
         looking_in=["New York", "Jersey City"],
         budget_min=100000, budget_max=170000, move_in_date=date_ahead(7),
         role="member", household_id=household_ids[2], trust_score=81),

    User(id=user_ids[12], email="noah@test.com", password_hash=PASSWORD_HASH,
         full_name="Noah Patel", phone="+12015551013",
         bio="Frontend dev at a startup. Vegan, meditates daily, loves hiking.",
         gender="male", occupation="Frontend Developer", diet_preference="vegan",
         smoking=False, drinking="never", pet_friendly=True,
         sleep_schedule="early_bird", noise_tolerance="quiet",
         guest_frequency="rarely", cleanliness_level=5, work_schedule="wfh",
         current_city="Jersey City", current_state="NJ",
         looking_in=["Jersey City", "Hoboken"],
         budget_min=100000, budget_max=160000, move_in_date=date_ahead(30),
         role="member", trust_score=55),

    User(id=user_ids[13], email="isabella@test.com", password_hash=PASSWORD_HASH,
         full_name="Isabella Torres", phone="+12015551014",
         bio="Marketing manager at a JC startup. Outgoing, loves cooking and hosting dinners.",
         gender="female", occupation="Marketing Manager", diet_preference="non_vegetarian",
         smoking=False, drinking="social", pet_friendly=True,
         sleep_schedule="normal", noise_tolerance="moderate",
         guest_frequency="sometimes", cleanliness_level=4, work_schedule="hybrid",
         current_city="Hoboken", current_state="NJ",
         looking_in=["Hoboken", "Jersey City"],
         budget_min=110000, budget_max=175000, move_in_date=date_ahead(21),
         role="member", household_id=household_ids[1], trust_score=67),

    User(id=user_ids[14], email="ethan@test.com", password_hash=PASSWORD_HASH,
         full_name="Ethan Nakamura", phone="+12015551015",
         bio="Consultant at McKinsey. Travel often, very low-key when home.",
         gender="male", occupation="Management Consultant", diet_preference="non_vegetarian",
         smoking=False, drinking="social", pet_friendly=False,
         sleep_schedule="normal", noise_tolerance="moderate",
         guest_frequency="rarely", cleanliness_level=4, work_schedule="hybrid",
         current_city="New York", current_state="NY",
         looking_in=["New York", "Jersey City", "Hoboken"],
         budget_min=130000, budget_max=210000, move_in_date=date_ahead(45),
         role="member", trust_score=38),
]


# ════════════════════════════════════════════════════════════════════════════
# VERIFICATIONS
# All types × all statuses (5 pending, 5 rejected, rest verified)
# ════════════════════════════════════════════════════════════════════════════

VERIFICATIONS = []

# Email verified — all 15 users
for i, uid in enumerate(user_ids):
    VERIFICATIONS.append(Verification(
        user_id=uid, type="email", status="verified",
        verified_at=days_ago(60 - i), points_awarded=4,
    ))

# Phone verified — users 0-9 (10 verified)
for i in range(10):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="phone", status="verified",
        verified_at=days_ago(55 - i), points_awarded=4,
    ))

# Phone pending — users 10-14 (5 pending) ← TEST CASE: pending verification
for i in range(10, 15):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="phone", status="pending",
        submitted_at=days_ago(2), points_awarded=0,
    ))

# Photo ID verified — users 0-7 (8 verified)
for i in range(8):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="photo_id", status="verified",
        verified_at=days_ago(50 - i), points_awarded=5,
    ))

# Photo ID pending — users 8-9 (2 pending)
for i in range(8, 10):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="photo_id", status="pending",
        submitted_at=days_ago(3), points_awarded=0,
    ))

# Photo ID rejected — users 10-11 (2 rejected) ← TEST CASE: rejected verification
for i in range(10, 12):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="photo_id", status="rejected",
        submitted_at=days_ago(10), reviewed_at=days_ago(7),
        review_notes="Document unclear or expired. Please resubmit.",
        points_awarded=0,
    ))

# LinkedIn verified — users 0-4 (5 verified)
for i in range(5):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="linkedin", status="verified",
        verified_at=days_ago(45 - i), points_awarded=4,
    ))

# LinkedIn pending — users 5-6 (2 pending)
for i in range(5, 7):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="linkedin", status="pending",
        submitted_at=days_ago(1), points_awarded=0,
    ))

# LinkedIn rejected — users 14 (1 rejected) ← TEST CASE: rejected verification
VERIFICATIONS.append(Verification(
    user_id=user_ids[14], type="linkedin", status="rejected",
    submitted_at=days_ago(5), reviewed_at=days_ago(3),
    review_notes="Profile URL not accessible or profile is private.",
    points_awarded=0,
))

# Lease doc rejected — users 8-9 (2 more rejected) ← TEST CASE: rejected verification
for i in range(8, 10):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="lease_doc", status="rejected",
        submitted_at=days_ago(14), reviewed_at=days_ago(10),
        review_notes="Lease document does not match current address.",
        points_awarded=0,
    ))

# Pay stub verified — users 0-3 (4 verified)
for i in range(4):
    VERIFICATIONS.append(Verification(
        user_id=user_ids[i], type="pay_stub", status="verified",
        verified_at=days_ago(40 - i), points_awarded=3,
    ))


# ════════════════════════════════════════════════════════════════════════════
# LISTINGS  (16 total: 10 active, 2 paused, 2 draft, 2 closed)
# ════════════════════════════════════════════════════════════════════════════

LISTINGS = [
    # ── 10 Active listings ───────────────────────────────────────────────────
    Listing(
        id=listing_ids[0], host_id=user_ids[3],
        title="Sunny private room near Grove St PATH",
        description="Bright corner room in a 3BR/2BA apartment. 5 min walk to Grove Street PATH. Laundry in building, dishwasher, central AC.",
        property_type="apartment", room_type="private_room",
        address_line1="234 Grove St", city="Jersey City", state="NJ", zip_code="07302",
        latitude=40.7178, longitude=-74.0431,
        rent_monthly=145000, security_deposit=145000, utilities_included=False, utility_estimate=15000,
        total_bedrooms=3, total_bathrooms=2, available_spots=1, current_occupants=2,
        amenities=["ac", "laundry_in_building", "dishwasher", "elevator", "gym"],
        house_rules=["no_smoking", "quiet_after_10pm"],
        images=["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
        available_from=date_ahead(15), lease_duration="1_year",
        nearest_transit="Grove Street PATH", transit_walk_mins=5,
        nearby_universities=["NJCU", "Stevens Institute"],
        is_verified=True, verified_at=days_ago(10), status="active", view_count=87,
    ),
    Listing(
        id=listing_ids[1], host_id=user_ids[4],
        title="Modern 2BR in FiDi with skyline views",
        description="Luxury 2BR on the 28th floor with Manhattan skyline views. Doorman building, rooftop, gym, pool. Looking for a clean, working professional.",
        property_type="apartment", room_type="private_room",
        address_line1="99 Wall St", city="New York", state="NY", zip_code="10005",
        latitude=40.7074, longitude=-74.0113,
        rent_monthly=220000, security_deposit=220000, utilities_included=True,
        total_bedrooms=2, total_bathrooms=2, available_spots=1, current_occupants=1,
        amenities=["ac", "laundry_in_unit", "dishwasher", "gym", "pool", "doorman", "elevator", "furnished"],
        house_rules=["no_smoking", "no_pets"],
        images=["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"],
        available_from=date_ahead(5), lease_duration="1_year",
        nearest_transit="Wall Street 2/3", transit_walk_mins=2,
        is_verified=True, verified_at=days_ago(5), status="active", view_count=234,
    ),
    Listing(
        id=listing_ids[2], host_id=user_ids[5],
        title="Cozy room in Journal Square — great for students",
        description="Affordable private room in a 4BR house. 3 min walk to Journal Square PATH. Backyard, free parking.",
        property_type="house", room_type="private_room",
        address_line1="45 Summit Ave", city="Jersey City", state="NJ", zip_code="07306",
        latitude=40.7326, longitude=-74.0630,
        rent_monthly=95000, security_deposit=95000, utilities_included=False, utility_estimate=10000,
        total_bedrooms=4, total_bathrooms=2, available_spots=2, current_occupants=2,
        amenities=["parking", "laundry_in_unit", "backyard"],
        house_rules=["no_smoking"],
        images=["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"],
        available_from=date_ahead(7), lease_duration="6_months",
        nearest_transit="Journal Square PATH", transit_walk_mins=3,
        nearby_universities=["NJCU", "Saint Peter's University"],
        is_verified=True, verified_at=days_ago(8), status="active", view_count=156,
    ),
    Listing(
        id=listing_ids[3], host_id=user_ids[3],
        title="Hoboken 1BR brownstone — Washington St",
        description="Beautiful renovated 1BR in a classic Hoboken brownstone. Steps from Washington St. Hardwood floors, exposed brick.",
        property_type="townhouse", room_type="entire_place",
        address_line1="512 Washington St", city="Hoboken", state="NJ", zip_code="07030",
        latitude=40.7440, longitude=-74.0285,
        rent_monthly=195000, security_deposit=195000, utilities_included=False, utility_estimate=12000,
        total_bedrooms=1, total_bathrooms=1, available_spots=1, current_occupants=0,
        amenities=["laundry_in_building", "dishwasher", "hardwood_floors"],
        house_rules=["no_smoking", "no_pets"],
        images=["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"],
        available_from=date_ahead(30), lease_duration="1_year",
        nearest_transit="Hoboken PATH", transit_walk_mins=8,
        nearby_universities=["Stevens Institute"],
        status="active", view_count=63,
    ),
    Listing(
        id=listing_ids[4], host_id=user_ids[4],
        title="Shared room in Midtown — super cheap!",
        description="Shared room near Penn Station. Perfect for someone who's barely home. Furnished, all utilities included.",
        property_type="apartment", room_type="shared_room",
        address_line1="315 W 33rd St", city="New York", state="NY", zip_code="10001",
        latitude=40.7506, longitude=-73.9935,
        rent_monthly=75000, security_deposit=75000, utilities_included=True,
        total_bedrooms=3, total_bathrooms=1, available_spots=1, current_occupants=3,
        amenities=["furnished", "ac", "elevator"],
        house_rules=["no_smoking", "no_overnight_guests", "quiet_after_11pm"],
        images=["https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800"],
        available_from=date_ahead(3), lease_duration="month_to_month",
        nearest_transit="Penn Station", transit_walk_mins=3,
        status="active", view_count=312,
    ),
    Listing(
        id=listing_ids[5], host_id=user_ids[5],
        title="Vegetarian-friendly 3BR in JC Heights",
        description="Peaceful 3BR apartment in Jersey City Heights. Strictly vegetarian household. Beautiful NYC skyline views from the rooftop.",
        property_type="apartment", room_type="private_room",
        address_line1="178 Ogden Ave", city="Jersey City", state="NJ", zip_code="07307",
        latitude=40.7490, longitude=-74.0588,
        rent_monthly=110000, security_deposit=110000, utilities_included=False, utility_estimate=8000,
        total_bedrooms=3, total_bathrooms=1.5, available_spots=1, current_occupants=2,
        amenities=["ac", "laundry_in_building", "rooftop"],
        house_rules=["no_smoking", "vegetarian_kitchen", "quiet_after_10pm"],
        images=["https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800"],
        available_from=date_ahead(10), lease_duration="1_year",
        nearest_transit="Congress Street Light Rail", transit_walk_mins=6,
        is_verified=True, verified_at=days_ago(3), status="active", view_count=98,
    ),
    Listing(
        id=listing_ids[6], host_id=user_ids[7],
        title="Luxury room in Newport JC — waterfront",
        description="Private room in a luxury waterfront building. Floor-to-ceiling windows, in-unit laundry, gym, concierge. 2 min to Newport PATH.",
        property_type="condo", room_type="private_room",
        address_line1="1 River Ct", city="Jersey City", state="NJ", zip_code="07310",
        latitude=40.7267, longitude=-74.0340,
        rent_monthly=175000, security_deposit=175000, utilities_included=True,
        total_bedrooms=2, total_bathrooms=2, available_spots=1, current_occupants=1,
        amenities=["ac", "laundry_in_unit", "gym", "pool", "doorman", "elevator", "furnished"],
        house_rules=["no_smoking"],
        images=["https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800"],
        available_from=date_ahead(20), lease_duration="1_year",
        nearest_transit="Newport PATH", transit_walk_mins=2,
        is_verified=True, verified_at=days_ago(2), status="active", view_count=189,
    ),
    Listing(
        id=listing_ids[7], host_id=user_ids[6],
        title="Budget room in Union City, 10min to NYC",
        description="Affordable room in a 3BR apartment. Bus to Port Authority takes 10 minutes. Quiet neighborhood.",
        property_type="apartment", room_type="private_room",
        address_line1="620 Bergenline Ave", city="Union City", state="NJ", zip_code="07087",
        latitude=40.7697, longitude=-74.0255,
        rent_monthly=85000, security_deposit=85000, utilities_included=False, utility_estimate=7000,
        total_bedrooms=3, total_bathrooms=1, available_spots=1, current_occupants=2,
        amenities=["parking", "laundry_in_building"],
        house_rules=["no_smoking"],
        images=["https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800"],
        available_from=date_ahead(5), lease_duration="6_months",
        nearest_transit="Bergenline Ave Bus", transit_walk_mins=2,
        status="active", view_count=45,
    ),
    Listing(
        id=listing_ids[8], host_id=user_ids[3],
        title="Furnished room in downtown Hoboken",
        description="Move-in ready furnished room. Walking distance to Hoboken terminal, restaurants, and nightlife.",
        property_type="apartment", room_type="private_room",
        address_line1="88 Hudson St", city="Hoboken", state="NJ", zip_code="07030",
        latitude=40.7365, longitude=-74.0296,
        rent_monthly=165000, security_deposit=165000, utilities_included=True,
        total_bedrooms=2, total_bathrooms=1, available_spots=1, current_occupants=1,
        amenities=["furnished", "ac", "dishwasher", "laundry_in_building", "elevator"],
        house_rules=["no_smoking", "no_pets", "quiet_after_10pm"],
        images=["https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800"],
        available_from=date_ahead(10), lease_duration="1_year",
        nearest_transit="Hoboken Terminal PATH/NJT", transit_walk_mins=4,
        nearby_universities=["Stevens Institute"],
        is_verified=True, verified_at=days_ago(7), status="active", view_count=112,
    ),
    Listing(
        id=listing_ids[9], host_id=user_ids[5],
        title="Room in Exchange Place high-rise",
        description="Modern apartment near Exchange Place PATH. Amazing views, full amenities. Seeking a WFH professional.",
        property_type="apartment", room_type="private_room",
        address_line1="30 Hudson St", city="Jersey City", state="NJ", zip_code="07302",
        latitude=40.7162, longitude=-74.0340,
        rent_monthly=155000, security_deposit=155000, utilities_included=True,
        total_bedrooms=2, total_bathrooms=2, available_spots=1, current_occupants=1,
        amenities=["ac", "laundry_in_unit", "gym", "doorman", "elevator", "furnished"],
        house_rules=["no_smoking", "quiet_after_9pm"],
        images=["https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800"],
        available_from=date_ahead(25), lease_duration="1_year",
        nearest_transit="Exchange Place PATH", transit_walk_mins=3,
        is_verified=True, verified_at=days_ago(1), status="active", view_count=74,
    ),
    # ── 2 Paused listings ────────────────────────────────────────────────────
    Listing(
        id=listing_ids[10], host_id=user_ids[5],
        title="[PAUSED] Private room in JC Heights — coming back soon",
        description="Temporarily paused while host is away on vacation. Will be re-activated in 2 weeks.",
        property_type="apartment", room_type="private_room",
        address_line1="340 Palisade Ave", city="Jersey City", state="NJ", zip_code="07307",
        latitude=40.7512, longitude=-74.0521,
        rent_monthly=108000, security_deposit=108000, utilities_included=False,
        total_bedrooms=3, total_bathrooms=1, available_spots=1, current_occupants=2,
        amenities=["ac", "laundry_in_building"],
        house_rules=["no_smoking"],
        images=[],
        available_from=date_ahead(30), lease_duration="1_year",
        nearest_transit="Congress St Light Rail", transit_walk_mins=7,
        status="paused", view_count=23,
    ),
    Listing(
        id=listing_ids[11], host_id=user_ids[4],
        title="[PAUSED] NYC Upper West Side shared room",
        description="Paused while current tenant gives notice. Will reopen listings once confirmed.",
        property_type="apartment", room_type="shared_room",
        address_line1="411 W 82nd St", city="New York", state="NY", zip_code="10024",
        latitude=40.7851, longitude=-73.9798,
        rent_monthly=92000, security_deposit=92000, utilities_included=True,
        total_bedrooms=3, total_bathrooms=1, available_spots=1, current_occupants=2,
        amenities=["laundry_in_building", "elevator"],
        house_rules=["no_smoking", "quiet_after_11pm"],
        images=[],
        available_from=date_ahead(21), lease_duration="month_to_month",
        nearest_transit="1 Train 86th St", transit_walk_mins=4,
        status="paused", view_count=11,
    ),
    # ── 2 Draft listings ─────────────────────────────────────────────────────
    Listing(
        id=listing_ids[12], host_id=user_ids[8],
        title="[DRAFT] Luxury studio in JC waterfront",
        description="This listing is a draft. Finishing up photos and adding more details.",
        property_type="condo", room_type="entire_place",
        address_line1="100 Provost St", city="Jersey City", state="NJ", zip_code="07302",
        latitude=40.7178, longitude=-74.0350,
        rent_monthly=185000, security_deposit=185000, utilities_included=True,
        total_bedrooms=1, total_bathrooms=1, available_spots=1, current_occupants=0,
        amenities=["gym", "doorman", "pool"],
        house_rules=["no_smoking"],
        images=[],
        available_from=date_ahead(40), lease_duration="1_year",
        nearest_transit="Exchange Place PATH", transit_walk_mins=5,
        status="draft", view_count=0,
    ),
    Listing(
        id=listing_ids[13], host_id=user_ids[8],
        title="[DRAFT] Edgewater NJ private room — river views",
        description="Draft listing. Will publish after lease review.",
        property_type="apartment", room_type="private_room",
        address_line1="800 River Rd", city="Edgewater", state="NJ", zip_code="07020",
        latitude=40.8238, longitude=-73.9745,
        rent_monthly=160000, security_deposit=160000, utilities_included=False,
        total_bedrooms=2, total_bathrooms=2, available_spots=1, current_occupants=1,
        amenities=["ac", "laundry_in_unit", "gym", "pool"],
        house_rules=["no_smoking"],
        images=[],
        available_from=date_ahead(35), lease_duration="1_year",
        nearest_transit="Edgewater Ferry", transit_walk_mins=5,
        status="draft", view_count=0,
    ),
    # ── 2 Closed listings ────────────────────────────────────────────────────
    Listing(
        id=listing_ids[14], host_id=user_ids[3],
        title="[CLOSED] Downtown JC studio — filled",
        description="This listing is closed. The room has been filled.",
        property_type="apartment", room_type="entire_place",
        address_line1="55 Essex St", city="Jersey City", state="NJ", zip_code="07302",
        latitude=40.7184, longitude=-74.0432,
        rent_monthly=135000, security_deposit=135000, utilities_included=True,
        total_bedrooms=1, total_bathrooms=1, available_spots=0, current_occupants=1,
        amenities=["ac", "laundry_in_building"],
        house_rules=["no_smoking"],
        images=[],
        available_from=date_ago(30), lease_duration="1_year",
        status="closed", view_count=198,
    ),
    Listing(
        id=listing_ids[15], host_id=user_ids[7],
        title="[CLOSED] Newport JC 1BR — tenant found",
        description="Room has been rented. Closing this listing.",
        property_type="condo", room_type="entire_place",
        address_line1="22 Ave at Port Imperial", city="Jersey City", state="NJ", zip_code="07310",
        latitude=40.7270, longitude=-74.0340,
        rent_monthly=178000, security_deposit=178000, utilities_included=True,
        total_bedrooms=1, total_bathrooms=1, available_spots=0, current_occupants=1,
        amenities=["gym", "pool", "doorman", "elevator", "ac"],
        house_rules=["no_smoking"],
        images=[],
        available_from=date_ago(60), lease_duration="1_year",
        status="closed", view_count=143,
    ),
]


# ════════════════════════════════════════════════════════════════════════════
# HOUSEHOLDS  (3)
# ════════════════════════════════════════════════════════════════════════════

HOUSEHOLDS = [
    Household(
        id=household_ids[0], name="Grove Street Crew",
        listing_id=listing_ids[0], admin_id=user_ids[0],
        invite_code=secrets.token_urlsafe(8), max_members=4, status="active",
    ),
    Household(
        id=household_ids[1], name="Hoboken Heights House",
        listing_id=listing_ids[8], admin_id=user_ids[3],
        invite_code=secrets.token_urlsafe(8), max_members=4, status="active",
    ),
    Household(
        id=household_ids[2], name="Newport NYC Crew",
        listing_id=listing_ids[6], admin_id=user_ids[8],
        invite_code=secrets.token_urlsafe(8), max_members=4, status="active",
    ),
]


# ════════════════════════════════════════════════════════════════════════════
# EXPENSES + SPLITS  (10 per household = 30 total, 90 splits)
# ════════════════════════════════════════════════════════════════════════════

EXPENSES = []
EXPENSE_SPLITS = []

def build_expenses(hh_id, members, raw):
    """Build Expense + ExpenseSplit rows for a household."""
    for desc, amount, category, paid_by_idx, ago, settled in raw:
        paid_by = members[paid_by_idx]
        eid = uuid.uuid4()
        is_recurring = category in ("rent", "internet")
        EXPENSES.append(Expense(
            id=eid, household_id=hh_id, paid_by=paid_by,
            description=desc, amount=amount, category=category,
            split_type="equal", date=date_ago(ago),
            is_recurring=is_recurring,
            recurrence="monthly" if is_recurring else None,
            status="settled" if settled else "pending",
        ))
        per = amount // len(members)
        for uid in members:
            is_payer = uid == paid_by
            EXPENSE_SPLITS.append(ExpenseSplit(
                expense_id=eid, user_id=uid, amount_owed=per,
                status="paid" if (is_payer or settled) else "pending",
                paid_at=days_ago(ago) if (is_payer or settled) else None,
            ))

# (description, amount_cents, category, paid_by_member_index, days_ago, settled?)
build_expenses(household_ids[0], hh0_members, [
    ("Rent — April",          435000, "rent",      0, 30, True),
    ("Electricity bill",       18500, "utilities",  1, 25, True),
    ("Internet — Fios",         7999, "internet",   2, 22, True),
    ("Groceries — Trader Joe's",12450,"groceries",  0, 18, True),
    ("Cleaning supplies",       3200, "other",      1, 15, True),
    ("Rent — March",           435000,"rent",       0, 60, True),
    ("Gas bill",                9500, "utilities",  2, 55, True),
    ("Groceries — H-Mart",      8900, "groceries",  1, 45, True),
    ("New shower curtain",       2500,"other",      0,  8, False),
    ("Pizza night",              4500,"groceries",  2,  3, False),
])

build_expenses(household_ids[1], hh1_members, [
    ("Rent — April",           495000,"rent",       0, 28, True),
    ("PSE&G electric",          21000,"utilities",  1, 25, True),
    ("Optimum Internet",         5999,"internet",   2, 22, True),
    ("Whole Foods run",         16200,"groceries",  0, 14, True),
    ("Bathroom supplies",        4100,"other",      1, 12, True),
    ("Rent — March",           495000,"rent",       0, 58, True),
    ("Water bill",               3200,"utilities",  2, 50, True),
    ("Trader Joe's weekly",     11500,"groceries",  1, 42, True),
    ("Dining out — dinner",      8700,"other",      2,  5, False),
    ("Laundry detergent",        2200,"other",      0,  2, False),
])

build_expenses(household_ids[2], hh2_members, [
    ("Rent — April",           525000,"rent",       0, 28, True),
    ("Con Edison electric",     19500,"utilities",  1, 26, True),
    ("Spectrum Internet",        6499,"internet",   2, 23, True),
    ("Costco groceries",        22000,"groceries",  0, 20, True),
    ("Cleaning service",        12000,"other",      1, 18, True),
    ("Rent — March",           525000,"rent",       0, 58, True),
    ("Groceries — Whole Foods", 15000,"groceries",  2, 48, True),
    ("Gas for cooking",          1800,"utilities",  0, 40, True),
    ("Team dinner",              9500,"other",      1,  4, False),
    ("Paper towels / soap",      3100,"other",      2,  1, False),
])


# ════════════════════════════════════════════════════════════════════════════
# CHORE TEMPLATES  (5 per household = 15 total)
# ════════════════════════════════════════════════════════════════════════════

CHORE_TEMPLATES = [
    # Household 0 — Grove Street Crew
    ChoreTemplate(id=chore_template_ids[0],  household_id=household_ids[0], name="Kitchen cleanup",       weight=2.0, frequency=7, time_of_day="evening"),
    ChoreTemplate(id=chore_template_ids[1],  household_id=household_ids[0], name="Vacuum living room",    weight=1.5, frequency=3, time_of_day="anytime"),
    ChoreTemplate(id=chore_template_ids[2],  household_id=household_ids[0], name="Take out trash",        weight=1.0, frequency=3, time_of_day="evening"),
    ChoreTemplate(id=chore_template_ids[3],  household_id=household_ids[0], name="Clean bathroom",        weight=3.0, frequency=2, time_of_day="morning"),
    ChoreTemplate(id=chore_template_ids[4],  household_id=household_ids[0], name="Wipe counters",         weight=0.5, frequency=7, time_of_day="anytime"),
    # Household 1 — Hoboken Heights House
    ChoreTemplate(id=chore_template_ids[5],  household_id=household_ids[1], name="Kitchen cleanup",       weight=2.0, frequency=7, time_of_day="evening"),
    ChoreTemplate(id=chore_template_ids[6],  household_id=household_ids[1], name="Vacuum & mop floors",   weight=2.0, frequency=3, time_of_day="morning"),
    ChoreTemplate(id=chore_template_ids[7],  household_id=household_ids[1], name="Recycling & trash",     weight=1.0, frequency=3, time_of_day="evening"),
    ChoreTemplate(id=chore_template_ids[8],  household_id=household_ids[1], name="Bathroom deep clean",   weight=3.0, frequency=2, time_of_day="morning"),
    ChoreTemplate(id=chore_template_ids[9],  household_id=household_ids[1], name="Laundry room tidy",     weight=0.5, frequency=7, time_of_day="anytime"),
    # Household 2 — Newport NYC Crew
    ChoreTemplate(id=chore_template_ids[10], household_id=household_ids[2], name="Kitchen cleanup",       weight=2.0, frequency=7, time_of_day="evening"),
    ChoreTemplate(id=chore_template_ids[11], household_id=household_ids[2], name="Take out trash",        weight=1.0, frequency=3, time_of_day="evening"),
    ChoreTemplate(id=chore_template_ids[12], household_id=household_ids[2], name="Clean bathroom",        weight=3.0, frequency=2, time_of_day="morning"),
    ChoreTemplate(id=chore_template_ids[13], household_id=household_ids[2], name="Wipe counters / surfaces",weight=0.5,frequency=7, time_of_day="anytime"),
    ChoreTemplate(id=chore_template_ids[14], household_id=household_ids[2], name="Vacuum common areas",   weight=1.5, frequency=3, time_of_day="anytime"),
]


# ════════════════════════════════════════════════════════════════════════════
# CHORE CONSTRAINTS  (5 per household = 15 total)
# ════════════════════════════════════════════════════════════════════════════

CHORE_CONSTRAINTS = [
    # Household 0
    ChoreConstraint(household_id=household_ids[0], user_id=user_ids[1], chore_id=None,                   type="restriction",   day_of_week=0, priority=2, status="approved"),
    ChoreConstraint(household_id=household_ids[0], user_id=user_ids[0], chore_id=chore_template_ids[3],  type="preference",    day_of_week=5, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[0], user_id=user_ids[2], chore_id=chore_template_ids[0],  type="frequency_cap", max_frequency=4, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[0], user_id=user_ids[1], chore_id=chore_template_ids[2],  type="preference",    day_of_week=3, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[0], user_id=user_ids[2], chore_id=chore_template_ids[1],  type="restriction",   day_of_week=6, priority=1, status="pending"),
    # Household 1
    ChoreConstraint(household_id=household_ids[1], user_id=user_ids[3], chore_id=None,                   type="restriction",   day_of_week=1, priority=2, status="approved"),
    ChoreConstraint(household_id=household_ids[1], user_id=user_ids[6], chore_id=chore_template_ids[8],  type="preference",    day_of_week=5, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[1], user_id=user_ids[13],chore_id=chore_template_ids[5],  type="frequency_cap", max_frequency=3, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[1], user_id=user_ids[3], chore_id=chore_template_ids[6],  type="restriction",   day_of_week=0, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[1], user_id=user_ids[13],chore_id=None,                   type="restriction",   day_of_week=6, priority=1, status="pending"),
    # Household 2
    ChoreConstraint(household_id=household_ids[2], user_id=user_ids[8], chore_id=chore_template_ids[12], type="preference",    day_of_week=6, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[2], user_id=user_ids[9], chore_id=None,                   type="restriction",   day_of_week=2, priority=2, status="approved"),
    ChoreConstraint(household_id=household_ids[2], user_id=user_ids[11],chore_id=chore_template_ids[10], type="frequency_cap", max_frequency=3, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[2], user_id=user_ids[8], chore_id=chore_template_ids[11], type="preference",    day_of_week=1, priority=1, status="approved"),
    ChoreConstraint(household_id=household_ids[2], user_id=user_ids[9], chore_id=chore_template_ids[14], type="restriction",   day_of_week=5, priority=1, status="pending"),
]


# ════════════════════════════════════════════════════════════════════════════
# CHORE ASSIGNMENTS  (5 per household = 15, mix of completed/pending/missed)
# ════════════════════════════════════════════════════════════════════════════

week_start = date.today() - timedelta(days=date.today().weekday())

CHORE_ASSIGNMENTS = []

def add_assignments(hh_id, members, templates, plan):
    """plan: list of (day, template_idx_in_list, member_idx, status)"""
    for day, t_local, m_idx, status in plan:
        CHORE_ASSIGNMENTS.append(ChoreAssignment(
            household_id=hh_id,
            chore_id=templates[t_local],
            assigned_to=members[m_idx],
            day_of_week=day,
            week_start=week_start,
            status=status,
            completed_at=days_ago(1) if status == "completed" else None,
            points_earned=1.0 if status == "completed" else 0,
        ))

# Household 0 — 5 assignments (completed, completed, pending, pending, missed)
add_assignments(household_ids[0], hh0_members,
    [chore_template_ids[0], chore_template_ids[1], chore_template_ids[2], chore_template_ids[3], chore_template_ids[4]],
    [(0, 0, 0, "completed"), (1, 1, 1, "completed"), (2, 2, 2, "pending"),
     (3, 3, 0, "pending"),   (1, 4, 1, "missed")])

# Household 1 — 5 assignments
add_assignments(household_ids[1], hh1_members,
    [chore_template_ids[5], chore_template_ids[6], chore_template_ids[7], chore_template_ids[8], chore_template_ids[9]],
    [(0, 0, 0, "completed"), (0, 2, 1, "completed"), (1, 1, 2, "completed"),
     (2, 3, 0, "pending"),   (2, 4, 1, "missed")])

# Household 2 — 5 assignments
add_assignments(household_ids[2], hh2_members,
    [chore_template_ids[10], chore_template_ids[11], chore_template_ids[12], chore_template_ids[13], chore_template_ids[14]],
    [(0, 0, 0, "completed"), (1, 1, 1, "completed"), (2, 2, 2, "pending"),
     (3, 3, 0, "pending"),   (0, 4, 2, "missed")])


# ════════════════════════════════════════════════════════════════════════════
# TRUST EVENTS  (5 pillars × all users + special cases)
# ════════════════════════════════════════════════════════════════════════════

TRUST_EVENTS = []

# 1. Verification events — all 15 users
for i, uid in enumerate(user_ids):
    TRUST_EVENTS.append(TrustEvent(user_id=uid, category="verification", event_type="email_verified",   points_delta=4.0,  created_at=days_ago(60 - i)))
for i in range(10):
    TRUST_EVENTS.append(TrustEvent(user_id=user_ids[i], category="verification", event_type="phone_verified",   points_delta=4.0,  created_at=days_ago(55 - i)))
for i in range(8):
    TRUST_EVENTS.append(TrustEvent(user_id=user_ids[i], category="verification", event_type="photo_id_verified", points_delta=5.0, created_at=days_ago(50 - i)))
for i in range(5):
    TRUST_EVENTS.append(TrustEvent(user_id=user_ids[i], category="verification", event_type="linkedin_verified", points_delta=4.0, created_at=days_ago(45 - i)))
for i in range(4):
    TRUST_EVENTS.append(TrustEvent(user_id=user_ids[i], category="verification", event_type="pay_stub_verified", points_delta=3.0, created_at=days_ago(40 - i)))

# 2. Financial events — household members (on-time payments + one late)
for uid in [*hh0_members, *hh1_members, *hh2_members]:
    for j in range(5):
        TRUST_EVENTS.append(TrustEvent(user_id=uid, category="financial", event_type="bill_paid_ontime", points_delta=0.5, created_at=days_ago(j * 30 + 5)))
# Late payment — Alex (test: negative delta)
TRUST_EVENTS.append(TrustEvent(user_id=user_ids[2], category="financial", event_type="bill_paid_late",    points_delta=-1.0, created_at=days_ago(35)))
TRUST_EVENTS.append(TrustEvent(user_id=user_ids[10], category="financial", event_type="bill_paid_late",   points_delta=-1.0, created_at=days_ago(20)))

# 3. Household events — chore completions
for uid in [*hh0_members, *hh1_members, *hh2_members]:
    for j in range(5):
        TRUST_EVENTS.append(TrustEvent(user_id=uid, category="household", event_type="chore_completed",  points_delta=0.3,  created_at=days_ago(j * 5)))
# Missed chore — test negative delta
TRUST_EVENTS.append(TrustEvent(user_id=user_ids[2],  category="household", event_type="chore_missed",    points_delta=-0.5, created_at=days_ago(3)))
TRUST_EVENTS.append(TrustEvent(user_id=user_ids[13], category="household", event_type="chore_missed",    points_delta=-0.5, created_at=days_ago(5)))

# 4. Tenure events
for uid in user_ids[:10]:
    TRUST_EVENTS.append(TrustEvent(user_id=uid, category="tenure", event_type="tenancy_started",         points_delta=0.5,  created_at=days_ago(90)))
for uid in user_ids[:5]:
    TRUST_EVENTS.append(TrustEvent(user_id=uid, category="tenure", event_type="lease_renewed",           points_delta=2.0,  created_at=days_ago(30)))

# 5. Community events — upvotes received
for uid in user_ids[:8]:
    TRUST_EVENTS.append(TrustEvent(user_id=uid, category="community", event_type="post_upvoted",         points_delta=0.2,  created_at=days_ago(10)))
    TRUST_EVENTS.append(TrustEvent(user_id=uid, category="community", event_type="helpful_reply",        points_delta=0.1,  created_at=days_ago(7)))

# 6. Interest/match events
for uid in [user_ids[6], user_ids[7], user_ids[12]]:
    TRUST_EVENTS.append(TrustEvent(user_id=uid, category="community", event_type="match_completed",      points_delta=1.0,  created_at=days_ago(14)))


# ════════════════════════════════════════════════════════════════════════════
# TRUST SNAPSHOTS  (one per user = 15)
# ════════════════════════════════════════════════════════════════════════════

TRUST_SNAPSHOTS = []
for u in USERS:
    s = float(u.trust_score)
    TRUST_SNAPSHOTS.append(TrustSnapshot(
        user_id=u.id, total_score=s,
        verification_score=min(s * 0.22, 22),
        financial_score=min(s * 0.28, 28),
        household_score=min(s * 0.25, 25),
        tenure_score=min(s * 0.15, 15),
        community_score=min(s * 0.10, 10),
        trend="rising" if s > 60 else ("falling" if s < 40 else "stable"),
    ))


# ════════════════════════════════════════════════════════════════════════════
# VOUCHES  (10 total)
# ════════════════════════════════════════════════════════════════════════════

VOUCHES = [
    Vouch(voucher_id=user_ids[0], vouchee_id=user_ids[1], relationship="lived_together",  message="Great roommate, always clean and respectful."),
    Vouch(voucher_id=user_ids[1], vouchee_id=user_ids[0], relationship="lived_together",  message="Reliable, pays rent on time, keeps common areas clean."),
    Vouch(voucher_id=user_ids[3], vouchee_id=user_ids[1], relationship="colleague",       message="Worked with Priya at the hospital. Very responsible."),
    Vouch(voucher_id=user_ids[7], vouchee_id=user_ids[0], relationship="friend",          message="Known Rohith for years. Stand-up guy."),
    Vouch(voucher_id=user_ids[5], vouchee_id=user_ids[9], relationship="colleague",       message="Emma is incredibly organized and respectful of shared spaces."),
    Vouch(voucher_id=user_ids[3], vouchee_id=user_ids[6], relationship="lived_together",  message="James was a fantastic roommate — always on time with bills."),
    Vouch(voucher_id=user_ids[8], vouchee_id=user_ids[11],relationship="colleague",       message="Fatima is highly professional and a pleasure to live with."),
    Vouch(voucher_id=user_ids[9], vouchee_id=user_ids[8], relationship="lived_together",  message="Marcus is clean, quiet, and always pays his share promptly."),
    Vouch(voucher_id=user_ids[0], vouchee_id=user_ids[12],relationship="friend",          message="Noah is very principled and respectful. Highly recommend."),
    Vouch(voucher_id=user_ids[7], vouchee_id=user_ids[13],relationship="colleague",       message="Isabella is a team player with excellent communication skills."),
]


# ════════════════════════════════════════════════════════════════════════════
# MATCH INTERESTS  (25: 5 per status)
# ════════════════════════════════════════════════════════════════════════════

MATCH_INTERESTS = [
    # ── INTERESTED (5) ──────────────────────────────────────────────────────
    MatchInterest(id=match_interest_ids[0],  from_user_id=user_ids[10], to_listing_id=listing_ids[1],  compatibility_score=71.5, status="interested",   message="Hi Mike! Love the FiDi views. I start at Goldman next month."),
    MatchInterest(id=match_interest_ids[1],  from_user_id=user_ids[11], to_listing_id=listing_ids[2],  compatibility_score=68.0, status="interested",   message="Journal Square is perfect — I work nights so you won't even notice me!"),
    MatchInterest(id=match_interest_ids[2],  from_user_id=user_ids[12], to_listing_id=listing_ids[5],  compatibility_score=82.3, status="interested",   message="Vegetarian kitchen is exactly what I need. I cook a lot!"),
    MatchInterest(id=match_interest_ids[3],  from_user_id=user_ids[14], to_listing_id=listing_ids[3],  compatibility_score=60.8, status="interested",   message="Hoboken brownstone is my dream. I travel 50% of the time so low impact."),
    MatchInterest(id=match_interest_ids[4],  from_user_id=user_ids[13], to_listing_id=listing_ids[7],  compatibility_score=55.4, status="interested",   message="Union City commute works for my JC office. When can I view?"),
    # ── SHORTLISTED (5) ─────────────────────────────────────────────────────
    MatchInterest(id=match_interest_ids[5],  from_user_id=user_ids[10], to_listing_id=listing_ids[0],  compatibility_score=74.2, status="shortlisted",  message="I reviewed your profile and I'd love to chat!"),
    MatchInterest(id=match_interest_ids[6],  from_user_id=user_ids[12], to_listing_id=listing_ids[2],  compatibility_score=79.1, status="shortlisted",  message="Happy to be on the shortlist. When can we connect?"),
    MatchInterest(id=match_interest_ids[7],  from_user_id=user_ids[14], to_listing_id=listing_ids[4],  compatibility_score=52.0, status="shortlisted",  message="Midtown shared room works for my budget."),
    MatchInterest(id=match_interest_ids[8],  from_user_id=user_ids[11], to_listing_id=listing_ids[9],  compatibility_score=85.5, status="shortlisted",  message="Exchange Place is 5 min from NYU Langone. Perfect!"),
    MatchInterest(id=match_interest_ids[9],  from_user_id=user_ids[13], to_listing_id=listing_ids[8],  compatibility_score=77.0, status="shortlisted",  message="Hoboken is great for my commute. Love the furnished option."),
    # ── ACCEPTED (5) → chat rooms will be created for these ─────────────────
    MatchInterest(id=match_interest_ids[10], from_user_id=user_ids[6],  to_listing_id=listing_ids[1],  compatibility_score=69.3, status="accepted",     message="Hi Mike, I'm a teacher in Hoboken. Love the listing!"),
    MatchInterest(id=match_interest_ids[11], from_user_id=user_ids[7],  to_listing_id=listing_ids[8],  compatibility_score=83.7, status="accepted",     message="Hi Sarah! I found your Hoboken listing. Is it still available?"),
    MatchInterest(id=match_interest_ids[12], from_user_id=user_ids[12], to_listing_id=listing_ids[9],  compatibility_score=88.0, status="accepted",     message="Hey Anita! The Exchange Place listing looks amazing."),
    MatchInterest(id=match_interest_ids[13], from_user_id=user_ids[13], to_listing_id=listing_ids[0],  compatibility_score=76.5, status="accepted",     message="Hi! I found your Grove St listing. Love the location!"),
    MatchInterest(id=match_interest_ids[14], from_user_id=user_ids[14], to_listing_id=listing_ids[2],  compatibility_score=63.2, status="accepted",     message="Hi Anita! Is the Journal Square room available for July 1?"),
    # ── REJECTED (5) ────────────────────────────────────────────────────────
    MatchInterest(id=match_interest_ids[15], from_user_id=user_ids[2],  to_listing_id=listing_ids[4],  compatibility_score=41.0, status="rejected"),
    MatchInterest(id=match_interest_ids[16], from_user_id=user_ids[10], to_listing_id=listing_ids[3],  compatibility_score=38.5, status="rejected"),
    MatchInterest(id=match_interest_ids[17], from_user_id=user_ids[11], to_listing_id=listing_ids[8],  compatibility_score=49.0, status="rejected"),
    MatchInterest(id=match_interest_ids[18], from_user_id=user_ids[14], to_listing_id=listing_ids[5],  compatibility_score=44.2, status="rejected"),
    MatchInterest(id=match_interest_ids[19], from_user_id=user_ids[7],  to_listing_id=listing_ids[1],  compatibility_score=52.1, status="rejected"),
    # ── MUTUAL (5) ──────────────────────────────────────────────────────────
    MatchInterest(id=match_interest_ids[20], from_user_id=user_ids[6],  to_listing_id=listing_ids[5],  compatibility_score=88.4, status="mutual",       message="The vegetarian kitchen is exactly what I've been looking for."),
    MatchInterest(id=match_interest_ids[21], from_user_id=user_ids[0],  to_listing_id=listing_ids[9],  compatibility_score=91.2, status="mutual",       message="WFH engineer seeking quiet place. Exchange Place is ideal."),
    MatchInterest(id=match_interest_ids[22], from_user_id=user_ids[1],  to_listing_id=listing_ids[6],  compatibility_score=87.0, status="mutual",       message="Priya here — data scientist, very clean, early bird."),
    MatchInterest(id=match_interest_ids[23], from_user_id=user_ids[2],  to_listing_id=listing_ids[7],  compatibility_score=72.3, status="mutual",       message="Budget room works great for a grad student."),
    MatchInterest(id=match_interest_ids[24], from_user_id=user_ids[10], to_listing_id=listing_ids[8],  compatibility_score=79.6, status="mutual",       message="I'm a finance analyst. Hoboken commute to FiDi is ideal."),
]


# ════════════════════════════════════════════════════════════════════════════
# CHAT ROOMS  (5, linked to accepted match interests)
# ════════════════════════════════════════════════════════════════════════════

CHAT_ROOMS = [
    # room[0]: James (user[6]) ↔ Mike (user[4]) re listing[1]
    ChatRoom(id=chat_room_ids[0], interest_id=match_interest_ids[10], listing_id=listing_ids[1], user_a_id=user_ids[6], user_b_id=user_ids[4], status="active"),
    # room[1]: Deepa (user[7]) ↔ Sarah (user[3]) re listing[8]
    ChatRoom(id=chat_room_ids[1], interest_id=match_interest_ids[11], listing_id=listing_ids[8], user_a_id=user_ids[7], user_b_id=user_ids[3], status="active"),
    # room[2]: Noah (user[12]) ↔ Anita (user[5]) re listing[9]
    ChatRoom(id=chat_room_ids[2], interest_id=match_interest_ids[12], listing_id=listing_ids[9], user_a_id=user_ids[12], user_b_id=user_ids[5], status="active"),
    # room[3]: Isabella (user[13]) ↔ Sarah (user[3]) re listing[0]
    ChatRoom(id=chat_room_ids[3], interest_id=match_interest_ids[13], listing_id=listing_ids[0], user_a_id=user_ids[13], user_b_id=user_ids[3], status="active"),
    # room[4]: Ethan (user[14]) ↔ Anita (user[5]) re listing[2]
    ChatRoom(id=chat_room_ids[4], interest_id=match_interest_ids[14], listing_id=listing_ids[2], user_a_id=user_ids[14], user_b_id=user_ids[5], status="active"),
]


# ════════════════════════════════════════════════════════════════════════════
# CHAT MESSAGES  (5-6 per room = 27 total, realistic back-and-forth)
# ════════════════════════════════════════════════════════════════════════════

CHAT_MESSAGES = [
    # Room 0: James ↔ Mike (FiDi luxury listing)
    ChatMessage(room_id=chat_room_ids[0], sender_id=user_ids[6], body="Hi Mike! I'm James, a high school teacher from Hoboken. Love the FiDi listing!", is_read=True),
    ChatMessage(room_id=chat_room_ids[0], sender_id=user_ids[4], body="Hey James! Thanks for reaching out. What's your ideal move-in timeline?", is_read=True),
    ChatMessage(room_id=chat_room_ids[0], sender_id=user_ids[6], body="I'm looking at June 1st. Is that flexible? I'm very clean and quiet.", is_read=True),
    ChatMessage(room_id=chat_room_ids[0], sender_id=user_ids[4], body="June 1 works! Are you okay with occasional gatherings on weekends?", is_read=True),
    ChatMessage(room_id=chat_room_ids[0], sender_id=user_ids[6], body="Totally fine — I'm fairly social. Would love to set up a tour this week.", is_read=False),

    # Room 1: Deepa ↔ Sarah (Hoboken furnished listing)
    ChatMessage(room_id=chat_room_ids[1], sender_id=user_ids[7], body="Hi Sarah! Found your Hoboken listing. Is it still available?", is_read=True),
    ChatMessage(room_id=chat_room_ids[1], sender_id=user_ids[3], body="Yes it is! It's a great spot near the Hoboken terminal. Are you a professional?", is_read=True),
    ChatMessage(room_id=chat_room_ids[1], sender_id=user_ids[7], body="I'm a PM at Google NYC — commute would be perfect via PATH.", is_read=True),
    ChatMessage(room_id=chat_room_ids[1], sender_id=user_ids[3], body="Perfect! Our other roommate also works in the city. Very compatible lifestyle.", is_read=True),
    ChatMessage(room_id=chat_room_ids[1], sender_id=user_ids[7], body="Sounds ideal. Can we schedule a call or tour this week?", is_read=True),
    ChatMessage(room_id=chat_room_ids[1], sender_id=user_ids[3], body="Absolutely! How about Saturday morning around 10am?", is_read=False),

    # Room 2: Noah ↔ Anita (Exchange Place high-rise)
    ChatMessage(room_id=chat_room_ids[2], sender_id=user_ids[12], body="Hey Anita! The Exchange Place listing looks incredible. Is it still available?", is_read=True),
    ChatMessage(room_id=chat_room_ids[2], sender_id=user_ids[5], body="Yes! Beautiful Hudson views and very quiet building. What do you do for work?", is_read=True),
    ChatMessage(room_id=chat_room_ids[2], sender_id=user_ids[12], body="I'm a frontend dev, fully remote. I'm also vegan — is that required here?", is_read=True),
    ChatMessage(room_id=chat_room_ids[2], sender_id=user_ids[5], body="Not required for this apt, but preferred. I cook vegan and it's a quiet household.", is_read=True),
    ChatMessage(room_id=chat_room_ids[2], sender_id=user_ids[12], body="That sounds perfect. I'd love to see the place. Free Saturday afternoon?", is_read=False),

    # Room 3: Isabella ↔ Sarah (Grove St listing)
    ChatMessage(room_id=chat_room_ids[3], sender_id=user_ids[13], body="Hi! I found your Grove St listing — love the location near the PATH!", is_read=True),
    ChatMessage(room_id=chat_room_ids[3], sender_id=user_ids[3], body="Hey Isabella! Yes it's available. What do you do for work?", is_read=True),
    ChatMessage(room_id=chat_room_ids[3], sender_id=user_ids[13], body="Marketing manager at a JC startup. Hybrid schedule, so I'm home some days.", is_read=True),
    ChatMessage(room_id=chat_room_ids[3], sender_id=user_ids[3], body="Nice! Our roommates work in tech. I think you'd fit in well. Very clean household.", is_read=True),
    ChatMessage(room_id=chat_room_ids[3], sender_id=user_ids[13], body="Sounds great! I'm very clean and always respect quiet hours after 10pm.", is_read=False),

    # Room 4: Ethan ↔ Anita (Journal Square listing)
    ChatMessage(room_id=chat_room_ids[4], sender_id=user_ids[14], body="Hi Anita! Is the Journal Square room available for July 1st?", is_read=True),
    ChatMessage(room_id=chat_room_ids[4], sender_id=user_ids[5], body="Yes! July 1 works great. Are you thinking 6 months or a year?", is_read=True),
    ChatMessage(room_id=chat_room_ids[4], sender_id=user_ids[14], body="I'd prefer 6 months to start — I travel a lot for work so low impact.", is_read=True),
    ChatMessage(room_id=chat_room_ids[4], sender_id=user_ids[5], body="That's fine with us. Any questions about the neighborhood?", is_read=True),
    ChatMessage(room_id=chat_room_ids[4], sender_id=user_ids[14], body="What's street parking like? I have a car but use it mainly on weekends.", is_read=True),
    ChatMessage(room_id=chat_room_ids[4], sender_id=user_ids[5], body="Very easy street parking in the Heights! Most blocks are permit only but it's doable.", is_read=False),
]


# ════════════════════════════════════════════════════════════════════════════
# APPOINTMENTS  (5: one per status — proposed, accepted, completed, rejected, rescheduled)
# ════════════════════════════════════════════════════════════════════════════

APPOINTMENTS = [
    Appointment(
        room_id=chat_room_ids[0], proposer_id=user_ids[4], responder_id=user_ids[6],
        appointment_type="tour",
        proposed_time=days_future(5), alt_time_1=days_future(7), alt_time_2=days_future(8),
        status="proposed",
        notes="Tour of the FiDi apartment. Please use the lobby entrance on Wall St.",
    ),
    Appointment(
        room_id=chat_room_ids[1], proposer_id=user_ids[3], responder_id=user_ids[7],
        appointment_type="call",
        proposed_time=days_future(2), confirmed_time=days_future(2),
        status="accepted",
        notes="30-min intro call. Sarah will send a Google Meet link.",
    ),
    Appointment(
        room_id=chat_room_ids[2], proposer_id=user_ids[5], responder_id=user_ids[12],
        appointment_type="tour",
        proposed_time=days_ago(3), confirmed_time=days_ago(3),
        status="completed",
        notes="Tour completed. Noah loved the apartment. Proceeding to lease review.",
    ),
    Appointment(
        room_id=chat_room_ids[3], proposer_id=user_ids[3], responder_id=user_ids[13],
        appointment_type="tour",
        proposed_time=days_ago(1),
        status="rejected",
        notes="Isabella found another place before the tour. Listing back to searching.",
    ),
    Appointment(
        room_id=chat_room_ids[4], proposer_id=user_ids[14], responder_id=user_ids[5],
        appointment_type="call",
        proposed_time=days_future(7), alt_time_1=days_future(9), alt_time_2=days_future(10),
        status="rescheduled",
        notes="Ethan is traveling. Rescheduling to next week.",
    ),
]


# ════════════════════════════════════════════════════════════════════════════
# SAVED LISTINGS  (15 total — multiple seekers × multiple listings)
# ════════════════════════════════════════════════════════════════════════════

_saved = [
    # user[0] (Rohith) saves 3 listings
    (user_ids[0], listing_ids[1]),
    (user_ids[0], listing_ids[6]),
    (user_ids[0], listing_ids[9]),
    # user[1] (Priya) saves 2 listings
    (user_ids[1], listing_ids[3]),
    (user_ids[1], listing_ids[6]),
    # user[2] (Alex) saves 2 listings
    (user_ids[2], listing_ids[4]),
    (user_ids[2], listing_ids[1]),
    # user[6] (James) saves 3 listings
    (user_ids[6], listing_ids[2]),
    (user_ids[6], listing_ids[5]),
    (user_ids[6], listing_ids[9]),
    # user[10] (David) saves 2 listings
    (user_ids[10], listing_ids[0]),
    (user_ids[10], listing_ids[2]),
    # user[12] (Noah) saves 2 listings
    (user_ids[12], listing_ids[3]),
    (user_ids[12], listing_ids[8]),
    # user[14] (Ethan) saves 1 listing
    (user_ids[14], listing_ids[1]),
]
SAVED_LISTINGS = [SavedListing(user_id=uid, listing_id=lid) for uid, lid in _saved]


# ════════════════════════════════════════════════════════════════════════════
# SAVED SEARCHES  (10: alerts on/off, varied filters)
# ════════════════════════════════════════════════════════════════════════════

SAVED_SEARCHES = [
    SavedSearch(user_id=user_ids[0], name="JC Private Rooms",      filters={"city": "Jersey City", "room_type": "private_room", "price_max": 150000}, alerts_enabled=True,  last_notified_count=3),
    SavedSearch(user_id=user_ids[0], name="JC Budget Listings",    filters={"city": "Jersey City", "price_max": 120000},                               alerts_enabled=False, last_notified_count=0),
    SavedSearch(user_id=user_ids[2], name="NYC Cheap Rooms",        filters={"city": "New York",    "price_max": 100000, "room_type": "shared_room"},   alerts_enabled=True,  last_notified_count=1),
    SavedSearch(user_id=user_ids[6], name="Veggie-Friendly JC",     filters={"city": "Jersey City", "room_type": "private_room", "price_max": 140000}, alerts_enabled=True,  last_notified_count=5),
    SavedSearch(user_id=user_ids[6], name="Hoboken Entire Places",  filters={"city": "Hoboken",     "room_type": "entire_place", "price_max": 220000},  alerts_enabled=False, last_notified_count=0),
    SavedSearch(user_id=user_ids[10], name="JC Budget Under $1K",   filters={"city": "Jersey City", "price_max": 100000, "room_type": "private_room"},  alerts_enabled=True,  last_notified_count=2),
    SavedSearch(user_id=user_ids[10], name="JC Near PATH Stations", filters={"city": "Jersey City", "price_max": 130000},                               alerts_enabled=True,  last_notified_count=0),
    SavedSearch(user_id=user_ids[12], name="JC Vegetarian Apts",    filters={"city": "Jersey City", "room_type": "private_room"},                       alerts_enabled=True,  last_notified_count=1),
    SavedSearch(user_id=user_ids[14], name="NYC Private Rooms",     filters={"city": "New York",    "room_type": "private_room", "price_max": 180000},  alerts_enabled=False, last_notified_count=0),
    SavedSearch(user_id=user_ids[14], name="FiDi Luxury Listings",  filters={"city": "New York",    "price_min": 180000},                               alerts_enabled=True,  last_notified_count=0),
]


# ════════════════════════════════════════════════════════════════════════════
# SERVICE PROVIDERS  (10, multiple categories and cities)
# ════════════════════════════════════════════════════════════════════════════

SERVICE_PROVIDERS = [
    ServiceProvider(id=provider_ids[0], name="JC Plumbing Pros",        category="plumbing",     phone="+12015559001", email="info@jcplumbing.com",    city="Jersey City", state="NJ", rating=4.7, review_count=23, verified=True),
    ServiceProvider(id=provider_ids[1], name="SparksFly Electrical",    category="electrical",   phone="+12015559002",                                  city="Jersey City", state="NJ", rating=4.5, review_count=15, verified=True),
    ServiceProvider(id=provider_ids[2], name="CleanSweep NJ",           category="cleaning",     phone="+12015559003", email="book@cleansweepnj.com",   city="Jersey City", state="NJ", rating=4.8, review_count=42, verified=True),
    ServiceProvider(id=provider_ids[3], name="BugBusters Pest Control", category="pest_control", phone="+12015559004",                                  city="Hoboken",     state="NJ", rating=4.3, review_count=11, verified=False),
    ServiceProvider(id=provider_ids[4], name="CoolAir HVAC",            category="ac_hvac",      phone="+12015559005",                                  city="Jersey City", state="NJ", rating=4.6, review_count=19, verified=True),
    ServiceProvider(id=provider_ids[5], name="QuickMove NJ",            category="moving",       phone="+12015559006", email="hello@quickmovenj.com",   city="Union City",  state="NJ", rating=4.1, review_count=31, verified=False),
    ServiceProvider(id=provider_ids[6], name="Hoboken Handymen",        category="handyman",     phone="+12015559007", email="jobs@hobokenhandymen.com",city="Hoboken",     state="NJ", rating=4.4, review_count=27, verified=True),
    ServiceProvider(id=provider_ids[7], name="GreenThumb Landscaping",  category="landscaping",  phone="+12015559008",                                  city="Jersey City", state="NJ", rating=4.2, review_count=8,  verified=False),
    ServiceProvider(id=provider_ids[8], name="NYC Deep Clean",          category="cleaning",     phone="+12125559009", email="info@nycdeepcl.com",      city="New York",    state="NY", rating=4.9, review_count=61, verified=True),
    ServiceProvider(id=provider_ids[9], name="Manhattan Movers",        category="moving",       phone="+12125559010",                                  city="New York",    state="NY", rating=4.0, review_count=44, verified=True),
]

SERVICE_REVIEWS = [
    ServiceReview(provider_id=provider_ids[0], user_id=user_ids[0], household_id=household_ids[0], rating=5, comment="Fixed our leaky faucet in 30 minutes. Very professional."),
    ServiceReview(provider_id=provider_ids[2], user_id=user_ids[1], household_id=household_ids[0], rating=5, comment="Deep cleaned our apartment before move-in. Spotless!"),
    ServiceReview(provider_id=provider_ids[2], user_id=user_ids[3], household_id=household_ids[1], rating=4, comment="Good service but showed up 20 min late."),
    ServiceReview(provider_id=provider_ids[4], user_id=user_ids[0], household_id=household_ids[0], rating=5, comment="AC fixed same day. Lifesaver in August."),
    ServiceReview(provider_id=provider_ids[5], user_id=user_ids[7],                                rating=3, comment="Got the job done but some furniture got scratched."),
    ServiceReview(provider_id=provider_ids[6], user_id=user_ids[3], household_id=household_ids[1], rating=5, comment="Fixed our shower and kitchen sink. Super fast and fair price."),
    ServiceReview(provider_id=provider_ids[3], user_id=user_ids[6], household_id=household_ids[1], rating=4, comment="Took care of a mouse problem. Haven't seen any since."),
    ServiceReview(provider_id=provider_ids[8], user_id=user_ids[8], household_id=household_ids[2], rating=5, comment="Best cleaning service we've ever hired. Truly spotless."),
    ServiceReview(provider_id=provider_ids[9], user_id=user_ids[11],                               rating=4, comment="Moved all my stuff without a scratch. On time too."),
    ServiceReview(provider_id=provider_ids[1], user_id=user_ids[9], household_id=household_ids[2], rating=5, comment="Fixed our outlet issue and added a new one in the kitchen."),
]


# ════════════════════════════════════════════════════════════════════════════
# COMMUNITY POSTS  (15 — 8 original + 7 new)
# ════════════════════════════════════════════════════════════════════════════

COMMUNITY_POSTS = [
    CommunityPost(id=post_ids[0],  author_id=user_ids[0], city="Jersey City",  type="tip",            title="Best grocery stores in JC for Indian ingredients",             body="H-Mart on Newark Ave has a great selection. Also check out Patel Brothers on Oak Tree Rd. For everyday stuff, Trader Joe's on Columbus Dr is solid.",              upvotes=3, reply_count=3),
    CommunityPost(id=post_ids[1],  author_id=user_ids[1], city="Jersey City",  type="recommendation", title="Amazing ramen spot near Grove St",                             body="Ani Ramen on 1st St is incredible. The spicy miso is a must-try. Vegetarian options available. Usually 15-20 min wait on weekends.",                       upvotes=12, reply_count=4),
    CommunityPost(id=post_ids[2],  author_id=user_ids[3], city="Hoboken",      type="tip",            title="Free parking hack in Hoboken",                                 body="Street parking is free on Sundays and after 6pm on most streets south of 4th St. Check the signs carefully — some blocks differ.",                          upvotes=34, reply_count=5),
    CommunityPost(id=post_ids[3],  author_id=user_ids[2], city="New York",     type="question",       title="Best coworking spaces near FiDi?",                             body="Looking for a coworking space near the Financial District. Need reliable WiFi, quiet areas, day pass option. Budget $30-40/day. Recommendations?",          upvotes=5, reply_count=4),
    CommunityPost(id=post_ids[4],  author_id=user_ids[7], city="Jersey City",  type="event",          title="Desi professionals meetup — April 26",                         body="Organizing a casual meetup for South Asian professionals in JC/Hoboken area. Barcade in Jersey City at 7pm. Great way to network!",                          upvotes=22, reply_count=5),
    CommunityPost(id=post_ids[5],  author_id=user_ids[5], city="Jersey City",  type="recommendation", title="Reliable laundromat in the Heights",                           body="Star Laundromat on Central Ave is clean, well-maintained, has large machines for comforters. Wash-and-fold for $1.50/lb.",                                 upvotes=8, reply_count=4),
    CommunityPost(id=post_ids[6],  author_id=user_ids[4], city="New York",     type="tip",            title="NYC subway tips for new transplants",                          body="1. Get an OMNY card — caps at $34/week. 2. Express trains skip stops. 3. Stand right on escalators. 4. Download Citymapper.",                             upvotes=47, reply_count=0),
    CommunityPost(id=post_ids[7],  author_id=user_ids[6], city="Hoboken",      type="question",       title="How bad is PATH during rush hour?",                            body="Moving to Hoboken soon, will commute to WTC daily. How packed does PATH get 8-9am? Is it better to take the bus?",                                        upvotes=15, reply_count=0),
    # 7 new posts
    CommunityPost(id=post_ids[8],  author_id=user_ids[8], city="Jersey City",  type="tip",            title="Newport waterfront morning run route",                         body="Best JC running route: start at Liberty State Park, run along the waterfront to Newport PATH, loop back. 5 miles total, stunning NYC views the whole way.", upvotes=19, reply_count=0),
    CommunityPost(id=post_ids[9],  author_id=user_ids[9], city="Jersey City",  type="recommendation", title="Art supply shops near JC Art Studio",                         body="Blick Art Materials on Marin Blvd is the go-to. Also check the small shop on Newark Ave near the art studios — great for specialty papers.",             upvotes=6, reply_count=0),
    CommunityPost(id=post_ids[10], author_id=user_ids[11],city="New York",     type="question",       title="Halal meal prep services in NYC?",                            body="As a medical resident I have zero time to cook. Looking for a halal meal prep delivery service in the NYC/JC area. Any recommendations? Budget ~$12/meal.",   upvotes=11, reply_count=0),
    CommunityPost(id=post_ids[11], author_id=user_ids[12],city="Jersey City",  type="event",          title="JC Vegan Potluck — May 3rd at Liberty State Park",            body="Monthly vegan potluck! Bring a dish to share and meet like-minded folks in JC. Bring your own containers. Dogs welcome!",                                  upvotes=28, reply_count=0),
    CommunityPost(id=post_ids[12], author_id=user_ids[13],city="Hoboken",      type="tip",            title="Farmers market schedule update — 2026",                       body="Hoboken Farmers Market is now open Saturdays 9am-2pm on Pier A. Best selection is early. Great fresh produce and artisan bread.",                          upvotes=33, reply_count=0),
    CommunityPost(id=post_ids[13], author_id=user_ids[14],city="New York",     type="recommendation", title="Best dry cleaners near Financial District",                   body="Manhattan Cleaners on Broadway by Wall St does excellent work — shirts back in 24 hours, very reasonable pricing. Ask for Antonio.",                         upvotes=9, reply_count=0),
    CommunityPost(id=post_ids[14], author_id=user_ids[10],city="New York",     type="question",       title="NYC → Hoboken commute options for a car owner?",              body="Starting at Goldman Sachs next month. I have a car — should I drive to Hoboken and take PATH, or just take the subway? Parking costs? Commute time?",       upvotes=14, reply_count=0),
]


# ════════════════════════════════════════════════════════════════════════════
# COMMUNITY REPLIES  (25 total, threaded under posts 0-5)
# reply_count on posts above must match these counts: [3, 4, 5, 4, 5, 4]
# ════════════════════════════════════════════════════════════════════════════

COMMUNITY_REPLIES = [
    # Post 0 (grocery tips) — 3 replies
    CommunityReply(post_id=post_ids[0], author_id=user_ids[3], body="Thanks! Patel Brothers is definitely worth the trip. Also check Al-Aqsa on Bergen Ave for South Asian/Middle Eastern stuff."),
    CommunityReply(post_id=post_ids[0], author_id=user_ids[5], body="For vegan Indian stuff — the Satvic Foods store on Newark Ave is incredible. Specialty items you can't find elsewhere."),
    CommunityReply(post_id=post_ids[0], author_id=user_ids[7], body="Great tips! I'd add that the JC Farmers Market on Grove St on Wednesdays has amazing fresh produce at good prices."),
    # Post 1 (ramen spot) — 4 replies
    CommunityReply(post_id=post_ids[1], author_id=user_ids[0], body="Ani Ramen is legit! The black garlic ramen is also incredible. Pro tip: go on a weeknight to avoid the wait."),
    CommunityReply(post_id=post_ids[1], author_id=user_ids[2], body="Been there 5 times. The kimchi gyoza is a must-order appetizer. Can't go wrong with anything on the menu."),
    CommunityReply(post_id=post_ids[1], author_id=user_ids[4], body="Overrated imo. Try Ramen Nagomi in Manhattan instead — better broth and similar price."),
    CommunityReply(post_id=post_ids[1], author_id=user_ids[6], body="They added a new winter miso special last month. Super rich and hearty. Perfect for this weather!"),
    # Post 2 (Hoboken parking) — 5 replies
    CommunityReply(post_id=post_ids[2], author_id=user_ids[1], body="This is gold! I had no idea about the Sunday free parking. Just saved myself $40 in garage fees."),
    CommunityReply(post_id=post_ids[2], author_id=user_ids[6], body="Also worth knowing: the blocks near 1st and Adams are usually much easier to find spots on. Locals secret!"),
    CommunityReply(post_id=post_ids[2], author_id=user_ids[8], body="The Shoprite parking lot on 14th St allows 2-hour free parking. Good for quick grocery runs."),
    CommunityReply(post_id=post_ids[2], author_id=user_ids[9], body="Warning: the no-parking rules on street-cleaning days (Wed and Fri mornings in most of Hoboken) are strictly enforced. Got a $65 ticket!"),
    CommunityReply(post_id=post_ids[2], author_id=user_ids[11],body="Does anyone know if this applies to the streets near the Ferry terminal? I can never find parking there."),
    # Post 3 (FiDi coworking) — 4 replies
    CommunityReply(post_id=post_ids[3], author_id=user_ids[1], body="WeWork on Broad St has day passes around $35. Good WiFi and tons of meeting rooms. Book online the night before."),
    CommunityReply(post_id=post_ids[3], author_id=user_ids[4], body="The Battery Park City public library has free WiFi and quiet study spaces. Not a coworking space per se but works well."),
    CommunityReply(post_id=post_ids[3], author_id=user_ids[7], body="Spaces on Fulton St is great — they do day passes for $30 and the coffee is included. Very professional vibe."),
    CommunityReply(post_id=post_ids[3], author_id=user_ids[9], body="Try the free trial at Industrious near Stone St. They give you 3 free days before requiring a membership."),
    # Post 4 (desi meetup) — 5 replies
    CommunityReply(post_id=post_ids[4], author_id=user_ids[0], body="Count me in! I've been looking for a South Asian professional network in JC. Will bring some friends too."),
    CommunityReply(post_id=post_ids[4], author_id=user_ids[1], body="This is amazing! I'll be there. Should we bring anything specific or is it just drinks and networking?"),
    CommunityReply(post_id=post_ids[4], author_id=user_ids[2], body="Barcade is a great choice — games and drinks. I'll probably swing by after 8pm if that's okay."),
    CommunityReply(post_id=post_ids[4], author_id=user_ids[6], body="Not South Asian but can I still come? Would love to meet more professionals in the area!"),
    CommunityReply(post_id=post_ids[4], author_id=user_ids[7], body="Just shared this in 3 WhatsApp groups. Expect at least 15+ people. Deepa from Google here — see you all there!"),
    # Post 5 (laundromat) — 4 replies
    CommunityReply(post_id=post_ids[5], author_id=user_ids[1], body="Star Laundromat is great! The attendants are super helpful and the machines are always clean."),
    CommunityReply(post_id=post_ids[5], author_id=user_ids[3], body="They also do alterations! Had a pair of pants hemmed for $8. Much cheaper than the dry cleaner on Palisade."),
    CommunityReply(post_id=post_ids[5], author_id=user_ids[7], body="Is there one in the Downtown JC area? Heights is a bit far from Exchange Place."),
    CommunityReply(post_id=post_ids[5], author_id=user_ids[12],body="Suds on Grove St is decent for downtown. Newer machines and a good app to check when they're available."),
]


# ════════════════════════════════════════════════════════════════════════════
# POST UPVOTES  (15, unique per post+user — dedup test coverage)
# ════════════════════════════════════════════════════════════════════════════

_upvotes = [
    # post[0] — 3 upvotes
    (post_ids[0], user_ids[1]),
    (post_ids[0], user_ids[2]),
    (post_ids[0], user_ids[3]),
    # post[1] — 3 upvotes
    (post_ids[1], user_ids[0]),
    (post_ids[1], user_ids[4]),
    (post_ids[1], user_ids[5]),
    # post[2] — 3 upvotes
    (post_ids[2], user_ids[1]),
    (post_ids[2], user_ids[6]),
    (post_ids[2], user_ids[8]),
    # post[3] — 2 upvotes
    (post_ids[3], user_ids[7]),
    (post_ids[3], user_ids[9]),
    # post[4] — 3 upvotes
    (post_ids[4], user_ids[0]),
    (post_ids[4], user_ids[2]),
    (post_ids[4], user_ids[10]),
    # post[5] — 1 upvote
    (post_ids[5], user_ids[3]),
]
POST_UPVOTES = [PostUpvote(post_id=pid, user_id=uid) for pid, uid in _upvotes]


# ════════════════════════════════════════════════════════════════════════════
# RUN SEED
# ════════════════════════════════════════════════════════════════════════════

async def seed():
    async with async_session() as db:
        # ── Clear existing data (FK-safe order) ─────────────────────────────
        for table in [
            "community_post_upvotes",
            "community_replies",
            "community_posts",
            "appointments",
            "chat_messages",
            "chat_rooms",
            "saved_listings",
            "saved_searches",
            "service_reviews",
            "service_providers",
            "vouches",
            "match_interests",
            "trust_snapshots",
            "trust_events",
            "chore_assignments",
            "chore_constraints",
            "chore_templates",
            "expense_splits",
            "expenses",
            "verifications",
            "listings",
        ]:
            await db.execute(text(f"DELETE FROM {table}"))

        # Break circular FK: users ↔ households
        await db.execute(text("UPDATE users SET household_id = NULL"))
        await db.execute(text("DELETE FROM users"))
        await db.execute(text("DELETE FROM households"))
        await db.commit()

        # ── Step 1: Insert users WITHOUT household_id ────────────────────────
        for u in USERS:
            stashed = u.household_id
            u.household_id = None
            db.add(u)
            u._seed_hh = stashed
        await db.flush()

        # ── Step 2: Insert households WITHOUT listing_id (circular FK) ──────
        hh_listing_ids_stash = {}
        for hh in HOUSEHOLDS:
            hh_listing_ids_stash[hh.id] = hh.listing_id
            hh.listing_id = None
        db.add_all(HOUSEHOLDS)
        await db.flush()

        # ── Step 3: Restore household_id on users ───────────────────────────
        for u in USERS:
            if getattr(u, '_seed_hh', None):
                u.household_id = u._seed_hh
        await db.flush()

        # ── Step 4: Insert listings (households exist now) ───────────────────
        db.add_all(VERIFICATIONS)
        db.add_all(LISTINGS)
        await db.flush()

        # ── Step 5: Update households with their listing_ids ─────────────────
        for hh in HOUSEHOLDS:
            hh.listing_id = hh_listing_ids_stash[hh.id]
        await db.flush()

        db.add_all(EXPENSES)
        await db.flush()

        db.add_all(EXPENSE_SPLITS)
        db.add_all(CHORE_TEMPLATES)
        await db.flush()

        db.add_all(CHORE_CONSTRAINTS)
        db.add_all(CHORE_ASSIGNMENTS)
        db.add_all(TRUST_EVENTS)
        db.add_all(TRUST_SNAPSHOTS)
        db.add_all(VOUCHES)
        db.add_all(MATCH_INTERESTS)
        await db.flush()

        db.add_all(CHAT_ROOMS)
        await db.flush()

        db.add_all(CHAT_MESSAGES)
        db.add_all(APPOINTMENTS)
        db.add_all(SAVED_LISTINGS)
        db.add_all(SAVED_SEARCHES)
        db.add_all(SERVICE_PROVIDERS)
        await db.flush()

        db.add_all(SERVICE_REVIEWS)
        db.add_all(COMMUNITY_POSTS)
        await db.flush()

        db.add_all(COMMUNITY_REPLIES)
        db.add_all(POST_UPVOTES)

        await db.commit()

    # ── Summary ──────────────────────────────────────────────────────────────
    listing_statuses = {}
    for l in LISTINGS:
        listing_statuses[l.status] = listing_statuses.get(l.status, 0) + 1

    interest_statuses = {}
    for m in MATCH_INTERESTS:
        interest_statuses[m.status] = interest_statuses.get(m.status, 0) + 1

    verif_statuses = {}
    for v in VERIFICATIONS:
        verif_statuses[v.status] = verif_statuses.get(v.status, 0) + 1

    appt_statuses = {}
    for a in APPOINTMENTS:
        appt_statuses[a.status] = appt_statuses.get(a.status, 0) + 1

    print("=" * 65)
    print("  SEED COMPLETE — Urban Hut comprehensive test data")
    print("=" * 65)
    print(f"  Users:               {len(USERS):<4}  (3 households)")
    print(f"  Households:          3")
    print(f"  Listings:            {len(LISTINGS):<4}  {dict(listing_statuses)}")
    print(f"  Verifications:       {len(VERIFICATIONS):<4}  {dict(verif_statuses)}")
    print(f"  Match Interests:     {len(MATCH_INTERESTS):<4}  {dict(interest_statuses)}")
    print(f"  Chat Rooms:          {len(CHAT_ROOMS)}")
    print(f"  Chat Messages:       {len(CHAT_MESSAGES)}")
    print(f"  Appointments:        {len(APPOINTMENTS):<4}  {dict(appt_statuses)}")
    print(f"  Saved Listings:      {len(SAVED_LISTINGS)}")
    print(f"  Saved Searches:      {len(SAVED_SEARCHES)}")
    print(f"  Expenses:            {len(EXPENSES):<4}  (3 households × 10)")
    print(f"  Expense Splits:      {len(EXPENSE_SPLITS)}")
    print(f"  Chore Templates:     {len(CHORE_TEMPLATES):<4}  (5 per household)")
    print(f"  Chore Assignments:   {len(CHORE_ASSIGNMENTS):<4}  (5 per household)")
    print(f"  Chore Constraints:   {len(CHORE_CONSTRAINTS):<4}  (5 per household)")
    print(f"  Trust Events:        {len(TRUST_EVENTS)}")
    print(f"  Trust Snapshots:     {len(TRUST_SNAPSHOTS)}")
    print(f"  Vouches:             {len(VOUCHES)}")
    print(f"  Service Providers:   {len(SERVICE_PROVIDERS)}")
    print(f"  Service Reviews:     {len(SERVICE_REVIEWS)}")
    print(f"  Community Posts:     {len(COMMUNITY_POSTS)}")
    print(f"  Community Replies:   {len(COMMUNITY_REPLIES)}")
    print(f"  Post Upvotes:        {len(POST_UPVOTES):<4}  (dedup test coverage)")
    print()
    print("  TEST ACCOUNTS  (all passwords: password123)")
    print("  " + "─" * 60)
    for u in USERS:
        hh_label = ""
        if u.household_id == household_ids[0]: hh_label = " [HH0]"
        elif u.household_id == household_ids[1]: hh_label = " [HH1]"
        elif u.household_id == household_ids[2]: hh_label = " [HH2]"
        print(f"  {u.email:<26} {u.full_name:<22} trust={float(u.trust_score):<5}{hh_label}")
    print()
    print("  HOUSEHOLDS")
    for hh in HOUSEHOLDS:
        print(f"  {hh.name}  (invite: {hh.invite_code})")
    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(seed())
