import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0005_visual_theme"),
    ]

    operations = [
        migrations.CreateModel(
            name="Page",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("slug", models.SlugField(max_length=120, unique=True)),
                ("is_home", models.BooleanField(default=False)),
                ("visible", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["order", "title"],
            },
        ),
        migrations.CreateModel(
            name="PageSection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "section_type",
                    models.CharField(
                        choices=[
                            ("hero", "Hero"),
                            ("about", "About"),
                            ("skills", "Skills"),
                            ("projects", "Projects"),
                            ("learning", "Learning"),
                            ("contact", "Contact"),
                        ],
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(blank=True, max_length=120)),
                ("anchor", models.SlugField(max_length=80)),
                ("visible", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
                (
                    "layout_variant",
                    models.CharField(
                        choices=[
                            ("simple", "Simple"),
                            ("compact", "Compacta"),
                            ("editorial", "Editorial"),
                            ("grid", "Grid"),
                            ("list", "Lista"),
                            ("featured", "Destacada"),
                        ],
                        default="simple",
                        max_length=30,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "page",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sections",
                        to="app.page",
                    ),
                ),
            ],
            options={
                "ordering": ["order", "id"],
                "unique_together": {("page", "anchor")},
            },
        ),
    ]
