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
            user = request.user
            from student_groups.models import StudentGroup
            from classes.models import Class
            
            groups = StudentGroup.objects.filter(students=user)
            classes = Class.objects.filter(student_group__in=groups)
            
            global_attended = 0
            global_possible = 0
            class_breakdown = []
            
            attended_session_ids = set(
                Attendance.objects.filter(student=user).values_list('session_id', flat=True)
            )
            
            for cls in classes:
                sessions = Session.objects.filter(class_instance=cls, is_active=False)
                total_sessions = sessions.count()
                attended_sessions = len([s for s in sessions if s.id in attended_session_ids])
                
                global_possible += total_sessions
                global_attended += attended_sessions
                
                attendance_pct = (attended_sessions / total_sessions * 100) if total_sessions > 0 else 0
                class_breakdown.append({
                    'subject': cls.subject,
                    'department': cls.department,
                    'attended': attended_sessions,
                    'total_sessions': total_sessions,
                    'attendance_pct': round(attendance_pct, 2)
                })
                
            global_attendance_pct = (global_attended / global_possible * 100) if global_possible > 0 else 0
            
            return Response({
                'attendance_count': global_attended,
                'total_sessions_possible': global_possible,
                'engagement_score': round(global_attendance_pct, 2),
                'class_breakdown': class_breakdown
            })
            
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
