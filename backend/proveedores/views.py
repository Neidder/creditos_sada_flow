from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Proveedores
from .serializers import ProveedorSerializer


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedores.objects.filter(activo=True)
    serializer_class = ProveedorSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'mensaje': 'Proveedor creado correctamente',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'mensaje': 'Proveedor actualizado correctamente',
                'data': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        from compras.models import Compras
        if Compras.objects.filter(id_proveedor=instance).exists():
            instance.activo = False
            instance.save()
            return Response(
                {'mensaje': f'Proveedor "{instance. nombre_empresa}" desactivado porque tiene compras asociadas'},
                status=status.HTTP_200_OK
            )
        instance.activo = False
        instance.save()
        return Response(
            {'mensaje': f'Proveedor "{instance. nombre_empresa}" desactivado correctamente'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def inactivos(self, request):
        from .models import Proveedores
        proveedores = Proveedores.objects.filter(activo=False)
        serializer = self.get_serializer(proveedores, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def reactivar(self, request, pk=None):
        from .models import Proveedores
        try:
            proveedor = Proveedores.objects.get(pk=pk)
            proveedor.activo = True
            proveedor.save()
            return Response({'mensaje': f'Proveedor "{proveedor.nombre_empresa}" reactivado correctamente'})
        except Proveedores.DoesNotExist:
            return Response({'error': 'Proveedor no encontrado'}, status=status.HTTP_404_NOT_FOUND)