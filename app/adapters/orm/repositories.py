from django.core.exceptions import ObjectDoesNotExist


class EntityNotFound(Exception):
    pass


class DjangoModelRepository:
    def __init__(self, model):
        self.model = model

    def list(self):
        return self.model.objects.all()

    def get(self, entity_id):
        try:
            return self.model.objects.get(pk=entity_id)
        except ObjectDoesNotExist as exc:
            raise EntityNotFound(f"{self.model.__name__} {entity_id} not found") from exc

    def create(self, data):
        instance = self.model(**data)
        instance.full_clean()
        instance.save()
        return instance

    def update(self, entity_id, data):
        instance = self.get(entity_id)
        for field, value in data.items():
            setattr(instance, field, value)
        instance.full_clean()
        instance.save()
        return instance

    def delete(self, entity_id):
        instance = self.get(entity_id)
        instance.delete()
