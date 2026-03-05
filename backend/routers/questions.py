from fastapi import APIRouter
from pypika import JSON


# the code explanantion:
# 'prefix' means all URLs in this file start with /questions 
# # (e.g., /questions/all)
# 'tags' groups these endpoints together in the /docs 
# # (Swagger) interface
router = APIRouter(prefix="/questions", tags=["questions"])


# Because the prefix is "/questions", an empty string "" means 
# # the URL is just "/questions"
# 'role: str | None = None' makes 'role' an OPTIONAL query 
# #parameter (e.g., /questions?role=admin)
@router.get("")
def list_questions(role: str | None = None):
    #
    return {"items": [], "role": role} # FastAPI converts into 
                                       # JSON object for frontend
                                       
