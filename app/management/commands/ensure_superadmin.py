import os

from django.contrib.auth.models import Group, Permission, User
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Creates or updates the superadmin user and administrator group from environment variables."

    def handle(self, *args, **options):
        username = os.getenv("SUPERADMIN_USERNAME")
        email = os.getenv("SUPERADMIN_EMAIL", "")
        password = os.getenv("SUPERADMIN_PASSWORD")

        if not username or not password:
            raise CommandError("SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD are required.")

        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        group = self._ensure_admin_group()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} superadmin '{username}'."))
        self.stdout.write(self.style.SUCCESS(f"Ensured group '{group.name}' with portfolio permissions."))

    def _ensure_admin_group(self):
        group, _ = Group.objects.get_or_create(name="Administradores")
        permissions = Permission.objects.filter(
            content_type__app_label="app",
            codename__regex=r"^(add|change|delete|view)_",
        )
        group.permissions.set(permissions)
        return group
