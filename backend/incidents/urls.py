from rest_framework.routers import DefaultRouter
from .views import (
    IncidentViewSet,
    AssignmentViewSet,
    IncidentMediaViewSet,
    IncidentUpdateViewSet,
    MediaAccessViewSet,
)

router = DefaultRouter()
router.register(r"incidents", IncidentViewSet, basename="incident")
router.register(r"assignments", AssignmentViewSet, basename="assignment")
router.register(r"media", IncidentMediaViewSet, basename="incident-media")
router.register(r"updates", IncidentUpdateViewSet, basename="incident-update")
router.register(r"media-access", MediaAccessViewSet, basename="media-access")

urlpatterns = router.urls
