from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serilizers import CustomUserSerilizer

class CustomUserDetailView(APIView):
    permission_classes=[IsAuthenticated]
    
    def get(self, request):
        serializer = CustomUserSerilizer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = CustomUserSerilizer(request.user, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)
    
    def patch(self, request):
        serializer = CustomUserSerilizer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=200)
        return Response(serializer.errors, status=400)

        
class CustomUserCreateView(APIView):
    def post(self, request):
        serializer = CustomUserSerilizer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)