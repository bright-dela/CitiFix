from django.urls import path
from .views import (
    AutoAssignIncidentView,
    CreateIncidentView,
    FindBestAuthorityView,
    IncidentListView,
    IncidentDetailView,
    IncidentTimelineView,
    VerifyIncidentView,
    AssignmentListView,
    UpdateAssignmentStatusView,
    MediaHouseIncidentListView,
    DownloadMediaView,
)

urlpatterns = [
    # Incident CRUD operations
    path('create/', 
         CreateIncidentView.as_view(), 
         name='create-incident'),
    
    path('list/', 
         IncidentListView.as_view(), 
         name='list-incidents'),
    
    path('<uuid:id>/', 
         IncidentDetailView.as_view(), 
         name='incident-detail'),
    
    path('<uuid:incident_id>/timeline/', 
         IncidentTimelineView.as_view(), 
         name='incident-timeline'),
    
    # Authority actions
    path('<uuid:incident_id>/verify/', 
         VerifyIncidentView.as_view(), 
         name='verify-incident'),
    
    # Assignment management
    path('assignments/', 
         AssignmentListView.as_view(), 
         name='list-assignments'),
    
    path('assignments/<uuid:assignment_id>/status/', 
         UpdateAssignmentStatusView.as_view(), 
         name='update-assignment'),
    
    # Media house access
    path('media/list/', 
         MediaHouseIncidentListView.as_view(), 
         name='media-incidents'),
    
    path('media/<uuid:media_id>/download/', 
         DownloadMediaView.as_view(), 
         name='download-media'),

     path('<uuid:incident_id>/auto-assign/', 
         AutoAssignIncidentView.as_view(), 
         name='auto-assign-incident'),
    
    path('<uuid:incident_id>/find-authority/', 
         FindBestAuthorityView.as_view(), 
         name='find-best-authority'),
]
