from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer

# Create your views here.


class NotificationListView(generics.ListAPIView):
    """
    List user notifications
    Supports filtering for unread only
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        """Get notifications for the logged-in user"""
        user = self.request.user

        # Check if filtering for unread only
        show_unread = self.request.query_params.get("unread_only", "false")
        show_unread = show_unread.lower() == "true"

        if show_unread:
            return Notification.objects.filter(user=user, is_read=False)

        return Notification.objects.filter(user=user)

    def list(self, request, *args, **kwargs):
        """List notifications with pagination"""
        queryset = self.get_queryset()

        # Pagination
        page = int(request.query_params.get("page", 1))
        page_size = 20
        start = (page - 1) * page_size
        end = start + page_size

        # Get counts
        total = queryset.count()
        unread_count = Notification.objects.filter(
            user=request.user, is_read=False
        ).count()

        # Get page of notifications
        notifications = queryset[start:end]

        # Serialize
        serializer = self.get_serializer(notifications, many=True)

        return Response(
            {
                "results": serializer.data,
                "count": total,
                "unread_count": unread_count,
                "page": page,
                "page_size": page_size,
                "has_next": end < total,
            }
        )


class MarkNotificationReadView(APIView):
    """
    Mark a single notification as read
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        """Mark notification as read"""
        try:
            # Get notification for this user
            notification = Notification.objects.get(
                id=notification_id, user=request.user
            )

            # Mark as read
            notification.mark_as_read()

            return Response(
                {
                    "message": "Notification marked as read",
                    "notification_id": str(notification.id),
                }
            )

        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found"}, status=status.HTTP_404_NOT_FOUND
            )


class MarkAllReadView(APIView):
    """
    Mark all notifications as read
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Mark all user's notifications as read"""
        # Update all unread notifications
        updated_count = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True, read_at=timezone.now())

        return Response(
            {
                "message": f"{updated_count} notifications marked as read",
                "count": updated_count,
            }
        )
