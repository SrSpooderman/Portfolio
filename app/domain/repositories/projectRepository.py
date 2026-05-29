from abc import ABC, abstractmethod


class ProjectRepository(ABC):
    @abstractmethod
    def get_entity(self, project_id: int):
        pass

    @abstractmethod
    def add_entity(self, project_data: dict):
        pass

    @abstractmethod
    def update_entity(self, project_id: int, project_data: dict):
        pass

    @abstractmethod
    def delete_entity(self, project_id: int):
        pass
