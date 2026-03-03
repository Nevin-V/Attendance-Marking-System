from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Session
from .serializers import SessionSerializer
import uuid
from datetime import datetime

class SessionStartView(generics.CreateAPIView):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Generate QR Token
        qr_token = str(uuid.uuid4())
        request.data['qr_token'] = qr_token
        return super().create(request, *args, **kwargs)

from django.utils import timezone

class SessionEndView(generics.UpdateAPIView):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.end_time = timezone.now()
        instance.save()
        return Response({'status': 'Session ended'}, status=status.HTTP_200_OK)

class SessionListView(generics.ListAPIView):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        class_id = self.kwargs['class_id']
        return Session.objects.filter(class_instance_id=class_id, class_instance__faculty=self.request.user).order_by('-start_time')
