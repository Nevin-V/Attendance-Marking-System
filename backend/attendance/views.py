from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.utils import timezone
from .models import Attendance
from sessions.models import Session
from classes.models import Class
from student_groups.models import StudentGroup
from .serializers import AttendanceSerializer, AttendanceMarkSerializer
from datetime import timedelta
import math

def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance in meters between two points 
    on the earth (specified in decimal degrees)
    """
    if lon1 is None or lat1 is None or lon2 is None or lat2 is None:
        return float('inf')
        
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371000 # Radius of earth in meters
    return c * r

def euclidean_distance(desc1, desc2):
    if not desc1 or not desc2 or len(desc1) != len(desc2):
        return float('inf')
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(desc1, desc2)))

class MarkAttendanceView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Only faculty cannot mark attendance
        if request.user.role == 'FACULTY':
             return Response({'error': 'Faculty cannot mark attendance'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AttendanceMarkSerializer(data=request.data)
        if serializer.is_valid():
            qr_token = serializer.validated_data['qr_token']
            student_lat = serializer.validated_data['latitude']
            student_lon = serializer.validated_data['longitude']
            device_id = serializer.validated_data['device_id']
            face_descriptor = serializer.validated_data.get('face_descriptor')
            
            try:
                session = Session.objects.get(qr_token=qr_token)
            except Session.DoesNotExist:
                return Response({'error': 'Invalid QR Code'}, status=status.HTTP_400_BAD_REQUEST)

            # Verify Location
            if session.latitude is not None and session.longitude is not None:
                distance = haversine(student_lon, student_lat, session.longitude, session.latitude)
                if distance > session.radius_meters:
                    return Response({
                        'error': f'You are too far from the class ({distance:.0f}m). Must be within {session.radius_meters}m to mark attendance.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Verify Biometrics & Device Identity
            user = request.user
            if not user.trusted_device_id:
                return Response({'error': 'Face Registration Required'}, status=status.HTTP_403_FORBIDDEN)
                
            if user.trusted_device_id != device_id:
                if not face_descriptor:
                    return Response({'error': 'Device mismatch. Live face verification required.', 'require_face': True}, status=status.HTTP_403_FORBIDDEN)
                
                # Verify face because device changed
                if not user.face_descriptor:
                    return Response({'error': 'No registered face descriptor found. Please contact admin.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                distance = euclidean_distance(user.face_descriptor, face_descriptor)
                # 0.5 is a somewhat strict euclidean threshold for face-api.js identifying the same person
                if distance > 0.5:
                    return Response({'error': f'Face verification failed! Distance metric: {distance:.2f}. You do not match the registered face.'}, status=status.HTTP_403_FORBIDDEN)
                
            if not session.is_active:
                return Response({'error': 'Session is inactive'}, status=status.HTTP_400_BAD_REQUEST)

            # Check for 5-minute expiration (300 seconds)
            time_diff = (timezone.now() - session.start_time).total_seconds()
            if time_diff > 300:
                 print(f"FAILED ATTENDANCE: Session {session.id} expired. Time elapsed: {time_diff}s. Token: {qr_token[:10]}...")
                 return Response({'error': 'QR Code expired. Ask faculty to start a new session.'}, status=status.HTTP_400_BAD_REQUEST)

            if Attendance.objects.filter(student=request.user, session=session).exists():
                return Response({'error': 'Attendance already marked'}, status=status.HTTP_400_BAD_REQUEST)

            Attendance.objects.create(student=request.user, session=session, participated=True)
            return Response({'status': 'Attendance marked successfully!'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AttendanceHistoryView(generics.ListAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Attendance.objects.filter(student=self.request.user).order_by('-timestamp')

class SessionAttendanceListView(generics.ListAPIView):
    serializer_class = AttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        session_id = self.kwargs['session_id']
        return Attendance.objects.filter(session_id=session_id)


class FullAttendanceHistoryView(views.APIView):
    """Returns all sessions the student was expected to attend, with present/absent status."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Find all groups this student belongs to
        groups = StudentGroup.objects.filter(students=user)
        # Find all classes linked to those groups
        classes = Class.objects.filter(student_group__in=groups)
        # Find all ended sessions for those classes
        sessions = Session.objects.filter(
            class_instance__in=classes,
            is_active=False
        ).select_related('class_instance').order_by('-start_time')

        # Get all attendance records for this student
        attended_session_ids = set(
            Attendance.objects.filter(student=user).values_list('session_id', flat=True)
        )

        data = []
        for session in sessions:
            was_present = session.id in attended_session_ids
            data.append({
                'session_id': session.id,
                'subject': session.class_instance.subject,
                'department': session.class_instance.department,
                'date': session.start_time.strftime('%Y-%m-%d'),
                'time': session.start_time.strftime('%H:%M:%S'),
                'status': 'Present' if was_present else 'Absent',
            })

        return Response(data)
