from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile


class UserSerializer(serializers.ModelSerializer):
    """Basic user information."""

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
    """Handles new citizen registration."""

    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("This phone number is already registered.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            phone_number=validated_data["phone_number"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            email=validated_data.get("email"),
            user_type="citizen",
        )
        CitizenProfile.objects.create(user=user)
        return user


class CitizenProfileSerializer(serializers.ModelSerializer):
    """Citizen profile with linked user."""

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
            "total_reports",
            "verified_reports",
            "reputation_score",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]



class AuthorityRegistrationSerializer(serializers.Serializer):
    """Handles registration for authorities (requires admin approval)."""

    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(max_length=255)
    organization_name = serializers.CharField(max_length=255)
    authority_type = serializers.ChoiceField(choices=["police", "fire", "ambulance", "hospital"])
    license_number = serializers.CharField(max_length=100)
    station_address = serializers.CharField()
    region = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100)
    official_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20)

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("This phone number is already registered.")
        return value

    def validate_license_number(self, value):
        if AuthorityProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError("This license number is already in use.")
        return value

    def create(self, validated_data):
        profile_data = {
            "organization_name": validated_data.pop("organization_name"),
            "authority_type": validated_data.pop("authority_type"),
            "license_number": validated_data.pop("license_number"),
            "station_address": validated_data.pop("station_address"),
            "region": validated_data.pop("region"),
            "district": validated_data.pop("district"),
            "official_email": validated_data.pop("official_email"),
            "contact_phone": validated_data.pop("contact_phone"),
        }

        user = User.objects.create_user(
            phone_number=validated_data["phone_number"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            email=validated_data["email"],
            user_type="authority",
            is_active=False,
        )
        AuthorityProfile.objects.create(user=user, **profile_data)
        return user


class AuthorityProfileSerializer(serializers.ModelSerializer):
    """Authority profile with linked user."""

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
        read_only_fields = ["created_at", "updated_at"]


class MediaHouseRegistrationSerializer(serializers.Serializer):
    """Handles registration for media houses (requires admin approval)."""

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
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError("This phone number is already registered.")
        return value

    def validate_license_number(self, value):
        if MediaHouseProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError("This license number is already in use.")
        return value

    def create(self, validated_data):
        profile_data = {
            "organization_name": validated_data.pop("organization_name"),
            "media_type": validated_data.pop("media_type"),
            "license_number": validated_data.pop("license_number"),
            "official_email": validated_data.pop("official_email"),
            "contact_phone": validated_data.pop("contact_phone"),
            "address": validated_data.pop("address"),
            "city": validated_data.pop("city"),
            "region": validated_data.pop("region"),
        }

        user = User.objects.create_user(
            phone_number=validated_data["phone_number"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            email=validated_data["email"],
            user_type="media",
            is_active=False,
        )
        MediaHouseProfile.objects.create(user=user, **profile_data)
        return user


class MediaHouseProfileSerializer(serializers.ModelSerializer):
    """Media house profile with linked user."""

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
        read_only_fields = ["created_at", "updated_at"]


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token that includes basic user info."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["user_type"] = user.user_type
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = {
            "id": str(self.user.id),
            "phone_number": self.user.phone_number,
            "email": self.user.email,
            "full_name": self.user.full_name,
            "user_type": self.user.user_type,
        }
        return data
