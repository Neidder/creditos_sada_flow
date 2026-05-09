from django.contrib.auth.models import AbstractUser
from django.db import models



# Create your models here.


class Roles(models.Model):
    id_rol = models.AutoField(primary_key=True)
    nombre_rol = models.CharField(max_length=50)
    fecha_creacion = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'roles'


class Usuarios(models.Model):
    id_usuario = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    correo = models.CharField(unique=True, max_length=150)
    contrasena = models.CharField(max_length=255)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    id_rol = models.ForeignKey(Roles, models.DO_NOTHING, db_column='id_rol', blank=True, null=True)
    fecha_creacion = models.DateTimeField(blank=True, null=True)
    activo = models.BooleanField(default=True)

    class Meta:
        managed = False
        db_table = 'usuarios'