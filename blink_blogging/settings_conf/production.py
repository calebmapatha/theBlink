import os

DEBUG = False
ALLOWED_HOSTS = [
    'http://theblink.co.za/',
    'https://theblink.herokuapp.com/',
]
ADMIN_URL = os.environ["ADMIN_URL"]

SITE_ID = 4
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_USE_TLS = True
EMAIL_PORT = 587
EMAIL_HOST_USER = os.environ['EMAIL_HOST_USER']
EMAIL_HOST_PASSWORD = os.environ['EMAIL_HOST_PASSWORD']

RECAPTCHA_SITE_KEY = os.environ['RECAPTCHA_SITE_KEY']
RECAPTCHA_SECRET_KEY = os.environ['RECAPTCHA_SECRETE_KEY']

PAGE_URL = os.environ['PAGE_URL']

# SECURE_SSL_REDIRECT = True
# SESSION_COOKIE_SECURE = True
# CSRF_COOKIE_SECURE = True
# SECURE_HSTS_SECONDS = 60
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True
