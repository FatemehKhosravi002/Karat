from rest_framework import serializers

from .models import CustomUser

class CustomUserSerializer(serializers.Serializer):
    name = serializers.CharField(required=True)
    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True)

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        instance.name=validated_data.get("name", instance.name)
        instance.username=validated_data.get("username", instance.username)
        instance.save()
        return instance
    
class CustomUserChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password1 = serializers.CharField(required=True)
    new_password2 = serializers.CharField(required=True)

    def validate(self, attrs):
        user = self.instance
        old_password = attrs.get("old_password")
        new_password1 = attrs.get("new_password1")
        new_password2 = attrs.get("new_password2")

        if not user.check_password(old_password):
             raise serializers.ValidationError({"old_password": "Incorrect old password."})
        if not new_password1==new_password2:
             raise serializers.ValidationError({"new_password2": "Passwords do not match."})
        
        return attrs

    def update(self, instance, validated_data):
        new_password = validated_data["new_password1"]
        instance.set_password(new_password)
        instance.save()
        return instance