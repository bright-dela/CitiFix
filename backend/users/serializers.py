from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile


#  BASIC USER SERIALIZER
class UserSerializer(serializers.ModelSerializer):
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
        

#  CITIZEN
class CitizenRegistrationSerializer(serializers.Serializer):
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
            "avatar",
            "total_reports",
            "verified_reports",
            "reputation_score",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "total_reports",
            "verified_reports",
            "reputation_score",
            "created_at",
            "updated_at",
        ]


class CitizenProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CitizenProfile
        fields = [
            "date_of_birth",
            "gender",
            "address",
            "city",
            "region",
            "avatar",
        ]


#  AUTHORITY
class AuthorityRegistrationSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    full_name = serializers.CharField(max_length=255)
    organization_name = serializers.CharField(max_length=255)
    authority_type = serializers.ChoiceField(choices=["police", "fire", "ambulance", "hospital"])
    license_number = serializers.CharField(max_length=100)
    station_latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=False, allow_null=True)
    station_longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=False, allow_null=True)
    station_address = serializers.CharField()
    region = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100)
    official_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20)
    document = serializers.FileField(required=True)

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
            key: validated_data.pop(key)
            for key in [
                "organization_name",
                "authority_type",
                "license_number",
                "station_address",
                "region",
                "district",
                "official_email",
                "contact_phone",
                "document",
                "station_latitude",
                "station_longitude",
            ]
            if key in validated_data
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
            "document",
            "approval_status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "approval_status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]


class AuthorityProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorityProfile
        fields = [
            "organization_name",
            "authority_type",
            "station_address",
            "region",
            "district",
            "official_email",
            "contact_phone",
            "station_latitude",
            "station_longitude",
            "document",
        ]
        read_only_fields = ["license_number", "approval_status"]


#  MEDIA HOUSES
class MediaHouseRegistrationSerializer(serializers.Serializer):
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
    document = serializers.FileField(required=True)

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
            key: validated_data.pop(key)
            for key in [
                "organization_name",
                "media_type",
                "license_number",
                "official_email",
                "contact_phone",
                "address",
                "city",
                "region",
                "document",
            ]
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
            "document",
            "approval_status",
            "approved_by",
            "approved_at",
            "subscription_tier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "approval_status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        ]


class MediaHouseProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaHouseProfile
        fields = [
            "organization_name",
            "media_type",
            "official_email",
            "contact_phone",
            "address",
            "city",
            "region",
            "document",
            "subscription_tier",
        ]
        read_only_fields = ["license_number", "approval_status"]


#  JWT TOKEN
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
