from django.contrib import admin
from .models import Equipment, IssueReason, Location, StockItem, StockMovement, Ticket

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id", "location", "status", "started_at", "created_by")
    list_filter = ("status", "location", "reasons")
    search_fields = ("description", "location__name")
    date_hierarchy = "started_at"


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "quantity", "minimum_quantity", "location", "active")
    list_filter = ("category", "active", "location")
    search_fields = ("name", "sku")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("item", "movement_type", "quantity", "created_by", "created_at")
    list_filter = ("movement_type", "created_at")
    search_fields = ("item__name", "item__sku", "note")


admin.site.register(Location)
admin.site.register(IssueReason)
admin.site.register(Equipment)
