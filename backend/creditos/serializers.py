from rest_framework import serializers
from .models import Creditos, DetalleCredito


class DetalleCreditoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalleCredito
        fields = '__all__'


class CreditoSerializer(serializers.ModelSerializer):
    detalles = DetalleCreditoSerializer(many=True, read_only=True)

    class Meta:
        model = Creditos
        fields = '__all__'


class CrearDetalleCreditoSerializer(serializers.Serializer):
    id_producto = serializers.IntegerField()
    talla = serializers.CharField(max_length=10)
    cantidad = serializers.IntegerField(min_value=1)
    precio_unitario = serializers.DecimalField(max_digits=10, decimal_places=2)


class CrearCreditoSerializer(serializers.Serializer):
    id_cliente = serializers.IntegerField()

    id_vendedor = serializers.IntegerField()

    fecha_fin = serializers.DateField()

    detalles = CrearDetalleCreditoSerializer(many=True)

    def validate(self, data):
        if not data.get('detalles'):
            raise serializers.ValidationError(
                'Debe agregar al menos un producto'
            )

        return data