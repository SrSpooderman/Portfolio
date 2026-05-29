import django.db.models.deletion
import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0004_skill_proficiency_validators"),
    ]

    operations = [
        migrations.CreateModel(
            name="VisualTheme",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80)),
                ("slug", models.SlugField(max_length=100, unique=True)),
                ("primary_color", models.CharField(default="#155bb5", max_length=7)),
                ("secondary_color", models.CharField(default="#1849a9", max_length=7)),
                ("accent_color", models.CharField(default="#eef4ff", max_length=7)),
                ("background_color", models.CharField(default="#f7f8fa", max_length=7)),
                ("surface_color", models.CharField(default="#ffffff", max_length=7)),
                ("text_color", models.CharField(default="#172033", max_length=7)),
                ("muted_text_color", models.CharField(default="#667085", max_length=7)),
                ("border_color", models.CharField(default="#dfe4ea", max_length=7)),
                (
                    "card_radius",
                    models.PositiveSmallIntegerField(
                        default=8,
                        validators=[
                            django.core.validators.MinValueValidator(0),
                            django.core.validators.MaxValueValidator(32),
                        ],
                    ),
                ),
                (
                    "content_width",
                    models.PositiveSmallIntegerField(
                        default=920,
                        validators=[
                            django.core.validators.MinValueValidator(680),
                            django.core.validators.MaxValueValidator(1440),
                        ],
                    ),
                ),
                (
                    "font_family",
                    models.CharField(
                        default='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        max_length=160,
                    ),
                ),
                ("is_default", models.BooleanField(default=False)),
                ("order", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["order", "name"],
            },
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="visual_theme",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="site_settings",
                to="app.visualtheme",
            ),
        ),
    ]
