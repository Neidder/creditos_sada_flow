from rest_framework.routers import DefaultRouter
from .views import PagoViewSet

router = DefaultRouter()
router.register(r'pagos', PagoViewSet)

urlpatterns = router.urls