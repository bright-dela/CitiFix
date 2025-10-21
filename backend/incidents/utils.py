import math
import requests
from django.conf import settings
from django.utils import timezone
from .models import AuthorityProfile, Incident


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance (in kilometers) between two geographic points
    using the Haversine formula.
    """

    # handle missing coordinates safely
    if not all([lat1, lon1, lat2, lon2]):
        return None

    # Earth radius in kilometers
    R = 6371.0

    # Convert degrees to radians
    lat1_rad, lon1_rad = math.radians(float(lat1)), math.radians(float(lon1))
    lat2_rad, lon2_rad = math.radians(float(lat2)), math.radians(float(lon2))

    # Compute differences
    diff_lat = lat2_rad - lat1_rad
    diff_lon = lon2_rad - lon1_rad

    # Haversine formula
    a = (
        math.sin(diff_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(diff_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(R * c, 2)


def find_nearest_authority(lat, lon, authority_type=None):
    """
    Find the nearest approved authority to the given coordinates.
    Optionally filter by authority type (e.g. 'fire', 'police', 'hospital').
    """

    if not lat or not lon:
        return None

    # Base queryset: only approved authorities with valid coordinates
    authorities = AuthorityProfile.objects.filter(
        approval_status="approved",
        station_latitude__isnull=False,
        station_longitude__isnull=False,
    )

    # Optional filtering (e.g. fire incidents only look for fire service)
    if authority_type:
        authorities = authorities.filter(authority_type=authority_type)

    nearest_authority = None
    nearest_distance = float("inf")

    for auth in authorities:
        distance = calculate_distance(
            lat, lon, auth.station_latitude, auth.station_longitude
        )
        if distance is not None and distance < nearest_distance:
            nearest_authority = auth
            nearest_distance = distance

    return nearest_authority


def auto_assign_incident(incident):
    """
    Automatically assign an incident to the nearest approved authority
    based on the incident type and location.
    """

    if not incident.latitude or not incident.longitude:
        return None

    # Match authority type based on incident category (simple mapping for now)
    type_map = {
        "fire": "fire",
        "accident": "ambulance",
        "crime": "police",
        "medical": "hospital",
    }

    incident_type = type_map.get(incident.category, None)
    nearest_authority = find_nearest_authority(
        incident.latitude, incident.longitude, authority_type=incident_type
    )

    if nearest_authority:
        incident.assigned_authority = nearest_authority.user
        incident.assigned_at = timezone.now()
        incident.status = "assigned"
        incident.save(update_fields=["assigned_authority", "assigned_at", "status"])
        return nearest_authority

    return None


def get_location_details(latitude, longitude):
    """
    Convert coordinates into a readable address and nearby landmark.
    Using OpenCage API.
    """
    try:
        api_key = getattr(settings, "OPENCAGE_API_KEY", None)
        if not api_key:
            return None

        url = (
            f"https://api.opencagedata.com/geocode/v1/json?"
            f"q={latitude}+{longitude}&key={api_key}&language=en"
        )
        response = requests.get(url, timeout=10)
        data = response.json()

        if response.status_code == 200 and data.get("results"):
            result = data["results"][0]
            components = result.get("components", {})
            annotations = result.get("annotations", {})

            return {
                "address": result.get("formatted"),
                "district": components.get("suburb") or components.get("county"),
                "region": components.get("state"),
                "country": components.get("country"),
                "landmark": components.get("poi")
                or components.get("road")
                or annotations.get("place", {}).get("name")
                or annotations.get("nearest", {}).get("place")
                or None,
            }

        return None

    except Exception as e:
        print(f"[Geo Error] Could not fetch location: {e}")
        return None
