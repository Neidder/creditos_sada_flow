from rest_framework import serializers
from .models import Pagos


class PagoSerializer(serializers.ModelSerializer):

    class Meta:
        model = Pagos
        fields = '__all__'


class CrearPagoSerializer(serializers.Serializer):

    id_credito = serializers.IntegerField()

    monto = serializers.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    metodo_pago = serializers.CharField()

    registrado_por = serializers.IntegerField()