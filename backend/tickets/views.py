import csv
from collections import Counter
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import (
    Equipment,
    IssueReason,
    Location,
    StockItem,
    StockMovement,
    Ticket,
)
from .permissions import IsSuperUserForWrites
from .serializers import (
    EquipmentSerializer,
    IssueReasonSerializer,
    LocationSerializer,
    StockItemSerializer,
    StockMovementSerializer,
    TicketSerializer,
    UserAdminSerializer,
)

User = get_user_model()


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsSuperUserForWrites]


class IssueReasonViewSet(viewsets.ModelViewSet):
    queryset = IssueReason.objects.all()
    serializer_class = IssueReasonSerializer
    permission_classes = [IsSuperUserForWrites]


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsSuperUserForWrites]


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Ticket.objects.select_related(
            "location",
            "created_by",
        ).prefetch_related("reasons", "equipment")
        params = self.request.query_params
        filters = {
            "location": "location_id",
            "reason": "reasons__id",
            "equipment": "equipment__id",
            "section": "location__section",
        }

        for parameter, model_field in filters.items():
            if params.get(parameter):
                queryset = queryset.filter(**{model_field: params[parameter]})

        if params.get("start"):
            queryset = queryset.filter(started_at__date__gte=params["start"])

        if params.get("end"):
            queryset = queryset.filter(started_at__date__lte=params["end"])

        if params.get("month") == "last":
            queryset = queryset.filter(
                started_at__gte=timezone.now() - timedelta(days=30)
            )

        return queryset.distinct()

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_superuser and not user.has_perm("tickets.change_ticket"):
            raise PermissionDenied("Você não tem permissão para editar chamados.")

        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_superuser and not user.has_perm("tickets.delete_ticket"):
            raise PermissionDenied("Você não tem permissão para excluir chamados.")

        instance.delete()

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        queryset = self.get_queryset()
        local_now = timezone.localtime()
        week_start = (local_now - timedelta(days=local_now.weekday())).date()
        location_stats = []
        alerts = []
        alert_queryset = queryset

        if not request.query_params.get("start") and not request.query_params.get("end"):
            alert_queryset = alert_queryset.filter(
                started_at__gte=timezone.now() - timedelta(days=30)
            )

        for location in Location.objects.all():
            location_tickets = queryset.filter(location=location)
            alert_tickets = alert_queryset.filter(location=location)
            ticket_count = location_tickets.count()

            if not ticket_count:
                continue

            latest_ticket = location_tickets.first()
            latest_reason = latest_ticket.reasons.first()
            location_stats.append({
                "location_id": location.id,
                "location": location.name,
                "section": location.section,
                "ticket_count": ticket_count,
                "last_ticket_at": latest_ticket.started_at,
                "last_reason": latest_reason.name if latest_reason else "Não informado",
                "top_equipment": top_equipment(location_tickets),
            })

            alert_ticket_count = alert_tickets.count()
            if not alert_ticket_count:
                continue

            pair_counts = Counter()
            for ticket in alert_tickets.prefetch_related("reasons", "equipment"):
                for reason in ticket.reasons.all():
                    for equipment in ticket.equipment.all():
                        pair_counts[(reason.id, equipment.id)] += 1

            for (reason_id, equipment_id), occurrences in pair_counts.items():
                percentage = occurrences / alert_ticket_count
                if percentage <= 0.40:
                    continue

                reason = IssueReason.objects.filter(pk=reason_id).first()
                equipment = Equipment.objects.filter(pk=equipment_id).first()
                alerts.append({
                    "location": location.name,
                    "reason": reason.name if reason else "Motivo removido",
                    "equipment": equipment.name if equipment else "Equipamento removido",
                    "count": occurrences,
                    "total": alert_ticket_count,
                    "percentage": round(percentage * 100, 1),
                })

        location_stats.sort(
            key=lambda item: item["ticket_count"],
            reverse=True,
        )
        week_total = queryset.filter(started_at__date__gte=week_start).count()

        return Response({
            "total": queryset.count(),
            "week_total": week_total,
            "by_location": location_stats[:10],
            "alerts": sorted(
                alerts,
                key=lambda item: item["percentage"],
                reverse=True,
            ),
        })

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        queryset = self.get_queryset()
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = (
            'attachment; filename="estatisticas-chamados.csv"'
        )
        response.write("\ufeff")
        writer = csv.writer(response, delimiter=";")
        writer.writerow([
            "NomeDoPosto",
            "QuantidadeDeChamados",
            "DataDoUltimoChamado",
            "MotivoDoUltimoChamado",
            "QualFoiOEquipamentoQueMaisTeveChamado",
        ])

        for location in Location.objects.all():
            location_tickets = queryset.filter(location=location)
            if not location_tickets.exists():
                continue

            latest_ticket = location_tickets.first()
            reasons = ", ".join(
                latest_ticket.reasons.values_list("name", flat=True)
            )
            writer.writerow([
                safe_csv_cell(location.name),
                location_tickets.count(),
                timezone.localtime(latest_ticket.started_at).strftime("%d/%m/%Y %H:%M"),
                safe_csv_cell(reasons),
                safe_csv_cell(top_equipment(location_tickets)),
            ])

        return response


def safe_csv_cell(value):
    """Neutralize spreadsheet formulas in untrusted CSV fields."""
    text = "" if value is None else str(value)
    probe = text.lstrip("\ufeff\t\r\n ")
    if probe.startswith(("=", "+", "-", "@")):
        return "'" + text
    return text


def top_equipment(queryset):
    equipment_counts = Counter()

    for ticket in queryset.prefetch_related("equipment"):
        for equipment in ticket.equipment.all():
            equipment_counts[equipment.name] += 1

    if not equipment_counts:
        return "Não informado"

    return equipment_counts.most_common(1)[0][0]


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_superuser": user.is_superuser,
        "permissions": list(user.get_all_permissions()),
    })


class UserAdminViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not request.user.is_superuser:
            raise PermissionDenied(
                "Somente o superusuário pode administrar contas."
            )

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise ValidationError("Você não pode excluir a própria conta.")

        instance.delete()


class StockItemViewSet(viewsets.ModelViewSet):
    queryset = StockItem.objects.select_related("location").all()
    serializer_class = StockItemSerializer
    permission_classes = [IsSuperUserForWrites]

    def perform_create(self, serializer):
        item = serializer.save()
        if item.quantity > 0:
            StockMovement.objects.create(
                item=item,
                movement_type=StockMovement.ENTRY,
                quantity=item.quantity,
                note="Saldo inicial do cadastro",
                created_by=self.request.user,
            )

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(category__icontains=search)
            )

        if self.request.query_params.get("low_stock") == "true":
            queryset = queryset.filter(quantity__lte=F("minimum_quantity"))

        return queryset


class StockMovementViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "head", "options"]
    queryset = StockMovement.objects.select_related("item", "created_by").all()
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_id = serializer.validated_data["item"].pk
        movement_type = serializer.validated_data["movement_type"]
        quantity = serializer.validated_data["quantity"]

        with transaction.atomic():
            item = StockItem.objects.select_for_update().get(pk=item_id)

            if movement_type == StockMovement.EXIT and item.quantity < quantity:
                raise ValidationError({
                    "quantity": "Estoque insuficiente para essa saída."
                })

            if movement_type == StockMovement.ENTRY:
                item.quantity += quantity
            else:
                item.quantity -= quantity

            item.save(update_fields=["quantity", "updated_at"])
            movement = serializer.save(created_by=request.user)

        return Response(
            StockMovementSerializer(movement).data,
            status=201,
        )
