from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.conf import settings
from django.db.models import Q
from .models import BlogPost, Like, Navigation_topic
from .forms import CommentForm, CreateBlogForm
from django.contrib.postgres.search import SearchVector
from django.views.generic import ListView
try:
    from django.utils import simplejson as json
except ImportError:
    import json


# Create your views here.
def index(request):
    blogPosts = BlogPost.objects.filter(status=1).order_by('-created_on')[:8]
    nav_link = Navigation_topic.objects.filter(link_status=1).order_by('-title')
    template_name = 'blog/index.html'
    context = {
        'blogPosts': blogPosts,
        'nav_link': nav_link,
    }
    return render(request, template_name, context)


def post_detail(request, pk, slug):
    template_name = 'blog/posts/post_detail.html'
    post = get_object_or_404(BlogPost, pk=pk, slug=slug)
    nav_link = Navigation_topic.objects.filter(link_status=1).order_by('-title')
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
        'blogPost': post,
        'comments': comments,
        'new_comment': new_comment,
        'comment_form': comment_form,
        'nav_link': nav_link,
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
    template_name = "blog/topic.html"
    nav_link = Navigation_topic.objects.filter(link_status=1).order_by('-title')
    context = {
    'nav_link': nav_link,
    'slug':slug,
    }

    return render(request, template_name, context)     


@login_required
@require_POST
def like(request):
    if request.method == 'POST':
        user = request.user
        slug = request.POST.get('slug', None)
        company = get_object_or_404(BlogPost, slug=slug)

        if company.likes.filter(id=user.id).exists():
            # user has already liked this company
            # remove like/user
            company.likes.remove(user)
            message = 'You disliked this'
        else:
            # add a new like for a company
            company.likes.add(user)
            message = 'You liked this'

    ctx = {'likes_count': company.total_likes, 'message': message}
    # use mimetype instead of content_type if django < 5
    return HttpResponse(json.dumps(ctx), content_type='application/json')
