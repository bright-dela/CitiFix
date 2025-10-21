from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    CitizenRegistrationView,
    AuthorityRegistrationView,
    MediaHouseRegistrationView,
    UserProfileUpdateView,
    UserProfileView,
    # CitizenProfileView,
    # AuthorityProfileView,
    # MediaHouseProfileView,
    # PendingApprovalsView,
    # ApproveAuthorityView,
    # ApproveMediaHouseView,
)

urlpatterns = [
    # Authentication
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Registration
    path("register/citizen/", CitizenRegistrationView.as_view(), name="register-citizen"),
    path("register/authority/", AuthorityRegistrationView.as_view(), name="register-authority"),
    path("register/media/", MediaHouseRegistrationView.as_view(), name="register-media"),

    # Profiles
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("profile/update/", UserProfileUpdateView.as_view(), name="user-profile-update"),

#     # Admin Actions
#     path("admin/approvals/", PendingApprovalsView.as_view(), name="pending-approvals"),
#     path("admin/authority/<uuid:object_id>/", ApproveAuthorityView.as_view(), name="approve-authority"),
#     path("admin/media/<uuid:object_id>/", ApproveMediaHouseView.as_view(), name="approve-media"),
]
