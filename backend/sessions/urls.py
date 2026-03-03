from django.urls import path
from .views import SessionStartView, SessionEndView, SessionListView

urlpatterns = [
    path('sessions/start/', SessionStartView.as_view(), name='session-start'),
    path('sessions/<int:pk>/end/', SessionEndView.as_view(), name='session-end'),
    path('sessions/class/<int:class_id>/', SessionListView.as_view(), name='session-list'),
]
