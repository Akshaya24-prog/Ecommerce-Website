from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole

from .models import Cart, CartItem, Order, OrderItem
from .serializers import (
    AddCartItemSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
    UpdateCartItemSerializer,
)


def _get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartView(APIView):
    """GET /api/orders/cart/ - the logged-in user's cart (created on first use)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart = _get_or_create_cart(request.user)
        return Response(CartSerializer(cart).data)


class CartItemAddView(APIView):
    """POST /api/orders/cart/items/ {product, quantity} - add or increment an item."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]

        cart = _get_or_create_cart(request.user)
        item, created = CartItem.objects.get_or_create(cart=cart, product=product, defaults={"quantity": quantity})
        if not created:
            new_quantity = item.quantity + quantity
            if new_quantity > product.stock:
                raise ValidationError({"quantity": f"Only {product.stock} unit(s) of '{product.name}' available."})
            item.quantity = new_quantity
            item.save()

        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    """PATCH /api/orders/cart/items/<id>/ {quantity}  - change quantity
    DELETE /api/orders/cart/items/<id>/             - remove the item"""

    permission_classes = [permissions.IsAuthenticated]

    def _get_item(self, request, item_id):
        cart = _get_or_create_cart(request.user)
        return get_object_or_404(CartItem, pk=item_id, cart=cart)

    def patch(self, request, item_id):
        item = self._get_item(request, item_id)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]
        if quantity > item.product.stock:
            raise ValidationError({"quantity": f"Only {item.product.stock} unit(s) of '{item.product.name}' available."})
        item.quantity = quantity
        item.save()
        return Response(CartSerializer(item.cart).data)

    def delete(self, request, item_id):
        item = self._get_item(request, item_id)
        cart = item.cart
        item.delete()
        return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


class CartClearView(APIView):
    """DELETE /api/orders/cart/clear/ - remove every item from the cart."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        cart = _get_or_create_cart(request.user)
        cart.items.all().delete()
        return Response(CartSerializer(cart).data)


class CheckoutView(APIView):
    """POST /api/orders/checkout/ {shipping_address, contact_phone}
    Converts the current cart into an Order, decrements stock, and empties the cart."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = _get_or_create_cart(request.user)
        items = list(cart.items.select_related("product").all())
        if not items:
            raise ValidationError({"detail": "Your cart is empty."})

        # Validate stock for every line before committing anything.
        for item in items:
            if item.quantity > item.product.stock:
                raise ValidationError(
                    {"detail": f"Only {item.product.stock} unit(s) of '{item.product.name}' available."}
                )

        order = Order.objects.create(
            user=request.user,
            shipping_address=serializer.validated_data["shipping_address"],
            contact_phone=serializer.validated_data.get("contact_phone", ""),
        )

        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                product_name=item.product.name,
                price=item.product.price,
                quantity=item.quantity,
            )
            item.product.stock -= item.quantity
            item.product.save(update_fields=["stock"])

        order.recalculate_total()
        cart.items.all().delete()

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderListView(generics.ListAPIView):
    """GET /api/orders/ - customers see only their own orders; admins see everyone's.
    Admins may filter with ?status=pending and/or ?user=<id>."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related("user").prefetch_related("items")
        if user.role != "admin":
            return queryset.filter(user=user)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        user_filter = self.request.query_params.get("user")
        if user_filter:
            queryset = queryset.filter(user_id=user_filter)
        return queryset


class OrderDetailView(generics.RetrieveAPIView):
    """GET /api/orders/<id>/ - order owner or any admin may view it."""

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Order.objects.select_related("user").prefetch_related("items")

    def get_object(self):
        order = super().get_object()
        if self.request.user.role != "admin" and order.user_id != self.request.user.id:
            raise PermissionDenied("You do not have access to this order.")
        return order


class OrderStatusUpdateView(APIView):
    """PATCH /api/orders/<id>/status/ {status} - admin only."""

    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        serializer = OrderStatusUpdateSerializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(OrderSerializer(order).data)


class OrderCancelView(APIView):
    """PATCH /api/orders/<id>/cancel/ - the order's owner can cancel it while it is
    still pending; cancelling restores the reserved stock."""

    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        if request.user.role != "admin" and order.user_id != request.user.id:
            raise PermissionDenied("You do not have access to this order.")
        if order.status != Order.Status.PENDING:
            raise ValidationError({"detail": "Only pending orders can be cancelled."})

        for item in order.items.select_related("product"):
            if item.product is not None:
                item.product.stock += item.quantity
                item.product.save(update_fields=["stock"])

        order.status = Order.Status.CANCELLED
        order.save(update_fields=["status"])
        return Response(OrderSerializer(order).data)
