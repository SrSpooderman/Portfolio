from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin, UserAdmin
from django.contrib.auth.models import Group, User
from django.contrib.admin.sites import NotRegistered

from app.adapters.orm.models import (
    ContentBlock,
    HeroSettings,
    LearningItem,
    NavigationItem,
    Page,
    PageSection,
    Profile,
    Project,
    ProjectMedia,
    ProjectSkill,
    SiteSettings,
    Skill,
    SkillCategory,
    SocialMedia,
    VisualTheme,
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


@admin.register(VisualTheme)
class VisualThemeAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_default", "primary_color", "secondary_color", "order")
    list_editable = ("is_default", "order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ("Identidad", {"fields": ("site_name", "owner_name", "role_title", "hero_eyebrow")}),
        ("Marca", {"fields": ("logo_path", "favicon_path", "visual_theme")}),
        ("SEO", {"fields": ("meta_description", "meta_author")}),
        (
            "Titulos de secciones",
            {
                "fields": (
                    "about_title",
                    "skills_title",
                    "projects_title",
                    "learning_title",
                    "contact_title",
                    "project_detail_title",
                    "media_title",
                )
            },
        ),
        (
            "Etiquetas",
            {
                "fields": (
                    "featured_label",
                    "project_detail_link_label",
                    "github_label",
                    "demo_label",
                    "cv_label",
                    "email_label",
                    "phone_label",
                )
            },
        ),
        (
            "Mensajes vacios",
            {
                "fields": (
                    "empty_about_message",
                    "empty_skills_message",
                    "empty_projects_message",
                    "empty_category_message",
                )
            },
        ),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()


class PageSectionInline(admin.TabularInline):
    model = PageSection
    extra = 0


class ContentBlockInline(admin.TabularInline):
    model = ContentBlock
    extra = 0


class HeroSettingsInline(admin.StackedInline):
    model = HeroSettings
    extra = 0
    max_num = 1


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_home", "visible", "order")
    list_editable = ("is_home", "visible", "order")
    prepopulated_fields = {"slug": ("title",)}
    search_fields = ("title", "slug")
    inlines = (PageSectionInline,)


@admin.register(PageSection)
class PageSectionAdmin(admin.ModelAdmin):
    list_display = ("page", "section_type", "anchor", "visible", "order", "layout_variant")
    list_editable = ("visible", "order", "layout_variant")
    list_filter = ("page", "section_type", "visible", "layout_variant")
    search_fields = ("title", "anchor")
    inlines = (HeroSettingsInline, ContentBlockInline)


@admin.register(ContentBlock)
class ContentBlockAdmin(admin.ModelAdmin):
    list_display = ("section", "block_type", "title", "visible", "order")
    list_editable = ("visible", "order")
    list_filter = ("block_type", "visible", "section")
    search_fields = ("title", "body", "cta_label", "cta_url")


@admin.register(HeroSettings)
class HeroSettingsAdmin(admin.ModelAdmin):
    list_display = ("section", "content_source", "variant", "alignment", "height", "show_logo")
    list_filter = ("content_source", "variant", "alignment", "height", "show_logo")
    search_fields = ("section__title", "section__anchor", "title", "subtitle")


@admin.register(NavigationItem)
class NavigationItemAdmin(admin.ModelAdmin):
    list_display = ("label", "url", "visible", "open_new_tab", "order")
    list_editable = ("visible", "open_new_tab", "order")
    search_fields = ("label", "url")


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


@admin.register(LearningItem)
class LearningItemAdmin(admin.ModelAdmin):
    list_display = ("title", "visible", "order")
    list_editable = ("visible", "order")
    search_fields = ("title", "description")


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
