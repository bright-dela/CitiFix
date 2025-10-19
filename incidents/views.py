import mimetypes
import os
from django.http import FileResponse, HttpResponse
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import transaction
from .models import Incident, IncidentMedia, Assignment, IncidentUpdate
from .serializers import (
    IncidentCreateSerializer,
    IncidentListSerializer,
    IncidentDetailSerializer,
    IncidentUpdateSerializer,
    AssignmentSerializer,
)

# Create your views here.


class CreateIncidentView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = IncidentCreateSerializer


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
    pagination_class = [IsAuthenticated]
    serializer_class = IncidentUpdateSerializer

    def get_queryset(self):
        incident_id = self.kwargs.get("incident_id")
        return IncidentUpdate.objects.filter(incident_id=incident_id)


class VerifyIncidentView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, incident_id):
        try:
            incident = Incident.objects.get(id=incident_id)
            incident.status = "verified"
            incident.verified_at = timezone.now()
            incident.verified_by = request.user.authority_profile
            incident.save()

            return Response({"message": "Incident verified"}, status=status.HTTP_200_OK)
        except:
            return Response(
                {"error": "Failed to verify"}, status=status.HTTP_400_BAD_REQUEST
            )


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

            IncidentUpdate.objects.create(
                incident=assignment.incident,
                updated_by=request.user,
                update_type="status_change",
                old_status=old_status,
                new_status=new_status,
                message=f"Assignment status changed from {old_status} to {new_status} by {request.user.full_name}",
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
                        if incident.media_access_level == "basic":
                            return Response(
                                {
                                    "error": "This incident is only available for basic access (view only)"
                                },
                                status=status.HTTP_403_FORBIDDEN,
                            )
                        elif incident.media_access_level != "premium":
                            return Response(
                                {
                                    "error": "This incident is not available for premium access"
                                },
                                status=status.HTTP_403_FORBIDDEN,
                            )

                    from .models import MediaAccess

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

            elif user.user_type == "admin":
                pass

            else:
                return Response(
                    {"error": "Invalid user type"}, status=status.HTTP_403_FORBIDDEN
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
