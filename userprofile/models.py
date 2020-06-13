from django.db import models
from django.contrib.auth.models import User
from blog.models import BlogPost


class User_Profile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=150, default="  ")
    following = models.ManyToManyField(User, blank=True, editable=False, related_name='following')
    followers = models.ManyToManyField(User, blank=True, related_name='followers')

    def __str__(self):
        return f"{self.user}"
