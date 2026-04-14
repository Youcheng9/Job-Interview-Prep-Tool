import json
from backend.models.db import SessionLocal
from backend.models.models import Question

from dotenv import load_dotenv
load_dotenv("backend/.env")

def main():
    db = SessionLocal()
    try:
        with open("backend/data/questions.json", "r", encoding="utf-8") as f:
            data = json.load(f)

        created = 0
        for item in data:
            level = item.get("level", "new_grad")
            exists = (
                db.query(Question)
                .filter(
                    Question.role == item["role"],
                    Question.level == level,
                    Question.prompt == item["prompt"],
                )
                .first()
            )
            if exists:
                continue
            db.add(
                Question(
                    role=item["role"],
                    level=level,
                    prompt=item["prompt"],
                    rubric=item["rubric"],
                )
            )
            created += 1

        db.commit()
        print(f"Seeded {created} questions")
    finally:
        db.close()

if __name__ == "__main__":
    main()
