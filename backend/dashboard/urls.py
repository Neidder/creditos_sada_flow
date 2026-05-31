from django.urls import path
from .views import resumen_dashboard , caja_diaria


urlpatterns = [
    path('resumen/', resumen_dashboard),
     path('caja/', caja_diaria), 
]