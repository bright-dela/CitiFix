from django.urls import re_path
from .consumers import NotificationConsumer

websocket_urlpatterns = [
    # WebSocket endpoint for real-time notifications
    # Connect to: ws://localhost:8000/ws/notifications/?token=YOUR_JWT_TOKEN
    re_path(r"ws/notifications/$", NotificationConsumer.as_asgi()),
]
