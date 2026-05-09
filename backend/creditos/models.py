from django.db import models
from clientes.models import Clientes
from productos.models import Productos
from usuarios.models import Usuarios


class Creditos(models.Model):
    id_credito = models.AutoField(primary_key=True)

    id_cliente = models.ForeignKey(
        Clientes,
        models.DO_NOTHING,
        db_column='id_cliente',
        blank=True,
        null=True
    )

    id_vendedor = models.ForeignKey(
        Usuarios,
        models.DO_NOTHING,
        db_column='id_vendedor',
        blank=True,
        null=True
    )

    valor_total = models.DecimalField(max_digits=10, decimal_places=2)
    saldo_pendiente = models.DecimalField(max_digits=10, decimal_places=2)

    fecha_credito = models.DateField(blank=True, null=True)
    fecha_limite = models.DateField(blank=True, null=True)

    estado = models.CharField(max_length=50, blank=True, null=True)

    fecha_creacion = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'creditos'


class DetalleCredito(models.Model):
    id_detalle = models.AutoField(primary_key=True)

    id_credito = models.ForeignKey(
        Creditos,
        models.CASCADE,
        db_column='id_credito',
        related_name='detalles'
    )

    id_producto = models.ForeignKey(
        Productos,
        models.DO_NOTHING,
        db_column='id_producto',
        null=True,
        blank=True
    )

    talla = models.CharField(max_length=10)

    cantidad = models.IntegerField(default=1)

    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'detalle_credito'