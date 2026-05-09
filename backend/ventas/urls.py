from rest_framework.routers import DefaultRouter
from .views import VentaViewSet

router = DefaultRouter()
router.register(r'ventas', VentaViewSet)
urlpatterns = router.urls