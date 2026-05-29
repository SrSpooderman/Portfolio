import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0007_content_block_custom_note"),
    ]

    operations = [
        migrations.CreateModel(
            name="HeroSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "content_source",
                    models.CharField(
                        choices=[("profile", "Perfil"), ("manual", "Manual"), ("mixed", "Mezcla")],
                        default="mixed",
                        max_length=20,
                    ),
                ),
                ("eyebrow", models.CharField(blank=True, max_length=90)),
                ("title", models.CharField(blank=True, max_length=140)),
                ("subtitle", models.TextField(blank=True)),
                ("show_logo", models.BooleanField(default=True)),
                ("background_image_url", models.URLField(blank=True, max_length=500)),
                ("image_alt_text", models.CharField(blank=True, max_length=180)),
                (
                    "alignment",
                    models.CharField(
                        choices=[("left", "Izquierda"), ("center", "Centro"), ("right", "Derecha")],
                        default="left",
                        max_length=20,
                    ),
                ),
                (
                    "variant",
                    models.CharField(
                        choices=[
                            ("simple", "Simple"),
                            ("image", "Con imagen"),
                            ("centered", "Centrado"),
                            ("split", "Lateral"),
                            ("compact", "Compacto"),
                        ],
                        default="simple",
                        max_length=20,
                    ),
                ),
                (
                    "height",
                    models.CharField(
                        choices=[
                            ("auto", "Automatica"),
                            ("short", "Baja"),
                            ("tall", "Alta"),
                            ("full", "Pantalla completa"),
                        ],
                        default="auto",
                        max_length=20,
                    ),
                ),
                (
                    "spacing",
                    models.CharField(
                        choices=[("tight", "Compacto"), ("normal", "Normal"), ("spacious", "Amplio")],
                        default="normal",
                        max_length=20,
                    ),
                ),
                ("primary_cta_label", models.CharField(blank=True, max_length=80)),
                ("primary_cta_url", models.CharField(blank=True, max_length=500)),
                ("primary_cta_new_tab", models.BooleanField(default=False)),
                ("secondary_cta_label", models.CharField(blank=True, max_length=80)),
                ("secondary_cta_url", models.CharField(blank=True, max_length=500)),
                ("secondary_cta_new_tab", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "section",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="hero_settings",
                        to="app.pagesection",
                    ),
                ),
            ],
            options={
                "verbose_name": "hero settings",
                "verbose_name_plural": "hero settings",
            },
        ),
    ]
