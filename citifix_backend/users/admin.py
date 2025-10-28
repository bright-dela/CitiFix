from django.contrib import admin
from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile, VerificationDocument

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'user_type', 'status', 'created_at']
    list_filter = ['user_type', 'status']
    search_fields = ['email', 'phone']

@admin.register(CitizenProfile)
class CitizenProfileAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'user']
    search_fields = ['first_name', 'last_name', 'user__email']

@admin.register(AuthorityProfile)
class AuthorityProfileAdmin(admin.ModelAdmin):
    list_display = ['organization_name', 'authority_type', 'verified_at']
    list_filter = ['authority_type']
    search_fields = ['organization_name', 'license_number']

@admin.register(MediaHouseProfile)
class MediaHouseProfileAdmin(admin.ModelAdmin):
    list_display = ['company_name', 'media_type', 'verified_at']
    list_filter = ['media_type']
    search_fields = ['company_name', 'registration_number']

@admin.register(VerificationDocument)
class VerificationDocumentAdmin(admin.ModelAdmin):
    list_display = ['user', 'document_type', 'document_name', 'uploaded_at']
    list_filter = ['document_type']
    search_fields = ['user__email', 'document_name']