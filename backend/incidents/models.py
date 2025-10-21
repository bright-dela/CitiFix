from django.db import models
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from users.models import User, CitizenProfile, AuthorityProfile
import uuid
import os


def incident_media_path(instance, filename):
    """
    Upload path for incident media.
    Example: incidents/{incident_id}/{unique_id}.ext
    """
    ext = filename.split(".")[-1]
    new_name = f"{uuid.uuid4()}.{ext}"
    return os.path.join("incidents", str(instance.incident.id), new_name)


class Incident(models.Model):
    """Main model for reported incidents."""

    INCIDENT_TYPES = [
        ("fire", "Fire"),
        ("medical", "Medical Emergency"),
        ("crime", "Crime"),
        ("accident", "Accident"),
        ("disaster", "Natural Disaster"),
        ("other", "Other"),
    ]

    SEVERITY_LEVELS = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending Verification"),
        ("verified", "Verified"),
        ("assigned", "Assigned"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        CitizenProfile,
        on_delete=models.SET_NULL,
        null=True,
        related_name="incidents",
    )
    incident_type = models.CharField(max_length=30, choices=INCIDENT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")
    description = models.TextField(max_length=500)

    location_latitude = models.DecimalField(max_digits=10, decimal_places=8)
    location_longitude = models.DecimalField(max_digits=11, decimal_places=8)
    location_address = models.TextField(blank=True)
    district = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)

    trust_score = models.DecimalField(max_digits=3, decimal_places=2, default=0.50)
    is_anonymous = models.BooleanField(default=False)

    verified_by = models.ForeignKey(
        AuthorityProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_incidents",
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    media_access_level = models.CharField(
        max_length=20,
        choices=[("none", "None"), ("basic", "Basic"), ("premium", "Premium")],
        default="none",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "incidents"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["incident_type"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["status"]),
            models.Index(fields=["region"]),
        ]

    def __str__(self):
        return f"{self.get_incident_type_display()} - {self.get_severity_display()}"

    def update_reporter_stats(self, verified=True):
        """Update citizen stats when incident is verified or resolved."""
        if self.reporter:
            self.reporter.total_reports += 1
            if verified:
                self.reporter.verified_reports += 1
                self.reporter.reputation_score = min(
                    1.0, float(self.reporter.reputation_score) + 0.05
                )
            self.reporter.save()


class IncidentMedia(models.Model):
    """Media attachments (photos/videos) for incidents."""

    MEDIA_TYPES = [
        ("photo", "Photo"),
        ("video", "Video"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name="media_files"
    )
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES)
    file = models.FileField(
        upload_to=incident_media_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=["jpg", "jpeg", "png", "mp4", "mov"]
            )
        ],
    )
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    captured_at = models.DateTimeField(null=True, blank=True)
    latitude = models.DecimalField(
        max_digits=10, decimal_places=8, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=11, decimal_places=8, null=True, blank=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "incident_media"
        indexes = [
            models.Index(fields=["incident"]),
            models.Index(fields=["media_type"]),
        ]

    def __str__(self):
        return f"{self.media_type.capitalize()} - {self.incident.id}"


class Assignment(models.Model):
    """Tracks which authority is handling a given incident."""

    STATUS_CHOICES = [
        ("assigned", "Assigned"),
        ("en_route", "En Route"),
        ("arrived", "Arrived"),
        ("in_progress", "In Progress"),
        ("resolved", "Resolved"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name="assignments"
    )
    authority = models.ForeignKey(
        AuthorityProfile, on_delete=models.CASCADE, related_name="assignments"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="assigned")
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="assigned_incidents"
    )
    distance_km = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True
    )
    estimated_arrival_min = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    arrived_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assignments"
        ordering = ["-assigned_at"]
        indexes = [
            models.Index(fields=["incident"]),
            models.Index(fields=["authority"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.authority.organization_name} -> {self.incident.id}"


class IncidentUpdate(models.Model):
    """Keeps a history of all updates or comments on an incident."""

    UPDATE_TYPES = [
        ("status_change", "Status Change"),
        ("assignment", "Assignment"),
        ("comment", "Comment"),
        ("verification", "Verification"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name="updates"
    )
    updated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    update_type = models.CharField(max_length=20, choices=UPDATE_TYPES)
    old_status = models.CharField(max_length=50, blank=True)
    new_status = models.CharField(max_length=50, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "incident_updates"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["incident"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.update_type} - {self.incident.id}"



class MediaAccess(models.Model):
    """Keep track of which media houses accessed verified incidents."""

    ACCESS_CHOICES = [
        ("view", "View"),
        ("download", "Download"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    media_house = models.ForeignKey(
        "users.MediaHouseProfile",
        on_delete=models.CASCADE,
        related_name="access_logs"
    )
    incident = models.ForeignKey(
        "incidents.Incident",
        on_delete=models.CASCADE,
        related_name="media_access"
    )
    access_type = models.CharField(max_length=10, choices=ACCESS_CHOICES)
    accessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "media_access"
        ordering = ["-accessed_at"]

    def __str__(self):
        return f"{self.media_house.organization_name} - {self.access_type}"
