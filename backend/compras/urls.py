from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import CompraViewSet, DetalleCompraViewSet, reporte_compras_proveedores

router = DefaultRouter()
router.register(r'compras', CompraViewSet)
router.register(r'detalles', DetalleCompraViewSet)

urlpatterns = [
    path('reporte-proveedores/', reporte_compras_proveedores),
] + router.urls