from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
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

# Create your views here.


class CitizenRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = CitizenRegistrationSerializer


class AuthorityRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = AuthorityRegistrationSerializer


class MediaHouseRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = MediaHouseRegistrationSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class CitizenProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CitizenProfileSerializer

    def get_object(self):
        return self.request.user.citizen_profile


class AuthorityProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AuthorityProfileSerializer

    def get_object(self):
        return self.request.user.authority_profile


class MediaHouseProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MediaHouseProfileSerializer

    def get_object(self):
        return self.request.user.media_profile


class PendingAuthoritiesListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        pending_authorities = AuthorityProfile.objects.filter(approval_status="pending")
        pending_media = MediaHouseProfile.objects.filter(approval_status="pending")

        return Response(
            {
                "authorities": AuthorityProfileSerializer(
                    pending_authorities, many=True
                ).data,
                "media_houses": MediaHouseProfileSerializer(
                    pending_media, many=True
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class ApproveAuthorityView(generics.UpdateAPIView):
    permission_classes = [IsAdminUser]

    def post(self, request, authority_id):
        try:
            authority = AuthorityProfile.objects.get(id=authority_id)
            authority.approval_status = "approved"
            authority.approved_by = request.user
            authority.approved_at = timezone.now()
            authority.user.is_active = True
            authority.user.save()
            authority.save()

            return Response(
                {"message": "Authority approved successfully."},
                status=status.HTTP_200_OK,
            )
        except AuthorityProfile.DoesNotExist:
            return Response(
                {"error": "Authority not found"}, status=status.HTTP_404_NOT_FOUND
            )


class ApproveMediaHouseView(generics.UpdateAPIView):
    permission_classes = [IsAdminUser]

    def post(self, request, media_id):
        try:
            media = MediaHouseProfile.objects.get(id=media_id)
            media.approval_status = "approved"
            media.approved_by = request.user
            media.approved_at = timezone.now()
            media.user.is_active = True
            media.user.save()
            media.save()

            return Response(
                {"message": "Media house approved successfully."},
                status=status.HTTP_200_OK,
            )
        except MediaHouseProfile.DoesNotExist:
            return Response(
                {"error": "Media house not found"}, status=status.HTTP_404_NOT_FOUND
            )
