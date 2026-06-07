from django.db import models
from django.utils import timezone

class Cambios(models.Model):
    METODOS_PAGO = [
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
        ('tarjeta', 'Tarjeta'),
    ]

    id_cambio = models.AutoField(primary_key=True)
    id_venta = models.ForeignKey(
        'ventas.Ventas', on_delete=models.SET_NULL,
        null=True, blank=True, db_column='id_venta'
    )
    id_credito = models.ForeignKey(
        'creditos.Creditos', on_delete=models.SET_NULL,
        null=True, blank=True, db_column='id_credito'
    )
    id_vendedor = models.ForeignKey(
        'usuarios.Usuarios', on_delete=models.PROTECT,
        db_column='id_vendedor', null=True, blank=True
    )

    total_devolucion = models.DecimalField(max_digits=10, decimal_places=2)
    total_nuevo = models.DecimalField(max_digits=10, decimal_places=2)

    # excedente_pagado representa la diferencia neta (total_nuevo - total_devolucion):
    # > 0: cliente paga excedente a la tienda (INGRESO)
    # < 0: tienda devuelve saldo al cliente (EGRESO)
    # = 0: cambio directo sin movimiento de dinero
    excedente_pagado = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00
    )
    metodo_pago_excedente = models.CharField(
        max_length=20, choices=METODOS_PAGO, null=True, blank=True
    )

    motivo = models.TextField(null=True, blank=True)
    fecha_cambio = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'cambios'

    def __str__(self):
        return f"Cambio #{self.id_cambio}"

    @property
    def excedente_cobrado(self):
        """Dinero que el cliente pagó a la tienda (solo positivo)."""
        val = float(self.excedente_pagado or 0)
        return val if val > 0 else 0

    @property
    def saldo_devuelto(self):
        """Dinero que la tienda devolvió al cliente (solo positivo)."""
        val = float(self.excedente_pagado or 0)
        return abs(val) if val < 0 else 0


class CambioDetallesEntrada(models.Model):
    id_detalle_entrada = models.AutoField(primary_key=True)
    id_cambio = models.ForeignKey(
        Cambios, on_delete=models.CASCADE,
        db_column='id_cambio', related_name='detalles_entrada'
    )
    id_producto = models.ForeignKey(
        'productos.Productos', on_delete=models.PROTECT, db_column='id_producto'
    )
    talla = models.CharField(max_length=10)
    cantidad = models.IntegerField()
    precio_pactado = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'cambio_detalles_entrada'


class CambioDetallesSalida(models.Model):
    id_detalle_salida = models.AutoField(primary_key=True)
    id_cambio = models.ForeignKey(
        Cambios, on_delete=models.CASCADE,
        db_column='id_cambio', related_name='detalles_salida'
    )
    id_producto = models.ForeignKey(
        'productos.Productos', on_delete=models.PROTECT, db_column='id_producto'
    )
    talla = models.CharField(max_length=10)
    cantidad = models.IntegerField()
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'cambio_detalles_salida'