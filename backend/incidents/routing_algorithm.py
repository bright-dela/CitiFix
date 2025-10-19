"""
Smart Incident Routing Algorithm
Intelligently assigns incidents to the best available authority
Considers: distance, workload, authority type, response history
"""
from typing import Optional, Tuple, List
from geopy.distance import geodesic
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from users.models import AuthorityProfile
from .models import Incident, Assignment


class IncidentRouter:
    """
    Intelligent incident routing system
    Finds the best authority to respond to an incident
    """
    
    # Map incident types to authority types
    TYPE_MAPPING = {
        'fire': ['fire'],
        'medical': ['ambulance', 'hospital'],
        'crime': ['police'],
        'accident': ['police', 'ambulance'],
        'disaster': ['fire', 'police', 'ambulance'],
        'other': ['police'],
    }
    
    # Maximum distance to consider (kilometers)
    MAX_DISTANCE_KM = 50
    
    # Scoring weights (must total 1.0)
    WEIGHTS = {
        'distance': 0.40,      # Proximity is most important
        'workload': 0.30,      # Avoid overloading units
        'response_time': 0.20, # Past performance matters
        'type_match': 0.10,    # Prefer specialists
    }
    
    def find_best_authority(self, incident: Incident) -> Optional[Tuple[AuthorityProfile, dict]]:
        """
        Find the best authority for an incident
        Returns: (authority, score_details) or (None, None) if none found
        """
        # Get authorities that can respond to this incident
        eligible_authorities = self._get_eligible_authorities(incident)
        
        if not eligible_authorities:
            return None, None
        
        # Get incident coordinates
        incident_coords = (
            float(incident.location_latitude),
            float(incident.location_longitude)
        )
        
        # Score each authority
        scored_authorities = []
        
        for authority in eligible_authorities:
            score_details = self._calculate_score(
                authority, 
                incident, 
                incident_coords
            )
            
            # Only consider authorities with positive scores
            if score_details['total_score'] > 0:
                scored_authorities.append({
                    'authority': authority,
                    'score': score_details['total_score'],
                    'details': score_details
                })
        
        if not scored_authorities:
            return None, None
        
        # Sort by score (highest first)
        scored_authorities.sort(key=lambda x: x['score'], reverse=True)
        
        # Return the best match
        best = scored_authorities[0]
        return best['authority'], best['details']
    
    def _get_eligible_authorities(self, incident: Incident):
        """Get authorities that can respond to this incident"""
        # Get matching authority types for this incident
        authority_types = self.TYPE_MAPPING.get(
            incident.incident_type, 
            ['police']
        )
        
        # Base query: approved and active authorities
        base_query = AuthorityProfile.objects.filter(
            approval_status='approved',
            authority_type__in=authority_types,
            user__is_active=True
        )
        
        # Prefer authorities in the same region
        same_region = base_query.filter(region=incident.region)
        
        if same_region.exists():
            return same_region
        
        # If no authorities in same region, expand search
        return base_query
    
    def _calculate_score(self, authority: AuthorityProfile, 
                        incident: Incident, 
                        incident_coords: tuple) -> dict:
        """Calculate comprehensive score for an authority"""
        
        # 1. Distance Score
        distance_score, distance_km = self._score_distance(
            authority, 
            incident_coords
        )
        
        # Reject if too far
        if distance_km > self.MAX_DISTANCE_KM:
            return {
                'total_score': 0,
                'distance_km': distance_km,
                'reason': 'too_far'
            }
        
        # 2. Workload Score
        workload_score, current_workload = self._score_workload(authority)
        
        # 3. Response Time Score
        response_score = self._score_response_time(authority)
        
        # 4. Type Match Score
        type_score = self._score_type_match(authority, incident)
        
        # Calculate weighted total score
        total_score = (
            distance_score * self.WEIGHTS['distance'] +
            workload_score * self.WEIGHTS['workload'] +
            response_score * self.WEIGHTS['response_time'] +
            type_score * self.WEIGHTS['type_match']
        )
        
        # Boost for critical incidents if authority is not overloaded
        if incident.severity == 'critical' and current_workload < 3:
            total_score = total_score * 1.2
        
        # Calculate estimated time of arrival
        eta_minutes = self._calculate_eta(distance_km, incident.severity)
        
        return {
            'total_score': round(total_score, 3),
            'distance_score': round(distance_score, 3),
            'workload_score': round(workload_score, 3),
            'response_score': round(response_score, 3),
            'type_score': round(type_score, 3),
            'distance_km': round(distance_km, 2),
            'current_workload': current_workload,
            'eta_minutes': eta_minutes
        }
    
    def _score_distance(self, authority: AuthorityProfile, 
                       incident_coords: tuple) -> Tuple[float, float]:
        """Score based on distance (closer is better)"""
        # Check if authority has location coordinates
        if not authority.station_latitude or not authority.station_longitude:
            return 0.5, float('inf')
        
        # Get authority coordinates
        auth_coords = (
            float(authority.station_latitude),
            float(authority.station_longitude)
        )
        
        # Calculate distance
        distance_km = geodesic(incident_coords, auth_coords).kilometers
        
        # Score based on distance ranges
        if distance_km <= 5:
            score = 1.0
        elif distance_km <= 10:
            score = 0.9
        elif distance_km <= 20:
            score = 0.7
        elif distance_km <= 30:
            score = 0.5
        elif distance_km <= 40:
            score = 0.3
        else:
            score = 0.1
        
        return score, distance_km
    
    def _score_workload(self, authority: AuthorityProfile) -> Tuple[float, int]:
        """Score based on current workload (less busy is better)"""
        # Count active assignments
        active_count = Assignment.objects.filter(
            authority=authority,
            status__in=['assigned', 'en_route', 'in_progress']
        ).count()
        
        # Score inversely proportional to workload
        if active_count == 0:
            score = 1.0  # Not busy at all
        elif active_count == 1:
            score = 0.8  # Slightly busy
        elif active_count == 2:
            score = 0.5  # Moderately busy
        elif active_count == 3:
            score = 0.3  # Very busy
        else:
            score = 0.1  # Overloaded
        
        return score, active_count
    
    def _score_response_time(self, authority: AuthorityProfile) -> float:
        """Score based on historical response time"""
        # Get resolved assignments from last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        resolved_assignments = Assignment.objects.filter(
            authority=authority,
            status='resolved',
            resolved_at__isnull=False,
            assigned_at__gte=thirty_days_ago
        )
        
        # If no history, return neutral score
        if not resolved_assignments.exists():
            return 0.7
        
        # Calculate average response time
        total_minutes = 0
        count = 0
        
        for assignment in resolved_assignments:
            time_diff = assignment.resolved_at - assignment.assigned_at
            minutes = time_diff.total_seconds() / 60
            total_minutes += minutes
            count += 1
        
        avg_minutes = total_minutes / count if count > 0 else 30
        
        # Score based on average response time
        if avg_minutes <= 15:
            return 1.0  # Excellent
        elif avg_minutes <= 25:
            return 0.8  # Good
        elif avg_minutes <= 40:
            return 0.6  # Average
        else:
            return 0.4  # Slow
    
    def _score_type_match(self, authority: AuthorityProfile, 
                         incident: Incident) -> float:
        """Score based on how well authority type matches incident"""
        # Perfect matches (specialist for incident type)
        perfect_matches = {
            'fire': 'fire',
            'medical': 'ambulance',
            'crime': 'police',
        }
        
        # Check for perfect match
        perfect = perfect_matches.get(incident.incident_type)
        if perfect and authority.authority_type == perfect:
            return 1.0
        
        # Check if authority can handle this incident type
        can_handle = self.TYPE_MAPPING.get(incident.incident_type, [])
        if authority.authority_type in can_handle:
            return 0.8
        
        # Can respond but not ideal
        return 0.5
    
    def _calculate_eta(self, distance_km: float, severity: str) -> int:
        """Calculate estimated time of arrival in minutes"""
        # Faster response for critical incidents
        avg_speed = 60 if severity == 'critical' else 40  # km/h
        
        # Calculate travel time
        travel_time = (distance_km / avg_speed) * 60  # minutes
        
        # Add preparation time
        prep_time = 3 if severity == 'critical' else 5
        
        return int(travel_time + prep_time)
    
    def assign_multiple_units(self, incident: Incident, count: int = 2) -> List[Tuple[AuthorityProfile, dict]]:
        """
        Assign multiple units for critical incidents
        Returns: list of (authority, details) tuples
        """
        assigned = []
        excluded_ids = []
        
        incident_coords = (
            float(incident.location_latitude),
            float(incident.location_longitude)
        )
        
        for _ in range(count):
            # Get eligible authorities (excluding already assigned)
            eligible = self._get_eligible_authorities(incident).exclude(
                id__in=excluded_ids
            )
            
            if not eligible:
                break
            
            # Find best from remaining authorities
            best_score = 0
            best_authority = None
            best_details = None
            
            for authority in eligible:
                score_details = self._calculate_score(
                    authority, 
                    incident, 
                    incident_coords
                )
                
                if score_details['total_score'] > best_score:
                    best_score = score_details['total_score']
                    best_authority = authority
                    best_details = score_details
            
            # Add to list if found
            if best_authority:
                assigned.append((best_authority, best_details))
                excluded_ids.append(best_authority.id)
        
        return assigned