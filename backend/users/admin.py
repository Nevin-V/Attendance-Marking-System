from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Biometrics & Role', {'fields': ('role', 'register_number', 'face_descriptor', 'trusted_device_id')}),
    )
    list_display = ['username', 'email', 'role', 'register_number', 'is_staff']

admin.site.register(User, CustomUserAdmin)
