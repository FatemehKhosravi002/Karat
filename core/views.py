from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.conf import settings

from tasks.models import TaskModel

def home(request):
    return render(request, "index.html")


def login(request):
    return render(request, "login.html")

