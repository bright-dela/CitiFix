from django.db import models
from users.models import User
import uuid


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("incident_reported", "Incident Reported"),
        ("incident_assigned", "Incident Assigned"),
        ("incident_verified", "Incident Verified"),
        ("incident_resolved", "Incident Resolved"),
        ("incident_pending_assignment", "Incident Pending Assignment"),
        ("general", "General"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=100)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default="general")
    related_object = models.CharField(max_length=100, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.recipient.username}"