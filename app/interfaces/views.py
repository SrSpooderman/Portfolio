from django.shortcuts import render

from app.adapters.orm.models import Profile, Project, SkillCategory, SocialMedia


def home(request):
    context = {
        "profile": Profile.objects.first(),
        "skill_categories": SkillCategory.objects.prefetch_related("skills"),
        "projects": Project.objects.prefetch_related("skills", "media"),
        "social_media": SocialMedia.objects.all(),
    }
    return render(request, "index.html", context)
