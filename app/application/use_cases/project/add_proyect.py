from app.domain.repositories.proyectRepository import ProyectRepository
from app.domain.entities import ProyectEntity

class Proyect:
    def __init__ (self, proyect_repository: ProyectRepository):
        self.proyect_repository = proyect_repository