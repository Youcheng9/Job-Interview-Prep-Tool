import argparse
import json
from backend.models.db import SessionLocal
from backend.models.models import Answer, FeedbackMessage, FeedbackThread, Question, Score
from backend.generate_questions import normalize_question_record

from dotenv import load_dotenv
load_dotenv("backend/.env")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete all existing questions before seeding the current dataset.",
    )
    parser.add_argument(
        "--purge-history",
        action="store_true",
        help="Delete answers, scores, and feedback chat history before replacing the question bank.",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        with open("backend/data/questions.json", "r", encoding="utf-8") as f:
            data = [normalize_question_record(item) for item in json.load(f)]

        if args.purge_history:
            db.query(FeedbackMessage).delete()
            db.query(FeedbackThread).delete()
            db.query(Score).delete()
            db.query(Answer).delete()
            db.commit()

        incoming_keys = {
            (item["role"], item.get("level", "new_grad"), item["prompt"])
            for item in data
        }

        existing_questions = {
            (question.role, question.level, question.prompt): question
            for question in db.query(Question).all()
        }

        created = 0
        updated = 0
        for item in data:
            level = item.get("level", "new_grad")
            key = (item["role"], level, item["prompt"])
            existing = existing_questions.get(key)

            if existing:
                companies = item.get("companies")
                if companies is None and item.get("company"):
                    companies = [item["company"]]
                existing.topic = item.get("topic")
                existing.company = companies[0] if companies else item.get("company")
                existing.companies = companies
                existing.rubric = item["rubric"]
                db.add(existing)
                updated += 1
                continue

            companies = item.get("companies")
            if companies is None and item.get("company"):
                companies = [item["company"]]
            question = Question(
                role=item["role"],
                level=level,
                topic=item.get("topic"),
                company=companies[0] if companies else item.get("company"),
                companies=companies,
                prompt=item["prompt"],
                rubric=item["rubric"],
            )
            db.add(question)
            created += 1

        removed = 0
        preserved = 0
        if args.replace:
            referenced_question_ids = {
                question_id
                for (question_id,) in db.query(Answer.question_id).distinct().all()
            }

            for key, question in existing_questions.items():
                if key in incoming_keys:
                    continue
                if question.id in referenced_question_ids:
                    preserved += 1
                    continue
                db.delete(question)
                removed += 1

        db.commit()
        print(
            f"Seeded {created} new questions, updated {updated}, removed {removed} stale unreferenced questions, preserved {preserved} referenced historical questions"
        )
    finally:
        db.close()

if __name__ == "__main__":
    main()
