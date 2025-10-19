from django.urls import path
from .views import (
    NotificationListView,
    MarkNotificationReadView,
    MarkAllReadView,
)

urlpatterns = [
    # List notifications
    path('', 
         NotificationListView.as_view(), 
         name='list-notifications'),
    
    # Mark single notification as read
    path('<uuid:notification_id>/read/', 
         MarkNotificationReadView.as_view(), 
         name='mark-read'),
    
    # Mark all notifications as read
    path('mark-all-read/', 
         MarkAllReadView.as_view(), 
         name='mark-all-read'),
]
