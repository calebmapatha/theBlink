from django.shortcuts import render
from django.views.generic.base import TemplateView

class contactView(TemplateView):
    template_name = "extras/contact-us.html"

class subscribeView(TemplateView):
    template_name = "extras/subscribe.html"

class privacyView(TemplateView):
    template_name = "extras/privacy-policy.html"

class aboutUsView(TemplateView):
    template_name = "extras/about-us.html"