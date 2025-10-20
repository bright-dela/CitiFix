from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    CitizenRegistrationView,
    AuthorityRegistrationView,
    MediaHouseRegistrationView,
    CitizenProfileView,
    AuthorityProfileView,
    MediaHouseProfileView,
    PendingApprovalsView,
    ApproveAuthorityView,
    ApproveMediaHouseView,
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
    path("profile/citizen/", CitizenProfileView.as_view(), name="citizen-profile"),
    path("profile/authority/", AuthorityProfileView.as_view(), name="authority-profile"),
    path("profile/media/", MediaHouseProfileView.as_view(), name="media-profile"),

    # Admin Actions
    path("admin/approvals/", PendingApprovalsView.as_view(), name="pending-approvals"),
    path("admin/approve/authority/<uuid:authority_id>/", ApproveAuthorityView.as_view(), name="approve-authority"),
    path("admin/approve/media/<uuid:media_id>/", ApproveMediaHouseView.as_view(), name="approve-media"),
]
