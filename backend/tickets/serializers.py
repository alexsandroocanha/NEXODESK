from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import (
    Equipment,
    IssueReason,
    Location,
    StockItem,
    StockMovement,
    Ticket,
)

User = get_user_model()


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "name", "section", "active", "created_at"]
        read_only_fields = ["id", "created_at"]


class IssueReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueReason
        fields = ["id", "name", "color", "active"]


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = ["id", "name", "active"]


class TicketSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(source="location.name", read_only=True)
    reason_names = serializers.SlugRelatedField(
        source="reasons",
        many=True,
        read_only=True,
        slug_field="name",
    )
    equipment_names = serializers.SlugRelatedField(
        source="equipment",
        many=True,
        read_only=True,
        slug_field="name",
    )
    reasons = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=IssueReason.objects.filter(active=True),
    )
    equipment = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Equipment.objects.filter(active=True),
    )
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
    )

    class Meta:
        model = Ticket
        fields = [
            "id", "location", "location_name", "reasons", "reason_names",
            "equipment", "equipment_names", "description", "started_at",
            "ended_at", "status", "created_by", "created_by_username",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def validate(self, attrs):
        start = attrs.get("started_at", getattr(self.instance, "started_at", None))
        end = attrs.get("ended_at", getattr(self.instance, "ended_at", None))

        if start and end and end < start:
            raise serializers.ValidationError({
                "ended_at": "O fim não pode ser anterior ao início."
            })

        return attrs

    def create(self, validated_data):
        reasons = validated_data.pop("reasons")
        equipment = validated_data.pop("equipment")
        ticket = Ticket.objects.create(
            created_by=self.context["request"].user,
            **validated_data,
        )
        ticket.reasons.set(reasons)
        ticket.equipment.set(equipment)
        return ticket

    def update(self, instance, validated_data):
        reasons = validated_data.pop("reasons", None)
        equipment = validated_data.pop("equipment", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        if reasons is not None:
            instance.reasons.set(reasons)

        if equipment is not None:
            instance.equipment.set(equipment)

        return instance


class UserAdminSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=12,
        required=False,
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "is_active", "is_staff", "is_superuser", "password",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError({
                "password": "Informe uma senha com pelo menos 12 caracteres."
            })

        user = User(**validated_data)
        validate_password(password, user=user)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        if password:
            validate_password(password, user=instance)
            instance.set_password(password)

        instance.save()
        return instance


class StockItemSerializer(serializers.ModelSerializer):
    location_name = serializers.CharField(
        source="location.name",
        read_only=True,
        default="",
    )
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = StockItem
        fields = [
            "id", "name", "sku", "category", "quantity", "minimum_quantity",
            "unit", "location", "location_name", "active", "is_low_stock",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_low_stock"]

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("A quantidade não pode ser negativa.")
        return value


class StockMovementSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source="item.name", read_only=True)
    sku = serializers.CharField(source="item.sku", read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username",
        read_only=True,
        default="",
    )

    class Meta:
        model = StockMovement
        fields = [
            "id", "item", "item_name", "sku", "movement_type", "quantity",
            "note", "created_by", "created_by_username", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "A movimentação deve ser de pelo menos uma unidade."
            )
        return value
