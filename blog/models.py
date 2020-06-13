from django.db import models
from django.contrib.auth.models import User

LINK_STATUS = (
    (0, "inactive"),
    (1, "active")
)


class Navigation_topic(models.Model):
    title = models.CharField(max_length=50)
    slug = models.SlugField(max_length=50, unique=True)
    url = models.URLField(blank=True)
    link_status = models.IntegerField(choices=LINK_STATUS, default=0)

    def __str__(self):
        return self.title


class Tags(models.Model):
    tag_name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=150, unique=True)

    def __str__(self):
        return self.tag_name

    class Meta:
        verbose_name_plural = 'Tags'


class MainTopic(models.Model):
    title = models.CharField(max_length=50)

    def __str__(self):
        return self.title


STATUS = (
    (0, "Draft"),
    (1, "Publish")
)


class BlogPost(models.Model):
    title = models.CharField(max_length=200, unique=True)
    slug = models.SlugField(max_length=200, unique=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, editable=False, related_name='blog_post')
    updated_on = models.DateTimeField(auto_now=True)
    content = models.TextField()
    likes = models.ManyToManyField(User, editable=False, blank=True, related_name='post_likes')
    image = models.ImageField(upload_to="blog_post/headers/", blank=True)
    created_on = models.DateTimeField(auto_now_add=True)
    topic = models.ManyToManyField(Navigation_topic)
    tags = models.TextField(blank=True)
    tags_1 = models.ManyToManyField(Tags, max_length=150, blank=True, related_name='posts')
    status = models.IntegerField(choices=STATUS, editable=False, default=0)

    class Meta:
        ordering = ['-created_on']

    def __str__(self):
        return self.title


class Comment(models.Model):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE, related_name='comments')
    name = models.CharField(max_length=80)
    email = models.EmailField()
    body = models.TextField()
    created_on = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_on']

    def __str__(self):
        return 'Comment {} by {}'.format(self.body, self.name)


class Like(models.Model):
    post = models.ForeignKey(BlogPost, on_delete=models.CASCADE)

    def __str__(self):
        return self.post.title