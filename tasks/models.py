from django.db import models
from django.conf import settings
from django.db.models import UniqueConstraint

from django_jalali.db import models as jmodels
import jdatetime


class TagModel(models.Model):
    name = models.CharField(max_length=30)
    color = models.CharField(max_length=7, default="#808080")
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE,
                             related_name="tags",
                             )
    class Meta:
        constraints=[
            models.UniqueConstraint(fields=['user','name'], name="unique_user_tag"),
        ]
class TaskModel(models.Model):
    class PriorityChoices(models.IntegerChoices):
        HIGH = 3 ,"High"
        MEDIUM = 2, "Medium"
        LOW = 1, "Low"

    class Duration_TypeChoices(models.TextChoices):
        LONG = "long", "Long"
        SHORT = "short", "Short"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_at = jmodels.jDateTimeField(auto_now_add=True)
    due_date = jmodels.jDateTimeField(blank=True, null=True)
    priority = models.IntegerField(choices=PriorityChoices, default=PriorityChoices.MEDIUM)
    is_completed = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    duration_type = models.CharField(max_length=5, choices=Duration_TypeChoices, default=Duration_TypeChoices.SHORT)
    completed_at = jmodels.jDateField(null=True, blank=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks")
    
    class Meta:
        ordering = ["-priority", "-due_date", "-created_at"]

    def save(self, *args, **kwargs):
        if self.is_completed and self.completed_at is None:
            self.completed_at = jdatetime.datetime.now()
        elif not self.is_completed:
            self.completed_at = None
        super().save(*args, **kwargs)
