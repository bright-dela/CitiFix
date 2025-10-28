import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_authenticated:
            await self.channel_layer.group_add(
                f"user_{self.user.id}",
                self.channel_name
            )
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and self.user.is_authenticated:
            await self.channel_layer.group_discard(
                f"user_{self.user.id}",
                self.channel_name
            )

    async def receive(self, text_data):
        pass

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event["data"]))

    async def report_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'report_update',
            'data': event["data"]
        }))

    async def new_report(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_report',
            'data': event["data"]
        }))

    async def stats_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'stats_update',
            'data': event["data"]
        }))