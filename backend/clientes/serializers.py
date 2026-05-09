from rest_framework import serializers
from .models import Clientes


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clientes
        fields = '__all__'

    def validate_documento(self, value):
        # Verifica que el documento no esté duplicado
        instance = self.instance
        if Clientes.objects.filter(documento=value).exclude(
            pk=instance.pk if instance else None
        ).exists():
            raise serializers.ValidationError('Ya existe un cliente con este documento.')
        return value

    def validate_telefono(self, value):
        if value and not value.replace('+', '').replace(' ', '').isdigit():
            raise serializers.ValidationError('El teléfono solo debe contener números.')
        return value