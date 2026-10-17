from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsSuperUserForWrites(BasePermission):

    def has_permission(self, request, view):
        user = request.user
        if request.method in SAFE_METHODS:
            return bool(user and user.is_authenticated)

        return bool(user and user.is_authenticated and user.is_superuser)
