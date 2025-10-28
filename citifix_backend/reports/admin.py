from django.contrib import admin
from .models import Report, ReportActionLog, MediaAttachment

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['title', 'report_type', 'severity', 'status', 'reporter', 'created_at']
    list_filter = ['report_type', 'severity', 'status', 'visibility']
    search_fields = ['title', 'description', 'reporter__email']

@admin.register(ReportActionLog)
class ReportActionLogAdmin(admin.ModelAdmin):
    list_display = ['report', 'action_type', 'actor', 'timestamp']
    list_filter = ['action_type']
    search_fields = ['report__title', 'actor__email']

@admin.register(MediaAttachment)
class MediaAttachmentAdmin(admin.ModelAdmin):
    list_display = ['report', 'file_type', 'file_size', 'uploaded_by', 'created_at']
    list_filter = ['file_type']
    search_fields = ['report__title', 'uploaded_by__email']