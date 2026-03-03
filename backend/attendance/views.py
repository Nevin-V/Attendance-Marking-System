from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from django.utils import timezone
from .models import Attendance
from sessions.models import Session
from classes.models import Class
from student_groups.models import StudentGroup
from .serializers import AttendanceSerializer, AttendanceMarkSerializer
from datetime import timedelta

class MarkAttendanceView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Only faculty cannot mark attendance
        if request.user.role == 'FACULTY':
             return Response({'error': 'Faculty cannot mark attendance'}, status=status.HTTP_403_FORBIDDEN)

        serializer = AttendanceMarkSerializer(data=request.data)
        if serializer.is_valid():
            qr_token = serializer.validated_data['qr_token']
            try:
                session = Session.objects.get(qr_token=qr_token)
            except Session.DoesNotExist:
                return Response({'error': 'Invalid QR Code'}, status=status.HTTP_400_BAD_REQUEST)

            if not session.is_active:
                return Response({'error': 'Session is inactive'}, status=status.HTTP_400_BAD_REQUEST)

            # Check for 5-minute expiration
            if timezone.now() > session.start_time + timedelta(seconds=300):
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
