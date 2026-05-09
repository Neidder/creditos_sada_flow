from django.db import models


class Productos(models.Model):
    id_producto = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, null=True)
    precio_venta = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField()
    fecha_creacion = models.DateTimeField(blank=True, null=True)
    costo_promedio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'productos'


class ProductoTalla(models.Model):
    id_talla = models.AutoField(primary_key=True)
    id_producto = models.ForeignKey(
        Productos,
        models.CASCADE,
        db_column='id_producto',
        related_name='tallas'
    )
    talla = models.CharField(max_length=10)
    cantidad = models.IntegerField(default=0)

    class Meta:
        managed = False
        db_table = 'producto_tallas'


class Kardex(models.Model):
    id_kardex = models.AutoField(primary_key=True)
    id_producto = models.ForeignKey(Productos, models.DO_NOTHING, db_column='id_producto')
    tipo_movimiento = models.CharField(max_length=7)
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    stock_anterior = models.IntegerField()
    stock_nuevo = models.IntegerField()
    fecha_movimiento = models.DateTimeField(blank=True, null=True)
    referencia = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'kardex'