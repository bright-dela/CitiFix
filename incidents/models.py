from django.db import models
from django.core.validators import FileExtensionValidator
from users.models import User, CitizenProfile, AuthorityProfile
import uuid
import os


# Create your models here.


def incident_media_path(instance, filename):
    """
    Generate upload path for incident media files
    Format: incidents/{incident_id}/{random_filename}.{extension}
    """
    extension = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4()}.{extension}"
    return os.path.join('incidents', str(instance.incident.id), new_filename)



class Incident(models.Model):
    """
    Main incident model
    Stores emergency reports from citizens
    """
    
    INCIDENT_TYPES = [
        ('fire', 'Fire'),
        ('medical', 'Medical Emergency'),
        ('crime', 'Crime'),
        ('accident', 'Accident'),
        ('disaster', 'Natural Disaster'),
        ('other', 'Other'),
    ]
  
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('assigned', 'Assigned to Authority'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        CitizenProfile, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='incidents'
    )
  
    incident_type = models.CharField(max_length=30, choices=INCIDENT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
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
        related_name='verified_incidents'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Media house access control
    media_access_level = models.CharField(
        max_length=20,
        choices=[
            ('none', 'None'), 
            ('basic', 'Basic'), 
            ('premium', 'Premium')
        ],
        default='none'
    )
    
    
    class Meta:
        db_table = 'incidents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['incident_type']),
            models.Index(fields=['severity']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_incident_type_display()} - {self.get_severity_display()}"
    
    def update_reporter_stats(self, verified=True):
        """
        Update the reporter's statistics
        Called when incident is verified or resolved
        """
        if self.reporter:
            if verified:
                self.reporter.verified_reports += 1
                
                # Improve reputation score (max 1.0)
                current_score = float(self.reporter.reputation_score)
                new_score = min(1.0, current_score + 0.05)
                self.reporter.reputation_score = new_score
            
            # Increase total reports count
            self.reporter.total_reports += 1
            self.reporter.save()


class IncidentMedia(models.Model):
    """
    Media files attached to incidents
    Photos and videos as evidence
    """
    
    MEDIA_TYPES = [
        ('photo', 'Photo'),
        ('video', 'Video'),
    ]
    
    # Basic fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident, 
        on_delete=models.CASCADE, 
        related_name='media_files'
    )
    
    # File information
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES)
    file = models.FileField(
        upload_to=incident_media_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=['jpg', 'jpeg', 'png', 'mp4', 'mov']
            )
        ]
    )
    file_size = models.IntegerField(help_text='File size in bytes')
    
    # EXIF data from photo/video (if available)
    captured_at = models.DateTimeField(null=True, blank=True)
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=8, 
        null=True, 
        blank=True
    )
    longitude = models.DecimalField(
        max_digits=11, 
        decimal_places=8, 
        null=True, 
        blank=True
    )
    
    # Timestamp
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'incident_media'
        indexes = [
            models.Index(fields=['incident']),
            models.Index(fields=['media_type']),
        ]
    
    def __str__(self):
        return f"{self.get_media_type_display()} for {self.incident.id}"


class Assignment(models.Model):
    """
    Assignment of incidents to authorities
    Tracks which authority is responding to which incident
    """
    
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('en_route', 'En Route'),
        ('arrived', 'Arrived'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('cancelled', 'Cancelled'),
    ]
    
    # Basic fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident, 
        on_delete=models.CASCADE, 
        related_name='assignments'
    )
    authority = models.ForeignKey(
        AuthorityProfile, 
        on_delete=models.CASCADE, 
        related_name='assignments'
    )
    
    # Assignment details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='assigned')
    assigned_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='assigned_incidents'
    )
    
    # Distance and time estimates
    distance_km = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    estimated_arrival_min = models.IntegerField(null=True, blank=True)
    
    # Additional notes
    notes = models.TextField(blank=True)
    
    # Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True)
    arrived_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'assignments'
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['incident']),
            models.Index(fields=['authority']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.authority.organization_name} -> {self.incident.id}"


class IncidentUpdate(models.Model):
    """
    Timeline of incident updates
    Tracks all changes and actions on an incident
    """
    
    UPDATE_TYPES = [
        ('status_change', 'Status Change'),
        ('assignment', 'Assignment'),
        ('comment', 'Comment'),
        ('verification', 'Verification'),
    ]
    
    # Basic fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    incident = models.ForeignKey(
        Incident, 
        on_delete=models.CASCADE, 
        related_name='updates'
    )
    updated_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Update details
    update_type = models.CharField(max_length=20, choices=UPDATE_TYPES)
    old_status = models.CharField(max_length=50, blank=True)
    new_status = models.CharField(max_length=50, blank=True)
    message = models.TextField()
    
    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'incident_updates'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['incident']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.update_type} - {self.incident.id}"


class MediaAccess(models.Model):
    """
    Track media house access to incidents
    For analytics and audit purposes
    """
    
    ACCESS_TYPES = [
        ('view', 'View'),
        ('download', 'Download'),
    ]
    
    # Basic fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    media_house = models.ForeignKey(
        'users.MediaHouseProfile', 
        on_delete=models.CASCADE
    )
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE)
    media_file = models.ForeignKey(
        IncidentMedia, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    # Access details
    access_type = models.CharField(max_length=10, choices=ACCESS_TYPES)
    
    # Timestamp
    accessed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'media_access_log'
        ordering = ['-accessed_at']
        indexes = [
            models.Index(fields=['media_house']),
            models.Index(fields=['incident']),
            models.Index(fields=['accessed_at']),
        ]
    
    def __str__(self):
        return f"{self.media_house.organization_name} - {self.access_type}"
