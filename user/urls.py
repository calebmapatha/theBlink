"""Defines URL patterns for users"""
from django.urls import path, include
from . import views

app_name = 'user'
urlpatterns = [
    path('a', include('django.contrib.auth.urls')),
]