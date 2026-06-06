from django.contrib import admin

from .models import TaskModel

@admin.register(TaskModel)
class TaskAdmin(admin.ModelAdmin):
    list_display=["title","user_name", "is_deleted"]
    search_fields=("title",)
    list_filter=("user",)

    def user_name(self, obj):
        return obj.user.username
    
    user_name.admin_order_field = "user__username"