from rest_framework import viewsets, status
from rest_framework.response import Response

from django.utils import timezone

from .models import Pagos
from .serializers import (
    PagoSerializer,
    CrearPagoSerializer
)

from creditos.models import Creditos
from usuarios.models import Usuarios


class PagoViewSet(viewsets.ModelViewSet):

    queryset = Pagos.objects.all().order_by('-fecha_pago')

    serializer_class = PagoSerializer

    def create(self, request, *args, **kwargs):

        serializer = CrearPagoSerializer(
            data=request.data
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data

        try:
            credito = Creditos.objects.get(
                pk=data['id_credito']
            )

        except Creditos.DoesNotExist:
            return Response(
                {'error': 'Crédito no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        usuario = Usuarios.objects.get(
            pk=data['registrado_por']
        )

        pago = Pagos.objects.create(
            id_credito=credito,
            monto=data['monto'],
            metodo_pago=data['metodo_pago'],
            fecha_pago=timezone.now(),
            registrado_por=usuario
        )

        credito.saldo_restante -= data['monto']

        if credito.saldo_restante <= 0:
            credito.saldo_restante = 0
            credito.estado = 'pagado'

        credito.save()

        return Response({
            'mensaje': 'Pago registrado correctamente',
            'saldo_restante': credito.saldo_restante
        })