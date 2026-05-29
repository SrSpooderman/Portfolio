from django.db.utils import DatabaseError, OperationalError, ProgrammingError

from app.adapters.orm.models import SiteSettings, VisualTheme


def backoffice_theme(request):
    try:
        site_settings = SiteSettings.objects.select_related("visual_theme").first()
        active_theme = (
            site_settings.active_theme
            if site_settings
            else VisualTheme.objects.filter(is_default=True).first() or VisualTheme.objects.first()
        )
    except (DatabaseError, OperationalError, ProgrammingError):
        site_settings = None
        active_theme = None
    return {
        "backoffice_site_settings": site_settings,
        "backoffice_active_theme": active_theme,
    }
