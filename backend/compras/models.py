from django.db import models
from proveedores.models import Proveedores
from usuarios.models import Usuarios
from productos.models import Productos

class Compras(models.Model):
    id_compra = models.AutoField(primary_key=True)
    id_proveedor = models.ForeignKey(Proveedores, models.DO_NOTHING, db_column='id_proveedor', blank=True, null=True)
    id_usuario = models.ForeignKey(Usuarios, models.DO_NOTHING, db_column='id_usuario', blank=True, null=True)
    fecha_compra = models.DateTimeField(blank=True, null=True)
    total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'compras'


class DetalleCompra(models.Model):
    id_detalle = models.AutoField(primary_key=True)
    id_compra = models.ForeignKey(Compras, models.DO_NOTHING, db_column='id_compra', blank=True, null=True)
    id_producto = models.ForeignKey(Productos, models.DO_NOTHING, db_column='id_producto', blank=True, null=True)
    
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'detalle_compra'