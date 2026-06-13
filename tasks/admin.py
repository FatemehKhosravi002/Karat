from django.contrib import admin

from .models import TaskModel, TagModel

@admin.register(TaskModel)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title","user_username", "is_deleted"]
    search_fields = ("title",)
    list_filter = ("user",)

    def user_username(self, obj):
        return obj.user.username
    
    user_username.admin_order_field = "user__username"


@admin.register(TagModel)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "user_username"]

    def user_username(self, obj):
        return obj.user.username
    