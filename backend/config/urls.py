from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('classes.urls')),
    path('api/', include('sessions.urls')),
    path('api/', include('attendance.urls')),
    path('api/', include('analytics.urls')),
    path('api/', include('student_groups.urls')),
]
