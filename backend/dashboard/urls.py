from django.urls import path
from .views import resumen_dashboard

urlpatterns = [
    path('resumen/', resumen_dashboard),
]