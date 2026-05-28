from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("site_name", models.CharField(default="Portfolio", max_length=120)),
                ("owner_name", models.CharField(default="Your Name", max_length=120)),
                ("role_title", models.CharField(default="Backend Developer", max_length=160)),
                ("hero_eyebrow", models.CharField(default="Portfolio", max_length=80)),
                (
                    "meta_description",
                    models.CharField(default="Portfolio profesional editable con Django.", max_length=255),
                ),
                ("meta_author", models.CharField(blank=True, max_length=120)),
                ("about_title", models.CharField(default="Sobre mí", max_length=80)),
                ("skills_title", models.CharField(default="Tecnologías", max_length=80)),
                ("projects_title", models.CharField(default="Proyectos", max_length=80)),
                ("learning_title", models.CharField(default="Aprendizaje", max_length=80)),
                ("contact_title", models.CharField(default="Contacto", max_length=80)),
                ("project_detail_title", models.CharField(default="Descripción", max_length=80)),
                ("media_title", models.CharField(default="Media", max_length=80)),
                ("featured_label", models.CharField(default="Destacado", max_length=40)),
                ("project_detail_link_label", models.CharField(default="Ver detalle", max_length=60)),
                ("github_label", models.CharField(default="GitHub", max_length=40)),
                ("demo_label", models.CharField(default="Demo", max_length=40)),
                ("cv_label", models.CharField(default="CV", max_length=40)),
                ("email_label", models.CharField(default="Email", max_length=40)),
                ("phone_label", models.CharField(default="Teléfono", max_length=40)),
                (
                    "empty_skills_message",
                    models.CharField(
                        default="Añade categorías y tecnologías desde el backoffice para mostrarlas aquí.",
                        max_length=180,
                    ),
                ),
                (
                    "empty_about_message",
                    models.CharField(
                        default="Edita el perfil desde el backoffice para mostrar una biografía aquí.",
                        max_length=180,
                    ),
                ),
                (
                    "empty_projects_message",
                    models.CharField(
                        default="Añade proyectos desde el backoffice para mostrarlos aquí.",
                        max_length=180,
                    ),
                ),
                (
                    "empty_category_message",
                    models.CharField(default="Sin tecnologías en esta categoría.", max_length=180),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "site settings", "verbose_name_plural": "site settings"},
        ),
        migrations.CreateModel(
            name="NavigationItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=80)),
                ("url", models.CharField(max_length=255)),
                ("open_new_tab", models.BooleanField(default=False)),
                ("visible", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
            ],
            options={"ordering": ["order", "label"]},
        ),
        migrations.CreateModel(
            name="LearningItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("url", models.URLField(blank=True, max_length=500)),
                ("visible", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
            ],
            options={"ordering": ["order", "title"]},
        ),
    ]
