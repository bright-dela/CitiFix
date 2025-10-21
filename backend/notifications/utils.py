from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification


def create_and_send_notification(
    recipient,
    title,
    message,
    notification_type="general",
    related_object=None,
):
    """
    Create a Notification object and send it instantly via WebSocket.
    Works seamlessly with InMemoryChannelLayer and SimpleJWT.
    """

    # Create a persistent notification record
    notification = Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notification_type=notification_type,
        related_object=related_object,
        timestamp=timezone.now(),
    )

    # Broadcast notification in real-time (WebSocket)
    channel_layer = get_channel_layer()
    group_name = f"user_{recipient.id}"  # Each user joins their own group on connect

    payload = {
        "type": "new.notification",  # Triggers consumer method `new_notification`
        "event": "new_notification",
        "data": {
            "id": str(notification.id),
            "title": title,
            "message": message,
            "notification_type": notification_type,
            "timestamp": notification.timestamp.isoformat(),
            "is_read": notification.is_read,
        },
    }

    # Safe send — prevents crash if user is not connected
    try:
        async_to_sync(channel_layer.group_send)(group_name, payload)
    except Exception as e:
        # Log this later with sentry/logger in production
        print(f"WebSocket send failed for {recipient}: {e}")

    return notification
