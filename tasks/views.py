from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from .serializers import TaskSerializer, TagSerializer
from .models import TaskModel, TagModel
from .permissions import OwnerPermission

class TagDetailView(APIView):
    permission_classes = [OwnerPermission,]
    def get_object(self, pk):
        obj = get_object_or_404(TagModel, pk=pk)
        self.check_object_permissions(self.request, obj)
        return obj
    
    def get(self, request, pk):
        serializer = TagSerializer(self.get_object(pk))
        return Response(serializer.data)
    
    def put(self, request, pk):
        instance = self.get_object(pk)
        serializer = TagSerializer(request.data, instance=instance, context={
            "user":request.user,
        })
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)
    
    def patch(self, request, pk):
        instance = self.get_object(pk)
        serializer = TagSerializer(data=request.data, instance=instance, partial=True , context={
            "user":request.user,
        })
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.delete()
        return Response(status=204)

class TagListView(APIView):
    def get(self, request):
        tags = TagModel.objects.filter(user=request.user)
        serializer = TagSerializer(tags, many=True)
        return Response(serializer.data, status=200)
    
    def post(self, request):
        serializer = TagSerializer(data=request.data, context={
            "user":request.user,
        })
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class TaskDetailView(APIView):
    permission_classes = [OwnerPermission,]
    def get_object(self, pk):
        obj = get_object_or_404(
            TaskModel,
            pk=pk)
        self.check_object_permissions(self.request, obj)
        return obj
    
    def get(self, request, pk):
        obj = self.get_object(pk)
        serializer = TaskSerializer(obj)
        return Response(serializer.data)
    
    def put(self, request, pk):
        obj = self.get_object(pk)
        serializer = TaskSerializer(data=request.data, instance=obj, context={
            "user":request.user,
        })

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)
    
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = TaskSerializer(data=request.data, instance=obj, partial=True, context={
            "user":request.user,
        })

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)
    
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.is_deleted=True
        obj.save()
        return Response(status=204)

class TasksListView(APIView):
    def get(self, request):
        tasks = TaskModel.objects.filter(user=request.user)
        if request.query_params.get("is_deleted"):
            is_deleted = request.query_params.get("is_deleted")
            tasks = tasks.filter(is_deleted=is_deleted)
        if request.query_params.get("is_completed"):
            is_completed = request.query_params.get("is_completed")
            tasks = tasks.filter(is_completed=is_completed)
        if request.query_params.get("created_at"):
            created_at = request.query_params.get("created_at")
            tasks = tasks.filter(created_at=created_at)
        if request.query_params.get("search"):
            search = request.query_params.get("search")
            tasks = tasks.filter(name__icontains=search)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TaskSerializer(data=request.data, context={
            "user":request.user,
        })
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class TaskCompletedListView(APIView):
    def get(self, request):
        tasks = TaskModel.objects.filter(user=request.user, is_completed=True)
        count = tasks.count()
        serializer = TaskSerializer(tasks, many=True)
        return Response(
    {
        "count": count,
        "tasks": serializer.data
    },
    status=200
)
