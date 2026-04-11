from rest_framework import serializers
from .models import Attendance

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    session_info = serializers.CharField(source='session', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'student', 'session', 'timestamp', 'participated', 'student_name', 'session_info']
        read_only_fields = ['student', 'timestamp']

class AttendanceMarkSerializer(serializers.Serializer):
    qr_token = serializers.CharField()
    latitude = serializers.FloatField(required=True)
    longitude = serializers.FloatField(required=True)
    device_id = serializers.CharField(required=True)
    face_descriptor = serializers.ListField(child=serializers.FloatField(), required=False)
