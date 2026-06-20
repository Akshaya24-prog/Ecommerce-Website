from django.urls import path

from .views import (
    CartClearView,
    CartItemAddView,
    CartItemDetailView,
    CartView,
    CheckoutView,
    OrderCancelView,
    OrderDetailView,
    OrderListView,
    OrderStatusUpdateView,
)

urlpatterns = [
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/items/", CartItemAddView.as_view(), name="cart-item-add"),
    path("cart/items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("cart/clear/", CartClearView.as_view(), name="cart-clear"),
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("", OrderListView.as_view(), name="order-list"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/status/", OrderStatusUpdateView.as_view(), name="order-status-update"),
    path("<int:pk>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
]
