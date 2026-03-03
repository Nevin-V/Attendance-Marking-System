from rest_framework import generics, permissions
from .models import Class
from .serializers import ClassSerializer

class ClassListCreateView(generics.ListCreateAPIView):
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'FACULTY':
            return Class.objects.filter(faculty=self.request.user)
        return Class.objects.none() # Students don't manage classes directly

    def perform_create(self, serializer):
        serializer.save(faculty=self.request.user)

class ClassDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
         if self.request.user.role == 'FACULTY':
            return Class.objects.filter(faculty=self.request.user)
         return Class.objects.none()
