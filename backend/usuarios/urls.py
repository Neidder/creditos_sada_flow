from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import UsuarioViewSet, RolViewSet, login

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'roles', RolViewSet)

urlpatterns = [
    path('login/', login),
] + router.urls