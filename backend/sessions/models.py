from django.db import models
from classes.models import Class

class Session(models.Model):
    class_instance = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='sessions')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    qr_token = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    radius_meters = models.IntegerField(default=200)  # Increased from 50m to account for GPS inaccuracy (±20-50m indoors)

    def __str__(self):
        return f"Session for {self.class_instance} at {self.start_time}"
