from django.db import models
from django.conf import settings

class StudentGroup(models.Model):
    name = models.CharField(max_length=100) # e.g., "CSE Sem 5"
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_groups')
    students = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='student_groups', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class StudentCredential(models.Model):
    """Stores plain-text passwords so the CR can always view them."""
    group = models.ForeignKey(StudentGroup, on_delete=models.CASCADE, related_name='credentials')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stored_credentials')
    username = models.CharField(max_length=150)
    password_plain = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['group', 'student']

    def __str__(self):
        return f"{self.username} (Group: {self.group.name})"
