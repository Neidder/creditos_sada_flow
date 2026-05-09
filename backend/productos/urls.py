from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ProductoViewSet, KardexViewSet
 
router = DefaultRouter()
router.register(r'productos', ProductoViewSet, basename='productos')
router.register(r'kardex', KardexViewSet, basename='kardex')
 
urlpatterns = [
    path('', include(router.urls)),
]