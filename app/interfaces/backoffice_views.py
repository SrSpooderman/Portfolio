from dataclasses import dataclass

from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.contrib.auth.views import LoginView
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.text import capfirst

from app.adapters.orm.models import (
    LearningItem,
    NavigationItem,
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
from app.interfaces.backoffice_forms import (
    AdminUserCreateForm,
    AdminUserEditForm,
    LearningItemForm,
    NavigationItemForm,
    ProfileForm,
    ProjectForm,
    ProjectMediaForm,
    ProjectSkillForm,
    SiteSettingsForm,
    SkillCategoryForm,
    SkillForm,
    SocialMediaForm,
    VisualThemeForm,
)


@dataclass(frozen=True)
class Resource:
    key: str
    label: str
    model: object
    form_class: object
    list_display: tuple
    description: str


RESOURCES = {
    "profiles": Resource("profiles", "Profiles", Profile, ProfileForm, ("name", "headline", "email"), "Persona principal del portfolio."),
    "navigation": Resource("navigation", "Navigation", NavigationItem, NavigationItemForm, ("label", "url", "visible", "order"), "Enlaces visibles en la cabecera."),
    "visual-themes": Resource("visual-themes", "Visual themes", VisualTheme, VisualThemeForm, ("name", "slug", "is_default", "primary_color", "secondary_color", "order"), "Temas visuales reutilizables para el portfolio publico."),
    "social-media": Resource("social-media", "Social media", SocialMedia, SocialMediaForm, ("platform", "url", "order"), "Redes y enlaces externos."),
    "skill-categories": Resource("skill-categories", "Skill categories", SkillCategory, SkillCategoryForm, ("category_name", "order"), "Agrupaciones de tecnologias."),
    "skills": Resource("skills", "Skills", Skill, SkillForm, ("name", "category", "proficiency", "order"), "Tecnologias y herramientas."),
    "learning": Resource("learning", "Learning", LearningItem, LearningItemForm, ("title", "visible", "order"), "Aprendizaje, formacion o foco actual."),
    "projects": Resource("projects", "Projects", Project, ProjectForm, ("title", "slug", "featured", "order"), "Proyectos publicados."),
    "project-skills": Resource("project-skills", "Project skills", ProjectSkill, ProjectSkillForm, ("project", "skill"), "Relacion entre proyectos y tecnologias."),
    "project-media": Resource("project-media", "Project media", ProjectMedia, ProjectMediaForm, ("project", "media_type", "media_url", "order"), "Media asociada a proyectos."),
}


def staff_required(view_func):
    return login_required(user_passes_test(lambda user: user.is_staff)(view_func))


def superuser_required(view_func):
    return login_required(user_passes_test(lambda user: user.is_superuser)(view_func))


class BackofficeLoginView(LoginView):
    template_name = "backoffice/login.html"
    redirect_authenticated_user = True

    def get_success_url(self):
        return reverse("backoffice-dashboard")


def backoffice_logout(request):
    logout(request)
    return redirect("backoffice-login")


@staff_required
def dashboard(request):
    cards = [
        {"label": "Config site", "count": SiteSettings.objects.count(), "url": reverse("backoffice-config-site"), "description": "Identidad, SEO y textos globales."},
    ]
    for resource in RESOURCES.values():
        cards.append(
            {
                "label": resource.label,
                "count": resource.model.objects.count(),
                "url": reverse("backoffice-resource-list", args=[resource.key]),
                "description": resource.description,
            }
        )
    if request.user.is_superuser:
        cards.append(
            {
                "label": "Administrators",
                "count": User.objects.filter(is_staff=True, is_superuser=False).count(),
                "url": reverse("backoffice-admin-users"),
                "description": "Usuarios con acceso al backoffice.",
            }
        )
    return render(request, "backoffice/dashboard.html", {"cards": cards})


@staff_required
def config_site(request):
    instance = SiteSettings.objects.first() or SiteSettings()
    if request.method == "POST":
        form = SiteSettingsForm(request.POST, instance=instance)
        if form.is_valid():
            form.save()
            messages.success(request, "Config site guardado.")
            return redirect("backoffice-config-site")
    else:
        form = SiteSettingsForm(instance=instance)
    return render(
        request,
        "backoffice/form.html",
        {"title": "Config site", "subtitle": "Identidad, SEO, etiquetas y mensajes del portfolio.", "form": form},
    )


@staff_required
def resource_list(request, resource_key):
    resource = _get_resource(resource_key)
    objects = resource.model.objects.all()
    return render(
        request,
        "backoffice/resource_list.html",
        {"resource": resource, "objects": objects, "fields": resource.list_display},
    )


@staff_required
def resource_create(request, resource_key):
    resource = _get_resource(resource_key)
    if request.method == "POST":
        form = resource.form_class(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, f"{resource.label} creado.")
            return redirect("backoffice-resource-list", resource_key=resource.key)
    else:
        form = resource.form_class()
    return render(
        request,
        "backoffice/form.html",
        {"title": f"New {resource.label}", "subtitle": resource.description, "form": form, "resource": resource},
    )


@staff_required
def resource_update(request, resource_key, pk):
    resource = _get_resource(resource_key)
    instance = get_object_or_404(resource.model, pk=pk)
    if request.method == "POST":
        form = resource.form_class(request.POST, request.FILES, instance=instance)
        if form.is_valid():
            form.save()
            messages.success(request, f"{resource.label} actualizado.")
            return redirect("backoffice-resource-list", resource_key=resource.key)
    else:
        form = resource.form_class(instance=instance)
    return render(
        request,
        "backoffice/form.html",
        {"title": f"Edit {resource.label}", "subtitle": str(instance), "form": form, "resource": resource},
    )


@staff_required
def resource_delete(request, resource_key, pk):
    resource = _get_resource(resource_key)
    instance = get_object_or_404(resource.model, pk=pk)
    if request.method == "POST":
        instance.delete()
        messages.success(request, f"{resource.label} eliminado.")
        return redirect("backoffice-resource-list", resource_key=resource.key)
    return render(
        request,
        "backoffice/confirm_delete.html",
        {"title": f"Delete {resource.label}", "object": instance, "resource": resource},
    )


@superuser_required
def admin_users(request):
    users = User.objects.filter(is_staff=True, is_superuser=False).order_by("username")
    return render(request, "backoffice/admin_users.html", {"users": users})


@superuser_required
def admin_user_create(request):
    if request.method == "POST":
        form = AdminUserCreateForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "Administrador creado.")
            return redirect("backoffice-admin-users")
    else:
        form = AdminUserCreateForm(initial={"is_active": True})
    return render(request, "backoffice/form.html", {"title": "New administrator", "form": form})


@superuser_required
def admin_user_update(request, pk):
    user = get_object_or_404(User, pk=pk, is_superuser=False)
    if request.method == "POST":
        form = AdminUserEditForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            messages.success(request, "Administrador actualizado.")
            return redirect("backoffice-admin-users")
    else:
        form = AdminUserEditForm(instance=user)
    return render(request, "backoffice/form.html", {"title": "Edit administrator", "subtitle": user.username, "form": form})


def display_value(obj, field_name):
    value = getattr(obj, field_name)
    if callable(value):
        value = value()
    return value


def _get_resource(resource_key):
    resource = RESOURCES.get(resource_key)
    if resource is None:
        raise Http404(f"Unknown backoffice resource: {resource_key}")
    return resource
