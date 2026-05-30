from django.urls import path
from . import views

urlpatterns = [
    path('buscar-origen/', views.buscar_origen, name='buscar_origen'),
    path('realizar-cambio/', views.realizar_cambio, name='realizar_cambio'),
    path('historial/', views.listar_cambios, name='listar_cambios'),
]