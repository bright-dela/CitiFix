from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Report, ReportActionLog, MediaAttachment
from .serializers import ReportSerializer, CreateReportSerializer
from apps.notifications.services import NotificationService

class ReportViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateReportSerializer
        return ReportSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Report.objects.select_related('reporter', 'assigned_to').prefetch_related('media_attachments', 'action_logs')
        
        # Media houses can only see public reports
        if user.user_type == 'media_house':
            queryset = queryset.filter(visibility='public')
        # Authorities see public reports and those assigned to them
        elif user.user_type == 'authority':
            queryset = queryset.filter(
                Q(visibility='public') | Q(assigned_to=user)
            )
        # Citizens only see their own reports
        elif user.user_type == 'citizen':
            queryset = queryset.filter(reporter=user)
        # Superadmin sees all
        
        # Apply filters
        status_filter = self.request.query_params.get('status')
        severity = self.request.query_params.get('severity')
        report_type = self.request.query_params.get('report_type')
        search = self.request.query_params.get('search')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if severity:
            queryset = queryset.filter(severity=severity)
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | 
                Q(description__icontains=search)
            )
        
        return queryset

    def perform_create(self, serializer):
        report = serializer.save(reporter=self.request.user)
        
        # Create initial action log
        ReportActionLog.objects.create(
            report=report,
            actor=self.request.user,
            action_type='status_change',
            description=f'Report created with status: {report.status}'
        )
        
        # Send real-time notification
        NotificationService.send_new_report_notification(report)

    @action(detail=False, methods=['get'])
    def my_reports(self, request):
        if request.user.user_type != 'citizen':
            return Response({'error': 'Only citizens can access this'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        reports = self.get_queryset().filter(reporter=request.user)
        page = self.paginate_queryset(reports)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def assigned_to_me(self, request):
        if request.user.user_type != 'authority':
            return Response({'error': 'Only authorities can access this'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        reports = self.get_queryset().filter(assigned_to=request.user)
        page = self.paginate_queryset(reports)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        report = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response({'error': 'Status is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if new_status not in dict(Report.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = report.status
        report.status = new_status
        
        if new_status == 'resolved':
            report.resolved_at = timezone.now()
        
        report.save()
        
        # Create action log
        ReportActionLog.objects.create(
            report=report,
            actor=request.user,
            action_type='status_change',
            description=f'Status changed from {old_status} to {new_status}'
        )
        
        # Send real-time update
        NotificationService.send_report_update(report.id, report.reporter.id)
        
        serializer = self.get_serializer(report)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        report = self.get_object()
        note = request.data.get('note')
        
        if not note:
            return Response({'error': 'Note is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        action_log = ReportActionLog.objects.create(
            report=report,
            actor=request.user,
            action_type='note_added',
            description=note
        )
        
        serializer = ReportActionLogSerializer(action_log)
        return Response(serializer.data)

@action(detail=True, methods=['patch'])
def assign_report(self, request, pk=None):
    report = self.get_object()
    authority_id = request.data.get('authority_id')
    
    if authority_id:
        from apps.users.models import User
        try:
            authority = User.objects.get(id=authority_id, user_type='authority', status='active')
        except User.DoesNotExist:
            return Response({'error': 'Authority not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        authority = request.user
    
    report.assigned_to = authority
    report.assigned_at = timezone.now()
    report.status = 'assigned'
    report.save()
    
    # Create action log
    ReportActionLog.objects.create(
        report=report,
        actor=request.user,
        action_type='assignment',
        description=f'Report assigned to {authority.email}'
    )
    
    # Send real-time update
    NotificationService.send_report_update(report.id, authority.id)
    
    serializer = self.get_serializer(report)
    return Response(serializer.data)