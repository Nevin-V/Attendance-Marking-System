from django.db import models
from django.conf import settings
from student_groups.models import StudentGroup

class Class(models.Model):
    faculty = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='classes')
    student_group = models.ForeignKey(StudentGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='classes')
    subject = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    semester = models.IntegerField()

    def __str__(self):
        return f"{self.subject} ({self.department})"
