from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
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
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class CitizenRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = CitizenRegistrationSerializer


class AuthorityRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = AuthorityRegistrationSerializer


class MediaHouseRegistrationView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = MediaHouseRegistrationSerializer


class CitizenProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CitizenProfileSerializer

    def get_object(self):
        user = self.request.user
        if user.user_type != "citizen":
            raise PermissionDenied("You are not authorized to access this profile.")
        try:
            return user.citizen_profile
        except CitizenProfile.DoesNotExist:
            raise NotFound("Citizen profile not found.")


class AuthorityProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AuthorityProfileSerializer

    def get_object(self):
        user = self.request.user
        if user.user_type != "authority":
            raise PermissionDenied("You are not authorized to access this profile.")
        try:
            return user.authority_profile
        except AuthorityProfile.DoesNotExist:
            raise NotFound("Authority profile not found.")


class MediaHouseProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MediaHouseProfileSerializer

    def get_object(self):
        user = self.request.user
        if user.user_type != "media":
            raise PermissionDenied("You are not authorized to access this profile.")
        try:
            return user.media_profile
        except MediaHouseProfile.DoesNotExist:
            raise NotFound("Media profile not found.")


class PendingApprovalsView(generics.ListAPIView):
    permission_classes = [IsAdminUser]

    def list(self, request, *args, **kwargs):
        authorities = AuthorityProfile.objects.filter(approval_status="pending")
        media_houses = MediaHouseProfile.objects.filter(approval_status="pending")

        data = {
            "authorities": AuthorityProfileSerializer(authorities, many=True).data,
            "media_houses": MediaHouseProfileSerializer(media_houses, many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)


class BaseApprovalView(generics.UpdateAPIView):
    permission_classes = [IsAdminUser]
    model = None
    object_name = ""

    def patch(self, request, object_id):
        try:
            instance = self.model.objects.get(id=object_id)
        except self.model.DoesNotExist:
            return Response({"error": f"{self.object_name} not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action", "approve").lower()

        if action == "approve":
            instance.approval_status = "approved"
            instance.approved_by = request.user
            instance.approved_at = timezone.now()
            instance.user.is_active = True
            instance.user.save()
            message = f"{self.object_name} approved successfully."
        elif action == "reject":
            instance.approval_status = "rejected"
            instance.user.is_active = False
            instance.user.save()
            message = f"{self.object_name} rejected."
        else:
            return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

        instance.save()
        return Response({"message": message}, status=status.HTTP_200_OK)


class ApproveAuthorityView(BaseApprovalView):
    model = AuthorityProfile
    object_name = "Authority"


class ApproveMediaHouseView(BaseApprovalView):
    model = MediaHouseProfile
    object_name = "Media house"
