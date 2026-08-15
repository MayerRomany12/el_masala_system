from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, List, Any

T = TypeVar("T")

class StandardResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "تمت العملية بنجاح"
    data: Optional[T] = None

class PaginatedData(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int

class PaginatedResponse(StandardResponse[PaginatedData[T]], Generic[T]):
    pass
