from rest_framework import serializers
from .models import Usuarios, Roles
import hashlib

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = '__all__'

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuarios
        fields = '__all__'
        extra_kwargs = {
            'contrasena': {'write_only': True}  # nunca devuelve la contraseña
        }

    def create(self, validated_data):
        # Encripta la contraseña al crear
        validated_data['contrasena'] = hashlib.sha256(
            validated_data['contrasena'].encode()
        ).hexdigest()
        return super().create(validated_data)

class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField()
    contrasena = serializers.CharField(write_only=True)