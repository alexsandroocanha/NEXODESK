import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="Equipment",
            fields=[("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")), ("name", models.CharField(max_length=120, unique=True)), ("active", models.BooleanField(default=True))],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="IssueReason",
            fields=[("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")), ("name", models.CharField(max_length=120, unique=True)), ("color", models.CharField(default="#64748b", max_length=7)), ("active", models.BooleanField(default=True))],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Location",
            fields=[("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")), ("name", models.CharField(max_length=120, unique=True)), ("section", models.CharField(blank=True, max_length=120)), ("active", models.BooleanField(default=True)), ("created_at", models.DateTimeField(auto_now_add=True))],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Ticket",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("description", models.TextField(max_length=5000, validators=[django.core.validators.MinLengthValidator(3)])),
                ("started_at", models.DateTimeField()), ("ended_at", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(choices=[("open", "Aberto"), ("in_progress", "Em andamento"), ("resolved", "Resolvido"), ("closed", "Fechado")], default="open", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_tickets", to=settings.AUTH_USER_MODEL)),
                ("equipment", models.ManyToManyField(related_name="tickets", to="tickets.equipment")),
                ("location", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="tickets", to="tickets.location")),
                ("reasons", models.ManyToManyField(related_name="tickets", to="tickets.issuereason")),
            ],
            options={"ordering": ["-started_at"]},
        ),
        migrations.AddIndex(model_name="ticket", index=models.Index(fields=["started_at"], name="tickets_ti_started_98d9e1_idx")),
        migrations.AddIndex(model_name="ticket", index=models.Index(fields=["location", "started_at"], name="tickets_ti_location_30c57b_idx")),
    ]
