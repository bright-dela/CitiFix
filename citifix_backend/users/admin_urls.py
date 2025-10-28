from django.urls import path
from . import views

urlpatterns = [
    path('pending-verifications/', views.PendingVerificationsView.as_view(), name='pending_verifications'),
    path('users/', views.AllUsersView.as_view(), name='all_users'),
    path('users/<uuid:user_id>/verify/', views.verify_user, name='verify_user'),
    path('users/<uuid:user_id>/reject/', views.reject_user, name='reject_user'),
]