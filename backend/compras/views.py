from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, date as date_type
from django.utils import timezone
from django.db import transaction
from .models import Compras, DetalleCompra
from .serializers import CompraSerializer, DetalleCompraSerializer, CrearCompraSerializer
from productos.models import Productos, Kardex, ProductoTalla
from proveedores.models import Proveedores
from usuarios.models import Usuarios


class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compras.objects.all().order_by('-fecha_compra')
    serializer_class = CompraSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = CrearCompraSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        detalles = data.get('detalles', [])

        if not detalles:
            return Response(
                {'error': 'La compra debe tener al menos un producto'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            proveedor = Proveedores.objects.get(pk=data['id_proveedor'])
            usuario = Usuarios.objects.get(pk=data['id_usuario'])
        except Proveedores.DoesNotExist:
            return Response({'error': 'Proveedor no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        except Usuarios.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        total = sum(d['cantidad'] * d['precio_unitario'] for d in detalles)

        compra = Compras.objects.create(
            id_proveedor=proveedor,
            id_usuario=usuario,
            fecha_compra=timezone.now(),
            total=total
        )

        for detalle in detalles:
            try:
                producto = Productos.objects.get(pk=detalle['id_producto'])
            except Productos.DoesNotExist:
                return Response({'error': 'Producto no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            cantidad = detalle['cantidad']
            precio_unitario = detalle['precio_unitario']
            subtotal = cantidad * precio_unitario
            talla = detalle.get('talla', '').upper()

            DetalleCompra.objects.create(
                id_compra=compra,
                id_producto=producto,
                cantidad=cantidad,
                precio_unitario=precio_unitario,
                subtotal=subtotal
            )

            # Sumar stock por talla si se especificó
            if talla:
                talla_obj, creada = ProductoTalla.objects.get_or_create(
                    id_producto=producto,
                    talla=talla,
                    defaults={'cantidad': 0}
                )
                talla_obj.cantidad += cantidad
                talla_obj.save()

            # Actualizar stock general y costo promedio
            stock_anterior = producto.stock
            costo_actual = (producto.costo_promedio or 0) * stock_anterior
            costo_nuevo = precio_unitario * cantidad
            producto.stock += cantidad
            producto.costo_promedio = (costo_actual + costo_nuevo) / producto.stock
            producto.save()

            # Registrar en Kardex
            Kardex.objects.create(
                id_producto=producto,
                tipo_movimiento='entrada',
                cantidad=cantidad,
                precio_unitario=precio_unitario,
                subtotal=subtotal,
                stock_anterior=stock_anterior,
                stock_nuevo=producto.stock,
                fecha_movimiento=timezone.now(),
                referencia=f'Compra #{compra.id_compra}'
            )

        return Response({
            'mensaje': 'Compra registrada correctamente',
            'id_compra': compra.id_compra,
            'total': total,
            'productos_ingresados': len(detalles)
        }, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': 'Las compras no se pueden eliminar por ser registros contables'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['get'])
    def detalles(self, request, pk=None):
        compra = self.get_object()
        detalles_qs = DetalleCompra.objects.filter(id_compra=compra)

        # Construir respuesta enriquecida con tallas desde producto_tallas
        detalles_data = []
        for d in detalles_qs:
            # Traer todas las tallas del producto con sus cantidades actuales
            tallas_producto = []
            if d.id_producto:
                tallas_qs = ProductoTalla.objects.filter(
                    id_producto=d.id_producto
                ).order_by('talla')
                tallas_producto = [
                    {'talla': t.talla, 'cantidad': t.cantidad}
                    for t in tallas_qs
                ]

            detalles_data.append({
                'id_detalle': d.id_detalle,
                'id_producto': d.id_producto_id,
                'cantidad': d.cantidad,
                'precio_unitario': d.precio_unitario,
                'subtotal': d.subtotal,
                'tallas': tallas_producto,
            })

        return Response({
            'compra': CompraSerializer(compra).data,
            'detalles': detalles_data,
        })


class DetalleCompraViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DetalleCompra.objects.all()
    serializer_class = DetalleCompraSerializer
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reporte_compras_proveedores(request):
    desde_str = request.query_params.get('desde')
    hasta_str = request.query_params.get('hasta')

    try:
        desde = date_type.fromisoformat(desde_str) if desde_str else date_type.today().replace(day=1)
        hasta = date_type.fromisoformat(hasta_str) if hasta_str else date_type.today()
    except ValueError:
        return Response({'error': 'Formato inválido. Usa YYYY-MM-DD'}, status=400)

    inicio = datetime.combine(desde, datetime.min.time())
    fin    = datetime.combine(hasta, datetime.max.time())

    compras = Compras.objects.filter(
        fecha_compra__range=(inicio, fin)
    ).select_related('id_proveedor').prefetch_related(
        'detallecompra_set__id_producto'
    )

    # Agrupa por proveedor
    proveedores_map = {}

    for compra in compras:
        prov = compra.id_proveedor
        if not prov:
            continue

        pid = prov.id_proveedor
        if pid not in proveedores_map:
            proveedores_map[pid] = {
                'id_proveedor':   pid,
                'nombre_empresa': prov.nombre_empresa,
                'contacto':       prov.contacto or '—',
                'total_gastado':  0,
                'total_ordenes':  0,
                'total_unidades': 0,
                'productos':      {},  # id_producto → datos acumulados
            }

        entry = proveedores_map[pid]
        entry['total_gastado']  += float(compra.total or 0)
        entry['total_ordenes']  += 1

        for detalle in compra.detallecompra_set.all():
            prod = detalle.id_producto
            if not prod:
                continue

            prod_id = prod.id_producto
            cantidad = detalle.cantidad or 0
            subtotal = float(detalle.subtotal or 0)

            entry['total_unidades'] += cantidad

            if prod_id not in entry['productos']:
                entry['productos'][prod_id] = {
                    'id_producto': prod_id,
                    'nombre':      prod.nombre,
                    'total_unidades': 0,
                    'total_ordenes':  0,
                    'subtotal':       0,
                }

            entry['productos'][prod_id]['total_unidades'] += cantidad
            entry['productos'][prod_id]['total_ordenes']  += 1
            entry['productos'][prod_id]['subtotal']       += subtotal

    # Convierte a lista y ordena por gasto descendente
    total_global = sum(p['total_gastado'] for p in proveedores_map.values())

    resultado = []
    for p in sorted(proveedores_map.values(), key=lambda x: -x['total_gastado']):
        productos_lista = sorted(
            p['productos'].values(),
            key=lambda x: -x['total_unidades']
        )
        resultado.append({
            'id_proveedor':    p['id_proveedor'],
            'nombre_empresa':  p['nombre_empresa'],
            'contacto':        p['contacto'],
            'total_gastado':   round(p['total_gastado'], 2),
            'total_ordenes':   p['total_ordenes'],
            'total_unidades':  p['total_unidades'],
            'porcentaje':      round((p['total_gastado'] / total_global * 100) if total_global else 0, 1),
            'productos':       productos_lista,
        })

    return Response({
        'desde':             str(desde),
        'hasta':             str(hasta),
        'total_global':      round(total_global, 2),
        'total_ordenes':     sum(p['total_ordenes'] for p in proveedores_map.values()),
        'total_unidades':    sum(p['total_unidades'] for p in proveedores_map.values()),
        'total_proveedores': len(resultado),
        'proveedores':       resultado,
    })