from django.urls import path
from .views import StudentGroupListCreateView, AddStudentsView, GroupStudentsListView, UpdateStudentView, RemoveStudentView, GroupCredentialsView

urlpatterns = [
    path('groups/', StudentGroupListCreateView.as_view(), name='group-list-create'),
    path('groups/<int:pk>/students/', AddStudentsView.as_view(), name='group-add-students'),
    path('groups/<int:pk>/details/', GroupStudentsListView.as_view(), name='group-details'),
    path('groups/<int:pk>/credentials/', GroupCredentialsView.as_view(), name='group-credentials'),
    path('groups/<int:pk>/students/<int:student_id>/update/', UpdateStudentView.as_view(), name='group-update-student'),
    path('groups/<int:pk>/students/<int:student_id>/remove/', RemoveStudentView.as_view(), name='group-remove-student'),
]
