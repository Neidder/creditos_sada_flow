from django.db import models
from clientes.models import Clientes
from usuarios.models import Usuarios
from productos.models import Productos


class Ventas(models.Model):
    id_venta = models.AutoField(primary_key=True)
    id_cliente = models.ForeignKey(
        Clientes, models.DO_NOTHING,
        db_column='id_cliente', blank=True, null=True
    )
    id_vendedor = models.ForeignKey(
        Usuarios, models.DO_NOTHING,
        db_column='id_vendedor'
    )
    fecha_venta = models.DateTimeField()
    total = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=50)

    class Meta:
        managed = False
        db_table = 'ventas'


class DetalleVenta(models.Model):
    id_detalle = models.AutoField(primary_key=True)
    id_venta = models.ForeignKey(
        Ventas, models.CASCADE,
        db_column='id_venta',
        related_name='detalles'
    )
    id_producto = models.ForeignKey(
        Productos, models.DO_NOTHING,
        db_column='id_producto'
    )
    talla = models.CharField(max_length=10)
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'detalle_venta'