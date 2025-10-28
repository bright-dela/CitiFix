from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q
from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile, VerificationDocument
from .serializers import *

@api_view(['POST'])
@permission_classes([AllowAny])
def register_citizen(request):
    serializer = RegisterCitizenSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'success': True,
            'data': {
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            },
            'message': 'Registration successful'
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'error': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_authority(request):
    serializer = RegisterAuthoritySerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        return Response({
            'success': True,
            'data': UserSerializer(user).data,
            'message': 'Registration submitted. Please upload verification documents.'
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'error': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def register_media_house(request):
    serializer = RegisterMediaHouseSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        return Response({
            'success': True,
            'data': UserSerializer(user).data,
            'message': 'Registration submitted. Please upload verification documents.'
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'error': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        user.last_login_at = timezone.now()
        user.save()
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'success': True,
            'data': {
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            },
            'message': 'Login successful'
        })
    
    return Response({
        'success': False,
        'error': 'Invalid credentials'
    }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    serializer = UserSerializer(request.user)
    return Response({
        'success': True,
        'data': serializer.data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_verification_document(request):
    if request.user.user_type not in ['authority', 'media_house']:
        return Response({
            'success': False,
            'error': 'Only authorities and media houses can upload documents'
        }, status=status.HTTP_403_FORBIDDEN)
    
    if request.user.status == 'active':
        return Response({
            'success': False,
            'error': 'Your account is already verified'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    document_file = request.FILES.get('document_file')
    document_type = request.data.get('document_type')
    document_name = request.data.get('document_name', document_file.name)
    
    if not document_file:
        return Response({
            'success': False,
            'error': 'No file provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if document_file.size > 10 * 1024 * 1024:  # 10MB
        return Response({
            'success': False,
            'error': 'File size cannot exceed 10MB'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    ext = document_file.name.split('.')[-1].lower()
    if ext not in ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']:
        return Response({
            'success': False,
            'error': 'Invalid file type'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    document = VerificationDocument.objects.create(
        user=request.user,
        document_type=document_type,
        document_file=document_file,
        document_name=document_name,
        file_size=document_file.size
    )
    
    serializer = VerificationDocumentSerializer(document, context={'request': request})
    
    return Response({
        'success': True,
        'data': serializer.data,
        'message': 'Document uploaded successfully'
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_documents(request):
    documents = VerificationDocument.objects.filter(user=request.user)
    serializer = VerificationDocumentSerializer(documents, many=True, context={'request': request})
    
    return Response({
        'success': True,
        'data': serializer.data
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, document_id):
    try:
        document = VerificationDocument.objects.get(id=document_id, user=request.user)
        
        if request.user.status == 'active':
            return Response({
                'success': False,
                'error': 'Cannot delete documents after verification'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        document.delete()
        
        return Response({
            'success': True,
            'message': 'Document deleted successfully'
        })
    
    except VerificationDocument.DoesNotExist:
        return Response({
            'success': False,
            'error': 'Document not found'
        }, status=status.HTTP_404_NOT_FOUND)

class PendingVerificationsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserSerializer
    
    def get_queryset(self):
        return User.objects.filter(status='pending').select_related(
            'authority_profile', 'media_profile'
        ).prefetch_related('verification_documents')

@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def verify_user(request, user_id):
    try:
        user = User.objects.get(id=user_id, status='pending')
        
        if user.user_type in ['authority', 'media_house']:
            doc_count = VerificationDocument.objects.filter(user=user).count()
            if doc_count == 0:
                return Response({
                    'success': False,
                    'error': 'User must upload verification documents first'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        user.status = 'active'
        user.save()
        
        if hasattr(user, 'authority_profile'):
            profile = user.authority_profile
            profile.verified_by = request.user
            profile.verified_at = timezone.now()
            profile.save()
        elif hasattr(user, 'media_profile'):
            profile = user.media_profile
            profile.verified_by = request.user
            profile.verified_at = timezone.now()
            profile.save()
        
        serializer = UserSerializer(user)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'User verified successfully'
        })
    
    except User.DoesNotExist:
        return Response({
            'success': False,
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdminUser])
def reject_user(request, user_id):
    try:
        user = User.objects.get(id=user_id, status='pending')
        reason = request.data.get('reason', 'Not specified')
        
        user.status = 'rejected'
        user.save()
        
        if hasattr(user, 'authority_profile'):
            profile = user.authority_profile
            profile.rejection_reason = reason
            profile.save()
        elif hasattr(user, 'media_profile'):
            profile = user.media_profile
            profile.rejection_reason = reason
            profile.save()
        
        return Response({
            'success': True,
            'message': 'User rejected',
            'data': {'reason': reason}
        })
    
    except User.DoesNotExist:
        return Response({
            'success': False,
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)

class AllUsersView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = UserSerializer
    
    def get_queryset(self):
        queryset = User.objects.all()
        
        user_type = self.request.query_params.get('user_type')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) | 
                Q(phone__icontains=search)
            )
        
        return queryset