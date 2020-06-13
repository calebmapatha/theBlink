from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.contrib.auth.forms import UserCreationForm
from django.conf import settings


def register(request):
    """Register a new user."""
    if request.method != 'POST':
        # Display a registration form.
        form = UserCreationForm()
    else:
        # Process completed form.
        form = UserCreationForm(data=request.POST)

        if form.is_valid():
            new_user = form.save()
            # log the user in and then redirect them to the homepage
            login(request, new_user)
            return redirect('blog:index')

    # Display a blank or invalid form
    context = {
        'form': form,
    }
    return render(request, 'registration/register.html', context)
