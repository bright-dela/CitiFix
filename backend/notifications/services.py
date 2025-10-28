from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from reports.models import Report
from reports.serializers import ReportSerializer
from django.utils import timezone
import time

class NotificationService:
    @staticmethod
    def send_report_update(report_id, user_id=None):
        try:
            report = Report.objects.get(id=report_id)
            channel_layer = get_channel_layer()
            
            serializer = ReportSerializer(report)
            
            if user_id:
                async_to_sync(channel_layer.group_send)(
                    f"user_{user_id}",
                    {
                        "type": "report_update",
                        "data": serializer.data
                    }
                )
            
            # Send to all authorities for critical reports
            if report.severity == 'critical':
                from users.models import User
                authorities = User.objects.filter(user_type='authority', status='active')
                for authority in authorities:
                    async_to_sync(channel_layer.group_send)(
                        f"user_{authority.id}",
                        {
                            "type": "new_report",
                            "data": {
                                'id': str(report.id),
                                'title': report.title,
                                'severity': report.severity,
                                'type': report.report_type,
                                'message': f'New critical report: {report.title}'
                            }
                        }
                    )
                    
        except Report.DoesNotExist:
            pass

    @staticmethod
    def send_new_report_notification(report):
        channel_layer = get_channel_layer()
        
        # Notify superadmins
        from users.models import User
        superadmins = User.objects.filter(user_type='superadmin', status='active')
        
        for admin in superadmins:
            async_to_sync(channel_layer.group_send)(
                f"user_{admin.id}",
                {
                    "type": "new_report",
                    "data": {
                        'id': str(report.id),
                        'title': report.title,
                        'severity': report.severity,
                        'type': report.report_type,
                        'message': f'New report submitted: {report.title}'
                    }
                }
            )
        
        # Notify authorities for critical reports
        if report.severity == 'critical':
            authorities = User.objects.filter(user_type='authority', status='active')
            for authority in authorities:
                async_to_sync(channel_layer.group_send)(
                    f"user_{authority.id}",
                    {
                        "type": "new_report",
                        "data": {
                            'id': str(report.id),
                            'title': report.title,
                            'severity': report.severity,
                            'type': report.report_type,
                            'message': f'New critical report: {report.title}'
                        }
                    }
                )

    @staticmethod
    def send_user_notification(user_id, message, notification_type='info'):
        channel_layer = get_channel_layer()
        
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                "type": "send_notification",
                "data": {
                    'type': notification_type,
                    'message': message,
                    'timestamp': str(timezone.now())
                }
            }
        )