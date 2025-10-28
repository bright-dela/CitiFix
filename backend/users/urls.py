from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/citizen/', views.register_citizen, name='register_citizen'),
    path('register/authority/', views.register_authority, name='register_authority'),
    path('register/media-house/', views.register_media_house, name='register_media_house'),
    path('login/', views.login_view, name='login'),
    path('me/', views.get_current_user, name='current_user'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]