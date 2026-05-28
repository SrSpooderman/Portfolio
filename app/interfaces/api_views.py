from rest_framework import viewsets

from app.adapters.orm.models import (
    Profile,
    Project,
    ProjectMedia,
    ProjectSkill,
    Skill,
    SkillCategory,
    SocialMedia,
)
from app.interfaces.serializers import (
    ProfileSerializer,
    ProjectMediaSerializer,
    ProjectSerializer,
    ProjectSkillSerializer,
    SkillCategorySerializer,
    SkillSerializer,
    SocialMediaSerializer,
)


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer


class SocialMediaViewSet(viewsets.ModelViewSet):
    queryset = SocialMedia.objects.select_related("profile")
    serializer_class = SocialMediaSerializer


class SkillCategoryViewSet(viewsets.ModelViewSet):
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.select_related("category")
    serializer_class = SkillSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.prefetch_related("skills", "media")
    serializer_class = ProjectSerializer
    lookup_field = "pk"


class ProjectSkillViewSet(viewsets.ModelViewSet):
    queryset = ProjectSkill.objects.select_related("project", "skill")
    serializer_class = ProjectSkillSerializer


class ProjectMediaViewSet(viewsets.ModelViewSet):
    queryset = ProjectMedia.objects.select_related("project")
    serializer_class = ProjectMediaSerializer
