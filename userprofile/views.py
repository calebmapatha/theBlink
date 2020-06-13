from django.contrib.auth.models import User
from django.shortcuts import render
from django.views.generic import TemplateView
from django.shortcuts import get_object_or_404
from django.core.exceptions import ObjectDoesNotExist
from .models import User_Profile
from blog.models import BlogPost


# Create your views here.
def profile(request, username):
    user_details = get_object_or_404(User, username=username)
    posts = BlogPost.objects.all().filter(author=user_details.id)
    try:
        user_profile = User_Profile.objects.get(user=user_details.id)
    except ObjectDoesNotExist:
        user_profile = {
        }

    context = {
        'user': user_details,
        'blogposts': posts,
        'user_profile': user_profile
    }
    template_name = 'profile/profile.html'
    return render(request, template_name, context)