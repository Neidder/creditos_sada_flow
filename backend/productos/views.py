from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Productos, ProductoTalla, Kardex
from .serializers import ProductoSerializer, ProductoTallaSerializer, KardexSerializer


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Productos.objects.filter(activo=True)
    serializer_class = ProductoSerializer

    def perform_create(self, serializer):
        producto = serializer.save(fecha_creacion=timezone.now())
        Kardex.objects.create(
            id_producto=producto,
            tipo_movimiento='entrada',
            cantidad=producto.stock,
            precio_unitario=producto.costo_promedio or 0,
            subtotal=(producto.costo_promedio or 0) * producto.stock,
            stock_anterior=0,
            stock_nuevo=producto.stock,
            fecha_movimiento=timezone.now(),
            referencia='Stock inicial'
        )

    def perform_update(self, serializer):
        producto_anterior = self.get_object()
        stock_anterior = producto_anterior.stock
        producto = serializer.save()
        if producto.stock != stock_anterior:
            diferencia = producto.stock - stock_anterior
            tipo = 'entrada' if diferencia > 0 else 'salida'
            Kardex.objects.create(
                id_producto=producto,
                tipo_movimiento=tipo,
                cantidad=abs(diferencia),
                precio_unitario=producto.costo_promedio or 0,
                subtotal=(producto.costo_promedio or 0) * abs(diferencia),
                stock_anterior=stock_anterior,
                stock_nuevo=producto.stock,
                fecha_movimiento=timezone.now(),
                referencia='Ajuste manual'
            )

    def _validar_precio_venta(self, precio_venta, costo_promedio):
        """Valida que el precio de venta no sea inferior al costo promedio."""
        if precio_venta is not None and costo_promedio is not None:
            try:
                pv = float(precio_venta)
                cp = float(costo_promedio)
                if cp > 0 and pv < cp:
                    return Response(
                        {
                            'error': (
                                f'El precio de venta (${pv:,.0f}) no puede ser inferior al costo promedio '
                                f'(${cp:,.0f}). Esto generaría una pérdida de ${(cp - pv):,.0f} por unidad.'
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except (ValueError, TypeError):
                pass
        return None

    def create(self, request, *args, **kwargs):
        tallas_data = request.data.get('tallas', [])

        # Validar precio_venta vs costo_promedio
        error_precio = self._validar_precio_venta(
            request.data.get('precio_venta'),
            request.data.get('costo_promedio')
        )
        if error_precio:
            return error_precio

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            producto = serializer.instance
            for t in tallas_data:
                if t.get('talla') and t.get('cantidad') is not None:
                    ProductoTalla.objects.create(
                        id_producto=producto,
                        talla=t['talla'].upper(),
                        cantidad=int(t['cantidad'])
                    )
            return Response({
                'mensaje': 'Producto creado correctamente',
                'data': self.get_serializer(producto).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        tallas_data = request.data.get('tallas', [])

        # Determinar costo_promedio a comparar: el enviado o el existente
        precio_venta = request.data.get('precio_venta')
        costo_promedio = request.data.get('costo_promedio') or instance.costo_promedio

        # Validar precio_venta vs costo_promedio
        error_precio = self._validar_precio_venta(precio_venta, costo_promedio)
        if error_precio:
            return error_precio

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            self.perform_update(serializer)
            producto = serializer.instance
            if tallas_data:
                ProductoTalla.objects.filter(id_producto=producto).delete()
                for t in tallas_data:
                    if t.get('talla') and t.get('cantidad') is not None:
                        ProductoTalla.objects.create(
                            id_producto=producto,
                            talla=t['talla'].upper(),
                            cantidad=int(t['cantidad'])
                        )
            return Response({
                'mensaje': 'Producto actualizado correctamente',
                'data': self.get_serializer(producto).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.activo = False
        instance.save()
        return Response(
            {'mensaje': f'Producto "{instance.nombre}" desactivado correctamente'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def inactivos(self, request):
        productos = Productos.objects.filter(activo=False)
        serializer = self.get_serializer(productos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def reactivar(self, request, pk=None):
        try:
            producto = Productos.objects.get(pk=pk)
            producto.activo = True
            producto.save()
            return Response({'mensaje': f'Producto "{producto.nombre}" reactivado correctamente'})
        except Productos.DoesNotExist:
            return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)


class KardexViewSet(viewsets.ModelViewSet):
    queryset = Kardex.objects.all().order_by('-fecha_movimiento')
    serializer_class = KardexSerializer

    @action(detail=False, methods=['get'], url_path='producto/(?P<id_producto>[^/.]+)')
    def por_producto(self, request, id_producto=None):
        kardex = Kardex.objects.filter(
            id_producto=id_producto
        ).order_by('-fecha_movimiento')
        serializer = self.get_serializer(kardex, many=True)
        return Response(serializer.data)