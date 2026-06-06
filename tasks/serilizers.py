from rest_framework import serializers

from .models import TaskModel

class TaskSerilizer(serializers.Serializer):
    PriorityChoices=(
        (3, "High"),
        (2, "Medium"),
        (1, "Low"),
    )

    title = serializers.CharField(required=True)
    description = serializers.CharField(required=False)
    created_at = serializers.DateTimeField(read_only=True)
    due_date = serializers.DateTimeField(required=False)
    priority = serializers.ChoiceField(choices=PriorityChoices, required=False)

    def create(self , validate_data):
        return TaskModel.objects.create(**validate_data)
    
    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.due_date = validated_data.get("due_date", instance.due_date)
        instance.priority = validated_data.get("priority", instance.priority)

        instance.save()
        return instance