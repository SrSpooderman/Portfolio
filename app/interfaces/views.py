from django.shortcuts import get_object_or_404, render

from app.adapters.orm.models import (
    LearningItem,
    NavigationItem,
    Page,
    PageSection,
    Profile,
    Project,
    SiteSettings,
    SkillCategory,
    SocialMedia,
    VisualTheme,
)


DEFAULT_HOME_SECTIONS = [
    {
        "section_type": PageSection.HERO,
        "anchor": "hero",
        "title": "",
        "layout_variant": PageSection.SIMPLE,
    },
    {
        "section_type": PageSection.ABOUT,
        "anchor": "about",
        "title": "",
        "layout_variant": PageSection.SIMPLE,
    },
    {
        "section_type": PageSection.SKILLS,
        "anchor": "skills",
        "title": "",
        "layout_variant": PageSection.GRID,
    },
    {
        "section_type": PageSection.PROJECTS,
        "anchor": "projects",
        "title": "",
        "layout_variant": PageSection.LIST,
    },
    {
        "section_type": PageSection.LEARNING,
        "anchor": "learning",
        "title": "",
        "layout_variant": PageSection.LIST,
    },
    {
        "section_type": PageSection.CONTACT,
        "anchor": "contact",
        "title": "",
        "layout_variant": PageSection.SIMPLE,
    },
]


def get_site_context():
    site_settings = SiteSettings.objects.select_related("visual_theme").first()
    active_theme = (
        site_settings.active_theme
        if site_settings
        else VisualTheme.objects.filter(is_default=True).first() or VisualTheme.objects.first()
    )
    return {
        "site_settings": site_settings,
        "active_theme": active_theme,
        "navigation_items": NavigationItem.objects.filter(visible=True),
    }


def home(request):
    page = (
        Page.objects.filter(is_home=True, visible=True)
        .select_related()
        .prefetch_related("sections__blocks", "sections__hero_settings")
        .first()
    )
    if page and page.sections.exists():
        page_sections = page.sections.filter(visible=True)
    else:
        page_sections = DEFAULT_HOME_SECTIONS
    context = {
        **get_site_context(),
        "page": page,
        "page_sections": page_sections,
        "profile": Profile.objects.first(),
        "skill_categories": SkillCategory.objects.prefetch_related("skills").all(),
        "learning_items": LearningItem.objects.filter(visible=True),
        "projects": Project.objects.prefetch_related("skills", "media").all(),
        "featured_projects": Project.objects.prefetch_related("skills", "media").filter(featured=True),
        "social_media": SocialMedia.objects.all(),
    }
    return render(request, "index.html", context)


def project_detail(request, slug):
    project = get_object_or_404(
        Project.objects.prefetch_related("skills", "media"),
        slug=slug,
    )
    context = {
        **get_site_context(),
        "profile": Profile.objects.first(),
        "project": project,
    }
    return render(request, "project_detail.html", context)
