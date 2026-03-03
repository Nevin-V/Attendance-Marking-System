from rest_framework import serializers
from .models import Class

class ClassSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source='faculty.username', read_only=True)
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default=None)

    class Meta:
        model = Class
        fields = ['id', 'faculty', 'subject', 'department', 'semester', 'faculty_name', 'student_group', 'student_group_name']
        read_only_fields = ['faculty']
