from django.urls import path, include

from . import views
app_name = 'blog'
urlpatterns = [
    path('post/<slug:slug>/', views.post_detail, name='postDetails'),
    path('', views.index, name='index'),
    path('likepost/<int:pk>/', views.likePost, name='likePost'),
    path('blog/create/', views.new_blog_post, name='newBlogPost'),
    path('topics/<slug:slug>/', views.topic_view, name='topicView')
]

