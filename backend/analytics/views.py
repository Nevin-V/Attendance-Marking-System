from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.db.models import Count, Q
from classes.models import Class
from sessions.models import Session
from attendance.models import Attendance
from users.models import User

class ClassAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == User.Role.FACULTY:
            classes = Class.objects.filter(faculty=request.user)
            data = []
            for cls in classes:
                total_sessions = Session.objects.filter(class_instance=cls).count()
                total_attendance = Attendance.objects.filter(session__class_instance=cls).count()
                
                total_students = 0
                if cls.student_group:
                    total_students = cls.student_group.students.count()

                avg_attendance = 0
                if total_sessions > 0 and total_students > 0:
                    avg_attendance = (total_attendance / (total_sessions * total_students)) * 100

                data.append({
                    'class_id': cls.id,
                    'subject': cls.subject,
                    'total_sessions': total_sessions,
                    'total_students': total_students,
                    'total_attendance_records': total_attendance,
                    'avg_attendance_pct': round(avg_attendance, 2)
                })
            return Response(data)
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

class StudentAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == User.Role.STUDENT:
            # Get all classes? Or just global stats?
            # Prompt: "View engagement score"
            
            # sessions_attended = Attendance.objects.filter(student=request.user).count()
            # participation_count = Attendance.objects.filter(student=request.user, participated=True).count()
            # But we need "Total Sessions" to calculate %.
            # Since no enrollment, we can't know which classes the student belongs to exactly.
            # But we can assume they belong to classes they attended? No.
            # We can calculate based on All Sessions of Classes they have attended at least once?
            # Or just Total Sessions in the system? (Simple MVP approach).
            # "Class Management -> Create Class". No "Enroll Student".
            # So a student can attend ANY class session if they scan QR.
            # So "Total Scans" is their attendance.
            # Engagement Score: (Attendance % + Participation Flag) / 2
            # "Attendance %" needs a denominator.
            # I will simple return the raw counts and let frontend display "attended X sessions".
            # Or assume denominator = Sum of sessions of classes they have at least 1 attendance in.
            
            attended_sessions_qs = Attendance.objects.filter(student=request.user)
            attended_count = attended_sessions_qs.count()
            participated_count = attended_sessions_qs.filter(participated=True).count()
            
            # Calculate denominator: Find unique classes attended, count their total sessions.
            class_ids = attended_sessions_qs.values_list('session__class_instance', flat=True).distinct()
            total_sessions_possible = Session.objects.filter(class_instance__id__in=class_ids).count()
            
            attendance_pct = (attended_count / total_sessions_possible * 100) if total_sessions_possible > 0 else 0
            participation_pct = (participated_count / total_sessions_possible * 100) if total_sessions_possible > 0 else 0
            
            engagement_score = (attendance_pct + participation_pct) / 2
            
            return Response({
                'attendance_count': attended_count,
                'total_sessions_possible': total_sessions_possible,
                'attendance_pct': round(attendance_pct, 2),
                'participation_pct': round(participation_pct, 2),
                'engagement_score': round(engagement_score, 2)
            })
            
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
