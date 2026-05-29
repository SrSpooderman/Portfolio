import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0006_page_page_section"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pagesection",
            name="section_type",
            field=models.CharField(
                choices=[
                    ("hero", "Hero"),
                    ("about", "About"),
                    ("skills", "Skills"),
                    ("projects", "Projects"),
                    ("learning", "Learning"),
                    ("contact", "Contact"),
                    ("custom_note", "Custom note"),
                ],
                max_length=30,
            ),
        ),
        migrations.CreateModel(
            name="ContentBlock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "block_type",
                    models.CharField(
                        choices=[
                            ("text", "Texto"),
                            ("image", "Imagen"),
                            ("cta", "CTA"),
                            ("skill_list", "Lista de tecnologias"),
                            ("featured_projects", "Proyectos destacados"),
                            ("contact_links", "Contacto y enlaces"),
                        ],
                        default="text",
                        max_length=30,
                    ),
                ),
                ("title", models.CharField(blank=True, max_length=140)),
                ("body", models.TextField(blank=True)),
                ("image_url", models.URLField(blank=True, max_length=500)),
                ("alt_text", models.CharField(blank=True, max_length=180)),
                ("cta_label", models.CharField(blank=True, max_length=80)),
                ("cta_url", models.CharField(blank=True, max_length=500)),
                (
                    "cta_style",
                    models.CharField(
                        choices=[("primary", "Primario"), ("secondary", "Secundario"), ("link", "Enlace")],
                        default="primary",
                        max_length=20,
                    ),
                ),
                ("open_new_tab", models.BooleanField(default=False)),
                ("visible", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "section",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="blocks",
                        to="app.pagesection",
                    ),
                ),
            ],
            options={
                "ordering": ["order", "id"],
            },
        ),
    ]
