from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile, VerificationDocument

class CitizenProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CitizenProfile
        fields = ['first_name', 'last_name', 'date_of_birth', 'address', 'emergency_contact']

class AuthorityProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorityProfile
        fields = ['organization_name', 'authority_type', 'jurisdiction_area', 'license_number', 'head_officer_name']

class MediaHouseProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaHouseProfile
        fields = ['company_name', 'registration_number', 'media_type', 'press_license_number']

class VerificationDocumentSerializer(serializers.ModelSerializer):
    document_url = serializers.SerializerMethodField()
    
    class Meta:
        model = VerificationDocument
        fields = ['id', 'document_type', 'document_name', 'document_url', 'file_size', 'uploaded_at']
    
    def get_document_url(self, obj):
        if obj.document_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.document_file.url)
        return None

class UserSerializer(serializers.ModelSerializer):
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'user_type', 'status', 'email_verified', 'profile', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_profile(self, obj):
        if obj.user_type == 'citizen' and hasattr(obj, 'citizen_profile'):
            return CitizenProfileSerializer(obj.citizen_profile).data
        elif obj.user_type == 'authority' and hasattr(obj, 'authority_profile'):
            return AuthorityProfileSerializer(obj.authority_profile).data
        elif obj.user_type == 'media_house' and hasattr(obj, 'media_profile'):
            return MediaHouseProfileSerializer(obj.media_profile).data
        return None

class RegisterCitizenSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    phone = serializers.CharField(required=False, allow_blank=True)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def create(self, validated_data):
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone'),
            user_type='citizen',
            status='active',
        )
        
        CitizenProfile.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name
        )
        
        return user

class RegisterAuthoritySerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    phone = serializers.CharField(required=False, allow_blank=True)
    organization_name = serializers.CharField(max_length=200)
    authority_type = serializers.ChoiceField(choices=AuthorityProfile.AUTHORITY_TYPES)
    license_number = serializers.CharField(max_length=100)
    head_officer_name = serializers.CharField(max_length=200)
    jurisdiction_area = serializers.CharField()

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def create(self, validated_data):
        org_data = {
            'organization_name': validated_data.pop('organization_name'),
            'authority_type': validated_data.pop('authority_type'),
            'license_number': validated_data.pop('license_number'),
            'head_officer_name': validated_data.pop('head_officer_name'),
            'jurisdiction_area': validated_data.pop('jurisdiction_area'),
        }
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone'),
            user_type='authority',
            status='pending',
        )
        
        AuthorityProfile.objects.create(user=user, **org_data)
        return user

class RegisterMediaHouseSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    phone = serializers.CharField(required=False, allow_blank=True)
    company_name = serializers.CharField(max_length=200)
    registration_number = serializers.CharField(max_length=100)
    media_type = serializers.ChoiceField(choices=MediaHouseProfile.MEDIA_TYPES)
    press_license_number = serializers.CharField(max_length=100)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered")
        return value

    def create(self, validated_data):
        media_data = {
            'company_name': validated_data.pop('company_name'),
            'registration_number': validated_data.pop('registration_number'),
            'media_type': validated_data.pop('media_type'),
            'press_license_number': validated_data.pop('press_license_number'),
        }
        
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone'),
            user_type='media_house',
            status='pending',
        )
        
        MediaHouseProfile.objects.create(user=user, **media_data)
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        
        if user.status == 'suspended':
            raise serializers.ValidationError("Your account has been suspended")
        
        if user.status == 'rejected':
            raise serializers.ValidationError("Your account registration was rejected")
        
        data['user'] = user
        return data