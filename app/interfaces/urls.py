from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

from app.interfaces import api_views, backoffice_views, views


router = DefaultRouter()
router.register("site-settings", api_views.SiteSettingsViewSet, basename="site-settings")
router.register("navigation", api_views.NavigationItemViewSet, basename="navigation")
router.register("profiles", api_views.ProfileViewSet, basename="profile")
router.register("social-media", api_views.SocialMediaViewSet, basename="social-media")
router.register("skill-categories", api_views.SkillCategoryViewSet, basename="skill-category")
router.register("skills", api_views.SkillViewSet, basename="skill")
router.register("learning", api_views.LearningItemViewSet, basename="learning")
router.register("projects", api_views.ProjectViewSet, basename="project")
router.register("project-skills", api_views.ProjectSkillViewSet, basename="project-skill")
router.register("project-media", api_views.ProjectMediaViewSet, basename="project-media")

urlpatterns = [
    path("", views.home, name="home"),
    path("projects/<slug:slug>/", views.project_detail, name="project-detail"),
    path("backoffice/login/", backoffice_views.BackofficeLoginView.as_view(), name="backoffice-login"),
    path("backoffice/logout/", backoffice_views.backoffice_logout, name="backoffice-logout"),
    path("backoffice/", backoffice_views.dashboard, name="backoffice-dashboard"),
    path("backoffice/config-site/", backoffice_views.config_site, name="backoffice-config-site"),
    path("backoffice/administrators/", backoffice_views.admin_users, name="backoffice-admin-users"),
    path("backoffice/administrators/new/", backoffice_views.admin_user_create, name="backoffice-admin-user-create"),
    path("backoffice/administrators/<int:pk>/edit/", backoffice_views.admin_user_update, name="backoffice-admin-user-edit"),
    path("backoffice/<slug:resource_key>/", backoffice_views.resource_list, name="backoffice-resource-list"),
    path("backoffice/<slug:resource_key>/new/", backoffice_views.resource_create, name="backoffice-resource-create"),
    path("backoffice/<slug:resource_key>/<int:pk>/edit/", backoffice_views.resource_update, name="backoffice-resource-edit"),
    path("backoffice/<slug:resource_key>/<int:pk>/delete/", backoffice_views.resource_delete, name="backoffice-resource-delete"),
    path("api/", include(router.urls)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
