from django.shortcuts import get_object_or_404, render

from app.adapters.orm.models import (
    LearningItem,
    NavigationItem,
    Profile,
    Project,
    SiteSettings,
    SkillCategory,
    SocialMedia,
)


def get_site_context():
    return {
        "site_settings": SiteSettings.objects.first(),
        "navigation_items": NavigationItem.objects.filter(visible=True),
    }


def home(request):
    context = {
        **get_site_context(),
        "profile": Profile.objects.first(),
        "skill_categories": SkillCategory.objects.prefetch_related("skills").all(),
        "learning_items": LearningItem.objects.filter(visible=True),
        "projects": Project.objects.prefetch_related("skills", "media").all(),
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
