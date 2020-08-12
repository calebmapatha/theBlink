from django.contrib import admin
from django.urls import path, include
from django.conf.urls import re_path
from blink_blogging.settings import DEVELOPMENT_MODE_ENABLED, MEDIA_ROOT, MEDIA_URL
from django.conf.urls.static import static

if DEVELOPMENT_MODE_ENABLED is False:
    from blink_blogging.settings_conf.production import ADMIN_URL
    urlpatterns = [
        path(ADMIN_URL, admin.site.urls),
    ]

elif DEVELOPMENT_MODE_ENABLED:
    ADMIN_URL_ = 'admin/'
    urlpatterns = [
        path(ADMIN_URL_, admin.site.urls),
     ] + static(MEDIA_URL, document_root=MEDIA_ROOT)

urlpatterns += [
    re_path(r'^accounts/', include('allauth.urls')),
    path('profile/', include('userprofile.urls')),
    path('', include('blog.urls')),
]

