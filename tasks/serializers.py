from rest_framework import serializers

from .models import TaskModel, TagModel

from django.shortcuts import get_object_or_404


class TagSerializer(serializers.Serializer):
    name = serializers.CharField(required=True)
    color = serializers.CharField(required=False)
    
    def create(self, validated_data):
        user = self.context.get("user")
        tag = TagModel.objects.create(**validated_data, user=user)
        return tag
    
    def update(self, instance, validated_data):
        instance.name = validated_data.get("name", instance.name)
        instance.color = validated_data.get("color", instance.color)
        instance.save()
        return instance


class TaskSerializer(serializers.Serializer):
    title = serializers.CharField(required=True, max_length=200)
    description = serializers.CharField(required=False, allow_blank=True,
                                        allow_null=True, default=None)
    created_at = serializers.DateTimeField(read_only=True)
    due_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    priority = serializers.ChoiceField(choices=TaskModel.PriorityChoices, required=False, default=TaskModel.PriorityChoices.MEDIUM)
    is_completed = serializers.BooleanField(required=False)
    is_deleted = serializers.BooleanField(required=False)
    duration_type = serializers.ChoiceField(choices=TaskModel.Duration_TypeChoices, required=False, default=TaskModel.Duration_TypeChoices.SHORT)
    completed_at = serializers.DateField(required=False, read_only=True, allow_null=True)
    tags = TagSerializer(many=True)


    def create(self, validated_data):
        tags = validated_data.pop("tags",[])
        user = self.context.get("user")
        task = TaskModel.objects.create(**validated_data,user=user)
        tags_list=[]
        for tag in tags:
            tag_object, _ =TagModel.objects.get_or_create(user=user,
                                                            name=tag["name"],
                                                            defaults={"color":tag.get("color", "#1E435D")})
            tags_list.append(tag_object)
        task.tags.set(tags_list)
        task.save()
        return task
    
    def update(self, instance, validated_data):
        instance.title = validated_data.get("title", instance.title)
        instance.description = validated_data.get("description", instance.description)
        instance.due_date = validated_data.get("due_date", instance.due_date)
        instance.priority = validated_data.get("priority", instance.priority)
        instance.is_completed = validated_data.get("is_completed", instance.is_completed)
        instance.is_deleted = validated_data.get("is_deleted", instance.is_deleted)
        instance.duration_type = validated_data.get("duration_type", instance.duration_type)
        if validated_data.get("tags"):
            tags = validated_data.get("tags")
            tags_list = []
            user = self.context.get("user")
            for tag in tags:
                tag_object, _ = TagModel.objects.get_or_create(
                    user=user,
                    name=tag["name"],
                    defaults={"color":tag.get("color", "#1E435D")})
                tags_list.append(tag_object)
            instance.tags.set(tags_list)

        instance.save()
        return instance