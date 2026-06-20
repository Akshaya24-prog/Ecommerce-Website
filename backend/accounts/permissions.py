from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdminRole(BasePermission):
    """Grants access only to authenticated users with role == 'admin'."""

    message = "Only admin accounts can perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "admin")


class IsAdminOrReadOnly(BasePermission):
    """Anyone (even anonymous) can read; only admin-role users can write."""

    message = "Only admin accounts can modify this resource."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and user.role == "admin")
