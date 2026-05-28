from django.core.management.base import BaseCommand

from app.adapters.orm.models import NavigationItem, SiteSettings


class Command(BaseCommand):
    help = "Creates editable default site settings and navigation items."

    def handle(self, *args, **options):
        settings, created = SiteSettings.objects.get_or_create(
            pk=1,
            defaults={
                "site_name": "WebWeaver",
                "owner_name": "Your Name",
                "role_title": "Portfolio Builder",
                "hero_eyebrow": "WebWeaver",
                "logo_path": "img/brand/webweaberLogo.svg",
                "favicon_path": "img/brand/webweaberLogo.svg",
                "meta_author": "Your Name",
            },
        )
        if settings.site_name == "Portfolio":
            settings.site_name = "WebWeaver"
        if settings.role_title == "Backend Developer":
            settings.role_title = "Portfolio Builder"
        if settings.hero_eyebrow == "Portfolio":
            settings.hero_eyebrow = "WebWeaver"
        if not settings.logo_path:
            settings.logo_path = "img/brand/webweaberLogo.svg"
        if not settings.favicon_path:
            settings.favicon_path = "img/brand/webweaberLogo.svg"
        settings.save()

        defaults = [
            ("Sobre mí", "#about", 10),
            ("Tecnologías", "#skills", 20),
            ("Proyectos", "#projects", 30),
            ("Aprendizaje", "#learning", 40),
            ("Contacto", "#contact", 50),
        ]
        for label, url, order in defaults:
            NavigationItem.objects.get_or_create(
                label=label,
                defaults={"url": url, "order": order},
            )

        action = "Created" if created else "Found"
        self.stdout.write(self.style.SUCCESS(f"{action} site settings '{settings.site_name}'."))
        self.stdout.write(self.style.SUCCESS("Ensured default navigation items."))
