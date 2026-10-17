from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EquipmentViewSet,
    IssueReasonViewSet,
    LocationViewSet,
    StockItemViewSet,
    StockMovementViewSet,
    TicketViewSet,
    UserAdminViewSet,
    current_user,
)

router = DefaultRouter()
router.register("locations", LocationViewSet)
router.register("reasons", IssueReasonViewSet)
router.register("equipment", EquipmentViewSet)
router.register("tickets", TicketViewSet, basename="ticket")
router.register("users", UserAdminViewSet, basename="users")
router.register("stock/items", StockItemViewSet, basename="stock-items")
router.register("stock/movements", StockMovementViewSet, basename="stock-movements")

urlpatterns = [
    path("me/", current_user),
    path("", include(router.urls)),
]
