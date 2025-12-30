"""
Modèle de données pour un événement
Utilise Pydantic pour la validation automatique
"""
from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field
import uuid


class EventLocation(BaseModel):
    """Localisation de l'événement"""
    city: str
    country: str
    full_address: Optional[str] = None


class Event(BaseModel):
    """
    Modèle d'événement sportif conforme au format de l'app Yoroi
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    date_start: date
    location: EventLocation
    category: Literal["combat", "endurance", "force"]
    sport_tag: Literal["jjb", "hyrox", "mma", "crossfit", "grappling", "trail", "marathon", "running"]
    registration_link: str
    federation: Optional[str] = None
    image_logo_url: Optional[str] = None

    class Config:
        json_encoders = {
            date: lambda v: v.isoformat()
        }

    def to_dict(self):
        """Convertit en dictionnaire pour JSON"""
        data = self.model_dump()
        # Convertir la date en string ISO
        data['date_start'] = self.date_start.isoformat()
        return data
