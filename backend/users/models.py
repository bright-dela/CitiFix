import uuid
import os
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'superadmin')
        extra_fields.setdefault('status', 'active')
        
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    USER_TYPE_CHOICES = (
        ('citizen', 'Citizen'),
        ('authority', 'Authority'),
        ('media_house', 'Media House'),
        ('superadmin', 'Super Admin'),
    )
    
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('suspended', 'Suspended'),
        ('rejected', 'Rejected'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=17, blank=True, null=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='citizen')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.user_type})"

class CitizenProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='citizen_profile')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    emergency_contact = models.CharField(max_length=17, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class AuthorityProfile(models.Model):
    AUTHORITY_TYPES = (
        ('police', 'Police'),
        ('fire', 'Fire Department'),
        ('medical', 'Medical Services'),
        ('municipal', 'Municipal Services'),
        ('disaster', 'Disaster Management'),
        ('other', 'Other'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='authority_profile')
    organization_name = models.CharField(max_length=200)
    authority_type = models.CharField(max_length=50, choices=AUTHORITY_TYPES)
    jurisdiction_area = models.TextField()
    license_number = models.CharField(max_length=100)
    head_officer_name = models.CharField(max_length=200)
    
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_authorities')
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.organization_name

class MediaHouseProfile(models.Model):
    MEDIA_TYPES = (
        ('newspaper', 'Newspaper'),
        ('tv', 'Television'),
        ('radio', 'Radio'),
        ('online', 'Online Media'),
        ('other', 'Other'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='media_profile')
    company_name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=100)
    media_type = models.CharField(max_length=50, choices=MEDIA_TYPES)
    press_license_number = models.CharField(max_length=100)
    
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_media')
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.company_name

def verification_document_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f'verification_documents/{instance.user.user_type}/{instance.user.id}/{filename}'

class VerificationDocument(models.Model):
    DOCUMENT_TYPES = (
        ('license', 'License'),
        ('registration', 'Registration Certificate'),
        ('id_proof', 'ID Proof'),
        ('accreditation', 'Accreditation'),
        ('other', 'Other'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    document_file = models.FileField(upload_to=verification_document_upload_path)
    document_name = models.CharField(max_length=255)
    file_size = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.document_type} - {self.user.email}"

    def delete(self, *args, **kwargs):
        if self.document_file:
            if os.path.isfile(self.document_file.path):
                os.remove(self.document_file.path)
        super().delete(*args, **kwargs)