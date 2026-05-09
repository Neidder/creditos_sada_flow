from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Usuarios, Roles
from .serializers import UsuarioSerializer, RolSerializer, LoginSerializer
import hashlib


class RolViewSet(viewsets.ModelViewSet):
    queryset = Roles.objects.all()
    serializer_class = RolSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuarios.objects.filter(activo=True)  # ← solo usuarios activos
    serializer_class = UsuarioSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.activo = False
        instance.save()
        return Response(
            {'mensaje': f'Usuario "{instance.nombre}" desactivado correctamente'},
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
            return Response({'mensaje': f'Usuario "{usuario.nombre}" reactivado correctamente'})
        except Usuarios.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        correo = serializer.validated_data['correo']
        contrasena = hashlib.sha256(
            serializer.validated_data['contrasena'].encode()
        ).hexdigest()
        try:
            usuario = Usuarios.objects.get(correo=correo, contrasena=contrasena)
            return Response({
                'mensaje': 'Login exitoso',
                'id_usuario': usuario.id_usuario,
                'nombre': usuario.nombre,
                'apellido': usuario.apellido,
                'correo': usuario.correo,
                'id_rol': usuario.id_rol_id
            }, status=status.HTTP_200_OK)
        except Usuarios.DoesNotExist:
            return Response(
                {'error': 'Correo o contraseña incorrectos'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)