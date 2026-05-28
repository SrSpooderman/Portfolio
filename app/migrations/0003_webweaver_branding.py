from django.db import migrations, models


def seed_webweaver_brand(apps, schema_editor):
    SiteSettings = apps.get_model("app", "SiteSettings")
    settings = SiteSettings.objects.first()
    if settings is None:
        return

    replacements = {
        "site_name": ("Portfolio", "WebWeaver"),
        "role_title": ("Backend Developer", "Portfolio Builder"),
        "hero_eyebrow": ("Portfolio", "WebWeaver"),
        "meta_description": (
            "Portfolio profesional editable con Django.",
            "Portfolio profesional editable con Django y WebWeaver.",
        ),
    }
    for field, (old_value, new_value) in replacements.items():
        if getattr(settings, field) == old_value:
            setattr(settings, field, new_value)
    if not settings.logo_path:
        settings.logo_path = "img/brand/webweaberLogo.svg"
    if not settings.favicon_path:
        settings.favicon_path = "img/brand/webweaberLogo.svg"
    settings.save()


class Migration(migrations.Migration):
    dependencies = [
        ("app", "0002_site_settings_navigation_learning"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="favicon_path",
            field=models.CharField(default="img/brand/webweaberLogo.svg", max_length=255),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="logo_path",
            field=models.CharField(default="img/brand/webweaberLogo.svg", max_length=255),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="hero_eyebrow",
            field=models.CharField(default="WebWeaver", max_length=80),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="meta_description",
            field=models.CharField(default="Portfolio profesional editable con Django y WebWeaver.", max_length=255),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="role_title",
            field=models.CharField(default="Portfolio Builder", max_length=160),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="site_name",
            field=models.CharField(default="WebWeaver", max_length=120),
        ),
        migrations.RunPython(seed_webweaver_brand, migrations.RunPython.noop),
    ]
