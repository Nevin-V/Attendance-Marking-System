from django.urls import path
from .views import ClassAnalyticsView, StudentAnalyticsView

urlpatterns = [
    path('analytics/class/', ClassAnalyticsView.as_view(), name='class-analytics'),
    path('analytics/student/', StudentAnalyticsView.as_view(), name='student-analytics'),
]
