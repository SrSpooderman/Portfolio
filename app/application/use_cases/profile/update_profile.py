from app.domain.repositories.profileRepository import ProfileRepository
from app.domain.entities import ProfileEntity

class UpdateProfile:
    def __init__(self, profile_repository: ProfileRepository):
        self.profile_repository = profile_repository

    def execute(self, profile_id: int, profile_data: ProfileEntity)-> None:
        return self.profile_repository.update_profile(profile_id, profile_data)