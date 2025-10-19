from django.contrib import admin
from .models import Incident, IncidentMedia, Assignment, IncidentUpdate, MediaAccess

# Register your models here.


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ["id", "incident_type", "severity", "status", "created_at"]
    list_filter = ["incident_type", "severity", "status"]
    search_fields = [
        "description",
        "location_address",
    ]


@admin.register(IncidentMedia)
class IncidentMediaAdmin(admin.ModelAdmin):
    list_display = ["id", "incident", "media_type", "uploaded_at"]


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ["id", "incident", "authority", "status", "assigned_at"]
    list_filter = ["status"]


@admin.register(IncidentUpdate)
class IncidentUpdateAdmin(admin.ModelAdmin):
    list_display = ["id", "incident", "update_type", "created_at"]


@admin.register(MediaAccess)
class MediaAccessAdmin(admin.ModelAdmin):
    list_display = ["media_house", "incident", "access_type", "accessed_at"]
