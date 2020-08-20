from django.urls import path  

from . import views

app_name = "extras"

urlpatterns = [
    path('subscribe/', views.subscribeView.as_view(), name="subscribe"),
    path('about-us/', views.aboutUsView.as_view(), name="aboutUs"),
    path('contact-us/', views.contactView.as_view(), name="contactUs"),
    path('privacypolicy/', views.privacyView.as_view(), name="privacy"),
]