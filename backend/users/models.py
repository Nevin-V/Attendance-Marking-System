from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        FACULTY = 'FACULTY', 'Faculty'
        STUDENT = 'STUDENT', 'Student'
        CLASS_REP = 'CLASS_REP', 'Class Representative'
    
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.STUDENT)
    register_number = models.CharField(max_length=20, null=True, blank=True)
    face_descriptor = models.JSONField(null=True, blank=True)
    trusted_device_id = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"
