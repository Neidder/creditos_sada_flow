from rest_framework.routers import DefaultRouter
from .views import CompraViewSet, DetalleCompraViewSet

router = DefaultRouter()
router.register(r'compras', CompraViewSet)
router.register(r'detalles', DetalleCompraViewSet)

urlpatterns = router.urls