from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin, UserAdmin
from django.contrib.auth.models import Group, User
from django.contrib.admin.sites import NotRegistered

from app.adapters.orm.models import (
    Profile,
    Project,
    ProjectMedia,
    ProjectSkill,
    Skill,
    SkillCategory,
    SocialMedia,
)


class SuperuserOnlyAdminMixin:
    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


try:
    admin.site.unregister(User)
except NotRegistered:
    pass


try:
    admin.site.unregister(Group)
except NotRegistered:
    pass


@admin.register(User)
class BackofficeUserAdmin(SuperuserOnlyAdminMixin, UserAdmin):
    list_display = ("username", "email", "is_staff", "is_superuser", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")


@admin.register(Group)
class BackofficeGroupAdmin(SuperuserOnlyAdminMixin, GroupAdmin):
    pass


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "headline", "email")
    search_fields = ("name", "headline", "email")


@admin.register(SocialMedia)
class SocialMediaAdmin(admin.ModelAdmin):
    list_display = ("platform", "url", "order")
    list_filter = ("platform",)
    search_fields = ("platform", "url")


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ("category_name", "order")
    search_fields = ("category_name",)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "proficiency", "order")
    list_filter = ("category",)
    search_fields = ("name",)


class ProjectSkillInline(admin.TabularInline):
    model = ProjectSkill
    extra = 1


class ProjectMediaInline(admin.TabularInline):
    model = ProjectMedia
    extra = 1


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "featured", "order")
    list_filter = ("featured",)
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "description")
    inlines = (ProjectSkillInline, ProjectMediaInline)


@admin.register(ProjectSkill)
class ProjectSkillAdmin(admin.ModelAdmin):
    list_display = ("project", "skill")
    list_filter = ("skill",)


@admin.register(ProjectMedia)
class ProjectMediaAdmin(admin.ModelAdmin):
    list_display = ("project", "media_type", "media_url", "order")
    list_filter = ("media_type",)
