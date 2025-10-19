from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CitizenRegistrationView,
    AuthorityRegistrationView,
    MediaHouseRegistrationView,
    CustomTokenObtainPairView,
    CitizenProfileView,
    AuthorityProfileView,
    MediaHouseProfileView,
    PendingAuthoritiesListView,
    ApproveAuthorityView,
    ApproveMediaHouseView,
)

urlpatterns = [
    # Registration endpoints (no authentication required)
    path(
        "register/citizen/", CitizenRegistrationView.as_view(), name="citizen-register"
    ),
    path(
        "register/authority/",
        AuthorityRegistrationView.as_view(),
        name="authority-register",
    ),
    path(
        "register/media/", MediaHouseRegistrationView.as_view(), name="media-register"
    ),
    # Authentication endpoints
    path("login/", CustomTokenObtainPairView.as_view(), name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    # Profile endpoints (requires authentication)
    path("profile/citizen/", CitizenProfileView.as_view(), name="citizen-profile"),
    path(
        "profile/authority/", AuthorityProfileView.as_view(), name="authority-profile"
    ),
    path("profile/media/", MediaHouseProfileView.as_view(), name="media-profile"),
    # Admin endpoints (requires admin access)
    path(
        "admin/approvals/",
        PendingAuthoritiesListView.as_view(),
        name="pending-approvals",
    ),
    path(
        "admin/approve/authority/<uuid:authority_id>/",
        ApproveAuthorityView.as_view(),
        name="approve-authority",
    ),
    path(
        "admin/approve/media/<uuid:media_id>/",
        ApproveMediaHouseView.as_view(),
        name="approve-media",
    ),
]
