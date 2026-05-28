from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Profile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("headline", models.CharField(blank=True, max_length=160)),
                ("bio", models.TextField()),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(blank=True, max_length=40)),
                ("cv_file", models.FileField(blank=True, null=True, upload_to="cv/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Project",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=160)),
                ("slug", models.SlugField(max_length=180, unique=True)),
                ("description", models.TextField()),
                ("github_url", models.URLField(blank=True, max_length=500)),
                ("demo_url", models.URLField(blank=True, max_length=500)),
                ("featured", models.BooleanField(default=False)),
                ("order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["order", "title"]},
        ),
        migrations.CreateModel(
            name="SkillCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category_name", models.CharField(max_length=100, unique=True)),
                ("order", models.PositiveIntegerField(default=0)),
            ],
            options={"verbose_name_plural": "skill categories", "ordering": ["order", "category_name"]},
        ),
        migrations.CreateModel(
            name="SocialMedia",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("platform", models.CharField(max_length=80)),
                ("url", models.URLField(max_length=500)),
                ("order", models.PositiveIntegerField(default=0)),
                (
                    "profile",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="social_media",
                        to="app.profile",
                    ),
                ),
            ],
            options={"ordering": ["order", "platform"], "unique_together": {("profile", "platform")}},
        ),
        migrations.CreateModel(
            name="Skill",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("proficiency", models.PositiveSmallIntegerField(default=0)),
                ("order", models.PositiveIntegerField(default=0)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="skills",
                        to="app.skillcategory",
                    ),
                ),
            ],
            options={"ordering": ["category__order", "order", "name"], "unique_together": {("name", "category")}},
        ),
        migrations.CreateModel(
            name="ProjectSkill",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="project_skills",
                        to="app.project",
                    ),
                ),
                (
                    "skill",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="project_skills",
                        to="app.skill",
                    ),
                ),
            ],
            options={"unique_together": {("project", "skill")}},
        ),
        migrations.AddField(
            model_name="project",
            name="skills",
            field=models.ManyToManyField(related_name="projects", through="app.ProjectSkill", to="app.skill"),
        ),
        migrations.CreateModel(
            name="ProjectMedia",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("media_url", models.URLField(max_length=500)),
                (
                    "media_type",
                    models.CharField(
                        choices=[("image", "Image"), ("video", "Video"), ("document", "Document")],
                        default="image",
                        max_length=20,
                    ),
                ),
                ("alt_text", models.CharField(blank=True, max_length=180)),
                ("order", models.PositiveIntegerField(default=0)),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="media",
                        to="app.project",
                    ),
                ),
            ],
            options={"ordering": ["order", "id"]},
        ),
    ]
