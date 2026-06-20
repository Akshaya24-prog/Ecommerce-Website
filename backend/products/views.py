from django.db.models import Q
from rest_framework import viewsets

from accounts.permissions import IsAdminOrReadOnly

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    """
    /api/products/categories/        GET (public), POST (admin)
    /api/products/categories/<pk>/   GET (public), PUT/PATCH/DELETE (admin)
    """

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "pk"


class ProductViewSet(viewsets.ModelViewSet):
    """
    /api/products/                GET (public), POST (admin)
    /api/products/<pk>/           GET (public), PUT/PATCH/DELETE (admin)

    Query params (GET /api/products/):
      search    - matches name or description
      category  - category id
      ordering  - one of: price, -price, name, -name, created_at, -created_at
      in_stock  - "true" to only show items with stock > 0
    """

    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "pk"

    ORDERING_FIELDS = {"price", "-price", "name", "-name", "created_at", "-created_at"}

    def get_queryset(self):
        queryset = Product.objects.select_related("category").all()

        user = self.request.user
        is_admin = bool(user and user.is_authenticated and getattr(user, "role", None) == "admin")
        if not is_admin:
            queryset = queryset.filter(is_active=True)

        params = self.request.query_params

        search = params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(description__icontains=search))

        category = params.get("category")
        if category:
            queryset = queryset.filter(category_id=category)

        if params.get("in_stock") == "true":
            queryset = queryset.filter(stock__gt=0)

        ordering = params.get("ordering")
        if ordering in self.ORDERING_FIELDS:
            queryset = queryset.order_by(ordering)

        return queryset
