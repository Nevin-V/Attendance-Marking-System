from django.urls import path
from .views import MarkAttendanceView, AttendanceHistoryView, SessionAttendanceListView, FullAttendanceHistoryView

urlpatterns = [
    path('attendance/mark/', MarkAttendanceView.as_view(), name='mark-attendance'),
    path('attendance/history/', AttendanceHistoryView.as_view(), name='attendance-history'),
    path('attendance/full-history/', FullAttendanceHistoryView.as_view(), name='full-attendance-history'),
    path('attendance/session/<int:session_id>/', SessionAttendanceListView.as_view(), name='session-attendance'),
]
