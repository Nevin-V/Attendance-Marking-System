from django.db import models
from django.conf import settings
from sessions.models import Session

class Attendance(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='attendance')
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='attendance')
    timestamp = models.DateTimeField(auto_now_add=True)
    participated = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student', 'session')

    def __str__(self):
        return f"{self.student} - {self.session}"
