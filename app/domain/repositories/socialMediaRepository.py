from abc import ABC, abstractmethod

class SocialMediaRepository(ABC):
    @abstractmethod
    def get_entity_by_id(self, social_media_id: int):
        pass

    @abstractmethod
    def add_entity(self, social_media_data: dict):
        pass

    @abstractmethod
    def update_entity(self, social_media_id: int, social_media_data: dict):
        pass

    @abstractmethod
    def delete_entity(self, social_media_id: int):
        pass