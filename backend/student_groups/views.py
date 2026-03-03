from rest_framework import generics, permissions, status, views
from rest_framework.response import Response
from .models import StudentGroup, StudentCredential
from .serializers import StudentGroupSerializer
from users.models import User
from django.db import transaction
import random
import string

class IsClassRep(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'CLASS_REP' or request.user.is_superuser

class StudentGroupListCreateView(generics.ListCreateAPIView):
    serializer_class = StudentGroupSerializer
    permission_classes = [permissions.IsAuthenticated] # Faculty needs to list too

    def get_queryset(self):
        if self.request.user.role == 'CLASS_REP':
            return StudentGroup.objects.filter(created_by=self.request.user)
        elif self.request.user.role == 'FACULTY':
             return StudentGroup.objects.all() # Faculty can see all groups
        return StudentGroup.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class AddStudentsView(views.APIView):
    permission_classes = [IsClassRep]

    def post(self, request, pk):
        try:
            group = StudentGroup.objects.get(pk=pk, created_by=request.user)
        except StudentGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

        students_data = request.data.get('students', []) # Expecting list of {name, register_number}
        created_users_data = []

        with transaction.atomic():
            for s_data in students_data:
                name = s_data.get('name')
                reg_no = s_data.get('register_number')
                
                if not name or not reg_no:
                    continue

                # Generate username as name_rollno (e.g. john_REG001)
                username = name.split()[0].lower() + '_' + reg_no
                
                # Create user if not exists
                user, created = User.objects.get_or_create(username=username, defaults={
                    'first_name': name,
                    'role': 'STUDENT',
                    'register_number': reg_no
                })
                
                # Always generate a password so CR can see it
                password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
                user.set_password(password)
                if not created:
                    user.first_name = name  # Update name if user already existed
                user.save()
                
                group.students.add(user)
                
                # Store credentials permanently
                StudentCredential.objects.update_or_create(
                    group=group, student=user,
                    defaults={'username': user.username, 'password_plain': password}
                )
                
                created_users_data.append({
                    'username': user.username,
                    'password': password,
                    'name': user.first_name
                })
        
        return Response(created_users_data, status=status.HTTP_201_CREATED)

class GroupStudentsListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
             # Allow faculty and CR to view
             if request.user.role == 'CLASS_REP':
                 group = StudentGroup.objects.get(pk=pk, created_by=request.user)
             else:
                 group = StudentGroup.objects.get(pk=pk)
        except StudentGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Build a credentials lookup for CR users
        creds_map = {}
        if request.user.role == 'CLASS_REP':
            for c in StudentCredential.objects.filter(group=group):
                creds_map[c.student_id] = {'username': c.username, 'password': c.password_plain}

        data = []
        for student in group.students.all():
            entry = {
                'id': student.id,
                'username': student.username,
                'name': student.first_name,
                'register_number': student.register_number
            }
            # Include credentials for CR
            if student.id in creds_map:
                entry['login_username'] = creds_map[student.id]['username']
                entry['login_password'] = creds_map[student.id]['password']
            data.append(entry)
        return Response(data)


class GroupCredentialsView(views.APIView):
    permission_classes = [IsClassRep]

    def get(self, request, pk):
        try:
            group = StudentGroup.objects.get(pk=pk, created_by=request.user)
        except StudentGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

        creds = StudentCredential.objects.filter(group=group).select_related('student')
        data = []
        for c in creds:
            data.append({
                'name': c.student.first_name,
                'username': c.username,
                'password': c.password_plain,
                'register_number': c.student.register_number
            })
        return Response(data)


class UpdateStudentView(views.APIView):
    permission_classes = [IsClassRep]

    def put(self, request, pk, student_id):
        try:
            group = StudentGroup.objects.get(pk=pk, created_by=request.user)
        except StudentGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            student = group.students.get(id=student_id)
        except User.DoesNotExist:
            return Response({'error': 'Student not found in group'}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name')
        register_number = request.data.get('register_number')

        if name:
            student.first_name = name
        if register_number:
            student.register_number = register_number
            student.username = register_number
        student.save()

        return Response({
            'id': student.id,
            'username': student.username,
            'name': student.first_name,
            'register_number': student.register_number
        })


class RemoveStudentView(views.APIView):
    permission_classes = [IsClassRep]

    def delete(self, request, pk, student_id):
        try:
            group = StudentGroup.objects.get(pk=pk, created_by=request.user)
        except StudentGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            student = group.students.get(id=student_id)
        except User.DoesNotExist:
            return Response({'error': 'Student not found in group'}, status=status.HTTP_404_NOT_FOUND)

        group.students.remove(student)
        return Response({'message': 'Student removed from group'}, status=status.HTTP_204_NO_CONTENT)
