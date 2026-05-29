from django import template
from django.urls import NoReverseMatch, reverse
from django.utils.html import format_html


register = template.Library()


@register.filter
def attr(obj, field_name):
    value = getattr(obj, field_name, "")
    if callable(value):
        value = value()
    if value is True:
        return "Yes"
    if value is False:
        return "No"
    return value


@register.filter
def get_item(mapping, key):
    if not mapping:
        return ""
    return mapping.get(key, "")


@register.simple_tag
def resource_value(obj, field_name):
    value = attr(obj, field_name)
    if value in ("", None):
        return ""

    href = _field_href(obj, field_name, value)
    if href:
        target_attrs = ""
        if str(href).startswith(("http://", "https://")):
            target_attrs = ' target="_blank" rel="noopener noreferrer"'
        return format_html('<a class="cell-link" href="{}"{}>{}</a>', href, target_attrs, value)

    return value


def _field_href(obj, field_name, value):
    url_fields = {"url", "github_url", "demo_url", "media_url"}
    if field_name in url_fields:
        return value

    model_name = obj.__class__.__name__
    if model_name == "Project" and field_name in {"title", "slug"}:
        return _reverse_or_none("project-detail", obj.slug)
    if model_name == "Page" and field_name in {"title", "slug"} and getattr(obj, "is_home", False):
        return _reverse_or_none("home")
    if model_name == "PageSection" and field_name in {"anchor", "section_type"}:
        page = getattr(obj, "page", None)
        if page and getattr(page, "is_home", False):
            home_url = _reverse_or_none("home")
            if home_url:
                return f"{home_url}#{obj.anchor}"
    if model_name == "NavigationItem" and field_name == "label":
        return obj.url
    if model_name == "LearningItem" and field_name == "title" and obj.url:
        return obj.url
    if model_name == "SocialMedia" and field_name == "platform":
        return obj.url
    return None


def _reverse_or_none(name, *args):
    try:
        return reverse(name, args=args)
    except NoReverseMatch:
        return None
