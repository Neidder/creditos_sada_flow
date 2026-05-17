from rest_framework import viewsets, status
from rest_framework.response import Response
from django.utils import timezone

from .models import Pagos
from .serializers import PagoSerializer, CrearPagoSerializer
from creditos.models import Creditos
from usuarios.models import Usuarios


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pagos.objects.all().order_by('-fecha_pago')
    serializer_class = PagoSerializer

    def create(self, request, *args, **kwargs):
        serializer = CrearPagoSerializer(data=request.data)

        if not serializer.is_valid():
            print("ERRORES PAGO:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            credito = Creditos.objects.get(pk=data['id_credito'])
        except Creditos.DoesNotExist:
            return Response(
                {'error': 'Crédito no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            usuario = Usuarios.objects.get(pk=data['registrado_por'])
        except Usuarios.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        pago = Pagos.objects.create(
            id_credito=credito,
            monto=data['monto'],
            metodo_pago=data['metodo_pago'],
            fecha_pago=timezone.now(),
            registrado_por=usuario
        )

        credito.saldo_pendiente -= data['monto']  # ← era saldo_restante

        if credito.saldo_pendiente <= 0:
            credito.saldo_pendiente = 0
            credito.estado = 'PAGADO'

        credito.save()

        return Response({
            'mensaje': 'Pago registrado correctamente',
            'saldo_restante': credito.saldo_pendiente
        })