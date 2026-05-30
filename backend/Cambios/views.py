from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.shortcuts import get_object_or_404

from ventas.models import Ventas  
from creditos.models import Creditos
from productos.models import Productos, ProductoTalla
from .models import Cambios, CambioDetallesEntrada, CambioDetallesSalida
from .serializers import CambiosSerializer


@api_view(['GET'])
def buscar_origen(request):
    tipo = request.query_params.get('tipo')
    id_origen = request.query_params.get('id')

    if not tipo or not id_origen:
        return Response(
            {'error': 'Debe proporcionar el tipo (venta/credito) y el ID.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        detalles = []

        if tipo == 'venta':
            venta = Ventas.objects.get(id_venta=id_origen)

            id_cliente = venta.id_cliente.id_cliente if venta.id_cliente else None
            nombre_cliente = (
                f"{venta.id_cliente.nombre} {getattr(venta.id_cliente, 'apellido', '')}".strip()
                if venta.id_cliente else "Cliente Ocasional"
            )

            # Intentamos los related_names más comunes
            try:
                filas = venta.detalle_venta_set.all()
            except AttributeError:
                try:
                    filas = venta.detalles.all()
                except AttributeError:
                    filas = []

            for d in filas:
                detalles.append({
                    'id_producto':     d.id_producto.id_producto,
                    'nombre_producto': d.id_producto.nombre,
                    'talla':           d.talla,
                    'cantidad':        d.cantidad,
                    'cantidad_maxima': d.cantidad,
                    'precio_unitario': float(d.precio_unitario),
                })

            return Response({
                'tipo':              'venta',
                'id_venta':          venta.id_venta,
                'id_cliente':        id_cliente,
                'nombre_cliente':    nombre_cliente,
                'total_transaccion': float(venta.total),
                'detalles':          detalles,
            })

        elif tipo == 'credito':
            credito = Creditos.objects.get(id_credito=id_origen)

            id_cliente = credito.id_cliente.id_cliente if credito.id_cliente else None
            nombre_cliente = (
                f"{credito.id_cliente.nombre} {getattr(credito.id_cliente, 'apellido', '')}".strip()
                if credito.id_cliente else "Cliente Ocasional"
            )

            try:
                filas = credito.detalle_credito_set.all()
            except AttributeError:
                try:
                    filas = credito.detalles.all()
                except AttributeError:
                    filas = []

            for d in filas:
                detalles.append({
                    'id_producto':     d.id_producto.id_producto,
                    'nombre_producto': d.id_producto.nombre,
                    'talla':           d.talla,
                    'cantidad':        d.cantidad,
                    'cantidad_maxima': d.cantidad,
                    'precio_unitario': float(d.precio_unitario),
                })

            return Response({
                'tipo':              'credito',
                'id_credito':        credito.id_credito,
                'id_cliente':        id_cliente,
                'nombre_cliente':    nombre_cliente,
                'total_transaccion': float(credito.valor_total),
                'saldo_pendiente':   float(credito.saldo_pendiente),
                'detalles':          detalles,
            })

        else:
            return Response(
                {'error': 'Tipo de origen no válido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    except Ventas.DoesNotExist:
        return Response(
            {'error': f'No se encontró ninguna venta con el ID {id_origen}.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Creditos.DoesNotExist:
        return Response(
            {'error': f'No se encontró ningún crédito con el ID {id_origen}.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': f'Error interno al buscar el origen: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@transaction.atomic
def realizar_cambio(request):
    try:
        data = request.data
        id_venta          = data.get('id_venta')
        id_credito        = data.get('id_credito')
        id_cliente        = data.get('id_cliente')
        id_vendedor       = data.get('id_vendedor') # Recibido desde el frontend
        metodo_excedente  = data.get('metodo_pago_excedente')
        motivo            = data.get('motivo', '')

        productos_devueltos = data.get('productos_devueltos', [])
        productos_nuevos    = data.get('productos_nuevos', [])

        if not productos_devueltos:
            return Response(
                {'error': 'Debe indicar al menos un producto a devolver.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not id_vendedor:
            return Response(
                {'error': 'El ID del vendedor es obligatorio para registrar la auditoría del cambio.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── 1. Calcular totales leyendo precios desde la BD ──
        total_devolucion = 0.0
        items_devueltos_enriquecidos = []

        for p in productos_devueltos:
            prod = get_object_or_404(Productos, id_producto=p['id_producto'])
            precio = float(prod.precio_venta)
            cantidad = int(p['cantidad'])
            total_devolucion += precio * cantidad
            items_devueltos_enriquecidos.append({
                **p,
                'precio_unitario': precio,
                'cantidad':        cantidad,
                'obj_producto':    prod,
            })

        total_nuevo = 0.0
        items_nuevos_enriquecidos = []

        for p in productos_nuevos:
            prod = get_object_or_404(Productos, id_producto=p['id_producto'])
            precio = float(prod.precio_venta)
            cantidad = int(p['cantidad'])
            total_nuevo += precio * cantidad
            items_nuevos_enriquecidos.append({
                **p,
                'precio_unitario': precio,
                'cantidad':        cantidad,
                'obj_producto':    prod,
            })

        diferencia = total_nuevo - total_devolucion

        # ── 2. Validaciones de negocio ──
        if diferencia < 0 and not id_cliente:
            return Response(
                {'error': 'No se puede generar saldo a favor para un Cliente Ocasional. '
                          'Ajusta los artículos nuevos o vincula un cliente real.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if diferencia > 0 and not metodo_excedente:
            return Response(
                {'error': 'Debe especificar el método de pago para cobrar el excedente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── 3. Validar stock antes de mutar datos ──
        for p in items_nuevos_enriquecidos:
            talla_reg = ProductoTalla.objects.filter(
                id_producto=p['obj_producto'], talla=p['talla']
            ).first()
            if not talla_reg or talla_reg.cantidad < p['cantidad']:
                raise Exception(
                    f"Stock insuficiente para '{p['obj_producto'].nombre}' talla [{p['talla']}]. "
                    f"Disponible: {talla_reg.cantidad if talla_reg else 0}."
                )

        # ── 4. Crear cabecera del cambio incluyendo el id_vendedor ──
        cambio = Cambios.objects.create(
            id_venta_id          = id_venta if id_venta else None,
            id_credito_id        = id_credito if id_credito else None,
            id_vendedor_id       = int(id_vendedor), # Soluciona el error de nulidad
            total_devolucion     = total_devolucion,
            total_nuevo          = total_nuevo,
            excedente_pagado     = max(diferencia, 0),
            metodo_pago_excedente= metodo_excedente if diferencia > 0 else None,
            motivo               = motivo,
        )

        # ── 5. Procesar ENTRADAS: sube stock ──
        for p in items_devueltos_enriquecidos:
            prod = p['obj_producto']

            prod.stock += p['cantidad']
            prod.save()

            talla_reg = ProductoTalla.objects.filter(
                id_producto=prod, talla=p['talla']
            ).first()
            if talla_reg:
                talla_reg.cantidad += p['cantidad']
                talla_reg.save()

            CambioDetallesEntrada.objects.create(
                id_cambio     = cambio,
                id_producto_id= p['id_producto'],
                talla         = p['talla'],
                cantidad      = p['cantidad'],
                precio_pactado= p['precio_unitario'],
            )

        # ── 6. Procesar SALIDAS: baja stock ──
        for p in items_nuevos_enriquecidos:
            prod = p['obj_producto']

            talla_reg = ProductoTalla.objects.filter(
                id_producto=prod, talla=p['talla']
            ).first()
            talla_reg.cantidad -= p['cantidad']
            talla_reg.save()

            prod.stock -= p['cantidad']
            prod.save()

            CambioDetallesSalida.objects.create(
                id_cambio     = cambio,
                id_producto_id= p['id_producto'],
                talla         = p['talla'],
                cantidad      = p['cantidad'],
                precio_venta  = p['precio_unitario'],
            )

        # ── 7. Ajuste financiero automático ──
        if id_venta and diferencia > 0:
            venta = Ventas.objects.get(id_venta=id_venta)
            venta.total = float(venta.total) + diferencia
            venta.save()

        if id_credito:
            credito = Creditos.objects.get(id_credito=id_credito)
            if diferencia > 0:
                credito.saldo_pendiente = float(credito.saldo_pendiente) + diferencia
            elif diferencia < 0:
                credito.saldo_pendiente = max(0, float(credito.saldo_pendiente) + diferencia)
            credito.save()

        return Response({
            'message':          '¡Cambio registrado exitosamente!',
            'id_cambio':        cambio.id_cambio,
            'total_devolucion': total_devolucion,
            'total_nuevo':      total_nuevo,
            'diferencia':       diferencia,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def listar_cambios(request):
    cambios = Cambios.objects.all().order_by('-fecha_cambio')
    serializer = CambiosSerializer(cambios, many=True)
    return Response(serializer.data)