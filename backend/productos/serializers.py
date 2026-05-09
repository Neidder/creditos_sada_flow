from rest_framework import serializers
from .models import Productos, ProductoTalla, Kardex


class ProductoTallaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductoTalla
        fields = ['id_talla', 'talla', 'cantidad']


class ProductoSerializer(serializers.ModelSerializer):
    tallas = ProductoTallaSerializer(many=True, read_only=True)

    class Meta:
        model = Productos
        fields = [
            'id_producto', 'nombre', 'descripcion',
            'precio_venta', 'costo_promedio', 'stock',
            'fecha_creacion', 'activo', 'tallas'
        ]


class KardexSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kardex
        fields = '__all__'