from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, authentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .serilizers import TaskSerilizer
from .models import TaskModel

class TaskDetailView(APIView):
    permission_classes=[IsAuthenticated]

    def get_object(self, pk):
        return get_object_or_404(
            TaskModel,
            pk=pk,
            user=self.request.user,
            is_deleted=False)
    
    def get(self, request, pk):
        obj = self.get_object(pk)
        serilizer = TaskSerilizer(obj)
        return Response(serilizer.data)
    
    def put(self, request, pk):
        obj = self.get_object(pk)
        serilizer = TaskSerilizer(data=request.data, instance=obj)

        if serilizer.is_valid():
            serilizer.save(user=request.user)
            return Response(serilizer.data, status=200)
        return Response(serilizer.errors, status=400)
    
    def patch(self, request, pk):
        obj = self.get_object(pk)
        serilizer = TaskSerilizer(data=request.data, instance=obj, partial=True)

        if serilizer.is_valid():
            serilizer.save(user=request.user)
            return Response(serilizer.data, status=200)
        return Response(serilizer.errors, status=400)
    
    def delete(self, request, pk):
        obj = self.get_object(pk)
        obj.is_deleted=True
        obj.save()
        return Response(status=204)

class TaskCreateView(APIView):
    permission_classes=[IsAuthenticated]

    def post(self, request):
        serilizer = TaskSerilizer(data=request.data)
        if serilizer.is_valid():
            serilizer.save(user=request.user)
            return Response(serilizer.data, status=201)
        return Response(serilizer.errors, status=400)

class TaskListView(APIView):
    permission_classes=[IsAuthenticated]

    def get(self, request):
        tasks = TaskModel.objects.filter(user=request.user, is_deleted=False)
        serilizer = TaskSerilizer(tasks, many=True)
        return Response(serilizer.data)