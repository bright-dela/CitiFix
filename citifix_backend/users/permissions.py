from rest_framework import permissions

class IsCitizen(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'citizen'

class IsAuthority(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'authority'

class IsMediaHouse(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'media_house'

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'superadmin'

class IsActive(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.status == 'active'