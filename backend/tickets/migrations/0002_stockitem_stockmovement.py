from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ("tickets", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="StockItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=160)),
                ("sku", models.CharField(max_length=80, unique=True)),
                ("category", models.CharField(blank=True, max_length=120)),
                ("quantity", models.PositiveIntegerField(default=0)),
                ("minimum_quantity", models.PositiveIntegerField(default=0)),
                ("unit", models.CharField(default="unidade", max_length=24)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("location", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="stock_items", to="tickets.location")),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.AddIndex(model_name="stockitem", index=models.Index(fields=["quantity", "minimum_quantity"], name="tickets_sto_quantit_3e86a9_idx")),
        migrations.CreateModel(
            name="StockMovement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("movement_type", models.CharField(choices=[("entry", "Entrada"), ("exit", "Saída")], max_length=10)),
                ("quantity", models.PositiveIntegerField()),
                ("note", models.CharField(blank=True, max_length=500)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="stock_movements", to=settings.AUTH_USER_MODEL)),
                ("item", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="movements", to="tickets.stockitem")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
