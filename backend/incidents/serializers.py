from rest_framework import serializers
from .models import Incident, Assignment, IncidentUpdate, IncidentMedia, MediaAccess
from users.models import AuthorityProfile
from .utils import get_location_details, calculate_distance


class IncidentSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source="reporter.user.full_name", read_only=True)
    verified_by_name = serializers.CharField(
        source="verified_by.organization_name", read_only=True
    )
    location_info = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = [
            "id",
            "incident_type",
            "severity",
            "status",
            "description",
            "reporter",
            "reporter_name",
            "verified_by",
            "verified_by_name",
            "verified_at",
            "resolved_at",
            "location_latitude",
            "location_longitude",
            "location_address",
            "district",
            "region",
            "trust_score",
            "is_anonymous",
            "media_access_level",
            "created_at",
            "updated_at",
            "location_info",
        ]
        read_only_fields = [
            "status",
            "verified_by",
            "verified_at",
            "resolved_at",
            "trust_score",
            "created_at",
            "updated_at",
            "location_info",
        ]

    def get_location_info(self, obj):
        if obj.location_latitude and obj.location_longitude:
            return get_location_details(obj.location_latitude, obj.location_longitude)
        return None




class AssignmentSerializer(serializers.ModelSerializer):
    incident_type = serializers.CharField(source="incident.incident_type", read_only=True)
    authority_name = serializers.CharField(source="authority.organization_name", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.full_name", read_only=True)
    distance_km = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)

    class Meta:
        model = Assignment
        fields = [
            "id",
            "incident",
            "incident_type",
            "authority",
            "authority_name",
            "assigned_by",
            "assigned_by_name",
            "status",
            "distance_km",
            "estimated_arrival_min",
            "notes",
            "assigned_at",
            "arrived_at",
            "resolved_at",
            "updated_at",
        ]
        read_only_fields = [
            "assigned_by",
            "assigned_at",
            "arrived_at",
            "resolved_at",
            "updated_at",
            "distance_km",
        ]




class IncidentUpdateSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(source="updated_by.full_name", read_only=True)

    class Meta:
        model = IncidentUpdate
        fields = [
            "id",
            "incident",
            "update_type",
            "old_status",
            "new_status",
            "message",
            "updated_by",
            "updated_by_name",
            "created_at",
        ]
        read_only_fields = ["created_at", "updated_by", "updated_by_name"]




class IncidentMediaSerializer(serializers.ModelSerializer):
    incident_type = serializers.CharField(source="incident.incident_type", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = IncidentMedia
        fields = [
            "id",
            "incident",
            "incident_type",
            "media_type",
            "file",
            "file_url",
            "file_size",
            "captured_at",
            "latitude",
            "longitude",
            "uploaded_at",
        ]
        read_only_fields = ["uploaded_at", "file_url"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url



class MediaAccessSerializer(serializers.ModelSerializer):
    media_house_name = serializers.CharField(
        source="media_house.organization_name", read_only=True
    )
    incident_type = serializers.CharField(source="incident.incident_type", read_only=True)

    class Meta:
        model = MediaAccess
        fields = [
            "id",
            "media_house",
            "media_house_name",
            "incident",
            "incident_type",
            "media_file",
            "access_type",
            "accessed_at",
        ]
        read_only_fields = ["accessed_at"]
