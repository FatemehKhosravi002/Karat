from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser
# Register your models here.

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['username', "is_active", "is_staff"]
    search_fields = ['username']
    list_editable = ["is_active", "is_staff"]