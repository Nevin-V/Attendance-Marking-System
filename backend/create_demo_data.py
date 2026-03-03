import os
import django
import sys
from datetime import timedelta

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User
from classes.models import Class
from sessions.models import Session
from attendance.models import Attendance
from django.utils import timezone

def create_data():
    print("Creating demo data...")
    # Users
    faculty, _ = User.objects.get_or_create(username='faculty', defaults={'email':'faculty@example.com', 'role':'FACULTY'})
    faculty.set_password('pass123')
    faculty.save()
    
    student1, _ = User.objects.get_or_create(username='student1', defaults={'email':'s1@example.com', 'role':'STUDENT', 'register_number':'REG001'})
    student1.set_password('pass123')
    student1.save()

    student2, _ = User.objects.get_or_create(username='student2', defaults={'email':'s2@example.com', 'role':'STUDENT', 'register_number':'REG002'})
    student2.set_password('pass123')
    student2.save()

    cr, _ = User.objects.get_or_create(username='cr_user', defaults={'email':'cr@example.com', 'role':'CLASS_REP', 'register_number':'CR001'})
    cr.set_password('pass123')
    cr.save()

    # Class
    cls, _ = Class.objects.get_or_create(subject='CS101', department='CSE', semester=1, faculty=faculty)
    
    # Past Sessions
    for i in range(5):
        s, created = Session.objects.get_or_create(
            qr_token=f'past_token_{i}',
            defaults={
                'class_instance': cls,
                'start_time': timezone.now() - timedelta(days=5-i),
                'end_time': timezone.now() - timedelta(days=5-i, minutes=59),
                'is_active': False
            }
        )
        # Attendance
        if created:
            Attendance.objects.create(student=student1, session=s, participated=True)
            if i % 2 == 0:
                Attendance.objects.create(student=student2, session=s, participated=False)

    print("Demo data created successfully!")
    print("Credentials:")
    print("Faculty: faculty / pass123")
    print("Student: student1 / pass123")
    print("Student: student2 / pass123")

if __name__ == '__main__':
    create_data()
