from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile
from .serializers import (
    CitizenRegistrationSerializer,
    AuthorityRegistrationSerializer,
    MediaHouseRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    CitizenProfileSerializer,
    AuthorityProfileSerializer,
    MediaHouseProfileSerializer,
)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login view with custom token."""
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class CitizenRegistrationView(generics.CreateAPIView):
    """Registers a new citizen."""
    permission_classes = [AllowAny]
    serializer_class = CitizenRegistrationSerializer


class AuthorityRegistrationView(generics.CreateAPIView):
    """Registers a new authority account (pending admin approval)."""
    permission_classes = [AllowAny]
    serializer_class = AuthorityRegistrationSerializer


class MediaHouseRegistrationView(generics.CreateAPIView):
    """Registers a new media house (pending admin approval)."""
    permission_classes = [AllowAny]
    serializer_class = MediaHouseRegistrationSerializer


class CitizenProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update a citizen's profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = CitizenProfileSerializer

    def get_object(self):
        return self.request.user.citizen_profile


class AuthorityProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update an authority's profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = AuthorityProfileSerializer

    def get_object(self):
        return self.request.user.authority_profile


class MediaHouseProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update a media house's profile."""
    permission_classes = [IsAuthenticated]
    serializer_class = MediaHouseProfileSerializer

    def get_object(self):
        return self.request.user.media_profile


class PendingApprovalsView(generics.ListAPIView):
    """Lists all pending authority and media house approvals."""
    permission_classes = [IsAdminUser]

    def list(self, request, *args, **kwargs):
        authorities = AuthorityProfile.objects.filter(approval_status="pending")
        media_houses = MediaHouseProfile.objects.filter(approval_status="pending")

        data = {
            "authorities": AuthorityProfileSerializer(authorities, many=True).data,
            "media_houses": MediaHouseProfileSerializer(media_houses, many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)


class ApproveAuthorityView(generics.UpdateAPIView):
    """Approve an authority account."""
    permission_classes = [IsAdminUser]

    def post(self, request, authority_id):
        try:
            authority = AuthorityProfile.objects.get(id=authority_id)
        except AuthorityProfile.DoesNotExist:
            return Response({"error": "Authority not found."}, status=status.HTTP_404_NOT_FOUND)

        authority.approval_status = "approved"
        authority.approved_by = request.user
        authority.approved_at = timezone.now()
        authority.user.is_active = True
        authority.user.save()
        authority.save()

        return Response({"message": "Authority approved successfully."}, status=status.HTTP_200_OK)


class ApproveMediaHouseView(generics.UpdateAPIView):
    """Approve a media house account."""
    permission_classes = [IsAdminUser]

    def post(self, request, media_id):
        try:
            media = MediaHouseProfile.objects.get(id=media_id)
        except MediaHouseProfile.DoesNotExist:
            return Response({"error": "Media house not found."}, status=status.HTTP_404_NOT_FOUND)

        media.approval_status = "approved"
        media.approved_by = request.user
        media.approved_at = timezone.now()
        media.user.is_active = True
        media.user.save()
        media.save()

        return Response({"message": "Media house approved successfully."}, status=status.HTTP_200_OK)
