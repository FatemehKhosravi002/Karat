from datatime import timedelta

from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, authentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .serializers import TaskSerializer
from .models import TaskModel

class TaskDetailView(APIView):
    permission_classes=[IsAuthenticated]

    def get_object(self, pk):
        return get_object_or_404(
            TaskModel,
            pk=pk,
            user=self.request.user,
            )
    
    def get(self, request, pk):
        obj = self.get_object(pk)
        serializer = TaskSerializer(obj)
        return Response(serializer.data)
    
    def put(self, request, pk):
        obj = self.get_object(pk)
        serializer = TaskSerializer(data=request.data, instance=obj)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)
    
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serializer = TaskSerializer(data=request.data, instance=obj, partial=True)

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
    permission_classes=[IsAuthenticated]

    def get(self, request):
        tasks = TaskModel.objects.filter(user=request.user, is_deleted=False, is_completed=timedelta(days=1))
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TaskSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class TaskCompletedListView(APIView):
    permission_classes=[IsAuthenticated]

    def get(self, request):
        tasks = TaskModel.objects.filter(user=request.user, is_completed=True)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data , status=200)

class TaskSoftDeletedListView(APIView):
    permission_classes=[IsAuthenticated]

    def get(self, request):
        tasks = TaskModel.objects.filter(user=request.user, is_deleted=True)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)