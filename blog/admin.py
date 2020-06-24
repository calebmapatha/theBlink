from django.contrib import admin

from .models import BlogPost, Comment, Like, Navigation_topic, Tags, MainTopic


@admin.register(BlogPost)
class PostAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'status', 'created_on',)
    list_filter = ('status', 'created_on', 'topic')
    search_fields = ['title', 'body']
    # prepopulated_fields = {'slug': ('title',)}
    actions = ['publish_post']

    def publish_post(self, request, queryset):
        queryset.update(status=True)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('name', 'body', 'post', 'created_on', 'active')
    list_filter = ('active', 'created_on')
    search_fields = ('name', 'email', 'body')
    actions = ['approve_comments']

    def approve_comments(self, request, queryset):
        queryset.update(active=True)


@admin.register(Navigation_topic)
class Navigation(admin.ModelAdmin):
    list_display = ['title', 'link_status', 'url']
    list_filter = ['link_status']
    prepopulated_fields = {'slug': ('title',)}
    actions = ['activate_link', 'deactivate_link']

    def activate_link(self, request, queryset):
        queryset.update(link_status=True)

    def deactivate_link(self, request, queryset):
        queryset.update(link_status=False)




@admin.register(Tags)
class Tags(admin.ModelAdmin):
    list_display = ('tag_name', 'slug')
    prepopulated_fields = {'slug': ('tag_name',)}
    list_filter = ('tag_name',)
    search_fields = ('tag_name',)


admin.site.register(Like)
admin.site.register(MainTopic)
