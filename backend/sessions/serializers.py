from rest_framework import serializers
from .models import Session

class SessionSerializer(serializers.ModelSerializer):
    student_group = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = ['id', 'class_instance', 'start_time', 'end_time', 'qr_token', 'is_active', 'student_group']

    def get_student_group(self, obj):
        if obj.class_instance and obj.class_instance.student_group:
            return obj.class_instance.student_group.id
        return None
