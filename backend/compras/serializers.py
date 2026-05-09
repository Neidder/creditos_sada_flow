from rest_framework import serializers
from .models import Compras, DetalleCompra
from productos.models import Productos, ProductoTalla


class DetalleCompraSerializer(serializers.ModelSerializer):
    tallas = serializers.SerializerMethodField()

    class Meta:
        model = DetalleCompra
        fields = '__all__'

    def get_tallas(self, obj):
        if not obj.id_producto:
            return []
        tallas = ProductoTalla.objects.filter(id_producto=obj.id_producto)
        return [{'talla': t.talla, 'cantidad': t.cantidad} for t in tallas]

    def validate(self, data):
        cantidad = data.get('cantidad', 0)
        precio_unitario = data.get('precio_unitario', 0)
        if cantidad <= 0:
            raise serializers.ValidationError('La cantidad debe ser mayor a 0.')
        if precio_unitario <= 0:
            raise serializers.ValidationError('El precio unitario debe ser mayor a 0.')
        data['subtotal'] = cantidad * precio_unitario
        return data


class CompraSerializer(serializers.ModelSerializer):
    detalles = DetalleCompraSerializer(many=True, read_only=True,
                                        source='detallecompra_set')
    class Meta:
        model = Compras
        fields = '__all__'


class CrearDetalleCompraSerializer(serializers.Serializer):
    id_producto = serializers.IntegerField()
    talla = serializers.CharField(max_length=10, required=False, allow_blank=True)
    cantidad = serializers.IntegerField(min_value=1)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)


class CrearCompraSerializer(serializers.Serializer):
    id_proveedor = serializers.IntegerField()
    id_usuario = serializers.IntegerField()
    detalles = CrearDetalleCompraSerializer(many=True)