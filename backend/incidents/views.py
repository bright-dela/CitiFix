import mimetypes
import os
from django.http import FileResponse
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from .models import Incident, IncidentMedia, Assignment, IncidentUpdate, MediaAccess
from .serializers import (
    IncidentCreateSerializer,
    IncidentListSerializer,
    IncidentDetailSerializer,
    IncidentUpdateSerializer,
    AssignmentSerializer,
)
from .routing_algorithm import IncidentRouter
from notifications.models import Notification

# Create your views here.


from notifications.models import Notification


class CreateIncidentView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = IncidentCreateSerializer

    def perform_create(self, serializer):
        """Create incident and send notifications"""
        incident = serializer.save()

        # Notify citizen (if not anonymous)
        if not incident.is_anonymous and incident.reporter:
            Notification.objects.create(
                user=incident.reporter.user,
                notification_type="general",
                title="Incident Reported Successfully",
                message=f"Your {incident.get_incident_type_display()} incident has been reported and is pending verification.",
                priority="medium",
            )

        # Notify all admins about new incident
        from users.models import User

        admins = User.objects.filter(user_type="admin", is_active=True)
        for admin in admins:
            Notification.objects.create(
                user=admin,
                notification_type="general",
                title="New Incident Reported",
                message=f"New {incident.get_severity_display()} severity {incident.get_incident_type_display()} incident reported.",
                priority=(
                    "high" if incident.severity in ["high", "critical"] else "medium"
                ),
            )

        # Notify authorities in the same region about critical incidents
        if incident.severity == "critical":
            from users.models import AuthorityProfile

            nearby_authorities = AuthorityProfile.objects.filter(
                region=incident.region, approval_status="approved", user__is_active=True
            )[
                :5
            ]  # Notify first 5 authorities

            for authority in nearby_authorities:
                Notification.objects.create(
                    user=authority.user,
                    notification_type="general",
                    title="Critical Incident Nearby",
                    message=f"Critical {incident.get_incident_type_display()} incident reported in {incident.region}.",
                    priority="high",
                )


class IncidentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = IncidentListSerializer

    def get_queryset(self):
        return Incident.objects.all().order_by("-created_at")


class IncidentDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = IncidentDetailSerializer
    lookup_field = "id"
    queryset = Incident.objects.all()


class IncidentTimelineView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = IncidentUpdateSerializer

    def get_queryset(self):
        incident_id = self.kwargs.get("incident_id")
        return IncidentUpdate.objects.filter(incident_id=incident_id)


# class VerifyIncidentView(generics.UpdateAPIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request, incident_id):
#         try:
#             incident = Incident.objects.get(id=incident_id)
#             incident.status = "verified"
#             incident.verified_at = timezone.now()
#             incident.verified_by = request.user.authority_profile
#             incident.save()

#             return Response({"message": "Incident verified"}, status=status.HTTP_200_OK)
#         except:
#             return Response(
#                 {"error": "Failed to verify"}, status=status.HTTP_400_BAD_REQUEST
#             )


class VerifyIncidentView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, incident_id):
        try:
            incident = Incident.objects.get(id=incident_id)
            old_status = incident.status
            incident.status = "verified"
            incident.verified_by = request.user.authority_profile
            incident.verified_at = timezone.now()
            incident.media_access_level = "basic"  # Allow media access
            incident.save()

            # Notify reporter about verification
            if not incident.is_anonymous and incident.reporter:
                Notification.objects.create(
                    user=incident.reporter.user,
                    notification_type="verification",
                    title="Incident Verified",
                    message=f"Your {incident.get_incident_type_display()} incident has been verified by {request.user.full_name}.",
                    priority="high",
                )

            # Create incident update
            IncidentUpdate.objects.create(
                incident=incident,
                updated_by=request.user,
                update_type="verification",
                old_status=old_status,
                new_status="verified",
                message=f"Incident verified by {request.user.full_name}",
            )

            # Auto-assign after verification
            auto_assign = request.data.get("auto_assign", True)
            if auto_assign:
                router = IncidentRouter()
                authority, details = router.find_best_authority(incident)

                if authority:
                    assignment = Assignment.objects.create(
                        incident=incident,
                        authority=authority,
                        assigned_by=request.user,
                        status="assigned",
                        distance_km=details["distance_km"],
                        estimated_arrival_min=details["eta_minutes"],
                    )

                    incident.status = "assigned"
                    incident.save()

                    # Notify assigned authority
                    Notification.objects.create(
                        user=authority.user,
                        notification_type="assignment",
                        title="New Incident Assignment",
                        message=f'Verified {incident.get_incident_type_display()} incident assigned to you. ETA: {details["eta_minutes"]} minutes.',
                        priority=(
                            "high"
                            if incident.severity in ["high", "critical"]
                            else "medium"
                        ),
                    )

                    # Notify reporter about assignment
                    if not incident.is_anonymous and incident.reporter:
                        Notification.objects.create(
                            user=incident.reporter.user,
                            notification_type="status_change",
                            title="Incident Assigned",
                            message=f"Your incident has been assigned to {authority.organization_name}.",
                            priority="medium",
                        )

            return Response(
                {
                    "message": (
                        "Incident verified and assigned successfully"
                        if auto_assign
                        else "Incident verified"
                    ),
                    "incident_id": str(incident.id),
                    "status": incident.status,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class AssignmentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AssignmentSerializer

    def get_queryset(self):
        return Assignment.objects.filter(authority=self.request.user.authority_profile)


class UpdateAssignmentStatusView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, assignment_id):
        try:
            if request.user.user_type != "authority":
                return Response(
                    {"error": "Only authorities can update assignments"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            assignment = Assignment.objects.select_for_update().get(id=assignment_id)

            if assignment.authority != request.user.authority_profile:
                return Response(
                    {"error": "You are not authorized to update this assignment"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            new_status = request.data.get("status")
            valid_statuses = [
                "assigned",
                "en_route",
                "arrived",
                "in_progress",
                "resolved",
                "cancelled",
            ]

            if new_status not in valid_statuses:
                return Response(
                    {
                        "error": "Invalid status. Must be one of: (assigned, en_route, arrived, in_progress, resolved or cancelled)"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            old_status = assignment.status
            assignment.status = new_status

            if new_status == "arrived" and not assignment.arrived_at:
                assignment.arrived_at = timezone.now()
            elif new_status == "resolved" and not assignment.resolved_at:
                assignment.resolved_at = timezone.now()

                if assignment.incident.status != "resolved":
                    assignment.incident.status = "resolved"
                    assignment.incident.resolved_at = timezone.now()
                    assignment.incident.save()

                    if assignment.incident.reporter:
                        assignment.incident.reporter.verified_reports += 1
                        current_score = float(
                            assignment.incident.reporter.reputation_score
                        )
                        new_score = min(1.0, current_score + 0.05)
                        assignment.incident.reporter.reputation_score = new_score
                        assignment.incident.reporter.save()

            assignment.save()

            # Create incident update
            IncidentUpdate.objects.create(
                incident=assignment.incident,
                updated_by=request.user,
                update_type="status_change",
                old_status=old_status,
                new_status=new_status,
                message=f"Assignment status changed from {old_status} to {new_status} by {request.user.full_name}",
            )

            # Notify reporter about status change
            if not assignment.incident.is_anonymous and assignment.incident.reporter:
                status_messages = {
                    "en_route": f"{assignment.authority.organization_name} is on the way to your incident.",
                    "arrived": f"{assignment.authority.organization_name} has arrived at the scene.",
                    "in_progress": f"{assignment.authority.organization_name} is handling your incident.",
                    "resolved": f"Your incident has been resolved by {assignment.authority.organization_name}.",
                    "cancelled": f"Assignment to {assignment.authority.organization_name} has been cancelled.",
                }

                if new_status in status_messages:
                    Notification.objects.create(
                        user=assignment.incident.reporter.user,
                        notification_type="status_change",
                        title="Incident Status Update",
                        message=status_messages[new_status],
                        priority="high" if new_status == "resolved" else "medium",
                    )

            notes = request.data.get("notes")
            if notes:
                assignment.notes = notes
                assignment.save()

                IncidentUpdate.objects.create(
                    incident=assignment.incident,
                    updated_by=request.user,
                    update_type="comment",
                    old_status="",
                    new_status="",
                    message=f"Note added: {notes}",
                )

            return Response(
                {
                    "message": "Assignment status updated successfully",
                    "assignment": {
                        "id": str(assignment.id),
                        "status": assignment.status,
                        "incident_id": str(assignment.incident.id),
                        "assigned_at": assignment.assigned_at,
                        "arrived_at": assignment.arrived_at,
                        "resolved_at": assignment.resolved_at,
                    },
                },
                status=status.HTTP_200_OK,
            )
        except Assignment.DoesNotExist:
            return Response(
                {"error": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except AttributeError:
            return Response(
                {"error": "Authority profile not found"},
                status=status.HTTP_403_FORBIDDEN,
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MediaHouseIncidentListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = IncidentListSerializer

    def get_queryset(self):
        return Incident.objects.filter(status="verified")


class DownloadMediaView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, media_id):
        try:
            media = IncidentMedia.objects.get(id=media_id)
            incident = media.incident
            user = request.user

            # Check access control
            if incident.media_access_level == "none":
                return Response(
                    {"error": "This incident is not available for media access"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if user.user_type == "citizen":
                if not incident.reporter or incident.reporter.user != user:
                    return Response(
                        {"error": "You can only access media from your own reports"},
                        status=status.HTTP_403_FORBIDDEN,
                    )

            elif user.user_type == "authority":
                try:
                    authority = user.authority_profile

                    if incident.verified_by == authority:
                        pass
                    elif Assignment.objects.filter(
                        incident=incident, authority=authority
                    ).exists():
                        pass
                    else:
                        return Response(
                            {
                                "error": "You can only access media from incidents you are handling"
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )

                except AttributeError:
                    return Response(
                        {"error": "Authority profile not found"},
                        status=status.HTTP_403_FORBIDDEN,
                    )

            elif user.user_type == "media":
                try:
                    media_house = user.media_profile

                    if media_house.approval_status != "approved":
                        return Response(
                            {"error": "Your media house account is not approved yet"},
                            status=status.HTTP_403_FORBIDDEN,
                        )

                    tier = media_house.subscription_tier

                    if tier == "basic":
                        return Response(
                            {
                                "error": "Your subscription tier (Basic) does not allow downloads. Upgrade to Premium."
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )

                    if tier == "premium":
                        if incident.media_access_level != "premium":
                            return Response(
                                {
                                    "error": "This incident is not available for premium access"
                                },
                                status=status.HTTP_403_FORBIDDEN,
                            )

                    MediaAccess.objects.create(
                        media_house=media_house,
                        incident=incident,
                        media_file=media,
                        access_type="download",
                    )

                except AttributeError:
                    return Response(
                        {"error": "Media house profile not found"},
                        status=status.HTTP_403_FORBIDDEN,
                    )

            # Check if file exists
            if not media.file or not os.path.exists(media.file.path):
                return Response(
                    {"error": "Media file not found on server"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            file_path = media.file.path

            content_type, _ = mimetypes.guess_type(file_path)
            if not content_type:
                if media.media_type == "photo":
                    content_type = "image/jpeg"
                elif media.media_type == "video":
                    content_type = "video/mp4"
                else:
                    content_type = "application/octet-stream"

            # Create a descriptive filename
            incident_type = incident.incident_type
            timestamp = incident.created_at.strftime("%Y%m%d_%H%M%S")
            extension = os.path.splitext(file_path)[1]
            download_filename = (
                f"citifix_{incident_type}_{timestamp}_{media.id}{extension}"
            )

            response = FileResponse(
                open(file_path, "rb"),
                content_type=content_type,
                as_attachment=True,
                filename=download_filename,
            )

            response["Content-Length"] = media.file_size
            response["X-Content-Type-Options"] = "nosniff"
            return response

        except IncidentMedia.DoesNotExist:
            return Response(
                {"error": "Media file not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AutoAssignIncidentView(APIView):
    """
    Automatically assign incident to best available authority
    Admin or system can trigger this
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, incident_id):
        try:
            incident = Incident.objects.get(id=incident_id)

            # Check if already assigned
            if Assignment.objects.filter(
                incident=incident, status__in=["assigned", "en_route", "in_progress"]
            ).exists():
                return Response(
                    {"error": "Incident already has active assignments"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Use routing algorithm
            router = IncidentRouter()

            # For critical incidents, assign multiple units
            if incident.severity == "critical":
                assignments = router.assign_multiple_units(incident, count=2)

                if not assignments:
                    return Response(
                        {"error": "No available authorities found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                created_assignments = []
                for authority, details in assignments:
                    assignment = Assignment.objects.create(
                        incident=incident,
                        authority=authority,
                        assigned_by=request.user,
                        status="assigned",
                        distance_km=details["distance_km"],
                        estimated_arrival_min=details["eta_minutes"],
                    )
                    created_assignments.append(assignment)

                    # Create notification for authority
                    Notification.objects.create(
                        user=authority.user,
                        notification_type="assignment",
                        title="New Critical Incident Assignment",
                        message=f'You have been assigned to a {incident.incident_type} incident. ETA: {details["eta_minutes"]} minutes',
                        priority="high",
                    )

                    # Create incident update
                    IncidentUpdate.objects.create(
                        incident=incident,
                        updated_by=request.user,
                        update_type="assignment",
                        old_status="",
                        new_status="",
                        message=f'Assigned to {authority.organization_name} (Distance: {details["distance_km"]}km, ETA: {details["eta_minutes"]}min)',
                    )

                # Update incident status
                incident.status = "assigned"
                incident.save()

                return Response(
                    {
                        "message": f"{len(created_assignments)} authorities assigned successfully",
                        "assignments": [
                            {
                                "id": str(a.id),
                                "authority": a.authority.organization_name,
                                "distance_km": float(a.distance_km),
                                "eta_minutes": a.estimated_arrival_min,
                            }
                            for a in created_assignments
                        ],
                    }
                )

            else:
                # Single unit assignment
                authority, details = router.find_best_authority(incident)

                if not authority:
                    return Response(
                        {"error": "No available authorities found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                # Create assignment
                assignment = Assignment.objects.create(
                    incident=incident,
                    authority=authority,
                    assigned_by=request.user,
                    status="assigned",
                    distance_km=details["distance_km"],
                    estimated_arrival_min=details["eta_minutes"],
                )

                # Create notification
                Notification.objects.create(
                    user=authority.user,
                    notification_type="assignment",
                    title="New Incident Assignment",
                    message=f'You have been assigned to a {incident.incident_type} incident. ETA: {details["eta_minutes"]} minutes',
                    priority=(
                        "medium" if incident.severity in ["low", "medium"] else "high"
                    ),
                )

                # Create incident update
                IncidentUpdate.objects.create(
                    incident=incident,
                    updated_by=request.user,
                    update_type="assignment",
                    old_status="",
                    new_status="",
                    message=f'Assigned to {authority.organization_name} (Distance: {details["distance_km"]}km, ETA: {details["eta_minutes"]}min, Score: {details["total_score"]})',
                )

                # Update incident status
                incident.status = "assigned"
                incident.save()

                return Response(
                    {
                        "message": "Authority assigned successfully",
                        "assignment": {
                            "id": str(assignment.id),
                            "authority": authority.organization_name,
                            "authority_type": authority.authority_type,
                            "distance_km": details["distance_km"],
                            "eta_minutes": details["eta_minutes"],
                            "score_breakdown": {
                                "total_score": details["total_score"],
                                "distance_score": details["distance_score"],
                                "workload_score": details["workload_score"],
                                "response_score": details["response_score"],
                                "type_score": details["type_score"],
                            },
                        },
                    }
                )

        except Incident.DoesNotExist:
            return Response(
                {"error": "Incident not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class FindBestAuthorityView(APIView):
    """
    Preview the best authority for an incident without assigning
    Useful for manual assignment decisions
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, incident_id):
        try:
            incident = Incident.objects.get(id=incident_id)

            router = IncidentRouter()
            authority, details = router.find_best_authority(incident)

            if not authority:
                return Response(
                    {"message": "No suitable authorities found", "suggestions": []}
                )

            # Get top 3 options
            eligible = router._get_eligible_authorities(incident)
            incident_coords = (
                float(incident.location_latitude),
                float(incident.location_longitude),
            )

            options = []
            for auth in eligible[:5]:  # Check top 5
                score_details = router._calculate_score(auth, incident, incident_coords)
                if score_details["total_score"] > 0:
                    options.append(
                        {
                            "authority_id": str(auth.id),
                            "name": auth.organization_name,
                            "type": auth.authority_type,
                            "distance_km": score_details["distance_km"],
                            "eta_minutes": score_details["eta_minutes"],
                            "current_workload": score_details["current_workload"],
                            "total_score": score_details["total_score"],
                            "is_best": auth.id == authority.id,
                        }
                    )

            # Sort by score
            options.sort(key=lambda x: x["total_score"], reverse=True)

            return Response(
                {
                    "incident_id": str(incident.id),
                    "incident_type": incident.incident_type,
                    "severity": incident.severity,
                    "best_authority": {
                        "id": str(authority.id),
                        "name": authority.organization_name,
                        "type": authority.authority_type,
                    },
                    "top_options": options[:3],
                    "all_options": options,
                }
            )

        except Incident.DoesNotExist:
            return Response(
                {"error": "Incident not found"}, status=status.HTTP_404_NOT_FOUND
            )
