class ListEntities:
    def __init__(self, repository):
        self.repository = repository

    def execute(self):
        return self.repository.list()


class GetEntity:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, entity_id):
        return self.repository.get(entity_id)


class CreateEntity:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, data):
        return self.repository.create(data)


class UpdateEntity:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, entity_id, data):
        return self.repository.update(entity_id, data)


class DeleteEntity:
    def __init__(self, repository):
        self.repository = repository

    def execute(self, entity_id):
        self.repository.delete(entity_id)
