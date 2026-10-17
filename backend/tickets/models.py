from django.conf import settings
from django.core.validators import MinLengthValidator
from django.db import models

class Location(models.Model):
    name = models.CharField(max_length=120, unique=True)
    section = models.CharField(max_length=120, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class IssueReason(models.Model):
    name = models.CharField(max_length=120, unique=True)
    color = models.CharField(max_length=7, default="#64748b")
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class Equipment(models.Model):
    name = models.CharField(max_length=120, unique=True)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

class Ticket(models.Model):
    STATUS = [
        ("open", "Aberto"),
        ("in_progress", "Em andamento"),
        ("resolved", "Resolvido"),
        ("closed", "Fechado"),
    ]

    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="tickets",
    )
    reasons = models.ManyToManyField(IssueReason, related_name="tickets")
    equipment = models.ManyToManyField(Equipment, related_name="tickets")
    description = models.TextField(
        validators=[MinLengthValidator(3)],
        max_length=5000,
    )
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="open")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_tickets",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["started_at"]),
            models.Index(fields=["location", "started_at"]),
        ]

    def __str__(self):
        return f"Chamado #{self.pk} — {self.location.name}"


class StockItem(models.Model):
    name = models.CharField(max_length=160)
    sku = models.CharField(max_length=80, unique=True)
    category = models.CharField(max_length=120, blank=True)
    quantity = models.PositiveIntegerField(default=0)
    minimum_quantity = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=24, default="unidade")
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_items",
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(
                fields=["quantity", "minimum_quantity"],
                name="tickets_sto_quantit_3e86a9_idx",
            ),
        ]

    @property
    def is_low_stock(self):
        return self.quantity <= self.minimum_quantity

    def __str__(self):
        return f"{self.name} ({self.sku})"


class StockMovement(models.Model):
    ENTRY = "entry"
    EXIT = "exit"
    MOVEMENT_TYPES = [
        (ENTRY, "Entrada"),
        (EXIT, "Saída"),
    ]

    item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="movements",
    )
    movement_type = models.CharField(max_length=10, choices=MOVEMENT_TYPES)
    quantity = models.PositiveIntegerField()
    note = models.CharField(max_length=500, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.get_movement_type_display()} · "
            f"{self.item.name} · {self.quantity}"
        )
