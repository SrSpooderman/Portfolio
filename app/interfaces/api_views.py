from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import permissions, viewsets

from app.adapters.orm.models import (
    Profile,
    Project,
    ProjectMedia,
    ProjectSkill,
    LearningItem,
    NavigationItem,
    SiteSettings,
    Skill,
    SkillCategory,
    SocialMedia,
    VisualTheme,
)
from app.interfaces.serializers import (
    ProfileSerializer,
    ProjectMediaSerializer,
    ProjectSerializer,
    ProjectSkillSerializer,
    LearningItemSerializer,
    NavigationItemSerializer,
    SiteSettingsSerializer,
    SkillCategorySerializer,
    SkillSerializer,
    SocialMediaSerializer,
    VisualThemeSerializer,
)


def parse_bool(value):
    if value is None:
        return None
    value = value.lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    return None


def parse_int(value):
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


class PublicReadAuthenticatedWriteMixin:
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class SiteSettingsViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsSerializer


class VisualThemeViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = VisualTheme.objects.all()
    serializer_class = VisualThemeSerializer
    lookup_field = "slug"


class NavigationItemViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = NavigationItem.objects.all()
    serializer_class = NavigationItemSerializer


class ProfileViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer


class SocialMediaViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = SocialMedia.objects.select_related("profile")
    serializer_class = SocialMediaSerializer


class SkillCategoryViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer


class SkillViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = Skill.objects.select_related("category")
    serializer_class = SkillSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="category",
                description="Filtra por id de categoria.",
                required=False,
                type=int,
            ),
            OpenApiParameter(
                name="category_name",
                description="Filtra por nombre exacto de categoria, sin distinguir mayusculas.",
                required=False,
                type=str,
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        category_value = self.request.query_params.get("category")
        category = parse_int(category_value)
        category_name = self.request.query_params.get("category_name")
        if category_value and category is None:
            return queryset.none()
        if category is not None:
            queryset = queryset.filter(category_id=category)
        if category_name:
            queryset = queryset.filter(category__category_name__iexact=category_name)
        return queryset


class LearningItemViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = LearningItem.objects.all()
    serializer_class = LearningItemSerializer


class ProjectViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = Project.objects.prefetch_related("skills", "media")
    serializer_class = ProjectSerializer
    lookup_field = "pk"

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="featured",
                description="Filtra proyectos destacados. Valores aceptados: true/false, 1/0, yes/no, on/off.",
                required=False,
                type=bool,
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        featured = parse_bool(self.request.query_params.get("featured"))
        if featured is not None:
            queryset = queryset.filter(featured=featured)
        return queryset


class ProjectSkillViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = ProjectSkill.objects.select_related("project", "skill")
    serializer_class = ProjectSkillSerializer


class ProjectMediaViewSet(PublicReadAuthenticatedWriteMixin, viewsets.ModelViewSet):
    queryset = ProjectMedia.objects.select_related("project")
    serializer_class = ProjectMediaSerializer

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="project",
                description="Filtra media por id de proyecto.",
                required=False,
                type=int,
            ),
            OpenApiParameter(
                name="project_slug",
                description="Filtra media por slug de proyecto.",
                required=False,
                type=str,
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        project_value = self.request.query_params.get("project")
        project = parse_int(project_value)
        project_slug = self.request.query_params.get("project_slug")
        if project_value and project is None:
            return queryset.none()
        if project is not None:
            queryset = queryset.filter(project_id=project)
        if project_slug:
            queryset = queryset.filter(project__slug=project_slug)
        return queryset
