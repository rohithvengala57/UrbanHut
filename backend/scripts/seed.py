"""
Seed script for Urban Hut development.

Creates:
  - 7 users (the original roommate group)
  - 20 listings in Harrison / Jersey City / Newark area
  - 1 active household with 5 members, 4 chore templates, 10 expenses
  - Trust events to push users to varied score levels

Usage:
    cd backend
    python -m scripts.seed
    python -m scripts.seed --reset   # drop all seed data first
"""

import argparse
import asyncio
import random
import uuid
from datetime import date, datetime, timedelta, timezone

from passlib.context import CryptContext
from sqlalchemy import delete, select

from app.database import async_session
from app.models.chore import ChoreAssignment, ChoreTemplate
from app.models.expense import Expense, ExpenseSplit
from app.models.household import Household
from app.models.listing import Listing
from app.models.trust_score import TrustEvent
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.user_search_preferences import UserSearchPreferences

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ─── Seed data ────────────────────────────────────────────────────────────────

USERS = [
    {
        "full_name": "Rohith Vengala",
        "email": "rohith@urbanhut.dev",
        "password": "Seed1234!",
        "phone": "+19735550001",
        "occupation": "Software Engineer",
        "bio": "SWE at a fintech startup. Early bird, clean freak, love cooking.",
        "gender": "male",
        "date_of_birth": date(1998, 3, 15),
        "smoking": False,
        "drinking": "social",
        "pet_friendly": True,
        "sleep_schedule": "early_bird",
        "noise_tolerance": "low",
        "guest_frequency": "rarely",
        "cleanliness_level": 5,
        "work_schedule": "9to5",
        "diet_preference": "vegetarian",
        "current_city": "Jersey City",
        "current_state": "NJ",
        "looking_in": ["Jersey City", "Harrison", "Newark"],
        "budget_min": 900,
        "budget_max": 1400,
        "move_in_date": date(2026, 6, 1),
        "trust_score": 82.0,
        "role": "member",
    },
    {
        "full_name": "Shravani Patel",
        "email": "shravani@urbanhut.dev",
        "password": "Seed1234!",
        "phone": "+19735550002",
        "occupation": "UX Designer",
        "bio": "UX designer. Organized, love plants and good coffee.",
        "gender": "female",
        "date_of_birth": date(1999, 7, 22),
        "smoking": False,
        "drinking": "rarely",
        "pet_friendly": True,
        "sleep_schedule": "normal",
        "noise_tolerance": "moderate",
        "guest_frequency": "sometimes",
        "cleanliness_level": 4,
        "work_schedule": "hybrid",
        "diet_preference": "vegetarian",
        "current_city": "Harrison",
        "current_state": "NJ",
        "looking_in": ["Harrison", "Jersey City"],
        "budget_min": 800,
        "budget_max": 1200,
        "move_in_date": date(2026, 6, 1),
        "trust_score": 74.5,
        "role": "member",
    },
    {
        "full_name": "Pawan Kumar",
        "email": "pawan@urbanhut.dev",
        "password": "Seed1234!",
        "phone": "+19735550003",
        "occupation": "Data Analyst",
        "bio": "Data analyst, avid gamer on weekends, keep to myself mostly.",
        "gender": "male",
        "date_of_birth": date(1997, 11, 5),
        "smoking": False,
        "drinking": "social",
        "pet_friendly": False,
        "sleep_schedule": "night_owl",
        "noise_tolerance": "high",
        "guest_frequency": "sometimes",
        "cleanliness_level": 3,
        "work_schedule": "9to5",
        "diet_preference": "non_vegetarian",
        "current_city": "Newark",
        "current_state": "NJ",
        "looking_in": ["Newark", "Harrison"],
        "budget_min": 700,
        "budget_max": 1100,
        "move_in_date": date(2026, 7, 1),
        "trust_score": 61.0,
        "role": "member",
    },
    {
        "full_name": "Sreeya Reddy",
        "email": "sreeya@urbanhut.dev",
        "password": "Seed1234!",
        "phone": "+19735550004",
        "occupation": "Pharmacist",
        "bio": "Healthcare professional. Quiet, responsible, looking for a calm home.",
        "gender": "female",
        "date_of_birth": date(1996, 4, 18),
        "smoking": False,
        "drinking": "never",
        "pet_friendly": True,
        "sleep_schedule": "early_bird",
        "noise_tolerance": "low",
        "guest_frequency": "rarely",
        "cleanliness_level": 5,
        "work_schedule": "shifts",
        "diet_preference": "vegetarian",
        "current_city": "Jersey City",
        "current_state": "NJ",
        "looking_in": ["Jersey City", "Hoboken"],
        "budget_min": 1100,
        "budget_max": 1600,
        "move_in_date": date(2026, 5, 15),
        "trust_score": 88.5,
        "role": "member",
    },
    {
        "full_name": "Raviteja Nalla",
        "email": "raviteja@urbanhut.dev",
        "password": "Seed1234!",
        "phone": "+19735550005",
        "occupation": "DevOps Engineer",
        "bio": "Cloud infra nerd. Work from home, cook often, easy to live with.",
        "gender": "male",
        "date_of_birth": date(1995, 9, 30),
        "smoking": False,
        "drinking": "social",
        "pet_friendly": True,
        "sleep_schedule": "normal",
        "noise_tolerance": "moderate",
        "guest_frequency": "sometimes",
        "cleanliness_level": 4,
        "work_schedule": "remote",
        "diet_preference": "non_vegetarian",
        "current_city": "Harrison",
        "current_state": "NJ",
        "looking_in": ["Harrison", "Jersey City", "Newark"],
        "budget_min": 900,
        "budget_max": 1300,
        "move_in_date": date(2026, 6, 15),
        "trust_score": 55.0,
        "role": "member",
    },
    {
        "full_name": "Honey Sharma",
        "email": "honey@urbanhut.dev",
        "password": "Seed1234!",
        "phone": "+19735550006",
        "occupation": "Marketing Manager",
        "bio": "Marketing at a startup. Social butterfly but respect quiet hours.",
        "gender": "female",
        "date_of_birth": date(2000, 1, 12),
        "smoking": False,
        "drinking": "social",
        "pet_friendly": True,
        "sleep_schedule": "normal",
        "noise_tolerance": "moderate",
        "guest_frequency": "often",
        "cleanliness_level": 3,
        "work_schedule": "9to5",
        "diet_preference": "non_vegetarian",
        "current_city": "Newark",
        "current_state": "NJ",
        "looking_in": ["Newark", "Harrison"],
        "budget_min": 750,
        "budget_max": 1100,
        "move_in_date": date(2026, 8, 1),
        "trust_score": 28.0,
        "role": "member",
    },
    {
        "full_name": "Tony George",
        "email": "tony@urbanhut.dev",
        "password": "Seed1234!",
        "phone": "+19735550007",
        "occupation": "Graduate Student",
        "bio": "CS grad student at NJIT. Budget-conscious, studious, keep things tidy.",
        "gender": "male",
        "date_of_birth": date(2001, 6, 8),
        "smoking": False,
        "drinking": "rarely",
        "pet_friendly": False,
        "sleep_schedule": "night_owl",
        "noise_tolerance": "moderate",
        "guest_frequency": "rarely",
        "cleanliness_level": 4,
        "work_schedule": "student",
        "diet_preference": "non_vegetarian",
        "current_city": "Newark",
        "current_state": "NJ",
        "looking_in": ["Newark", "Harrison"],
        "budget_min": 600,
        "budget_max": 950,
        "move_in_date": date(2026, 9, 1),
        "trust_score": 19.0,
        "role": "member",
    },
]

NJ_LISTINGS = [
    # Harrison (5 listings)
    {
        "title": "Bright Private Room in Harrison Near PATH",
        "description": (
            "Spacious private room in a 3BR apartment 4 mins walk to Harrison PATH. "
            "Shared modern kitchen, in-unit laundry, great natural light. "
            "Two current tenants — engineers, clean and quiet household."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "242 Bergen St",
        "city": "Harrison",
        "state": "NJ",
        "zip_code": "07029",
        "rent_monthly": 1150,
        "security_deposit": 1150,
        "utilities_included": True,
        "total_bedrooms": 3,
        "total_bathrooms": 1.0,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 6, 1),
        "nearest_transit": "Harrison PATH Station",
        "transit_walk_mins": 4,
        "nearby_universities": ["NJIT", "Rutgers Newark"],
        "is_verified": True,
        "amenities": ["laundry", "dishwasher", "parking", "gym"],
        "house_rules": ["no_smoking", "quiet_hours_11pm"],
    },
    {
        "title": "Modern Studio in Harrison — Perfect for Solo Professional",
        "description": (
            "Newly renovated studio steps from Harrison PATH. "
            "Private bathroom, eat-in kitchen, high-speed fiber included. Ideal for WFH."
        ),
        "property_type": "apartment",
        "room_type": "studio",
        "address_line1": "100 Frank E Rodgers Blvd",
        "city": "Harrison",
        "state": "NJ",
        "zip_code": "07029",
        "rent_monthly": 1350,
        "security_deposit": 1350,
        "utilities_included": True,
        "total_bedrooms": 0,
        "total_bathrooms": 1.0,
        "available_spots": 1,
        "current_occupants": 0,
        "available_from": date(2026, 5, 15),
        "nearest_transit": "Harrison PATH Station",
        "transit_walk_mins": 6,
        "nearby_universities": ["NJIT"],
        "is_verified": True,
        "amenities": ["wifi", "dishwasher", "rooftop"],
        "house_rules": ["no_smoking", "no_pets"],
    },
    {
        "title": "Cozy Room in Shared House — Harrison, All-Inclusive",
        "description": (
            "Furnished private room in a 4BR house with backyard. "
            "All utilities + WiFi included. Existing housemates are grad students, very chill."
        ),
        "property_type": "house",
        "room_type": "private_room",
        "address_line1": "58 William St",
        "city": "Harrison",
        "state": "NJ",
        "zip_code": "07029",
        "rent_monthly": 950,
        "security_deposit": 950,
        "utilities_included": True,
        "utility_estimate": 120,
        "total_bedrooms": 4,
        "total_bathrooms": 2.0,
        "available_spots": 1,
        "current_occupants": 3,
        "available_from": date(2026, 7, 1),
        "nearest_transit": "Harrison PATH Station",
        "transit_walk_mins": 12,
        "nearby_universities": ["NJIT", "Seton Hall"],
        "is_verified": False,
        "amenities": ["backyard", "parking", "laundry"],
        "house_rules": ["no_smoking"],
    },
    {
        "title": "Large 2BR/1BA Available — Split Rent with Current Tenant",
        "description": (
            "Looking for one person to split this 2BR with me. "
            "I'm a nurse, work shifts, quiet and clean. Near Harrison and Penn Station buses."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "330 Hamilton Ave",
        "city": "Harrison",
        "state": "NJ",
        "zip_code": "07029",
        "rent_monthly": 1050,
        "security_deposit": 1050,
        "utilities_included": False,
        "utility_estimate": 80,
        "total_bedrooms": 2,
        "total_bathrooms": 1.0,
        "available_spots": 1,
        "current_occupants": 1,
        "available_from": date(2026, 6, 15),
        "nearest_transit": "Harrison PATH Station",
        "transit_walk_mins": 8,
        "nearby_universities": [],
        "is_verified": False,
        "amenities": ["parking", "storage"],
        "house_rules": ["no_smoking", "no_loud_parties"],
    },
    {
        "title": "Furnished Room in Newly Renovated Harrison Apt",
        "description": (
            "Just renovated 3BR apartment. Your room comes furnished. "
            "Two current roommates: one engineer, one designer. Great kitchen. "
            "5 min walk to Harrison PATH."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "177 Bergen St",
        "city": "Harrison",
        "state": "NJ",
        "zip_code": "07029",
        "rent_monthly": 1200,
        "security_deposit": 1200,
        "utilities_included": True,
        "total_bedrooms": 3,
        "total_bathrooms": 2.0,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 6, 1),
        "nearest_transit": "Harrison PATH Station",
        "transit_walk_mins": 5,
        "nearby_universities": ["NJIT"],
        "is_verified": True,
        "amenities": ["laundry", "gym", "rooftop", "dishwasher"],
        "house_rules": ["no_smoking"],
    },
    # Jersey City (8 listings)
    {
        "title": "Downtown JC Private Room — Steps to Grove St PATH",
        "description": (
            "Private room in a luxury 3BR downtown JC apartment. "
            "Doorman building, rooftop, gym. 2-min walk to Grove St PATH. "
            "Existing roommates are friendly finance professionals."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "77 Hudson St",
        "city": "Jersey City",
        "state": "NJ",
        "zip_code": "07302",
        "rent_monthly": 1600,
        "security_deposit": 1600,
        "utilities_included": True,
        "total_bedrooms": 3,
        "total_bathrooms": 2.0,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 5, 1),
        "nearest_transit": "Grove Street PATH",
        "transit_walk_mins": 2,
        "nearby_universities": [],
        "is_verified": True,
        "amenities": ["doorman", "gym", "rooftop", "laundry", "dishwasher"],
        "house_rules": ["no_smoking", "no_pets"],
    },
    {
        "title": "Journal Square JC — Affordable Private Room",
        "description": (
            "Quiet 2BR apartment in Journal Square. Looking for a professional or grad student. "
            "Split 50/50. 10-min PATH to World Trade Center."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "21 Sip Ave",
        "city": "Jersey City",
        "state": "NJ",
        "zip_code": "07306",
        "rent_monthly": 1050,
        "security_deposit": 1050,
        "utilities_included": False,
        "utility_estimate": 90,
        "total_bedrooms": 2,
        "total_bathrooms": 1.0,
        "available_spots": 1,
        "current_occupants": 1,
        "available_from": date(2026, 6, 1),
        "nearest_transit": "Journal Square PATH",
        "transit_walk_mins": 7,
        "nearby_universities": ["St. Peter's University"],
        "is_verified": False,
        "amenities": ["laundry"],
        "house_rules": ["no_smoking"],
    },
    {
        "title": "Spacious Heights Room — Great Skyline Views",
        "description": (
            "Jersey City Heights, 3BR apartment with NYC skyline views from the living room. "
            "2 current tenants (both WFH). Looking for one more — remote workers preferred."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "314 Palisade Ave",
        "city": "Jersey City",
        "state": "NJ",
        "zip_code": "07307",
        "rent_monthly": 1250,
        "security_deposit": 1250,
        "utilities_included": True,
        "total_bedrooms": 3,
        "total_bathrooms": 2.0,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 7, 1),
        "nearest_transit": "Bergen Ave Light Rail",
        "transit_walk_mins": 9,
        "nearby_universities": [],
        "is_verified": True,
        "amenities": ["parking", "storage", "dishwasher"],
        "house_rules": ["no_smoking", "quiet_hours_11pm"],
    },
    {
        "title": "McGinley Square JC Room — Near Rutgers & Bus Lines",
        "description": (
            "Affordable private room near Rutgers Newark. "
            "4BR house, 3 current housemates (mix of students and young professionals). "
            "Backyard, quiet block."
        ),
        "property_type": "house",
        "room_type": "private_room",
        "address_line1": "88 Monticello Ave",
        "city": "Jersey City",
        "state": "NJ",
        "zip_code": "07304",
        "rent_monthly": 900,
        "security_deposit": 900,
        "utilities_included": True,
        "total_bedrooms": 4,
        "total_bathrooms": 2.0,
        "available_spots": 1,
        "current_occupants": 3,
        "available_from": date(2026, 6, 1),
        "nearest_transit": "Journal Square PATH",
        "transit_walk_mins": 15,
        "nearby_universities": ["Rutgers Newark", "NJIT"],
        "is_verified": False,
        "amenities": ["backyard", "laundry", "parking"],
        "house_rules": ["no_smoking"],
    },
    {
        "title": "Newport JC — Luxury Building, Furnished Room",
        "description": (
            "Fully furnished room in a luxury high-rise in Newport, JC. "
            "Concierge, rooftop pool, gym. Direct ferry or PATH to NYC."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "200 Washington Blvd",
        "city": "Jersey City",
        "state": "NJ",
        "zip_code": "07310",
        "rent_monthly": 1800,
        "security_deposit": 1800,
        "utilities_included": True,
        "total_bedrooms": 3,
        "total_bathrooms": 2.0,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 5, 15),
        "nearest_transit": "Newport PATH",
        "transit_walk_mins": 3,
        "nearby_universities": [],
        "is_verified": True,
        "amenities": ["concierge", "rooftop_pool", "gym", "laundry", "parking"],
        "house_rules": ["no_smoking", "no_pets"],
    },
    {
        "title": "Communipaw Ave JC — Budget-Friendly with Backyard",
        "description": (
            "Looking for a clean and chill roommate. 3BR house, private room, "
            "furnished. Backyard for summer BBQs. Near JSQ PATH."
        ),
        "property_type": "house",
        "room_type": "private_room",
        "address_line1": "450 Communipaw Ave",
        "city": "Jersey City",
        "state": "NJ",
        "zip_code": "07304",
        "rent_monthly": 875,
        "security_deposit": 875,
        "utilities_included": False,
        "utility_estimate": 100,
        "total_bedrooms": 3,
        "total_bathrooms": 1.5,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 7, 15),
        "nearest_transit": "Journal Square PATH",
        "transit_walk_mins": 18,
        "nearby_universities": [],
        "is_verified": False,
        "amenities": ["backyard", "parking"],
        "house_rules": ["no_smoking"],
    },
    {
        "title": "Bright JC Room — WFH Friendly, Quiet Block",
        "description": (
            "Large private room in a 2BR. Perfect for someone who works from home — "
            "great light, fast WiFi, dedicated desk space. One current roommate, "
            "also WFH, very respectful of quiet."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "150 Magnolia Ave",
        "city": "Jersey City",
        "state": "NJ",
        "zip_code": "07306",
        "rent_monthly": 1150,
        "security_deposit": 1150,
        "utilities_included": True,
        "total_bedrooms": 2,
        "total_bathrooms": 1.0,
        "available_spots": 1,
        "current_occupants": 1,
        "available_from": date(2026, 6, 15),
        "nearest_transit": "Journal Square PATH",
        "transit_walk_mins": 10,
        "nearby_universities": [],
        "is_verified": True,
        "amenities": ["wifi", "dishwasher", "storage"],
        "house_rules": ["no_smoking", "quiet_hours_10pm"],
    },
    {
        "title": "Dorm-Style Double Room Near NJCU — Ideal for Students",
        "description": (
            "Shared double room in a 5BR house near New Jersey City University. "
            "Looking for NJCU or Hudson County CC students. Utilities included, "
            "bus stop at the corner."
        ),
        "property_type": "house",
        "room_type": "shared_room",
        "address_line1": "22 West Side Ave",
        "city": "Jersey City",
        "state": "NJ",
        "zip_code": "07305",
        "rent_monthly": 650,
        "security_deposit": 650,
        "utilities_included": True,
        "total_bedrooms": 5,
        "total_bathrooms": 2.0,
        "available_spots": 2,
        "current_occupants": 3,
        "available_from": date(2026, 9, 1),
        "nearest_transit": "West Side Ave Bus",
        "transit_walk_mins": 1,
        "nearby_universities": ["NJCU", "Hudson County CC"],
        "is_verified": False,
        "amenities": ["laundry"],
        "house_rules": ["no_smoking", "quiet_hours_11pm"],
    },
    # Newark (7 listings)
    {
        "title": "Downtown Newark Room — 2 Min to Penn Station",
        "description": (
            "Private room in a recently renovated 3BR near Newark Penn Station. "
            "Direct NJTransit to NYC in 25 min. Two professional roommates, clean."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "350 Market St",
        "city": "Newark",
        "state": "NJ",
        "zip_code": "07102",
        "rent_monthly": 1100,
        "security_deposit": 1100,
        "utilities_included": True,
        "total_bedrooms": 3,
        "total_bathrooms": 2.0,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 6, 1),
        "nearest_transit": "Newark Penn Station",
        "transit_walk_mins": 2,
        "nearby_universities": ["Rutgers Newark", "NJIT", "Seton Hall Law"],
        "is_verified": True,
        "amenities": ["laundry", "dishwasher", "storage"],
        "house_rules": ["no_smoking"],
    },
    {
        "title": "NJIT/Rutgers Area Room — Perfect for Grad Students",
        "description": (
            "3BR apartment in University Heights. Ideal for NJIT or Rutgers students. "
            "Your room is large, closet included. Two other grad students, studious vibe."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "188 Central Ave",
        "city": "Newark",
        "state": "NJ",
        "zip_code": "07103",
        "rent_monthly": 850,
        "security_deposit": 850,
        "utilities_included": True,
        "total_bedrooms": 3,
        "total_bathrooms": 1.0,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 8, 15),
        "nearest_transit": "Newark Penn Station",
        "transit_walk_mins": 14,
        "nearby_universities": ["NJIT", "Rutgers Newark"],
        "is_verified": False,
        "amenities": ["laundry", "parking"],
        "house_rules": ["no_smoking", "quiet_hours_11pm"],
    },
    {
        "title": "Iron Bound Room — Vibrant Neighborhood, Great Food Scene",
        "description": (
            "Join a friendly 4BR household in the Ironbound. "
            "Best restaurant block in NJ outside your door. "
            "Current roommates: young professionals, social but respect privacy."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "74 Ferry St",
        "city": "Newark",
        "state": "NJ",
        "zip_code": "07105",
        "rent_monthly": 975,
        "security_deposit": 975,
        "utilities_included": False,
        "utility_estimate": 95,
        "total_bedrooms": 4,
        "total_bathrooms": 2.0,
        "available_spots": 1,
        "current_occupants": 3,
        "available_from": date(2026, 6, 15),
        "nearest_transit": "Newark Penn Station",
        "transit_walk_mins": 10,
        "nearby_universities": [],
        "is_verified": True,
        "amenities": ["laundry", "storage"],
        "house_rules": ["no_smoking"],
    },
    {
        "title": "Newark — Budget Private Room, All Bills Paid",
        "description": (
            "Affordable private room in a shared 3BR. All utilities included. "
            "Near Essex County College. Good for someone who needs to minimize expenses."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "62 Clinton Ave",
        "city": "Newark",
        "state": "NJ",
        "zip_code": "07108",
        "rent_monthly": 750,
        "security_deposit": 750,
        "utilities_included": True,
        "total_bedrooms": 3,
        "total_bathrooms": 1.0,
        "available_spots": 1,
        "current_occupants": 2,
        "available_from": date(2026, 7, 1),
        "nearest_transit": "Clinton Ave Bus",
        "transit_walk_mins": 5,
        "nearby_universities": ["Essex County College"],
        "is_verified": False,
        "amenities": ["laundry"],
        "house_rules": ["no_smoking", "no_loud_parties"],
    },
    {
        "title": "Forest Hill Newark — Quiet Residential, Clean Home",
        "description": (
            "Private room in a well-maintained colonial house. "
            "Forest Hill neighborhood — quieter, suburban feel. "
            "3 other professional roommates, shared chores, very organized."
        ),
        "property_type": "house",
        "room_type": "private_room",
        "address_line1": "29 Ridge St",
        "city": "Newark",
        "state": "NJ",
        "zip_code": "07104",
        "rent_monthly": 900,
        "security_deposit": 900,
        "utilities_included": False,
        "utility_estimate": 100,
        "total_bedrooms": 4,
        "total_bathrooms": 2.5,
        "available_spots": 1,
        "current_occupants": 3,
        "available_from": date(2026, 6, 1),
        "nearest_transit": "Forest Hill NJ Transit",
        "transit_walk_mins": 8,
        "nearby_universities": ["Rutgers Newark"],
        "is_verified": True,
        "amenities": ["backyard", "parking", "laundry", "storage"],
        "house_rules": ["no_smoking", "pets_ok"],
    },
    {
        "title": "North Newark Room — Commuter's Dream, NJT Station Nearby",
        "description": (
            "2BR apartment in North Newark. Great for commuters: "
            "NJT bus and train access to both NYC and downtown Newark. "
            "One current roommate, flexible on lease length."
        ),
        "property_type": "apartment",
        "room_type": "private_room",
        "address_line1": "511 Mount Prospect Ave",
        "city": "Newark",
        "state": "NJ",
        "zip_code": "07104",
        "rent_monthly": 875,
        "security_deposit": 875,
        "utilities_included": False,
        "utility_estimate": 85,
        "total_bedrooms": 2,
        "total_bathrooms": 1.0,
        "available_spots": 1,
        "current_occupants": 1,
        "available_from": date(2026, 7, 15),
        "nearest_transit": "Grove Street NJT Bus",
        "transit_walk_mins": 6,
        "nearby_universities": [],
        "is_verified": False,
        "amenities": ["laundry", "parking"],
        "house_rules": ["no_smoking"],
    },
    {
        "title": "Spacious Suite with Private Bath — Weequahic Newark",
        "description": (
            "Large private bedroom with en-suite bathroom in a 4BR house. "
            "Weequahic Park across the street — great for runners. "
            "3 roommates, diverse group, host dinner once a month."
        ),
        "property_type": "house",
        "room_type": "private_room",
        "address_line1": "90 Renner Ave",
        "city": "Newark",
        "state": "NJ",
        "zip_code": "07112",
        "rent_monthly": 1050,
        "security_deposit": 1050,
        "utilities_included": True,
        "total_bedrooms": 4,
        "total_bathrooms": 3.0,
        "available_spots": 1,
        "current_occupants": 3,
        "available_from": date(2026, 6, 1),
        "nearest_transit": "Weequahic Bus Stop",
        "transit_walk_mins": 7,
        "nearby_universities": [],
        "is_verified": True,
        "amenities": ["backyard", "laundry", "parking", "storage"],
        "house_rules": ["no_smoking", "quiet_hours_11pm"],
    },
]

TRUST_EVENTS_BY_USER = {
    "rohith@urbanhut.dev": [
        ("verification", "email_verified", 4.0),
        ("verification", "phone_verified", 4.0),
        ("verification", "id_verified", 8.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("household", "chore_completed", 3.0),
        ("household", "chore_completed", 3.0),
        ("household", "chore_completed", 3.0),
        ("community", "positive_review_received", 10.0),
        ("community", "positive_review_received", 10.0),
        ("tenure", "months_completed", 5.0),
        ("tenure", "months_completed", 5.0),
        ("tenure", "months_completed", 5.0),
    ],
    "shravani@urbanhut.dev": [
        ("verification", "email_verified", 4.0),
        ("verification", "phone_verified", 4.0),
        ("verification", "id_verified", 8.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("household", "chore_completed", 3.0),
        ("household", "chore_completed", 3.0),
        ("community", "positive_review_received", 10.0),
        ("tenure", "months_completed", 5.0),
        ("tenure", "months_completed", 5.0),
    ],
    "pawan@urbanhut.dev": [
        ("verification", "email_verified", 4.0),
        ("verification", "phone_verified", 4.0),
        ("verification", "id_verified", 8.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("household", "chore_completed", 3.0),
        ("community", "positive_review_received", 10.0),
        ("tenure", "months_completed", 5.0),
    ],
    "sreeya@urbanhut.dev": [
        ("verification", "email_verified", 4.0),
        ("verification", "phone_verified", 4.0),
        ("verification", "id_verified", 8.0),
        ("verification", "income_verified", 10.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("household", "chore_completed", 3.0),
        ("household", "chore_completed", 3.0),
        ("household", "chore_completed", 3.0),
        ("community", "positive_review_received", 10.0),
        ("community", "positive_review_received", 10.0),
        ("tenure", "months_completed", 5.0),
        ("tenure", "months_completed", 5.0),
        ("tenure", "months_completed", 5.0),
    ],
    "raviteja@urbanhut.dev": [
        ("verification", "email_verified", 4.0),
        ("verification", "phone_verified", 4.0),
        ("financial", "bill_paid_on_time", 5.0),
        ("household", "chore_completed", 3.0),
        ("community", "positive_review_received", 10.0),
        ("tenure", "months_completed", 5.0),
    ],
    "honey@urbanhut.dev": [
        ("verification", "email_verified", 4.0),
        ("verification", "phone_verified", 4.0),
    ],
    "tony@urbanhut.dev": [
        ("verification", "email_verified", 4.0),
    ],
}


# ─── Core helpers ─────────────────────────────────────────────────────────────

async def _clear_seed_data(session):
    """Remove any existing seed users (by email) and cascade."""
    emails = [u["email"] for u in USERS]
    result = await session.execute(select(User).where(User.email.in_(emails)))
    users = result.scalars().all()
    for user in users:
        await session.delete(user)
    await session.flush()
    print(f"  Cleared {len(users)} existing seed users.")


_PROFILE_FIELDS = {
    "bio", "occupation", "date_of_birth", "gender", "diet_preference",
    "smoking", "drinking", "pet_friendly", "sleep_schedule", "noise_tolerance",
    "guest_frequency", "cleanliness_level", "work_schedule",
}
_PREFS_FIELDS = {
    "current_city", "current_state", "looking_in",
    "budget_min", "budget_max", "move_in_date",
}


async def _create_users(session) -> dict[str, User]:
    user_map: dict[str, User] = {}
    for u in USERS:
        data = dict(u)
        raw_pw = data.pop("password")
        data["password_hash"] = pwd_ctx.hash(raw_pw)

        # Separate fields into core / profile / prefs buckets
        profile_data = {k: data.pop(k) for k in list(data) if k in _PROFILE_FIELDS}
        prefs_data = {k: data.pop(k) for k in list(data) if k in _PREFS_FIELDS}

        user_id = uuid.uuid4()
        user = User(id=user_id, **data)
        session.add(user)
        await session.flush()  # get DB-assigned id confirmed

        profile = UserProfile(user_id=user.id, **profile_data)
        prefs = UserSearchPreferences(user_id=user.id, **prefs_data)
        session.add(profile)
        session.add(prefs)
        await session.flush()

        user_map[user.email] = user
        print(f"  Created user: {user.full_name} (trust={user.trust_score})")
    return user_map


async def _create_listings(session, user_map: dict[str, User]) -> list[Listing]:
    # Rotate through seed users as hosts
    hosts = list(user_map.values())
    listings = []
    for i, ldata in enumerate(NJ_LISTINGS):
        host = hosts[i % len(hosts)]
        listing = Listing(
            host_id=host.id,
            **ldata,
        )
        session.add(listing)
        await session.flush()
        await session.refresh(listing)
        listings.append(listing)
    print(f"  Created {len(listings)} listings.")
    return listings


async def _create_household(session, user_map: dict[str, User]) -> Household:
    rohith = user_map["rohith@urbanhut.dev"]
    household = Household(
        name="Bergen St Crew",
        admin_id=rohith.id,
        invite_code="BERGENCREW",
        max_members=6,
        status="active",
    )
    session.add(household)
    await session.flush()
    await session.refresh(household)

    # Assign 5 members to this household
    members_emails = [
        "rohith@urbanhut.dev",
        "shravani@urbanhut.dev",
        "pawan@urbanhut.dev",
        "sreeya@urbanhut.dev",
        "raviteja@urbanhut.dev",
    ]
    for email in members_emails:
        user = user_map[email]
        user.household_id = household.id
        session.add(user)

    await session.flush()
    print(f"  Created household '{household.name}' with {len(members_emails)} members.")
    return household


async def _create_chore_templates(session, household: Household) -> list[ChoreTemplate]:
    templates_data = [
        {"name": "Kitchen Deep Clean", "weight": 2.0, "frequency": 7, "time_of_day": "evening"},
        {"name": "Trash & Recycling", "weight": 1.0, "frequency": 3, "time_of_day": "morning"},
        {"name": "Bathroom Scrub", "weight": 1.5, "frequency": 7, "time_of_day": "anytime"},
        {"name": "Vacuuming Common Areas", "weight": 1.0, "frequency": 7, "time_of_day": "anytime"},
    ]
    templates = []
    for t in templates_data:
        template = ChoreTemplate(household_id=household.id, **t)
        session.add(template)
        await session.flush()
        await session.refresh(template)
        templates.append(template)
    print(f"  Created {len(templates)} chore templates.")
    return templates


async def _create_chore_assignments(session, household: Household, templates, user_map):
    members_emails = [
        "rohith@urbanhut.dev",
        "shravani@urbanhut.dev",
        "pawan@urbanhut.dev",
        "sreeya@urbanhut.dev",
        "raviteja@urbanhut.dev",
    ]
    members = [user_map[e] for e in members_emails]
    today = date.today()
    # Build 2 weeks of past assignments
    weeks = [today - timedelta(weeks=2), today - timedelta(weeks=1)]
    count = 0
    for week_start in weeks:
        for j, template in enumerate(templates):
            assigned_user = members[j % len(members)]
            status = "completed" if week_start < today else "pending"
            assignment = ChoreAssignment(
                household_id=household.id,
                chore_id=template.id,
                assigned_to=assigned_user.id,
                day_of_week=(j * 2) % 7,
                week_start=week_start,
                status=status,
                completed_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 5)) if status == "completed" else None,
                points_earned=template.weight if status == "completed" else 0.0,
            )
            session.add(assignment)
            count += 1
    await session.flush()
    print(f"  Created {count} chore assignments.")


async def _create_expenses(session, household: Household, user_map: dict[str, User]):
    members_emails = [
        "rohith@urbanhut.dev",
        "shravani@urbanhut.dev",
        "pawan@urbanhut.dev",
        "sreeya@urbanhut.dev",
        "raviteja@urbanhut.dev",
    ]
    members = [user_map[e] for e in members_emails]
    member_ids = [m.id for m in members]
    per_person_5way = lambda total: total // 5

    expenses_data = [
        {"description": "March Rent", "amount": 4750, "category": "rent",
         "date": date(2026, 3, 1), "paid_by_idx": 0, "status": "settled"},
        {"description": "March Electricity", "amount": 185, "category": "utilities",
         "date": date(2026, 3, 5), "paid_by_idx": 1, "status": "settled"},
        {"description": "Costco Groceries Run", "amount": 230, "category": "groceries",
         "date": date(2026, 3, 10), "paid_by_idx": 2, "status": "settled"},
        {"description": "April Rent", "amount": 4750, "category": "rent",
         "date": date(2026, 4, 1), "paid_by_idx": 0, "status": "settled"},
        {"description": "Internet Bill (April)", "amount": 90, "category": "utilities",
         "date": date(2026, 4, 3), "paid_by_idx": 3, "status": "settled"},
        {"description": "Cleaning Supplies", "amount": 64, "category": "household",
         "date": date(2026, 4, 8), "paid_by_idx": 1, "status": "settled"},
        {"description": "April Electricity", "amount": 198, "category": "utilities",
         "date": date(2026, 4, 10), "paid_by_idx": 4, "status": "pending"},
        {"description": "Moving Boxes & Packing", "amount": 48, "category": "household",
         "date": date(2026, 4, 15), "paid_by_idx": 2, "status": "pending"},
        {"description": "BBQ Groceries", "amount": 112, "category": "groceries",
         "date": date(2026, 4, 18), "paid_by_idx": 0, "status": "pending"},
        {"description": "May Rent (prepaid)", "amount": 4750, "category": "rent",
         "date": date(2026, 4, 20), "paid_by_idx": 3, "status": "pending"},
    ]

    count = 0
    for edata in expenses_data:
        paid_by_user = members[edata["paid_by_idx"]]
        expense = Expense(
            household_id=household.id,
            paid_by=paid_by_user.id,
            description=edata["description"],
            amount=edata["amount"],
            category=edata["category"],
            date=edata["date"],
            status=edata["status"],
            split_type="equal",
        )
        session.add(expense)
        await session.flush()
        await session.refresh(expense)

        # Create equal splits for all 5 members
        share = edata["amount"] // 5
        remainder = edata["amount"] - (share * 5)
        for k, uid in enumerate(member_ids):
            split_amount = share + (remainder if k == 0 else 0)
            paid_at = None
            split_status = "pending"
            if edata["status"] == "settled":
                paid_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10))
                split_status = "paid"
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=uid,
                amount_owed=split_amount,
                paid_at=paid_at,
                status=split_status,
            )
            session.add(split)
        count += 1

    await session.flush()
    print(f"  Created {count} expenses with splits.")


async def _create_trust_events(session, user_map: dict[str, User]):
    count = 0
    now = datetime.now(timezone.utc)
    for email, events in TRUST_EVENTS_BY_USER.items():
        user = user_map.get(email)
        if not user:
            continue
        for i, (category, event_type, points_delta) in enumerate(events):
            event = TrustEvent(
                user_id=user.id,
                category=category,
                event_type=event_type,
                points_delta=points_delta,
                event_metadata={"source": "seed"},
                decayed=False,
                decay_factor=1.0,
            )
            # Spread events over the past 90 days
            event.created_at = now - timedelta(days=90 - i * 5)
            session.add(event)
            count += 1
    await session.flush()
    print(f"  Created {count} trust events.")


# ─── Entry point ──────────────────────────────────────────────────────────────

async def run(reset: bool = False):
    async with async_session() as session:
        async with session.begin():
            if reset:
                print("Resetting seed data...")
                await _clear_seed_data(session)

            print("\nSeeding users...")
            user_map = await _create_users(session)

            print("\nSeeding listings...")
            await _create_listings(session, user_map)

            print("\nSeeding household...")
            household = await _create_household(session, user_map)

            print("\nSeeding chore templates & assignments...")
            templates = await _create_chore_templates(session, household)
            await _create_chore_assignments(session, household, templates, user_map)

            print("\nSeeding expenses...")
            await _create_expenses(session, household, user_map)

            print("\nSeeding trust events...")
            await _create_trust_events(session, user_map)

    print("\n✓ Seed complete.")
    print("\nDemo accounts (password: Seed1234!):")
    for u in USERS:
        print(f"  {u['email']:<30}  trust={u['trust_score']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Urban Hut dev database")
    parser.add_argument("--reset", action="store_true", help="Delete existing seed data before seeding")
    args = parser.parse_args()
    asyncio.run(run(reset=args.reset))
