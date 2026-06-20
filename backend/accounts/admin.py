from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Store role & contact info", {"fields": ("role", "phone_number", "address")}),
    )
    list_display = ("username", "email", "role", "is_staff", "is_active", "date_joined")
    list_filter = UserAdmin.list_filter + ("role",)
