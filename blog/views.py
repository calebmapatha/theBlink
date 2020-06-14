from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.conf import settings
from django.db.models import Q
from .models import BlogPost, Like, Navigation_topic
from .forms import CommentForm, CreateBlogForm
from django.contrib.postgres.search import SearchVector
from django.views.generic import ListView


# Create your views here.
def index(request):
    blogPosts = BlogPost.objects.filter(status=1).order_by('-created_on')[:4]
    nav_link = Navigation_topic.objects.filter(link_status=1).order_by('-title')
    template_name = 'blog/index.html'
    context = {
        'blogPosts': blogPosts,
        'nav_link': nav_link,
    }
    return render(request, template_name, context)


def post_detail(request, slug):
    template_name = 'blog/posts/post_detail.html'
    post = get_object_or_404(BlogPost, slug=slug)
    comments = post.comments.filter(active=True)

    # Rendering a form to make a new comment
    new_comment = None
    if request.method == 'POST':
        comment_form = CommentForm(data=request.POST)
        if comment_form.is_valid():
            new_comment = comment_form.save(commit=False)
            new_comment.post = post
            new_comment.save()
    else:
        comment_form = CommentForm()

    context = {
        'post': post,
        'comments': comments,
        'new_comment': new_comment,
        'comment_form': comment_form,
    }
    return render(request, template_name, context)


@login_required
def new_blog_post(request):
    if request.method == 'POST':
        form = CreateBlogForm(request.POST, request.FILES)
        if form.is_valid():
            new_blogpost = form.save(commit=False)
            new_blogpost.author = request.user
            new_blogpost.save()
            return redirect('blog:index')
    else:
        form = CreateBlogForm

    context = {
        'form': form
    }
    template_name = "blog/posts/new_blog.html"
    return render(request, template_name, context)

@login_required
def likePost(request, pk):
    # post_id = request.GET.get('post_id')
    likedpost = get_object_or_404(BlogPost, pk=pk)
    user = request.user
    if user.is_authenticated:
        if user in likedpost.likes.all():
            likedpost.likes.remove(user)
        else:
            likedpost.likes.add(user)
        return redirect('blog:index')
    else:
        return redirect('account_login')


def topic_view(request, slug):
    pass