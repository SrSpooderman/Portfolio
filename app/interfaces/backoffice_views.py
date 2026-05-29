from dataclasses import dataclass

from django.contrib import messages
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.contrib.auth.views import LoginView
from django.db.models import Max
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.text import slugify

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
from app.interfaces.backoffice_forms import (
    AdminUserCreateForm,
    AdminUserEditForm,
    ContentBlockForm,
    HeroSettingsForm,
    LearningItemForm,
    NavigationItemForm,
    PageForm,
    PageSectionForm,
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
    "profiles": Resource("profiles", "Perfil", Profile, ProfileForm, ("name", "headline", "email"), "La persona que aparece como protagonista del portfolio."),
    "pages": Resource("pages", "Paginas", Page, PageForm, ("title", "slug", "is_home", "visible", "order"), "Paginas editables del portfolio."),
    "page-sections": Resource("page-sections", "Secciones", PageSection, PageSectionForm, ("page", "section_type", "anchor", "visible", "order", "layout_variant"), "Piezas reordenables que componen cada pagina."),
    "content-blocks": Resource("content-blocks", "Bloques", ContentBlock, ContentBlockForm, ("section", "block_type", "title", "visible", "order"), "Contenido flexible dentro de una seccion: texto, imagenes, CTAs y enlaces."),
    "hero-settings": Resource("hero-settings", "Hero configurable", HeroSettings, HeroSettingsForm, ("section", "content_source", "variant", "alignment", "height", "show_logo"), "Texto, imagen, CTAs y composicion de la seccion principal."),
    "navigation": Resource("navigation", "Navegacion", NavigationItem, NavigationItemForm, ("label", "url", "visible", "order"), "Enlaces visibles en la cabecera publica."),
    "visual-themes": Resource("visual-themes", "Temas visuales", VisualTheme, VisualThemeForm, ("name", "slug", "is_default", "primary_color", "secondary_color", "order"), "Colores, tipografia, ancho y radio visual del portfolio."),
    "social-media": Resource("social-media", "Redes sociales", SocialMedia, SocialMediaForm, ("platform", "url", "order"), "Redes y enlaces externos."),
    "skill-categories": Resource("skill-categories", "Categorias tech", SkillCategory, SkillCategoryForm, ("category_name", "order"), "Grupos para ordenar tecnologias y herramientas."),
    "skills": Resource("skills", "Tecnologias", Skill, SkillForm, ("name", "category", "proficiency", "order"), "Tecnologias y herramientas."),
    "learning": Resource("learning", "Aprendizaje", LearningItem, LearningItemForm, ("title", "visible", "order"), "Aprendizaje, formacion o foco actual."),
    "projects": Resource("projects", "Proyectos", Project, ProjectForm, ("title", "slug", "featured", "order"), "Proyectos publicados en el portfolio."),
    "project-skills": Resource("project-skills", "Skills de proyecto", ProjectSkill, ProjectSkillForm, ("project", "skill"), "Relacion entre proyectos y tecnologias."),
    "project-media": Resource("project-media", "Media de proyecto", ProjectMedia, ProjectMediaForm, ("project", "media_type", "media_url", "order"), "Imagenes y recursos asociados a proyectos."),
}


SECTION_HELP = {
    PageSection.HERO: "Presentacion principal del portfolio.",
    PageSection.ABOUT: "Bio y contexto profesional.",
    PageSection.SKILLS: "Categorias y tecnologias.",
    PageSection.PROJECTS: "Listado de proyectos publicados.",
    PageSection.LEARNING: "Aprendizaje, formacion o foco actual.",
    PageSection.CONTACT: "Contacto, CV y redes.",
    PageSection.CUSTOM_NOTE: "Nota flexible compuesta por bloques.",
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
    setup_steps = [
        {
            "number": "01",
            "title": "Configura la identidad",
            "description": "Nombre, logo, textos base y tema activo.",
            "url": reverse("backoffice-config-site"),
            "action": "Abrir config site",
        },
        {
            "number": "02",
            "title": "Rellena el contenido",
            "description": "Perfil, tecnologias, proyectos, aprendizaje y redes.",
            "url": reverse("backoffice-resource-list", args=["profiles"]),
            "action": "Editar perfil",
        },
        {
            "number": "03",
            "title": "Monta la home",
            "description": "Ordena secciones, anade bloques y ajusta la navegacion.",
            "url": reverse("backoffice-builder"),
            "action": "Ir al builder",
        },
        {
            "number": "04",
            "title": "Previsualiza y ajusta",
            "description": "Abre el portfolio publico y vuelve a tocar lo que haga falta.",
            "url": reverse("home"),
            "action": "Ver portfolio",
        },
    ]
    cards = [
        {"label": "Config site", "count": SiteSettings.objects.count(), "url": reverse("backoffice-config-site"), "description": "Identidad, SEO y textos globales."},
        {"label": "Page builder", "count": PageSection.objects.count(), "url": reverse("backoffice-builder"), "description": "Orden, visibilidad y composicion de la home."},
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
    return render(request, "backoffice/dashboard.html", {"cards": cards, "setup_steps": setup_steps})


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


@staff_required
def visual_theme_set_default(request, pk):
    if request.method != "POST":
        raise Http404("Theme actions require POST.")

    theme = get_object_or_404(VisualTheme, pk=pk)
    theme.is_default = True
    theme.save(update_fields=["is_default", "updated_at"])
    messages.success(request, f"'{theme.name}' es ahora el tema activo.")
    return redirect("backoffice-resource-list", resource_key="visual-themes")


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


@staff_required
def builder_home(request):
    page = _ensure_home_page()
    sections = list(page.sections.select_related("hero_settings").prefetch_related("blocks").all())
    nav_warnings = _navigation_warnings(page)
    return render(
        request,
        "backoffice/builder.html",
        {
            "page": page,
            "sections": sections,
            "section_help": SECTION_HELP,
            "nav_warnings": nav_warnings,
            "site_settings": SiteSettings.objects.select_related("visual_theme").first(),
        },
    )


@staff_required
def builder_section_action(request, pk, action):
    if request.method != "POST":
        raise Http404("Builder actions require POST.")

    section = get_object_or_404(PageSection, pk=pk)
    if action == "toggle":
        section.visible = not section.visible
        section.save(update_fields=["visible", "updated_at"])
        messages.success(request, f"{section.get_section_type_display()} actualizado.")
    elif action == "up":
        if _move_section(section, direction=-1):
            messages.success(request, f"{section.get_section_type_display()} movido.")
    elif action == "down":
        if _move_section(section, direction=1):
            messages.success(request, f"{section.get_section_type_display()} movido.")
    elif action == "duplicate":
        _duplicate_section(section)
        messages.success(request, f"{section.get_section_type_display()} duplicado.")
    else:
        raise Http404(f"Unknown builder action: {action}")

    return redirect("backoffice-builder")


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


def _ensure_home_page():
    page = Page.objects.filter(is_home=True).first()
    if page:
        return page
    page, _ = Page.objects.get_or_create(
        slug="home",
        defaults={"title": "Home", "is_home": True, "visible": True, "order": 10},
    )
    if not page.is_home:
        page.is_home = True
        page.visible = True
        page.save(update_fields=["is_home", "visible", "updated_at"])
    return page


def _move_section(section, direction):
    siblings = list(section.page.sections.order_by("order", "id"))
    current_index = siblings.index(section)
    target_index = current_index + direction
    if target_index < 0 or target_index >= len(siblings):
        return False
    target = siblings[target_index]
    section.order, target.order = target.order, section.order
    section.save(update_fields=["order", "updated_at"])
    target.save(update_fields=["order", "updated_at"])
    return True


def _duplicate_section(section):
    max_order = section.page.sections.aggregate(max_order=Max("order"))["max_order"] or 0
    base_anchor = slugify(f"{section.anchor}-copy") or f"{section.section_type}-copy"
    anchor = _unique_section_anchor(section.page, base_anchor)
    duplicated = PageSection.objects.create(
        page=section.page,
        section_type=section.section_type,
        title=section.title,
        anchor=anchor,
        visible=False,
        order=max_order + 10,
        layout_variant=section.layout_variant,
    )
    blocks = [
        ContentBlock(
            section=duplicated,
            block_type=block.block_type,
            title=block.title,
            body=block.body,
            image_url=block.image_url,
            alt_text=block.alt_text,
            cta_label=block.cta_label,
            cta_url=block.cta_url,
            cta_style=block.cta_style,
            open_new_tab=block.open_new_tab,
            visible=block.visible,
            order=block.order,
        )
        for block in section.blocks.all()
    ]
    if blocks:
        ContentBlock.objects.bulk_create(blocks)
    if hasattr(section, "hero_settings"):
        hero = section.hero_settings
        HeroSettings.objects.create(
            section=duplicated,
            content_source=hero.content_source,
            eyebrow=hero.eyebrow,
            title=hero.title,
            subtitle=hero.subtitle,
            show_logo=hero.show_logo,
            background_image_url=hero.background_image_url,
            image_alt_text=hero.image_alt_text,
            alignment=hero.alignment,
            variant=hero.variant,
            height=hero.height,
            spacing=hero.spacing,
            primary_cta_label=hero.primary_cta_label,
            primary_cta_url=hero.primary_cta_url,
            primary_cta_new_tab=hero.primary_cta_new_tab,
            secondary_cta_label=hero.secondary_cta_label,
            secondary_cta_url=hero.secondary_cta_url,
            secondary_cta_new_tab=hero.secondary_cta_new_tab,
        )


def _unique_section_anchor(page, base_anchor):
    anchor = base_anchor
    index = 2
    while PageSection.objects.filter(page=page, anchor=anchor).exists():
        anchor = f"{base_anchor}-{index}"
        index += 1
    return anchor


def _navigation_warnings(page):
    hidden_anchors = set(page.sections.filter(visible=False).values_list("anchor", flat=True))
    warnings = []
    for item in NavigationItem.objects.filter(visible=True, url__startswith="#"):
        anchor = item.url[1:]
        if anchor in hidden_anchors:
            warnings.append(f"Navigation '{item.label}' apunta a una seccion oculta: #{anchor}.")
    return warnings
