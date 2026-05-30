from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import Usuarios, Roles


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roles
        fields = '__all__'


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuarios
        fields = '__all__'
        extra_kwargs = {
            'contrasena': {'write_only': True}
        }

    def create(self, validated_data):
        # bcrypt en lugar de SHA-256
        validated_data['contrasena'] = make_password(
            validated_data['contrasena']
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'contrasena' in validated_data:
            validated_data['contrasena'] = make_password(
                validated_data['contrasena']
            )
        return super().update(instance, validated_data)


class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField()
    contrasena = serializers.CharField(write_only=True)