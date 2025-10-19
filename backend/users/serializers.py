from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile


class UserSerializer(serializers.ModelSerializer):
    """Basic user information serializer"""

    class Meta:
        model = User
        fields = [
            "id",
            "phone_number",
            "email",
            "full_name",
            "user_type",
            "phone_verified",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CitizenRegistrationSerializer(serializers.Serializer):
    """
    Handles citizen registration
    Simple signup for regular users
    """

    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField(required=False)

    def validate_phone_number(self, value):
        """Check if phone number is already taken"""
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Phone number already registered")
        return value

    def create(self, validated_data):
        """Create new citizen user and profile"""
        # Create the user account.
        user = User.objects.create_user(
            phone_number=validated_data["phone_number"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            email=validated_data.get("email"),
            user_type="citizen",
        )

        # Create empty citizen profile. Can be updated later.
        CitizenProfile.objects.create(user=user)

        return user


class CitizenProfileSerializer(serializers.ModelSerializer):
    """Citizen profile with user information"""

    user = UserSerializer(read_only=True)

    class Meta:
        model = CitizenProfile
        fields = [
            "user",
            "date_of_birth",
            "gender",
            "address",
            "city",
            "region",
            "created_at",
            "updated_at",
        ]


class AuthorityRegistrationSerializer(serializers.Serializer):
    """
    Handles authority registration
    Requires approval before account becomes active
    """

    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(max_length=255)
    organization_name = serializers.CharField(max_length=255)
    authority_type = serializers.ChoiceField(
        choices=["police", "fire", "ambulance", "hospital"]
    )
    license_number = serializers.CharField(max_length=100)
    station_address = serializers.CharField()
    region = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100)
    official_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20)

    def validate_phone_number(self, value):
        """Check if phone number is already taken"""
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Phone number already registered")
        return value

    def validate_license_number(self, value):
        """Check if license number is already registered"""
        if AuthorityProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError("License number already registered")
        return value

    def create(self, validated_data):
        """Create new authority user (inactive until approved)"""
        # Separate authority-specific data
        authority_fields = {
            "organization_name": validated_data.pop("organization_name"),
            "authority_type": validated_data.pop("authority_type"),
            "license_number": validated_data.pop("license_number"),
            "station_address": validated_data.pop("station_address"),
            "region": validated_data.pop("region"),
            "district": validated_data.pop("district"),
            "official_email": validated_data.pop("official_email"),
            "contact_phone": validated_data.pop("contact_phone"),
        }

        # Create user (inactive until admin approves)
        user = User.objects.create_user(
            phone_number=validated_data["phone_number"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            email=validated_data["email"],
            user_type="authority",
            is_active=False,
        )

        # Create authority profile
        AuthorityProfile.objects.create(user=user, **authority_fields)

        return user


class AuthorityProfileSerializer(serializers.ModelSerializer):
    """Authority profile with user information"""

    user = UserSerializer(read_only=True)

    class Meta:
        model = AuthorityProfile
        fields = [
            "user",
            "organization_name",
            "authority_type",
            "license_number",
            "station_address",
            "station_latitude",
            "station_longitude",
            "region",
            "district",
            "official_email",
            "contact_phone",
            "approval_status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]


class MediaHouseRegistrationSerializer(serializers.Serializer):
    """
    Handles media house registration
    Requires approval before account becomes active
    """

    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(max_length=255)
    organization_name = serializers.CharField(max_length=255)
    media_type = serializers.ChoiceField(choices=["newspaper", "tv", "radio", "online"])
    license_number = serializers.CharField(max_length=100)
    official_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20)
    address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    region = serializers.CharField(max_length=100)

    def validate_phone_number(self, value):
        """Check if phone number is already taken"""
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("Phone number already registered")
        return value

    def validate_license_number(self, value):
        """Check if license number is already registered"""
        if MediaHouseProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError("License number already registered")
        return value

    def create(self, validated_data):
        """Create new media house user (inactive until approved)"""
        # Separate media-specific data
        media_fields = {
            "organization_name": validated_data.pop("organization_name"),
            "media_type": validated_data.pop("media_type"),
            "license_number": validated_data.pop("license_number"),
            "official_email": validated_data.pop("official_email"),
            "contact_phone": validated_data.pop("contact_phone"),
            "address": validated_data.pop("address"),
            "city": validated_data.pop("city"),
            "region": validated_data.pop("region"),
        }

        # Create user (inactive until admin approves)
        user = User.objects.create_user(
            phone_number=validated_data["phone_number"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            email=validated_data["email"],
            user_type="media",
            is_active=False,
        )

        # Create media house profile
        MediaHouseProfile.objects.create(user=user, **media_fields)

        return user


class MediaHouseProfileSerializer(serializers.ModelSerializer):
    """Media house profile with user information"""

    user = UserSerializer(read_only=True)

    class Meta:
        model = MediaHouseProfile
        fields = [
            "user",
            "organization_name",
            "media_type",
            "license_number",
            "official_email",
            "contact_phone",
            "address",
            "city",
            "region",
            "approval_status",
            "approved_by",
            "approved_at",
            "subscription_tier",
            "created_at",
            "updated_at",
        ]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Enhanced JWT token with additional user information
    Used for login
    """

    @classmethod
    def get_token(cls, user):
        """Add custom claims to token"""
        token = super().get_token(user)

        # Add user info to token
        token["user_type"] = user.user_type
        token["full_name"] = user.full_name

        return token

    def validate(self, attrs):
        """Add user data to response"""
        data = super().validate(attrs)

        # Include user information in response
        data["user"] = {
            "id": str(self.user.id),
            "phone_number": self.user.phone_number,
            "email": self.user.email,
            "full_name": self.user.full_name,
            "user_type": self.user.user_type,
        }

        return data
