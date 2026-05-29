from abc import ABC, abstractmethod


class ProjectMediaRepository(ABC):
    @abstractmethod
    def get_media_from_project(self, project_id: int) -> list:
        pass

    @abstractmethod
    def add_media(self, project_id: int, media_data: dict) -> None:
        pass

    @abstractmethod
    def delete_media(self, media_id: int) -> None:
        pass
