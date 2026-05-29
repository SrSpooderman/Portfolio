from django.core.management.base import BaseCommand

from app.adapters.orm.models import NavigationItem, SiteSettings, VisualTheme


class Command(BaseCommand):
    help = "Creates editable default site settings and navigation items."

    def handle(self, *args, **options):
        theme_defaults = [
            {
                "name": "Clean Blue",
                "slug": "clean-blue",
                "primary_color": "#155bb5",
                "secondary_color": "#1849a9",
                "accent_color": "#eef4ff",
                "background_color": "#f7f8fa",
                "surface_color": "#ffffff",
                "text_color": "#172033",
                "muted_text_color": "#667085",
                "border_color": "#dfe4ea",
                "is_default": True,
                "order": 10,
            },
            {
                "name": "Graphite Mint",
                "slug": "graphite-mint",
                "primary_color": "#087f5b",
                "secondary_color": "#0f766e",
                "accent_color": "#dff8ef",
                "background_color": "#f5f7f6",
                "surface_color": "#ffffff",
                "text_color": "#1f2933",
                "muted_text_color": "#64748b",
                "border_color": "#d8e2dc",
                "is_default": False,
                "order": 20,
            },
            {
                "name": "Ink Coral",
                "slug": "ink-coral",
                "primary_color": "#c2410c",
                "secondary_color": "#9a3412",
                "accent_color": "#ffedd5",
                "background_color": "#fbfaf8",
                "surface_color": "#ffffff",
                "text_color": "#241c15",
                "muted_text_color": "#6b7280",
                "border_color": "#e7ded5",
                "is_default": False,
                "order": 30,
            },
        ]
        for theme_data in theme_defaults:
            VisualTheme.objects.get_or_create(
                slug=theme_data["slug"],
                defaults=theme_data,
            )

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
        if not settings.visual_theme_id:
            settings.visual_theme = VisualTheme.objects.filter(is_default=True).first()
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
        self.stdout.write(self.style.SUCCESS("Ensured default visual themes."))
        self.stdout.write(self.style.SUCCESS("Ensured default navigation items."))
