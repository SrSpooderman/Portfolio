from app.domain.repositories.profileRepository import ProfileRepository
from app.domain.entities import ProfileEntity

class GetProfile:
    def __init__(self, profile_repository: ProfileRepository):
        self.profile_repository = profile_repository
    
    def execute(self, user_id: int) -> ProfileEntity:
        return self.profile_repository.get_profile(user_id)