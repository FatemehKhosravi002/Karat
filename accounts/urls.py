from django.urls import path
from rest_framework_simplejwt import views as jwt_views

urlpatterns=[
    path("token/", jwt_views.TokenObtainPairView(), name='token_obtain_pair'),
    path("token/", jwt_views.TokenRefreshView(), name='token_refresh'),
]