from sqlalchemy import Column, Integer, Text, Float, ForeignKey
from backend.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(Text, nullable=False, unique=True)
    company_hq_city = Column(Text)
    company_hq_state = Column(Text)
    company_hq_country = Column(Text)
    company_hq_lat = Column(Float)
    company_hq_lng = Column(Float)
    company_locations = Column(Text)          # JSON array
    company_type = Column(Text)
    company_status = Column(Text)
    company_focus = Column(Text)              # JSON array
    supply_chain_segment = Column(Text)
    keywords = Column(Text)                   # JSON array
    announced_partners = Column(Text)         # JSON array of objects
    number_of_employees = Column(Integer)
    last_fundraise_date = Column(Text)
    company_website = Column(Text)
    summary = Column(Text)
    long_description = Column(Text)
    naatbatt_member = Column(Integer, default=0)
    naatbatt_id = Column(Text)
    last_updated = Column(Text)
    data_source = Column(Text)


class NewsHeadline(Base):
    __tablename__ = "news_headlines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    company_name = Column(Text)
    news_headline = Column(Text, nullable=False)
    category = Column(Text)
    partners = Column(Text)                   # JSON array
    news_source = Column(Text)
    date_of_article = Column(Text)
    location = Column(Text)
    topics = Column(Text)                     # JSON array
    url = Column(Text)
    summary = Column(Text)
    created_at = Column(Text)


class ConferenceProceeding(Base):
    __tablename__ = "conference_proceedings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    company_name = Column(Text)
    title = Column(Text, nullable=False)
    event_name = Column(Text)
    event_date = Column(Text)
    location = Column(Text)
    authors = Column(Text)                    # JSON array
    technologies = Column(Text)               # JSON array
    partners_mentioned = Column(Text)         # JSON array
    results_summary = Column(Text)
    source_type = Column(Text)
    source_url = Column(Text)
    file_path = Column(Text)
    topics = Column(Text)                     # JSON array
    created_at = Column(Text)


class SyncLog(Base):
    __tablename__ = "sync_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(Text)
    status = Column(Text)
    rows_added = Column(Integer)
    rows_updated = Column(Integer)
    error_message = Column(Text)
    run_at = Column(Text)


class ResearchJob(Base):
    __tablename__ = "research_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_type = Column(Text)
    status = Column(Text, default="pending")
    target = Column(Text)
    result = Column(Text)
    created_at = Column(Text)
    updated_at = Column(Text)
