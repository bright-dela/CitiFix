import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken

from users.models import User


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications
    Connect using: ws://localhost:8000/ws/notifications/?token=YOUR_JWT_TOKEN
    """

    async def connect(self):
        """Handle new WebSocket connection"""
        # Get JWT token from query string
        query_string = self.scope["query_string"].decode()
        token = None

        # Extract token from query string
        if "token=" in query_string:
            token = query_string.split("token=")[1].split("&")[0]

        # Authenticate the user
        user = await self.authenticate_user(token)

        if not user:
            # Reject connection if authentication fails
            await self.close(code=4001)
            return

        # Store user information
        self.user = user
        self.user_id = str(user.id)

        # Join user's personal notification group
        self.user_group = f"user_{self.user_id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        # Join role-specific groups based on user type
        if user.user_type == "authority":
            # Get authority profile
            authority = await self.get_authority_profile(user)

            if authority:
                # Join region-based group
                self.region_group = f"region_{authority.region}"
                await self.channel_layer.group_add(self.region_group, self.channel_name)

                # Join authority type group
                self.type_group = f"type_{authority.authority_type}"
                await self.channel_layer.group_add(self.type_group, self.channel_name)

        elif user.user_type == "media":
            # Join verified incidents group
            self.media_group = "verified_incidents"
            await self.channel_layer.group_add(self.media_group, self.channel_name)

        elif user.user_type == "admin":
            # Join admin group for all notifications
            self.admin_group = "admin_all"
            await self.channel_layer.group_add(self.admin_group, self.channel_name)

        # Accept the WebSocket connection
        await self.accept()

        # Send connection confirmation
        await self.send(
            text_data=json.dumps(
                {
                    "type": "connection_established",
                    "message": "Connected to real-time notifications",
                    "user_type": user.user_type,
                }
            )
        )

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave all groups the user joined
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

        if hasattr(self, "region_group"):
            await self.channel_layer.group_discard(self.region_group, self.channel_name)

        if hasattr(self, "type_group"):
            await self.channel_layer.group_discard(self.type_group, self.channel_name)

        if hasattr(self, "media_group"):
            await self.channel_layer.group_discard(self.media_group, self.channel_name)

        if hasattr(self, "admin_group"):
            await self.channel_layer.group_discard(self.admin_group, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming messages from client"""
        try:
            data = json.loads(text_data)
            message_type = data.get("type")

            if message_type == "ping":
                # Respond to keepalive ping
                await self.send(
                    text_data=json.dumps(
                        {"type": "pong", "timestamp": data.get("timestamp")}
                    )
                )

            elif message_type == "mark_read":
                # Mark notification as read
                notification_id = data.get("notification_id")
                success = await self.mark_notification_read(notification_id)

                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "notification_marked",
                            "notification_id": notification_id,
                            "success": success,
                        }
                    )
                )

        except json.JSONDecodeError:
            # Handle invalid JSON
            await self.send(
                text_data=json.dumps({"type": "error", "message": "Invalid JSON"})
            )

    # Event handlers for different notification types

    async def incident_created(self, event):
        """Handle new incident notification"""
        await self.send(
            text_data=json.dumps({"type": "incident_created", "data": event["data"]})
        )

    async def incident_assigned(self, event):
        """Handle incident assignment notification"""
        await self.send(
            text_data=json.dumps({"type": "incident_assigned", "data": event["data"]})
        )

    async def status_update(self, event):
        """Handle status change notification"""
        await self.send(
            text_data=json.dumps({"type": "status_update", "data": event["data"]})
        )

    async def incident_verified(self, event):
        """Handle incident verification notification"""
        await self.send(
            text_data=json.dumps({"type": "incident_verified", "data": event["data"]})
        )

    async def new_notification(self, event):
        """Handle general notification"""
        await self.send(
            text_data=json.dumps({"type": "notification", "data": event["data"]})
        )

    # Database operations (convert sync to async)

    @database_sync_to_async
    def authenticate_user(self, token):
        """Authenticate user from JWT token"""
        if not token:
            return None

        try:
            # Decode JWT token
            access_token = AccessToken(token)
            user_id = access_token["user_id"]

            # Get user from database
            user = User.objects.get(id=user_id, is_active=True)
            return user

        except (InvalidToken, User.DoesNotExist, KeyError):
            return None

    @database_sync_to_async
    def get_authority_profile(self, user):
        """Get authority profile for user"""
        try:
            return user.authority_profile
        except:
            return None

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark notification as read in database"""
        try:
            from notifications.models import Notification

            notification = Notification.objects.get(id=notification_id, user=self.user)
            notification.mark_as_read()
            return True

        except:
            return False
