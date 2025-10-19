from django.db import models
from django.utils import timezone
from users.models import User
import uuid

# Create your models here.

class Notification(models.Model):
    """
    User notifications
    Keeps users informed about important events
    """
  
    NOTIFICATION_TYPES = [
        ('approval', 'Approval'),
        ('assignment', 'Assignment'),
        ('status_change', 'Status Change'),
        ('verification', 'Verification'),
        ('general', 'General'),
    ]

    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
  
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
   
    priority = models.CharField(
        max_length=10, 
        choices=PRIORITY_LEVELS, 
        default='medium'
    )
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.full_name}"
    
    def mark_as_read(self):
        """Mark this notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
