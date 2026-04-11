from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework import views, status, permissions
from rest_framework.response import Response
import uuid

class FaceRegistrationView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        face_descriptor = request.data.get('face_descriptor')
        
        if not face_descriptor:
            return Response({'error': 'Face descriptor is required.'}, status=status.HTTP_400_BAD_REQUEST)

        device_id = str(uuid.uuid4())
        user.face_descriptor = face_descriptor
        user.trusted_device_id = device_id
        user.save()
        
        return Response({
            'status': 'success',
            'device_id': device_id
        })

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
