from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def send_notification(user_id, title, message):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "send_notification",
            "data": {
                "title": title,
                "message": message,
            },
        },
    )
