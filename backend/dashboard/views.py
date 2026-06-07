from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from django.db.models.functions import TruncDay
from datetime import timedelta, datetime, date as date_type

from clientes.models import Clientes
from productos.models import Productos
from proveedores.models import Proveedores
from compras.models import Compras
from creditos.models import Creditos
from pagos.models import Pagos
from ventas.models import Ventas


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def resumen_dashboard(request):
    hoy = timezone.now()
    inicio_hoy    = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_semana = hoy - timedelta(days=7)
    inicio_mes    = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    hace_30_dias  = hoy - timedelta(days=30)

    total_clientes    = Clientes.objects.count()
    total_productos   = Productos.objects.count()
    total_proveedores = Proveedores.objects.count()

    resumen_hoy    = Ventas.objects.filter(fecha_venta__gte=inicio_hoy).aggregate(cantidad=Count('id_venta'), total=Sum('total'))
    resumen_semana = Ventas.objects.filter(fecha_venta__gte=inicio_semana).aggregate(cantidad=Count('id_venta'), total=Sum('total'))
    resumen_mes    = Ventas.objects.filter(fecha_venta__gte=inicio_mes).aggregate(cantidad=Count('id_venta'), total=Sum('total'))

    ventas_agrupadas_mes = Ventas.objects.filter(
        fecha_venta__gte=inicio_mes
    ).annotate(dia_del_mes=TruncDay('fecha_venta')).values('dia_del_mes').annotate(
        total_dia=Sum('total')
    ).order_by('dia_del_mes')

    ventas_diarias_json = []
    for item in ventas_agrupadas_mes:
        if item['dia_del_mes']:
            ventas_diarias_json.append({
                'dia': item['dia_del_mes'].strftime('%d'),
                'total': float(item['total_dia'] or 0)
            })

    creditos_activos  = Creditos.objects.filter(estado='PENDIENTE').count()
    creditos_vencidos = Creditos.objects.filter(estado='PENDIENTE', fecha_limite__lt=hoy.date()).count()
    saldo_pendiente   = float(Creditos.objects.filter(estado='PENDIENTE').aggregate(total_saldo=Sum('saldo_pendiente'))['total_saldo'] or 0)

    total_recaudado_mes = float(Pagos.objects.filter(fecha_pago__gte=inicio_mes).aggregate(total_monto=Sum('monto'))['total_monto'] or 0)
    total_compras_mes   = float(Compras.objects.filter(fecha_compra__gte=inicio_mes).aggregate(total_compras=Sum('total'))['total_compras'] or 0)

    productos_stock_bajo = Productos.objects.filter(stock__lt=5).values('nombre', 'stock').order_by('stock')[:5]

    ultimas_compras = []
    for c in Compras.objects.select_related('id_proveedor').order_by('-fecha_compra')[:5]:
        ultimas_compras.append({
            'id':        c.id_compra,
            'proveedor': c.id_proveedor.nombre_empresa if c.id_proveedor else '—',
            'total':     float(c.total or 0),
            'fecha':     c.fecha_compra.strftime('%d/%m/%Y') if c.fecha_compra else '—',
        })

    ultimos_pagos = []
    for p in Pagos.objects.select_related('id_credito__id_cliente').order_by('-fecha_pago')[:5]:
        try:
            cliente = p.id_credito.id_cliente
            nombre_cliente = f'{cliente.nombre} {cliente.apellido or ""}'.strip()
        except Exception:
            nombre_cliente = '—'
        ultimos_pagos.append({
            'id':      p.id_pago,
            'cliente': nombre_cliente,
            'monto':   float(p.monto or 0),
            'metodo':  p.metodo_pago,
            'fecha':   p.fecha_pago.strftime('%d/%m/%Y %H:%M') if p.fecha_pago else '—',
        })

    metodos = {}
    for p in Pagos.objects.filter(fecha_pago__gte=hace_30_dias):
        metodo = p.metodo_pago or 'otro'
        metodos[metodo] = metodos.get(metodo, 0) + float(p.monto or 0)

    todos_los_productos    = Productos.objects.all()
    total_prendas_fisicas  = todos_los_productos.aggregate(total_stock=Sum('stock'))['total_stock'] or 0
    capital_total_bodega   = sum(float(p.costo_promedio or 0) * int(p.stock or 0) for p in todos_los_productos)

    return Response({
        'generales': {
            'clientes':         total_clientes,
            'productos':        total_productos,
            'proveedores':      total_proveedores,
            'creditos_activos': creditos_activos,
        },
        'finanzas': {
            'recaudado_mes':          total_recaudado_mes,
            'compras_mes':            total_compras_mes,
            'saldo_pendiente':        saldo_pendiente,
            'creditos_vencidos':      creditos_vencidos,
            'capital_inventario_costo': capital_total_bodega,
            'prendas_totales_bodega': total_prendas_fisicas,
        },
        'resumen_ventas': {
            'hoy':    {'cantidad': resumen_hoy['cantidad'] or 0,    'total': float(resumen_hoy['total'] or 0)},
            'semana': {'cantidad': resumen_semana['cantidad'] or 0, 'total': float(resumen_semana['total'] or 0)},
            'mes':    {'cantidad': resumen_mes['cantidad'] or 0,    'total': float(resumen_mes['total'] or 0)},
        },
        'ventas_diarias':       ventas_diarias_json,
        'productos_stock_bajo': list(productos_stock_bajo),
        'ultimas_compras':      ultimas_compras,
        'ultimos_pagos':        ultimos_pagos,
        'pagos_por_metodo':     metodos,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def caja_diaria(request):
    fecha_str = request.query_params.get('fecha')
    try:
        fecha = date_type.fromisoformat(fecha_str) if fecha_str else date_type.today()
    except ValueError:
        return Response({'error': 'Formato de fecha inválido. Usa YYYY-MM-DD'}, status=400)

    inicio = datetime.combine(fecha, datetime.min.time())
    fin    = datetime.combine(fecha, datetime.max.time())

    # ── Ventas del día ──
    ventas_qs = Ventas.objects.filter(fecha_venta__range=(inicio, fin))
    ventas_por_metodo = {}
    total_ventas = 0
    for v in ventas_qs:
        metodo = v.metodo_pago or 'otro'
        if metodo not in ventas_por_metodo:
            ventas_por_metodo[metodo] = {'cantidad': 0, 'total': 0}
        ventas_por_metodo[metodo]['cantidad'] += 1
        ventas_por_metodo[metodo]['total']    += float(v.total or 0)
        total_ventas += float(v.total or 0)

    # ── Cobros de créditos ──
    pagos_qs = Pagos.objects.select_related('id_credito__id_cliente').filter(fecha_pago__range=(inicio, fin))
    cobros = []
    total_cobros = 0
    for p in pagos_qs:
        try:
            cliente = p.id_credito.id_cliente
            nombre  = f'{cliente.nombre} {cliente.apellido or ""}'.strip()
        except Exception:
            nombre = '—'
        cobros.append({'cliente': nombre, 'metodo': p.metodo_pago, 'monto': float(p.monto or 0), 'id_credito': p.id_credito_id})
        total_cobros += float(p.monto or 0)

    # ── Compras del día ──
    compras_qs = Compras.objects.select_related('id_proveedor').filter(fecha_compra__range=(inicio, fin))
    compras = []
    total_compras = 0
    for c in compras_qs:
        compras.append({'proveedor': c.id_proveedor.nombre_empresa if c.id_proveedor else '—', 'total': float(c.total or 0), 'id_compra': c.id_compra})
        total_compras += float(c.total or 0)

    # ── Cambios/Devoluciones del día ──
    # excedente_pagado ahora puede ser:
    #   > 0: cliente pagó más, la tienda RECIBIÓ dinero (ingreso por cambio)
    #   < 0: tienda debe saldo al cliente, la tienda ENTREGÓ dinero (egreso por cambio)
    #   = 0: cambio directo sin movimiento de dinero
    from Cambios.models import Cambios as CambiosModel

    cambios_qs = CambiosModel.objects.filter(fecha_cambio__range=(inicio, fin))
    cantidad_cambios = cambios_qs.count()

    # Dinero que entra a la tienda por cambios (cliente paga excedente)
    total_ingresos_cambios = 0.0
    # Dinero que sale de la tienda por cambios (tienda devuelve saldo a favor)
    total_egresos_cambios = 0.0

    cambios_detalle = []
    for c in cambios_qs:
        excedente = float(c.excedente_pagado or 0)
        if excedente > 0:
            total_ingresos_cambios += excedente
            tipo_cambio = 'ingreso'
        elif excedente < 0:
            total_egresos_cambios += abs(excedente)
            tipo_cambio = 'egreso'
        else:
            tipo_cambio = 'neutro'

        cambios_detalle.append({
            'id_cambio':       c.id_cambio,
            'total_devolucion': float(c.total_devolucion or 0),
            'total_nuevo':      float(c.total_nuevo or 0),
            'excedente_pagado': excedente,
            'tipo':             tipo_cambio,
            'metodo_pago':      c.metodo_pago_excedente or '—',
        })

    # ── Totales consolidados ──
    # INGRESOS: ventas + cobros de créditos + excedentes de cambios
    total_ingresos = total_ventas + total_cobros + total_ingresos_cambios
    # EGRESOS: compras + saldos a favor devueltos en cambios
    total_egresos  = total_compras + total_egresos_cambios
    neto_caja      = total_ingresos - total_egresos

    return Response({
        'fecha': str(fecha),
        'resumen': {
            'total_ingresos':      round(total_ingresos, 2),
            'total_egresos':       round(total_egresos, 2),
            'neto_caja':           round(neto_caja, 2),
            'total_transacciones': ventas_qs.count() + pagos_qs.count() + cantidad_cambios,
        },
        'ventas': {
            'por_metodo': ventas_por_metodo,
            'total':      round(total_ventas, 2),
            'cantidad':   ventas_qs.count(),
        },
        'cobros_creditos': {
            'detalle':  cobros,
            'total':    round(total_cobros, 2),
            'cantidad': pagos_qs.count(),
        },
        'egresos': {
            'compras':      {'detalle': compras, 'total': round(total_compras, 2), 'cantidad': compras_qs.count()},
            # Devoluciones: lo que la tienda entrega al cliente cuando el cliente devuelve más valor
            'devoluciones': {
                'total':    round(total_egresos_cambios, 2),
                'cantidad': sum(1 for c in cambios_detalle if c['tipo'] == 'egreso'),
            },
        },
        # Nueva sección con el detalle completo de cambios
        'cambios': {
            'detalle':             cambios_detalle,
            'cantidad':            cantidad_cambios,
            'ingresos_excedentes': round(total_ingresos_cambios, 2),  # cliente pagó más
            'egresos_saldo_favor': round(total_egresos_cambios, 2),   # tienda devolvió saldo
            'neto_cambios':        round(total_ingresos_cambios - total_egresos_cambios, 2),
        },
    })