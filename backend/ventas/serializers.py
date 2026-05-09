from rest_framework import serializers
from .models import Ventas, DetalleVenta


class DetalleVentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleVenta
        fields = '__all__'


class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True, read_only=True)

    class Meta:
        model = Ventas
        fields = '__all__'


class CrearDetalleVentaSerializer(serializers.Serializer):
    id_producto = serializers.IntegerField()
    talla = serializers.CharField(max_length=10)
    cantidad = serializers.IntegerField(min_value=1)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)


class CrearVentaSerializer(serializers.Serializer):
    id_cliente = serializers.IntegerField(required=False, allow_null=True)
    id_vendedor = serializers.IntegerField()
    metodo_pago = serializers.ChoiceField(choices=[
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
        ('tarjeta', 'Tarjeta'),
    ])
    detalles = CrearDetalleVentaSerializer(many=True)

    def validate_detalles(self, value):
        if not value:
            raise serializers.ValidationError('Debe agregar al menos un producto')
        return value