from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count
from django.db.models.functions import TruncDay
from datetime import timedelta

from clientes.models import Clientes
from productos.models import Productos
from proveedores.models import Proveedores
from compras.models import Compras
from creditos.models import Creditos
from pagos.models import Pagos
from ventas.models import Ventas  # Ajusta la ruta a tu modelo de Ventas


@api_view(['GET'])
def resumen_dashboard(request):

    hoy = timezone.now()

    # Rangos de fechas para filtros
    inicio_hoy = hoy.replace(hour=0, minute=0, second=0, microsecond=0)
    inicio_semana = hoy - timedelta(days=7)
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    hace_30_dias = hoy - timedelta(days=30)

    # ─────────────────────────────
    # CONTEOS GENERALES
    # ─────────────────────────────
    total_clientes = Clientes.objects.count()
    total_productos = Productos.objects.count()
    total_proveedores = Proveedores.objects.count()

    # ─────────────────────────────
    # VENTAS REALES (RESUMEN TARJETAS)
    # ─────────────────────────────
    resumen_hoy = Ventas.objects.filter(fecha_venta__gte=inicio_hoy).aggregate(
        cantidad=Count('id_venta'), total=Sum('total')
    )
    resumen_semana = Ventas.objects.filter(fecha_venta__gte=inicio_semana).aggregate(
        cantidad=Count('id_venta'), total=Sum('total')
    )
    resumen_mes = Ventas.objects.filter(fecha_venta__gte=inicio_mes).aggregate(
        cantidad=Count('id_venta'), total=Sum('total')
    )

    # ─────────────────────────────
    # VENTAS DIARIAS REALES (PARA EL GRÁFICO RECHARTS)
    # ─────────────────────────────
    ventas_agrupadas_mes = Ventas.objects.filter(
        fecha_venta__gte=inicio_mes
    ).annotate(
        dia_del_mes=TruncDay('fecha_venta')
    ).values('dia_del_mes').annotate(
        total_dia=Sum('total')
    ).order_by('dia_del_mes')

    ventas_diarias_json = []
    for item in ventas_agrupadas_mes:
        if item['dia_del_mes']:
            ventas_diarias_json.append({
                'dia': item['dia_del_mes'].strftime('%d'),  # Ejemplo: '01', '02'
                'total': float(item['total_dia'] or 0)
            })

    # ─────────────────────────────
    # CREDITOS
    # ─────────────────────────────
    creditos_activos = Creditos.objects.filter(estado='PENDIENTE').count()
    creditos_vencidos = Creditos.objects.filter(
        estado='PENDIENTE',
        fecha_limite__lt=hoy.date()
    ).count()

    resumen_saldo = Creditos.objects.filter(estado='PENDIENTE').aggregate(total_saldo=Sum('saldo_pendiente'))
    saldo_pendiente = float(resumen_saldo['total_saldo'] or 0)

    # ─────────────────────────────
    # PAGOS DEL MES
    # ─────────────────────────────
    resumen_pagos = Pagos.objects.filter(fecha_pago__gte=inicio_mes).aggregate(total_monto=Sum('monto'))
    total_recaudado_mes = float(resumen_pagos['total_monto'] or 0)

    # ─────────────────────────────
    # COMPRAS DEL MES
    # ─────────────────────────────
    resumen_compras = Compras.objects.filter(fecha_compra__gte=inicio_mes).aggregate(total_compras=Sum('total'))
    total_compras_mes = float(resumen_compras['total_compras'] or 0)

    # ─────────────────────────────
    # PRODUCTOS STOCK BAJO
    # ─────────────────────────────
    productos_stock_bajo = Productos.objects.filter(
        stock__lt=5
    ).values('nombre', 'stock').order_by('stock')[:5]

    # ─────────────────────────────
    # ÚLTIMAS COMPRAS
    # ─────────────────────────────
    ultimas_compras = []
    for c in Compras.objects.order_by('-fecha_compra')[:5]:
        ultimas_compras.append({
            'id': c.id_compra,
            'proveedor': c.id_proveedor.nombre_empresa if c.id_proveedor else '—',
            'total': float(c.total or 0),
            'fecha': c.fecha_compra.strftime('%d/%m/%Y') if c.fecha_compra else '—',
        })

    # ─────────────────────────────
    # ÚLTIMOS PAGOS
    # ─────────────────────────────
    ultimos_pagos = []
    for p in Pagos.objects.order_by('-fecha_pago')[:5]:
        try:
            cliente = p.id_credito.id_cliente
            nombre_cliente = f'{cliente.nombre} {cliente.apellido or ""}'.strip()
        except Exception:
            nombre_cliente = '—'

        ultimos_pagos.append({
            'id': p.id_pago,
            'cliente': nombre_cliente,
            'monto': float(p.monto or 0),
            'metodo': p.metodo_pago,
            'fecha': p.fecha_pago.strftime('%d/%m/%Y %H:%M') if p.fecha_pago else '—',
        })

    # ─────────────────────────────
    # PAGOS POR MÉTODO
    # ─────────────────────────────
    metodos = {}
    for p in Pagos.objects.filter(fecha_pago__gte=hace_30_dias):
        metodo = p.metodo_pago or 'otro'
        metodos[metodo] = metodos.get(metodo, 0) + float(p.monto or 0)
# =================================================================
    # ➕ NUEVA INYECCIÓN GERENCIAL: VALORIZACIÓN REAL DE INVENTARIO
    # =================================================================
    todos_los_productos = Productos.objects.all()
    total_prendas_fisicas = todos_los_productos.aggregate(total_stock=Sum('stock'))['total_stock'] or 0
    
    # Multiplicación iterativa segura de stock * costo_promedio según tu esquema de BD
    capital_total_bodega = sum(float(p.costo_promedio or 0) * int(p.stock or 0) for p in todos_los_productos)

    return Response({
        'generales': {
            'clientes': total_clientes,
            'productos': total_productos,
            'proveedores': total_proveedores,
            'creditos_activos': creditos_activos,
        },
        'finanzas': {
            'recaudado_mes': total_recaudado_mes,
            'compras_mes': total_compras_mes,
            'saldo_pendiente': saldo_pendiente,
            'creditos_vencidos': creditos_vencidos,
            # Campos agregados para organización gerencial:
            'capital_inventario_costo': capital_total_bodega,
            'prendas_totales_bodega': total_prendas_fisicas
        },
        'resumen_ventas': {
            'hoy': {
                'cantidad': resumen_hoy['cantidad'] or 0,
                'total': float(resumen_hoy['total'] or 0)
            },
            'semana': {
                'cantidad': resumen_semana['cantidad'] or 0,
                'total': float(resumen_semana['total'] or 0)
            },
            'mes': {
                'cantidad': resumen_mes['cantidad'] or 0,
                'total': float(resumen_mes['total'] or 0)
            }
        },
        'ventas_diarias': ventas_diarias_json,
        'productos_stock_bajo': list(productos_stock_bajo),
        'ultimas_compras': ultimas_compras,
        'ultimos_pagos': ultimos_pagos,
        'pagos_por_metodo': metodos,
    })