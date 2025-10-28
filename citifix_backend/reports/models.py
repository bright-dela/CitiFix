import uuid
from django.db import models
from django.conf import settings

class Report(models.Model):
    REPORT_TYPES = (
        ('fire', 'Fire Emergency'),
        ('accident', 'Accident'),
        ('crime', 'Crime'),
        ('infrastructure', 'Infrastructure Issue'),
        ('health', 'Health Emergency'),
        ('other', 'Other'),
    )

    SEVERITY_LEVELS = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )

    STATUS_CHOICES = (
        ('reported', 'Reported'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    )

    VISIBILITY_CHOICES = (
        ('public', 'Public'),
        ('authorities_only', 'Authorities Only'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    title = models.CharField(max_length=200)
    description = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='reported')
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='public')
    
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_reports')
    assigned_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.status}"

class ReportActionLog(models.Model):
    ACTION_TYPES = (
        ('status_change', 'Status Changed'),
        ('assignment', 'Assignment'),
        ('note_added', 'Note Added'),
        ('resolved', 'Resolved'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='action_logs')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    description = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action_type} - {self.report.title}"

def report_media_upload_path(instance, filename):
    return f'reports/{instance.report.id}/{filename}'

class MediaAttachment(models.Model):
    FILE_TYPES = (
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='media_attachments')
    file = models.FileField(upload_to=report_media_upload_path)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES)
    file_size = models.IntegerField()
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_type} - {self.report.title}"