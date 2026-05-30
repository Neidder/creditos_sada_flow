from rest_framework import serializers
from .models import Cambios, CambioDetallesEntrada, CambioDetallesSalida

class CambioDetallesEntradaSerializer(serializers.ModelSerializer):
    nombre_producto = serializers.CharField(source='id_producto.nombre', read_only=True)

    class Meta:
        model = CambioDetallesEntrada
        fields = ['id_detalle_entrada', 'id_producto', 'nombre_producto', 'talla', 'cantidad', 'precio_pactado']

class CambioDetallesSalidaSerializer(serializers.ModelSerializer):
    nombre_producto = serializers.CharField(source='id_producto.nombre', read_only=True)

    class Meta:
        model = CambioDetallesSalida
        fields = ['id_detalle_salida', 'id_producto', 'nombre_producto', 'talla', 'cantidad', 'precio_venta']

class CambiosSerializer(serializers.ModelSerializer):
    detalles_entrada = CambioDetallesEntradaSerializer(many=True, read_only=True)
    detalles_salida = CambioDetallesSalidaSerializer(many=True, read_only=True)
    nombre_vendedor = serializers.CharField(source='id_vendedor.nombre', read_only=True)

    class Meta:
        model = Cambios
        fields = [
            'id_cambio', 'id_venta', 'id_credito', 'id_vendedor', 'nombre_vendedor',
            'total_devolucion', 'total_nuevo', 'excedente_pagado', 
            'metodo_pago_excedente', 'motivo', 'fecha_cambio',
            'detalles_entrada', 'detalles_salida'
        ]