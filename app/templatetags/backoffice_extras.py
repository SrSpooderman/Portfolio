from django import template


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
