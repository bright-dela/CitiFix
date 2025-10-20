from rest_framework import serializers
from .models import Incident, IncidentMedia, Assignment, IncidentUpdate


class IncidentMediaSerializer(serializers.ModelSerializer):
    """Serializer for incident media files"""
    
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = IncidentMedia
        fields = ['id', 'media_type', 'file_url', 'file_size', 'uploaded_at']
    
    def get_file_url(self, obj):
        """Get the full URL for the media file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class IncidentCreateSerializer(serializers.Serializer):
    """
    Serializer for creating new incidents
    Used by citizens to report emergencies
    """
    
    incident_type = serializers.ChoiceField(
        choices=['fire', 'medical', 'crime', 'accident', 'disaster', 'other']
    )
    severity = serializers.ChoiceField(
        choices=['low', 'medium', 'high', 'critical']
    )
    description = serializers.CharField(max_length=500)
    
    # Location fields
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8)
    address = serializers.CharField(required=False, allow_blank=True)
    
    # Privacy option
    is_anonymous = serializers.BooleanField(default=False)
    
    def create(self, validated_data):
        """Create new incident from validated data"""
        # Get the user making the report
        user = self.context['request'].user
        
        # Determine reporter (None if anonymous)
        reporter = None
        if not validated_data.get('is_anonymous'):
            try:
                reporter = user.citizen_profile
            except AttributeError:
                # Create citizen profile if it doesn't exist
                from users.models import CitizenProfile
                reporter = CitizenProfile.objects.create(user=user)
        
        # Create the incident
        incident = Incident.objects.create(
            reporter=reporter,
            incident_type=validated_data['incident_type'],
            severity=validated_data['severity'],
            description=validated_data['description'],
            location_latitude=validated_data['latitude'],
            location_longitude=validated_data['longitude'],
            location_address=validated_data.get('address', ''),
            is_anonymous=validated_data.get('is_anonymous', False),
            status='pending'
        )
        
        # Auto-verify for trusted reporters (reputation > 0.7)
        if reporter and reporter.reputation_score > 0.7:
            incident.status = 'verified'
            incident.trust_score = reporter.reputation_score
            incident.media_access_level = 'basic'
            incident.save()
        
        return incident
    
    def to_representation(self, instance):
        """Return incident data after creation"""
        return {
            'id': str(instance.id),
            'incident_type': instance.incident_type,
            'severity': instance.severity,
            'status': instance.status,
            'description': instance.description,
            'location_latitude': float(instance.location_latitude),
            'location_longitude': float(instance.location_longitude),
            'location_address': instance.location_address,
            'is_anonymous': instance.is_anonymous,
            'created_at': instance.created_at.isoformat() if instance.created_at else None,
        }


class IncidentListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing incidents
    Shows basic information
    """
    
    reporter_name = serializers.SerializerMethodField()
    media_count = serializers.IntegerField(
        source='media_files.count', 
        read_only=True
    )
    
    class Meta:
        model = Incident
        fields = [
            'id', 'incident_type', 'severity', 'status', 'description',
            'location_latitude', 'location_longitude', 'location_address',
            'district', 'region', 'reporter_name', 'media_count',
            'trust_score', 'created_at', 'updated_at'
        ]
    
    def get_reporter_name(self, obj):
        """Get reporter name (or 'Anonymous' if anonymous)"""
        if obj.is_anonymous:
            return 'Anonymous'
        
        if obj.reporter:
            return obj.reporter.user.full_name
        
        return 'Unknown'


class IncidentDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for single incident
    Includes all related data
    """
    
    reporter = serializers.SerializerMethodField()
    media_files = IncidentMediaSerializer(many=True, read_only=True)
    assignments = serializers.SerializerMethodField()
    
    class Meta:
        model = Incident
        fields = '__all__'
    
    def get_reporter(self, obj):
        """Get reporter information"""
        if obj.is_anonymous:
            return {'name': 'Anonymous'}
        
        if obj.reporter:
            return {
                'id': str(obj.reporter.id),
                'name': obj.reporter.user.full_name,
                'reputation_score': float(obj.reporter.reputation_score),
                'total_reports': obj.reporter.total_reports,
            }
        
        return None
    
    def get_assignments(self, obj):
        """Get list of assignments for this incident"""
        assignments = obj.assignments.all()
        
        assignment_list = []
        for assignment in assignments:
            assignment_list.append({
                'id': str(assignment.id),
                'authority': assignment.authority.organization_name,
                'status': assignment.status,
                'assigned_at': assignment.assigned_at,
            })
        
        return assignment_list


class FilteredIncidentSerializer(serializers.ModelSerializer):
    """
    Filtered incident serializer for media houses
    Respects subscription tiers (basic vs premium)
    """
    
    location = serializers.SerializerMethodField()
    reporter = serializers.SerializerMethodField()
    
    class Meta:
        model = Incident
        fields = [
            'id', 'incident_type', 'severity', 'status', 'description',
            'location', 'reporter', 'trust_score', 'created_at'
        ]
    
    def get_location(self, obj):
        """Get location based on subscription tier"""
        # Get subscription tier from context
        tier = self.context.get('subscription_tier', 'basic')
        
        if tier == 'premium':
            # Premium: Full location details
            return {
                'latitude': float(obj.location_latitude),
                'longitude': float(obj.location_longitude),
                'address': obj.location_address,
                'district': obj.district,
                'region': obj.region,
            }
        else:
            # Basic: Only district and region
            return {
                'district': obj.district,
                'region': obj.region,
            }
    
    def get_reporter(self, obj):
        """Get reporter info based on subscription tier"""
        tier = self.context.get('subscription_tier', 'basic')
        
        # Premium users can see reporter details (if not anonymous)
        if tier == 'premium' and not obj.is_anonymous and obj.reporter:
            return {
                'name': obj.reporter.user.full_name,
                'reputation_score': float(obj.reporter.reputation_score),
            }
        
        return None


class AssignmentSerializer(serializers.ModelSerializer):
    """Serializer for incident assignments"""
    
    incident_summary = serializers.SerializerMethodField()
    authority_name = serializers.CharField(
        source='authority.organization_name', 
        read_only=True
    )
    
    class Meta:
        model = Assignment
        fields = '__all__'
    
    def get_incident_summary(self, obj):
        """Get summary of the incident"""
        location = obj.incident.location_address
        if not location:
            location = f"{obj.incident.district}, {obj.incident.region}"
        
        return {
            'id': str(obj.incident.id),
            'type': obj.incident.incident_type,
            'severity': obj.incident.severity,
            'location': location,
        }


class IncidentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for incident updates/timeline"""
    
    updated_by_name = serializers.CharField(
        source='updated_by.full_name', 
        read_only=True
    )
    
    class Meta:
        model = IncidentUpdate
        fields = [
            'id', 'update_type', 'old_status', 'new_status', 
            'message', 'updated_by_name', 'created_at'
        ]
