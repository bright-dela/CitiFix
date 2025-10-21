from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AuthorityProfile, MediaHouseProfile
from .serializers import (
    CitizenRegistrationSerializer,
    AuthorityRegistrationSerializer,
    MediaHouseRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    UserProfileUpdateSerializer,
    AuthorityApprovalSerializer,
    MediaApprovalSerializer,
)


class CitizenRegistrationView(generics.CreateAPIView):
    serializer_class = CitizenRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Registration successful."}, status=status.HTTP_201_CREATED
        )


class AuthorityRegistrationView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = AuthorityRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"message": "Registration successful. Awaiting admin approval."},
            status=status.HTTP_201_CREATED,
        )


class MediaHouseRegistrationView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = MediaHouseRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {"message": "Registration successful. Awaiting admin approval."},
            status=status.HTTP_201_CREATED,
        )


class UserProfileUpdateView(generics.RetrieveUpdateAPIView):
    """
    Allows logged-in users to view or update their own profile.
    """

    serializer_class = UserProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserProfileView(APIView):
    """
    Fetch the current user's profile and related info.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileUpdateSerializer(request.user)
        return Response(serializer.data)


class UserProfileUpdateView(APIView):
    """
    Update the current user's profile.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def put(self, request):
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        return self.put(request)
    

class IsAdminUser(permissions.BasePermission):
    """Custom permission for admin-only access."""
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class AuthorityApprovalView(generics.RetrieveUpdateAPIView):
    """Admin can view detailed info and approve/reject an authority profile."""
    queryset = AuthorityProfile.objects.all()
    serializer_class = AuthorityApprovalSerializer
    permission_classes = [IsAdminUser]


class MediaApprovalView(generics.RetrieveUpdateAPIView):
    """Admin can view detailed info and approve/reject a media profile."""
    queryset = MediaHouseProfile.objects.all()
    serializer_class = MediaApprovalSerializer
    permission_classes = [IsAdminUser]


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer
