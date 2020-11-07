from django.db import models
from django.contrib.auth.models import User
from django.template.defaultfilters import slugify
from django.urls import reverse
from tinymce.models import HTMLField

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
    slug = models.SlugField(max_length=200, unique=True, editable=False)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blog_post')
    updated_on = models.DateTimeField(auto_now=True)
    # content = models.TextField()
    content = HTMLField()
    # FileContent = models.FileField(upload_to="BlogPost", blank=True, help_text="Alternatively, you can upload a
    # .docx file.")
    likes = models.ManyToManyField(User, editable=False, blank=True, related_name='post_likes')
    created_on = models.DateTimeField(auto_now_add=True)
    topic = models.ManyToManyField(Navigation_topic, help_text="Choose a topic/s under which article falls under.")
    tags = models.CharField(max_length=200, blank=True, help_text="Separate tags with spaces.")
    status = models.IntegerField(choices=STATUS, editable=False, default=0)
    image = models.ImageField(upload_to="headerImg/%Y/%m/%d/", help_text="Upload a banner image.", blank=True)

    @property
    def total_likes(self):
        # likes for the posts 
        return self.likes.count()
    
    def get_absolute_url(self):
        kwargs = {
            'pk':self.id,
            'slug':self.slug,
        }
        return reverse('blog:detail', kwargs=kwargs)

    def save(self, *args,**kwargs):
        self.slug = slugify(self.title)
        super(BlogPost, self).save(*args, **kwargs)


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