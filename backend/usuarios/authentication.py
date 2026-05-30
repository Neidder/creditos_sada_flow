from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework import exceptions
from .models import Usuarios


class UsuarioAutenticado:
    """
    Wrapper que envuelve tu modelo Usuarios y agrega los atributos
    que Django REST Framework requiere para verificar permisos.
    """
    def __init__(self, usuario):
        self._usuario = usuario
        self.is_authenticated = True          # ← lo que faltaba
        self.is_active = usuario.activo
        self.id_usuario = usuario.id_usuario
        self.correo = usuario.correo
        self.id_rol_id = usuario.id_rol_id
        self.nombre = usuario.nombre

    def __getattr__(self, name):
        # Delegamos cualquier otro atributo al modelo original
        return getattr(self._usuario, name)


class CustomJWTAuthentication(JWTAuthentication):
    """
    Autenticación JWT adaptada a nuestro modelo Usuarios custom.
    """

    def get_user(self, validated_token):
        try:
            id_usuario = validated_token['id_usuario']
        except KeyError:
            raise InvalidToken('El token no contiene id_usuario')

        try:
            usuario = Usuarios.objects.get(
                id_usuario=id_usuario,
                activo=True
            )
        except Usuarios.DoesNotExist:
            raise exceptions.AuthenticationFailed(
                'Usuario no encontrado o inactivo'
            )

        # Devuelve el wrapper, no el objeto directo
        return UsuarioAutenticado(usuario)