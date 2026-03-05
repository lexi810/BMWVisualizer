from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.config import UPLOAD_DIR
from backend.database import get_db
from backend.models import Company, ConferenceProceeding, NewsHeadline, ResearchJob

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/upload", tags=["upload"])

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _save_file(upload: UploadFile) -> str:
    dest = Path(UPLOAD_DIR) / upload.filename
    with open(dest, "wb") as f:
        f.write(upload.file.read())
    return str(dest)


@router.post("/csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".csv", ".xlsx")):
        raise HTTPException(400, "Only CSV or XLSX files are supported.")
    path = _save_file(file)
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(path, dtype=str)
        else:
            df = pd.read_excel(path, dtype=str)
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")

    added = updated = 0
    ts = datetime.now(timezone.utc).isoformat()
    for _, row in df.iterrows():
        name = str(row.get("company_name", "")).strip()
        if not name:
            continue
        existing = db.query(Company).filter(Company.company_name.ilike(name)).first()
        data = {
            "company_name": name,
            "company_hq_city": row.get("company_hq_city") or None,
            "company_hq_state": row.get("company_hq_state") or None,
            "company_hq_country": row.get("company_hq_country") or None,
            "company_type": row.get("company_type") or None,
            "company_status": row.get("company_status") or None,
            "summary": row.get("summary") or None,
            "company_website": row.get("company_website") or None,
            "data_source": "file_upload",
            "last_updated": ts,
        }
        if existing:
            for k, v in data.items():
                if v is not None:
                    setattr(existing, k, v)
            updated += 1
        else:
            db.add(Company(**data))
            added += 1
    db.commit()
    return {"added": added, "updated": updated, "filename": file.filename}


@router.post("/document")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    allowed = (".pdf", ".txt", ".md")
    if not any(file.filename.endswith(ext) for ext in allowed):
        raise HTTPException(400, "Supported formats: PDF, TXT, MD.")
    path = _save_file(file)

    now = datetime.now(timezone.utc).isoformat()
    job = ResearchJob(
        job_type="document_extract",
        status="pending",
        target=file.filename,
        created_at=now,
        updated_at=now,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    job_id = job.id
    filename = file.filename

    async def _run():
        from backend.ai_research import extract_from_document
        from backend.database import SessionLocal

        inner_db = SessionLocal()
        try:
            j = inner_db.query(ResearchJob).filter(ResearchJob.id == job_id).first()
            if j:
                j.status = "running"
                j.updated_at = datetime.now(timezone.utc).isoformat()
                inner_db.commit()

            # Extract text
            text = ""
            if filename.endswith(".pdf"):
                import pdfplumber

                with pdfplumber.open(path) as pdf:
                    for page in pdf.pages:
                        text += (page.extract_text() or "") + "\n"
            else:
                with open(path, "r", errors="ignore") as f:
                    text = f.read()

            result = await asyncio.get_event_loop().run_in_executor(
                None, extract_from_document, text, filename
            )

            ts = datetime.now(timezone.utc).isoformat()
            companies_added = news_added = procs_added = 0

            for comp_data in result.get("companies", []):
                name = comp_data.get("company_name", "").strip()
                if not name:
                    continue
                existing = inner_db.query(Company).filter(
                    Company.company_name.ilike(name)
                ).first()
                safe = {k: (json.dumps(v) if isinstance(v, (list, dict)) else v)
                        for k, v in comp_data.items()
                        if k in Company.__table__.columns.keys()}
                safe["last_updated"] = ts
                safe["data_source"] = "file_upload"
                if existing:
                    for k, v in safe.items():
                        if v is not None:
                            setattr(existing, k, v)
                else:
                    inner_db.add(Company(**safe))
                    companies_added += 1
            inner_db.commit()

            for news in result.get("news", []):
                name = news.get("company_name", "")
                company = inner_db.query(Company).filter(
                    Company.company_name.ilike(name)
                ).first() if name else None
                n = NewsHeadline(
                    company_id=company.id if company else None,
                    company_name=name,
                    news_headline=news.get("news_headline", ""),
                    category=news.get("category"),
                    partners=json.dumps(news.get("partners", [])),
                    date_of_article=news.get("date_of_article"),
                    summary=news.get("summary"),
                    topics=json.dumps(news.get("topics", [])),
                    file_path=path if hasattr(NewsHeadline, "file_path") else None,
                    created_at=ts,
                )
                inner_db.add(n)
                news_added += 1

            for proc in result.get("proceedings", []):
                name = proc.get("company_name", "")
                company = inner_db.query(Company).filter(
                    Company.company_name.ilike(name)
                ).first() if name else None
                p = ConferenceProceeding(
                    company_id=company.id if company else None,
                    company_name=name,
                    title=proc.get("title", filename),
                    event_name=proc.get("event_name"),
                    event_date=proc.get("event_date"),
                    location=proc.get("location"),
                    authors=json.dumps(proc.get("authors", [])),
                    technologies=json.dumps(proc.get("technologies", [])),
                    partners_mentioned=json.dumps(proc.get("partners_mentioned", [])),
                    results_summary=proc.get("results_summary"),
                    source_type=proc.get("source_type", "conference_paper"),
                    file_path=path,
                    topics=json.dumps(proc.get("topics", [])),
                    created_at=ts,
                )
                inner_db.add(p)
                procs_added += 1

            inner_db.commit()

            j = inner_db.query(ResearchJob).filter(ResearchJob.id == job_id).first()
            if j:
                j.status = "complete"
                j.result = json.dumps({
                    "companies_added": companies_added,
                    "news_added": news_added,
                    "proceedings_added": procs_added,
                })
                j.updated_at = datetime.now(timezone.utc).isoformat()
                inner_db.commit()
        except Exception as e:
            log.error("Document extract job %d failed: %s", job_id, e)
            j = inner_db.query(ResearchJob).filter(ResearchJob.id == job_id).first()
            if j:
                j.status = "failed"
                j.result = str(e)
                j.updated_at = datetime.now(timezone.utc).isoformat()
                inner_db.commit()
        finally:
            inner_db.close()

    asyncio.create_task(_run())
    return {"job_id": job_id, "filename": filename}
