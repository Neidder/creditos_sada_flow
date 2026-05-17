from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import Creditos, DetalleCredito
from .serializers import CreditoSerializer, CrearCreditoSerializer

from clientes.models import Clientes
from productos.models import Productos, Kardex, ProductoTalla
from usuarios.models import Usuarios


class CreditoViewSet(viewsets.ModelViewSet):
    queryset = Creditos.objects.all().order_by('-fecha_creacion')
    serializer_class = CreditoSerializer

    def create(self, request, *args, **kwargs):
        serializer = CrearCreditoSerializer(data=request.data)

        if not serializer.is_valid():
            print("ERRORES:", serializer.errors)
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        detalles = data.get('detalles', [])

        try:
            cliente = Clientes.objects.get(pk=data['id_cliente'])
        except Clientes.DoesNotExist:
            return Response(
                {'error': 'Cliente no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            vendedor = Usuarios.objects.get(pk=data['id_vendedor'])
        except Usuarios.DoesNotExist:
            return Response(
                {'error': 'Vendedor no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        valor_total = 0

        # Validar stock antes de crear
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
            except ProductoTalla.DoesNotExist:
                return Response(
                    {'error': f'La talla {d["talla"]} no existe para {producto.nombre}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if talla_obj.cantidad < d['cantidad']:
                return Response(
                    {'error': f'Stock insuficiente para {producto.nombre} talla {d["talla"]}. Disponible: {talla_obj.cantidad}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            valor_total += d['cantidad'] * d['precio_unitario']

        # Crear el crédito
        credito = Creditos.objects.create(
            id_cliente=cliente,
            id_vendedor=vendedor,
            valor_total=valor_total,
            saldo_pendiente=valor_total,
            fecha_credito=timezone.now().date(),   # era fecha_inicio
            fecha_limite=data['fecha_limite'],         # era fecha_fin → fecha_limite en BD
            estado='PENDIENTE',
            observaciones=None,
            fecha_creacion=timezone.now()
        )

        # Crear detalles y descontar stock
        for d in detalles:
            producto = Productos.objects.get(pk=d['id_producto'])
            subtotal = d['cantidad'] * d['precio_unitario']

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
            'saldo_pendiente': credito.saldo_pendiente
        }, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.estado = 'VENCIDO'
        instance.save()
        return Response(
            {'mensaje': 'Crédito cancelado correctamente'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'])
    def activos(self, request):
        creditos = Creditos.objects.filter(estado='PENDIENTE')
        serializer = CreditoSerializer(creditos, many=True)
        return Response(serializer.data)