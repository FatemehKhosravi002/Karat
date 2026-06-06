from django.db import models
from django.conf import settings

from django_jalali.db import models as jmodels


class TaskModel(models.Model):
    class PriorityChoices(models.TextChoices):
        HIGH = 3 ,"High"
        MEDIUM = 2, "Medium"
        LOW = 1, "Low"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_at = jmodels.jDateTimeField(auto_now_add=True)
    due_date = jmodels.jDateTimeField(blank=True, null=True)
    priority = models.IntegerField(choices=PriorityChoices, default=PriorityChoices.MEDIUM)
    is_deleted = models.BooleanField(default=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks")
    class Meta:
        ordering = ["-priority"]