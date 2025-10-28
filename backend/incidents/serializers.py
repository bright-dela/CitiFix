from rest_framework import serializers
from .models import Report, ReportActionLog, MediaAttachment

class MediaAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MediaAttachment
        fields = ['id', 'file_url', 'file_type', 'file_size', 'created_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None

class ReportActionLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.EmailField(source='actor.email', read_only=True)
    
    class Meta:
        model = ReportActionLog
        fields = ['id', 'action_type', 'description', 'actor_email', 'timestamp']

class ReportSerializer(serializers.ModelSerializer):
    reporter_email = serializers.EmailField(source='reporter.email', read_only=True)
    assigned_to_email = serializers.EmailField(source='assigned_to.email', read_only=True)
    assigned_to_organization = serializers.SerializerMethodField()
    media_attachments = MediaAttachmentSerializer(many=True, read_only=True)
    action_logs = ReportActionLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = Report
        fields = [
            'id', 'report_type', 'severity', 'title', 'description',
            'latitude', 'longitude', 'address', 'status', 'visibility',
            'reporter_email', 'assigned_to_email', 'assigned_to_organization',
            'assigned_at', 'resolved_at', 'created_at', 'updated_at',
            'media_attachments', 'action_logs'
        ]
        read_only_fields = [
            'id', 'reporter_email', 'created_at', 'updated_at',
            'assigned_at', 'resolved_at', 'media_attachments', 'action_logs'
        ]
    
    def get_assigned_to_organization(self, obj):
        if obj.assigned_to and hasattr(obj.assigned_to, 'authority_profile'):
            return obj.assigned_to.authority_profile.organization_name
        return None

class CreateReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ['report_type', 'severity', 'title', 'description', 'latitude', 'longitude', 'address', 'visibility']
    
    def create(self, validated_data):
        validated_data['reporter'] = self.context['request'].user
        return super().create(validated_data)