from .models import Comment, BlogPost
from django import forms


class CommentForm(forms.ModelForm):
    class Meta:
        model = Comment
        fields = ('name', 'email', 'body')


class CreateBlogForm(forms.ModelForm):
    class Meta:
        model = BlogPost
        fields = '__all__'
