from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from .models import Incident, Assignment, IncidentMedia, IncidentUpdate, MediaAccess
from .serializers import (
    IncidentSerializer,
    AssignmentSerializer,
    IncidentMediaSerializer,
    IncidentUpdateSerializer,
    MediaAccessSerializer,
)
from .utils import auto_assign_incident, get_location_details, calculate_distance
from users.models import AuthorityProfile
from notifications.utils import create_and_send_notification


class IncidentViewSet(viewsets.ModelViewSet):
    """
    Handles all incident-related CRUD operations.
    Automatically assigns the nearest authority and triggers notifications.
    """
    queryset = Incident.objects.all().select_related("reporter", "verified_by")
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Auto-populate address & assign nearest authority atomically."""
        with transaction.atomic():
            incident = serializer.save()

            # Auto-fill address info from coordinates
            if incident.location_latitude and incident.location_longitude:
                details = get_location_details(
                    incident.location_latitude, incident.location_longitude
                )
                if details:
                    incident.location_address = details.get("address", "")
                    incident.district = details.get("district", "")
                    incident.region = details.get("region", "")
                    incident.save(
                        update_fields=["location_address", "district", "region"]
                    )

            # Auto assign nearest authority
            assigned_authority = auto_assign_incident(incident)
            if assigned_authority:
                Assignment.objects.create(
                    incident=incident,
                    authority=assigned_authority,
                    assigned_by=incident.reporter.user if incident.reporter else None,
                    distance_km=calculate_distance(
                        incident.location_latitude,
                        incident.location_longitude,
                        assigned_authority.station_latitude,
                        assigned_authority.station_longitude,
                    ),
                )

                # Notify assigned authority
                create_and_send_notification(
                    recipient=assigned_authority.user,
                    title="New Incident Assigned",
                    message=f"A new {incident.get_incident_type_display()} has been reported near your area.",
                    notification_type="incident_assigned",
                )

            else:
                # No authority found — notify reporter that incident is pending
                if incident.reporter and incident.reporter.user:
                    create_and_send_notification(
                        recipient=incident.reporter.user,
                        title="Incident Pending Assignment",
                        message="Your report has been received and is awaiting assignment to an authority.",
                        notification_type="incident_pending_assignment",
                    )

            # Notify reporter (confirmation)
            if incident.reporter and incident.reporter.user:
                create_and_send_notification(
                    recipient=incident.reporter.user,
                    title="Incident Report Submitted",
                    message=f"Your report on {incident.get_incident_type_display()} has been received.",
                    notification_type="incident_reported",
                )

    @action(detail=True, methods=["post"])
    def verify(self, request, pk=None):
        """Authority verifies an incident."""
        incident = self.get_object()
        authority = request.user.authorityprofile

        with transaction.atomic():
            incident.status = "verified"
            incident.verified_by = authority
            incident.verified_at = timezone.now()
            incident.save(update_fields=["status", "verified_by", "verified_at"])
            incident.update_reporter_stats(verified=True)

            IncidentUpdate.objects.create(
                incident=incident,
                updated_by=request.user,
                update_type="verification",
                old_status="pending",
                new_status="verified",
                message="Incident verified by authority.",
            )

            # Notify reporter
            if incident.reporter and incident.reporter.user:
                create_and_send_notification(
                    recipient=incident.reporter.user,
                    title="Incident Verified",
                    message="Your reported incident has been verified by authorities.",
                    notification_type="incident_verified",
                )

        return Response({"detail": "Incident verified successfully."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Mark an incident as resolved."""
        incident = self.get_object()
        with transaction.atomic():
            old_status = incident.status
            incident.status = "resolved"
            incident.resolved_at = timezone.now()
            incident.save(update_fields=["status", "resolved_at"])

            IncidentUpdate.objects.create(
                incident=incident,
                updated_by=request.user,
                update_type="status_change",
                old_status=old_status,
                new_status="resolved",
                message="Incident resolved.",
            )

            # Notify reporter
            if incident.reporter and incident.reporter.user:
                create_and_send_notification(
                    recipient=incident.reporter.user,
                    title="Incident Resolved",
                    message="Your reported incident has been marked as resolved.",
                    notification_type="incident_resolved",
                )

        return Response({"detail": "Incident marked as resolved."}, status=status.HTTP_200_OK)


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.select_related("incident", "authority", "assigned_by")
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        """Allow authority to update their assignment status."""
        assignment = self.get_object()
        new_status = request.data.get("status")

        with transaction.atomic():
            old_status = assignment.status
            assignment.status = new_status
            assignment.save(update_fields=["status", "updated_at"])

            IncidentUpdate.objects.create(
                incident=assignment.incident,
                updated_by=request.user,
                update_type="assignment",
                old_status=old_status,
                new_status=new_status,
                message=f"Assignment status updated to {new_status}.",
            )

        return Response({"detail": f"Assignment updated to {new_status}."}, status=status.HTTP_200_OK)


class IncidentMediaViewSet(viewsets.ModelViewSet):
    queryset = IncidentMedia.objects.select_related("incident")
    serializer_class = IncidentMediaSerializer
    permission_classes = [IsAuthenticated]


class IncidentUpdateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = IncidentUpdate.objects.select_related("incident", "updated_by")
    serializer_class = IncidentUpdateSerializer
    permission_classes = [IsAuthenticated]


class MediaAccessViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MediaAccess.objects.select_related("incident", "media_house")
    serializer_class = MediaAccessSerializer
    permission_classes = [IsAuthenticated]
