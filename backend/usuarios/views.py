from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password, check_password
from .models import Usuarios, Roles
from .serializers import UsuarioSerializer, RolSerializer, LoginSerializer
import hashlib


def get_tokens_for_user(usuario):
    """Genera access + refresh token para un usuario."""
    refresh = RefreshToken()
    refresh['id_usuario'] = usuario.id_usuario
    refresh['correo'] = usuario.correo
    refresh['id_rol'] = usuario.id_rol_id
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RolViewSet(viewsets.ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuarios.objects.filter(activo=True)
    serializer_class = UsuarioSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.activo = False
        instance.save()
        return Response(
            {'mensaje': f'Usuario "{instance.nombre}" desactivado'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def inactivos(self, request):
        usuarios = Usuarios.objects.filter(activo=False)
        serializer = self.get_serializer(usuarios, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def reactivar(self, request, pk=None):
        try:
            usuario = Usuarios.objects.get(pk=pk)
            usuario.activo = True
            usuario.save()
            return Response({'mensaje': f'Usuario "{usuario.nombre}" reactivado'})
        except Usuarios.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    correo = serializer.validated_data['correo']
    contrasena = serializer.validated_data['contrasena']

    try:
        usuario = Usuarios.objects.get(correo=correo, activo=True)
    except Usuarios.DoesNotExist:
        return Response(
            {'error': 'Correo o contraseña incorrectos'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Soporta bcrypt (nuevo) y SHA-256 (usuarios existentes)
    es_valido = False

    if usuario.contrasena.startswith('bcrypt$$') or usuario.contrasena.startswith('bcrypt_sha256$$'):
        # Contraseña ya migrada a bcrypt
        es_valido = check_password(contrasena, usuario.contrasena)
    else:
        # Contraseña antigua en SHA-256 — verificar y migrar al vuelo
        sha = hashlib.sha256(contrasena.encode()).hexdigest()
        if sha == usuario.contrasena:
            es_valido = True
            # Migrar a bcrypt sin que el usuario note nada
            usuario.contrasena = make_password(contrasena)
            usuario.save(update_fields=['contrasena'])

    if not es_valido:
        return Response(
            {'error': 'Correo o contraseña incorrectos'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    tokens = get_tokens_for_user(usuario)

    return Response({
        'mensaje': 'Login exitoso',
        'access': tokens['access'],
        'refresh': tokens['refresh'],
        'id_usuario': usuario.id_usuario,
        'nombre': usuario.nombre,
        'apellido': usuario.apellido,
        'correo': usuario.correo,
        'id_rol': usuario.id_rol_id,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def refresh_token(request):
    """Renueva el access token usando el refresh token."""
    from rest_framework_simplejwt.views import TokenRefreshView
    return TokenRefreshView.as_view()(request._request)