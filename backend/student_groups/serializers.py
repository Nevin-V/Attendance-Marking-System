from rest_framework import serializers
from .models import StudentGroup
from users.models import User
import random
import string

class UserCredentialSerializer(serializers.ModelSerializer):
    password_plain = serializers.CharField(read_only=True) # To show generated password once
    
    class Meta:
        model = User
        fields = ['id', 'username', 'register_number', 'password_plain']

class StudentGroupSerializer(serializers.ModelSerializer):
    student_count = serializers.IntegerField(source='students.count', read_only=True)

    class Meta:
        model = StudentGroup
        fields = ['id', 'name', 'created_by', 'student_count', 'created_at']
        read_only_fields = ['created_by', 'created_at']

class CreateStudentsSerializer(serializers.Serializer):
    # Expects a list of dicts: [{'name': 'John', 'register_number': '123'}, ...]
    students = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField())
    )

    def create(self, validated_data):
        group = self.context['group']
        created_users = []
        
        for student_data in validated_data['students']:
            username = student_data.get('register_number') # Use reg no as username
            name = student_data.get('name')
            
            # Check if user exists
            user, created = User.objects.get_or_create(username=username, defaults={
                'role': 'STUDENT',
                'first_name': name,
                'register_number': username
            })
            
            if created:
                # Generate random password
                password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
                user.set_password(password)
                user.save()
                # Attach plain password for response
                user.password_plain = password
            else:
                user.password_plain = '******' # Already exists
            
            created_users.append(user)
            group.students.add(user)
            
        return created_users
