from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

FRONTEND_DIR = settings.BASE_DIR.parent / "frontend"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/products/", include("products.urls")),
    path("api/orders/", include("orders.urls")),
    # Root → catalog page
    path("", serve, {"document_root": FRONTEND_DIR, "path": "index.html"}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Serve all other frontend files (HTML, CSS, JS) — must come after API and media routes
urlpatterns += [
    re_path(r"^(?P<path>.*)$", serve, {"document_root": FRONTEND_DIR}),
]
