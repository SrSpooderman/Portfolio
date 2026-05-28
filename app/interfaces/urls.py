from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from app.interfaces import api_views, views


router = DefaultRouter()
router.register("profiles", api_views.ProfileViewSet, basename="profile")
router.register("social-media", api_views.SocialMediaViewSet, basename="social-media")
router.register("skill-categories", api_views.SkillCategoryViewSet, basename="skill-category")
router.register("skills", api_views.SkillViewSet, basename="skill")
router.register("projects", api_views.ProjectViewSet, basename="project")
router.register("project-skills", api_views.ProjectSkillViewSet, basename="project-skill")
router.register("project-media", api_views.ProjectMediaViewSet, basename="project-media")

urlpatterns = [
    path("", views.home, name="home"),
    path("api/", include(router.urls)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
