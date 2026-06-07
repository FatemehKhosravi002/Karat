from django.urls import path
from rest_framework_simplejwt import views as jwt_views

from .views import CustomUserDetailView, CustomUserCreateView, CustomUserChangePasswordSerializer

urlpatterns=[
    path("token/", jwt_views.TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path("token/refresh/", jwt_views.TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', CustomUserCreateView.as_view(), name="custom_user_create_view"),
    path('me/', CustomUserDetailView.as_view(), name="custom_user_detail_view"),
    path('me/change_password/', CustomUserChangePasswordSerializer.as_vieW(), name='custom_user_change_password'),

]