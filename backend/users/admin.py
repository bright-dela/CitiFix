from django.contrib import admin
from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("phone_number", "full_name", "user_type", "is_active", "created_at")
    list_filter = ("user_type", "is_active")
    search_fields = ("phone_number", "full_name", "email")


@admin.register(CitizenProfile)
class CitizenProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "total_reports", "verified_reports", "reputation_score")
    search_fields = ("user__full_name", "user__phone_number")


@admin.register(AuthorityProfile)
class AuthorityProfileAdmin(admin.ModelAdmin):
    list_display = ("organization_name", "authority_type", "approval_status", "region")
    list_filter = ("authority_type", "approval_status")
    search_fields = ("organization_name", "license_number", "region")


@admin.register(MediaHouseProfile)
class MediaHouseProfileAdmin(admin.ModelAdmin):
    list_display = ("organization_name", "media_type", "approval_status", "subscription_tier")
    list_filter = ("media_type", "approval_status", "subscription_tier")
    search_fields = ("organization_name", "license_number", "region")
