from django.db import models
from creditos.models import Creditos
from usuarios.models import Usuarios


class Pagos(models.Model):

    id_pago = models.AutoField(primary_key=True)

    id_credito = models.ForeignKey(
        Creditos,
        models.DO_NOTHING,
        db_column='id_credito',
        blank=True,
        null=True
    )

    monto = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    metodo_pago = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )

    fecha_pago = models.DateTimeField(
        blank=True,
        null=True
    )

    registrado_por = models.ForeignKey(
        Usuarios,
        models.DO_NOTHING,
        db_column='registrado_por',
        blank=True,
        null=True
    )

    class Meta:
        managed = False
        db_table = 'pagos'