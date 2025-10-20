from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
import uuid


class UserManager(BaseUserManager):
    """Custom user manager that uses phone number instead of username."""

    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError("A phone number is required.")
        user = self.model(phone_number=phone_number, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("user_type", "admin")
        return self.create_user(phone_number, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Main user model for citizens, authorities, media houses, and admins."""

    USER_TYPES = [
        ("citizen", "Citizen"),
        ("authority", "Authority"),
        ("media", "Media House"),
        ("admin", "Administrator"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=20, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=255)
    user_type = models.CharField(max_length=20, choices=USER_TYPES)
    phone_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = ["full_name", "user_type"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["phone_number"]),
            models.Index(fields=["user_type"]),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.user_type})"


class CitizenProfile(models.Model):
    """Extra details for citizen users."""

    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="citizen_profile")
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    region = models.CharField(max_length=100, null=True, blank=True)
    total_reports = models.IntegerField(default=0)
    verified_reports = models.IntegerField(default=0)
    reputation_score = models.DecimalField(max_digits=3, decimal_places=2, default=0.50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "citizen_profiles"

    def __str__(self):
        return f"Citizen: {self.user.full_name}"


class AuthorityProfile(models.Model):
    """Extra details for police, fire service, hospitals, etc."""

    AUTHORITY_TYPES = [
        ("police", "Police Service"),
        ("fire", "Fire Service"),
        ("ambulance", "Ambulance Service"),
        ("hospital", "Hospital"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="authority_profile")
    organization_name = models.CharField(max_length=255)
    authority_type = models.CharField(max_length=30, choices=AUTHORITY_TYPES)
    license_number = models.CharField(max_length=100, unique=True)
    station_address = models.TextField()
    region = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    official_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    station_latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    station_longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    approval_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_authorities"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "authority_profiles"
        indexes = [
            models.Index(fields=["authority_type"]),
            models.Index(fields=["approval_status"]),
        ]

    def __str__(self):
        return f"{self.organization_name} ({self.authority_type})"


class MediaHouseProfile(models.Model):
    """Extra details for media houses."""

    MEDIA_TYPES = [
        ("newspaper", "Newspaper"),
        ("tv", "Television"),
        ("radio", "Radio"),
        ("online", "Online Media"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending Approval"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    TIER_CHOICES = [
        ("basic", "Basic - View Only"),
        ("premium", "Premium - Download Access"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="media_profile")
    organization_name = models.CharField(max_length=255)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES)
    license_number = models.CharField(max_length=100, unique=True)
    official_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    address = models.TextField()
    city = models.CharField(max_length=100)
    region = models.CharField(max_length=100)
    approval_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_media"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    subscription_tier = models.CharField(max_length=20, choices=TIER_CHOICES, default="basic")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "media_profiles"
        indexes = [
            models.Index(fields=["approval_status"]),
            models.Index(fields=["subscription_tier"]),
        ]

    def __str__(self):
        return f"{self.organization_name} ({self.media_type})"
