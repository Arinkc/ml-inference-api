from pydantic import BaseModel, Field, ConfigDict

class HouseFeatures(BaseModel):
    sqft: int = Field(..., ge=200, le=15000, example=2000)
    bedrooms: int = Field(..., ge=1, le=10, example=3)
    bathrooms: int = Field(..., ge=1, le=8, example=2)
    age_years: int = Field(..., ge=0, le=150, example=10)
    garage: int = Field(..., ge=0, le=5, example=1)
    neighborhood: int = Field(..., ge=1, le=4, example=3)

class PredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    predicted_price: float
    cache_hit: bool
    latency_ms: float
    model_version: str = "1.0.0"