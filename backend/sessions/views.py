from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Session
from .serializers import SessionSerializer
import uuid
from django.utils import timezone

class SessionStartView(generics.CreateAPIView):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Move timestamp to the START of the token. 
        # Since QR codes encode from left-to-right, this drastically changes the visual pattern 
        # even if only 1 second has passed.
        ts = int(timezone.now().timestamp())
        short_uuid = uuid.uuid4().hex[:8]
        class_id = request.data.get('class_instance', '0')
        qr_token = f"{ts}-{short_uuid}-{class_id}"
        
        # In DRF, request.data can be an immutable QueryDict. 
        # Clone it before modification to ensure the serializer sees the new token.
        data = request.data.copy()
        data['qr_token'] = qr_token
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return the created session data (including the new token)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
