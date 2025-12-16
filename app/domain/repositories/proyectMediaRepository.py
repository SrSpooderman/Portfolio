from abc import ABC, abstractmethod

class ProyectMediaRepository(ABC):
    @abstractmethod
    def get_media_from_proyect(self, proyect_id: int) -> list:
        pass

    @abstractmethod
    def add_media(self, proyect_id: int, media_data: dict) -> None:
        pass

    @abstractmethod
    def delete_media(self, media_id: int) -> None:
        pass