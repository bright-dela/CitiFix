from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import User, CitizenProfile, AuthorityProfile, MediaHouseProfile


class CitizenRegistrationSerializer(serializers.ModelSerializer):
    # Profile fields
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(
        choices=CitizenProfile.GENDER_CHOICES, required=False
    )
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    region = serializers.CharField(required=False, allow_blank=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "phone_number",
            "email",
            "password",
            "user_type",
            "date_of_birth",
            "gender",
            "address",
            "city",
            "region",
            "avatar",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "user_type": {"default": "citizen"},
        }

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "This phone number is already registered."
            )
        return value

    def validate_user_type(self, value):
        if value != "citizen":
            raise serializers.ValidationError(
                "User type must be 'citizen' for this endpoint."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        # Extract profile fields
        profile_fields = {
            "date_of_birth": validated_data.pop("date_of_birth", None),
            "gender": validated_data.pop("gender", None),
            "address": validated_data.pop("address", ""),
            "city": validated_data.pop("city", ""),
            "region": validated_data.pop("region", ""),
            "avatar": validated_data.pop("avatar", None),
        }

        # Create user
        password = validated_data.pop("password")
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.user_type = "citizen"
        user.save()

        # Create citizen profile
        CitizenProfile.objects.create(user=user, **profile_fields)
        return user

    def to_representation(self, instance):
        """Return combined user + profile data."""
        data = super().to_representation(instance)
        try:
            profile = instance.citizen_profile
            data["profile"] = {
                "date_of_birth": profile.date_of_birth,
                "gender": profile.gender,
                "address": profile.address,
                "city": profile.city,
                "region": profile.region,
                "avatar": profile.avatar.url if profile.avatar else None,
                "reputation_score": profile.reputation_score,
            }
        except CitizenProfile.DoesNotExist:
            data["profile"] = None
        return data


class AuthorityRegistrationSerializer(serializers.ModelSerializer):
    # Extra AuthorityProfile fields
    organization_name = serializers.CharField(max_length=255)
    authority_type = serializers.ChoiceField(choices=AuthorityProfile.AUTHORITY_TYPES)
    license_number = serializers.CharField(max_length=100)
    station_address = serializers.CharField()
    region = serializers.CharField(max_length=100)
    district = serializers.CharField(max_length=100)
    official_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20)
    station_latitude = serializers.DecimalField(
        max_digits=10, decimal_places=8, required=False
    )
    station_longitude = serializers.DecimalField(
        max_digits=11, decimal_places=8, required=False
    )
    document = serializers.FileField(required=True)

    class Meta:
        model = User
        fields = [
            "full_name",
            "phone_number",
            "email",
            "password",
            "organization_name",
            "authority_type",
            "license_number",
            "station_address",
            "region",
            "district",
            "official_email",
            "contact_phone",
            "station_latitude",
            "station_longitude",
            "document",
        ]
        extra_kwargs = {"password": {"write_only": True}}

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "This phone number is already registered."
            )
        return value

    def validate_license_number(self, value):
        if AuthorityProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError(
                "This license number is already registered."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        # Extract authority-specific fields
        authority_data = {
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
                "station_latitude",
                "station_longitude",
                "document",
            ]
            if key in validated_data
        }

        user = User.objects.create_user(
            phone_number=validated_data["phone_number"],
            full_name=validated_data["full_name"],
            email=validated_data.get("email"),
            password=validated_data["password"],
            user_type="authority",
            is_active=False,
        )

        AuthorityProfile.objects.create(user=user, **authority_data)
        return user


class MediaHouseRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    organization_name = serializers.CharField(max_length=255)
    media_type = serializers.ChoiceField(choices=MediaHouseProfile.MEDIA_TYPES)
    license_number = serializers.CharField(max_length=100)
    official_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=20)
    address = serializers.CharField()
    city = serializers.CharField()
    region = serializers.CharField()
    document = serializers.FileField(required=True)

    class Meta:
        model = User
        fields = [
            "full_name",
            "phone_number",
            "email",
            "password",
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

    def validate_phone_number(self, value):
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "This phone number is already registered."
            )
        return value

    def validate_license_number(self, value):
        if MediaHouseProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError(
                "This license number is already registered."
            )
        return value

    @transaction.atomic
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
            email=validated_data.get("email"),
            user_type="media",
            is_active=False,
        )
        MediaHouseProfile.objects.create(user=user, **profile_data)
        return user


class CitizenProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CitizenProfile
        exclude = [
            "user",
            "created_at",
            "updated_at",
            "total_reports",
            "verified_reports",
            "reputation_score",
        ]


class AuthorityProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuthorityProfile
        exclude = ["user", "created_at", "updated_at", "approved_by", "approved_at"]

    def validate_document(self, value):
        if not value:
            raise serializers.ValidationError(
                "Document upload is required for authority verification."
            )
        return value


class MediaHouseProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaHouseProfile
        exclude = ["user", "created_at", "updated_at", "approved_by", "approved_at"]

    def validate_document(self, value):
        if not value:
            raise serializers.ValidationError(
                "Document upload is required for media house verification."
            )
        return value


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Master serializer that uses the correct profile serializer based on user_type.
    """

    citizen_profile = CitizenProfileSerializer(required=False)
    authority_profile = AuthorityProfileSerializer(required=False)
    media_profile = MediaHouseProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "citizen_profile",
            "authority_profile",
            "media_profile",
        ]

    def update(self, instance, validated_data):
        profile_data = None

        if instance.user_type == "citizen" and "citizen_profile" in validated_data:
            profile_data = validated_data.pop("citizen_profile")
            CitizenProfileSerializer().update(instance.citizen_profile, profile_data)

        elif (
            instance.user_type == "authority" and "authority_profile" in validated_data
        ):
            profile_data = validated_data.pop("authority_profile")
            serializer = AuthorityProfileSerializer()
            serializer.update(instance.authority_profile, profile_data)

            instance.authority_profile.approval_status = "pending"
            instance.authority_profile.save(
                update_fields=["approval_status", "updated_at"]
            )

        elif instance.user_type == "media" and "media_profile" in validated_data:
            profile_data = validated_data.pop("media_profile")
            serializer = MediaHouseProfileSerializer()
            serializer.update(instance.media_profile, profile_data)

            instance.media_profile.approval_status = "pending"
            instance.media_profile.save(update_fields=["approval_status", "updated_at"])

        instance.full_name = validated_data.get("full_name", instance.full_name)
        instance.email = validated_data.get("email", instance.email)
        instance.updated_at = timezone.now()
        instance.save()

        return instance


class AuthorityApprovalSerializer(serializers.ModelSerializer):
    """Used by admins to verify and approve/reject authority profiles."""

    user_phone = serializers.CharField(source="user.phone_number", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    approved_by_name = serializers.CharField(
        source="approved_by.full_name", read_only=True
    )

    class Meta:
        model = AuthorityProfile
        fields = [
            "id",
            "user_name",
            "user_phone",
            "organization_name",
            "authority_type",
            "license_number",
            "station_address",
            "region",
            "district",
            "official_email",
            "contact_phone",
            "station_latitude",
            "station_longitude",
            "document",
            "approval_status",
            "approved_by_name",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "organization_name",
            "authority_type",
            "license_number",
            "station_address",
            "region",
            "district",
            "official_email",
            "contact_phone",
            "station_latitude",
            "station_longitude",
            "document",
            "approved_by_name",
            "approved_at",
            "created_at",
            "updated_at",
        ]

    def update(self, instance, validated_data):
        request_user = self.context["request"].user
        status = validated_data.get("approval_status")

        if not request_user.is_staff:
            raise serializers.ValidationError("Only admin users can perform approvals.")

        if status not in ["approved", "rejected"]:
            raise serializers.ValidationError(
                "Invalid approval status. Must be 'approved' or 'rejected'."
            )

        instance.approval_status = status
        instance.approved_by = request_user
        instance.approved_at = timezone.now()
        instance.save(
            update_fields=[
                "approval_status",
                "approved_by",
                "approved_at",
                "updated_at",
            ]
        )
        return instance


class MediaApprovalSerializer(serializers.ModelSerializer):
    """Used by admins to verify and approve/reject media profiles."""

    user_phone = serializers.CharField(source="user.phone_number", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    approved_by_name = serializers.CharField(
        source="approved_by.full_name", read_only=True
    )

    class Meta:
        model = MediaHouseProfile
        fields = [
            "id",
            "user_name",
            "user_phone",
            "organization_name",
            "media_type",
            "license_number",
            "official_email",
            "contact_phone",
            "address",
            "city",
            "region",
            "document",
            "subscription_tier",
            "approval_status",
            "approved_by_name",
            "approved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "organization_name",
            "media_type",
            "license_number",
            "official_email",
            "contact_phone",
            "address",
            "city",
            "region",
            "document",
            "subscription_tier",
            "approved_by_name",
            "approved_at",
            "created_at",
            "updated_at",
        ]

    def update(self, instance, validated_data):
        request_user = self.context["request"].user
        status = validated_data.get("approval_status")

        if not request_user.is_staff:
            raise serializers.ValidationError("Only admin users can perform approvals.")

        if status not in ["approved", "rejected"]:
            raise serializers.ValidationError(
                "Invalid approval status. Must be 'approved' or 'rejected'."
            )

        instance.approval_status = status
        instance.approved_by = request_user
        instance.approved_at = timezone.now()
        instance.save(
            update_fields=[
                "approval_status",
                "approved_by",
                "approved_at",
                "updated_at",
            ]
        )
        return instance


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
