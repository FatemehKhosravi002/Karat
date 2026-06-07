from rest_framework import serializers

from .models import TaskModel

class TaskSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(required=True, max_length=200)
    description = serializers.CharField(required=False, allow_blank=True,
                                        allow_null=True, default=None)
    created_at = serializers.DateTimeField(read_only=True)
    due_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    priority = serializers.ChoiceField(choices=TaskModel.PriorityChoices, required=False, default=TaskModel.PriorityChoices.MEDIUM)
    is_completed = serializers.BooleanField(required=False)

    def create(self, validated_data):
        return TaskModel.objects.create(**validated_data)
    
    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.due_date = validated_data.get("due_date", instance.due_date)
        instance.priority = validated_data.get("priority", instance.priority)
        instance.is_completed = validated_data.get("is_completed", instance.is_completed)

        instance.save()
        return instance