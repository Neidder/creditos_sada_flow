from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from django.utils import timezone

from .models import Creditos, DetalleCredito
from .serializers import (
    CreditoSerializer,
    CrearCreditoSerializer
)

from clientes.models import Clientes
from productos.models import Productos, Kardex, ProductoTalla
from usuarios.models import Usuarios


class CreditoViewSet(viewsets.ModelViewSet):

    queryset = Creditos.objects.all().order_by('-fecha_creacion')

    serializer_class = CreditoSerializer

    def create(self, request, *args, **kwargs):

        serializer = CrearCreditoSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data

        detalles = data.get('detalles', [])

        try:
            cliente = Clientes.objects.get(
                pk=data['id_cliente']
            )

            vendedor = Usuarios.objects.get(
                pk=data['id_vendedor']
            )

        except Clientes.DoesNotExist:
            return Response(
                {'error': 'Cliente no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        except Usuarios.DoesNotExist:
            return Response(
                {'error': 'Vendedor no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        valor_total = 0

        for d in detalles:

            producto = Productos.objects.get(
                pk=d['id_producto']
            )

            talla_obj = ProductoTalla.objects.get(
                id_producto=producto,
                talla=d['talla'].upper()
            )

            if talla_obj.cantidad < d['cantidad']:
                return Response({
                    'error': f'Stock insuficiente para {producto.nombre}'
                }, status=status.HTTP_400_BAD_REQUEST)

            valor_total += (
                d['cantidad'] * d['precio_unitario']
            )

        credito = Creditos.objects.create(
            id_cliente=cliente,
            id_vendedor=vendedor,
            valor_total=valor_total,
            saldo_restante=valor_total,
            fecha_inicio=timezone.now().date(),
            fecha_fin=data['fecha_fin'],
            estado='activo',
            fecha_creacion=timezone.now()
        )

        for d in detalles:

            producto = Productos.objects.get(
                pk=d['id_producto']
            )

            subtotal = (
                d['cantidad'] * d['precio_unitario']
            )

            DetalleCredito.objects.create(
                id_credito=credito,
                id_producto=producto,
                talla=d['talla'].upper(),
                cantidad=d['cantidad'],
                precio_unitario=d['precio_unitario'],
                subtotal=subtotal
            )

            talla_obj = ProductoTalla.objects.get(
                id_producto=producto,
                talla=d['talla'].upper()
            )

            talla_obj.cantidad -= d['cantidad']
            talla_obj.save()

            stock_anterior = producto.stock

            producto.stock -= d['cantidad']

            producto.save()

            Kardex.objects.create(
                id_producto=producto,
                tipo_movimiento='SALIDA',
                cantidad=d['cantidad'],
                precio_unitario=d['precio_unitario'],
                subtotal=subtotal,
                stock_anterior=stock_anterior,
                stock_nuevo=producto.stock,
                fecha_movimiento=timezone.now(),
                referencia=f'Credito #{credito.id_credito}'
            )

        return Response({
            'mensaje': 'Crédito creado correctamente',
            'id_credito': credito.id_credito,
            'saldo_restante': credito.saldo_restante
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def activos(self, request):

        creditos = Creditos.objects.filter(
            estado='activo'
        )

        serializer = CreditoSerializer(
            creditos,
            many=True
        )

        return Response(serializer.data)