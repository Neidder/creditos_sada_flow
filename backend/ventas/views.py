from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from .models import Ventas, DetalleVenta
from .serializers import VentaSerializer, CrearVentaSerializer
from productos.models import Productos, Kardex, ProductoTalla
from clientes.models import Clientes
from usuarios.models import Usuarios


class VentaViewSet(viewsets.ModelViewSet):
    queryset = Ventas.objects.all().order_by('-fecha_venta')
    serializer_class = VentaSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = CrearVentaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        detalles = data.get('detalles', [])

        # Validar vendedor
        try:
            vendedor = Usuarios.objects.get(pk=data['id_vendedor'])
        except Usuarios.DoesNotExist:
            return Response({'error': 'Vendedor no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Validar cliente si se proporcionó
        cliente = None
        if data.get('id_cliente'):
            try:
                cliente = Clientes.objects.get(pk=data['id_cliente'])
            except Clientes.DoesNotExist:
                return Response({'error': 'Cliente no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        # Validar stock antes de crear la venta
        for d in detalles:
            try:
                producto = Productos.objects.get(pk=d['id_producto'])
            except Productos.DoesNotExist:
                return Response(
                    {'error': f'Producto #{d["id_producto"]} no encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
            try:
                talla_obj = ProductoTalla.objects.get(
                    id_producto=producto,
                    talla=d['talla'].upper()
                )
                if talla_obj.cantidad < d['cantidad']:
                    return Response({
                        'error': f'Stock insuficiente para {producto.nombre} talla {d["talla"]}. Disponible: {talla_obj.cantidad}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except ProductoTalla.DoesNotExist:
                return Response({
                    'error': f'La talla {d["talla"]} no existe para {producto.nombre}'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Calcular total
        total = sum(d['cantidad'] * d['precio_unitario'] for d in detalles)

        # Crear la venta
        venta = Ventas.objects.create(
            id_cliente=cliente,
            id_vendedor=vendedor,
            fecha_venta=timezone.now(),
            total=total,
            metodo_pago=data['metodo_pago']
        )

        # Crear detalles y descontar stock
        for d in detalles:
            producto = Productos.objects.get(pk=d['id_producto'])
            subtotal = d['cantidad'] * d['precio_unitario']

            DetalleVenta.objects.create(
                id_venta=venta,
                id_producto=producto,
                talla=d['talla'].upper(),
                cantidad=d['cantidad'],
                precio_unitario=d['precio_unitario'],
                subtotal=subtotal
            )

            # Descontar stock por talla
            talla_obj = ProductoTalla.objects.get(
                id_producto=producto,
                talla=d['talla'].upper()
            )
            talla_obj.cantidad -= d['cantidad']
            talla_obj.save()

            # Descontar stock general
            stock_anterior = producto.stock
            producto.stock -= d['cantidad']
            producto.save()

            # Registrar en Kardex
            Kardex.objects.create(
                id_producto=producto,
                tipo_movimiento='salida',
                cantidad=d['cantidad'],
                precio_unitario=d['precio_unitario'],
                subtotal=subtotal,
                stock_anterior=stock_anterior,
                stock_nuevo=producto.stock,
                fecha_movimiento=timezone.now(),
                referencia=f'Venta #{venta.id_venta}'
            )

        return Response({
            'mensaje': 'Venta registrada correctamente',
            'id_venta': venta.id_venta,
            'total': total,
            'metodo_pago': data['metodo_pago'],
            'productos_vendidos': len(detalles)
        }, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': 'Las ventas no se pueden eliminar'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def hoy(self, request):
        hoy = timezone.now().date()
        ventas = Ventas.objects.filter(
            fecha_venta__date=hoy
        ).order_by('-fecha_venta')
        serializer = VentaSerializer(ventas, many=True)
        total_hoy = sum(float(v.total) for v in ventas)
        return Response({
            'total_ventas': ventas.count(),
            'total_recaudado': total_hoy,
            'ventas': serializer.data
        })

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        hoy = timezone.now()
        inicio_hoy = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
        inicio_semana = hoy - timedelta(days=hoy.weekday())
        inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0)

        ventas_hoy = Ventas.objects.filter(fecha_venta__gte=inicio_hoy)
        ventas_semana = Ventas.objects.filter(fecha_venta__gte=inicio_semana)
        ventas_mes = Ventas.objects.filter(fecha_venta__gte=inicio_mes)

        return Response({
            'hoy': {
                'cantidad': ventas_hoy.count(),
                'total': sum(float(v.total) for v in ventas_hoy),
            },
            'semana': {
                'cantidad': ventas_semana.count(),
                'total': sum(float(v.total) for v in ventas_semana),
            },
            'mes': {
                'cantidad': ventas_mes.count(),
                'total': sum(float(v.total) for v in ventas_mes),
            },
        })