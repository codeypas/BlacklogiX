from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    AIEvent,
    Alert,
    AlertStatus,
    ChatSession,
    IngestionSource,
    IngestionSourceStatus,
    IngestionSourceType,
    Message,
    MessageRole,
    MembershipRole,
    Organization,
    OrganizationMembership,
    Project,
    SystemEvent,
    User,
)


async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(session: AsyncSession, email: str, name: str) -> User:
    user = User(email=email, name=name)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def get_or_create_user(session: AsyncSession, email: str, name: str) -> User:
    user = await get_user_by_email(session, email)
    if user:
        if user.name != name:
            user.name = name
            await session.commit()
            await session.refresh(user)
        return user

    return await create_user(session, email=email, name=name)


async def get_user_by_id(session: AsyncSession, user_id: str) -> Optional[User]:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


def slugify_project_name(name: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return normalized or "project"


async def create_organization_with_owner(
    session: AsyncSession,
    *,
    name: str,
    owner_user_id: str,
) -> Organization:
    organization = Organization(name=name)
    session.add(organization)
    await session.flush()

    membership = OrganizationMembership(
        user_id=owner_user_id,
        organization_id=organization.id,
        role=MembershipRole.OWNER.value,
    )
    session.add(membership)
    await session.commit()
    await session.refresh(organization)
    return organization


async def list_organizations_for_user(session: AsyncSession, user_id: str) -> List[Organization]:
    result = await session.execute(
        select(Organization)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user_id)
        .order_by(Organization.created_at.desc())
    )
    return list(result.scalars().all())


async def get_organization_for_user(
    session: AsyncSession,
    organization_id: str,
    user_id: str,
) -> Optional[Organization]:
    result = await session.execute(
        select(Organization)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(
            Organization.id == organization_id,
            OrganizationMembership.user_id == user_id,
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _project_slug_exists(
    session: AsyncSession,
    organization_id: str,
    slug: str,
) -> bool:
    result = await session.execute(
        select(Project.id)
        .where(Project.organization_id == organization_id, Project.slug == slug)
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def create_project(
    session: AsyncSession,
    *,
    organization_id: str,
    name: str,
) -> Project:
    base_slug = slugify_project_name(name)
    slug = base_slug
    suffix = 2

    while await _project_slug_exists(session, organization_id, slug):
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    project = Project(
        organization_id=organization_id,
        name=name,
        slug=slug,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def list_projects_for_user(session: AsyncSession, user_id: str) -> List[Project]:
    result = await session.execute(
        select(Project)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())


async def get_project_for_user(
    session: AsyncSession,
    project_id: str,
    user_id: str,
) -> Optional[Project]:
    result = await session.execute(
        select(Project)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(Project.id == project_id, OrganizationMembership.user_id == user_id)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_ingestion_source(
    session: AsyncSession,
    *,
    project_id: str,
    source_type: IngestionSourceType,
    name: str,
    status: IngestionSourceStatus = IngestionSourceStatus.READY,
    api_key_prefix: str | None = None,
    api_key_hash: str | None = None,
) -> IngestionSource:
    source = IngestionSource(
        project_id=project_id,
        type=source_type.value,
        name=name,
        status=status.value,
        api_key_prefix=api_key_prefix,
        api_key_hash=api_key_hash,
        last_key_rotated_at=datetime.now(timezone.utc) if api_key_hash else None,
    )
    session.add(source)
    await session.commit()
    await session.refresh(source)
    return source


async def list_sources_for_user(session: AsyncSession, user_id: str) -> List[IngestionSource]:
    result = await session.execute(
        select(IngestionSource)
        .join(Project, Project.id == IngestionSource.project_id)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user_id)
        .order_by(IngestionSource.created_at.desc())
    )
    return list(result.scalars().all())


async def get_source_for_user(
    session: AsyncSession,
    source_id: str,
    user_id: str,
) -> Optional[IngestionSource]:
    result = await session.execute(
        select(IngestionSource)
        .join(Project, Project.id == IngestionSource.project_id)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(IngestionSource.id == source_id, OrganizationMembership.user_id == user_id)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_source_by_api_key_hash(
    session: AsyncSession,
    api_key_hash: str,
) -> Optional[IngestionSource]:
    result = await session.execute(
        select(IngestionSource)
        .where(IngestionSource.api_key_hash == api_key_hash)
        .limit(1)
    )
    return result.scalar_one_or_none()


async def rotate_ingestion_source_api_key(
    session: AsyncSession,
    *,
    source: IngestionSource,
    api_key_prefix: str,
    api_key_hash: str,
) -> IngestionSource:
    source.api_key_prefix = api_key_prefix
    source.api_key_hash = api_key_hash
    source.last_key_rotated_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(source)
    return source


async def create_ai_event(
    session: AsyncSession,
    *,
    project_id: str,
    source_id: str,
    timestamp,
    event_type: str,
    model_name: str | None,
    model_version: str | None,
    prompt: str | None,
    response: str | None,
    confidence_score: float | None,
    hash_algorithm: str,
    raw_hash: str,
    previous_hash: str | None,
    chain_hash: str,
    metadata_json: dict,
    raw_payload: dict,
) -> AIEvent:
    event = AIEvent(
        project_id=project_id,
        source_id=source_id,
        timestamp=timestamp,
        event_type=event_type,
        model_name=model_name,
        model_version=model_version,
        prompt=prompt,
        response=response,
        confidence_score=confidence_score,
        hash_algorithm=hash_algorithm,
        raw_hash=raw_hash,
        previous_hash=previous_hash,
        chain_hash=chain_hash,
        metadata_json=metadata_json,
        raw_payload=raw_payload,
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


async def create_system_event(
    session: AsyncSession,
    *,
    project_id: str,
    source_id: str,
    timestamp,
    service: str,
    level: str,
    event_name: str,
    hash_algorithm: str,
    raw_hash: str,
    previous_hash: str | None,
    chain_hash: str,
    metadata_json: dict,
    raw_payload: dict,
) -> SystemEvent:
    event = SystemEvent(
        project_id=project_id,
        source_id=source_id,
        timestamp=timestamp,
        service=service,
        level=level,
        event_name=event_name,
        hash_algorithm=hash_algorithm,
        raw_hash=raw_hash,
        previous_hash=previous_hash,
        chain_hash=chain_hash,
        metadata_json=metadata_json,
        raw_payload=raw_payload,
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


async def get_latest_ai_event_for_source(session: AsyncSession, source_id: str) -> Optional[AIEvent]:
    result = await session.execute(
        select(AIEvent)
        .where(AIEvent.source_id == source_id)
        .order_by(AIEvent.timestamp.desc(), AIEvent.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_system_event_for_source(session: AsyncSession, source_id: str) -> Optional[SystemEvent]:
    result = await session.execute(
        select(SystemEvent)
        .where(SystemEvent.source_id == source_id)
        .order_by(SystemEvent.timestamp.desc(), SystemEvent.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_ai_event_by_id(session: AsyncSession, event_id: str) -> Optional[AIEvent]:
    result = await session.execute(
        select(AIEvent).where(AIEvent.id == event_id)
    )
    return result.scalar_one_or_none()


async def get_system_event_by_id(session: AsyncSession, event_id: str) -> Optional[SystemEvent]:
    result = await session.execute(
        select(SystemEvent).where(SystemEvent.id == event_id)
    )
    return result.scalar_one_or_none()


async def list_ai_events_for_source(session: AsyncSession, source_id: str) -> List[AIEvent]:
    result = await session.execute(
        select(AIEvent)
        .where(AIEvent.source_id == source_id)
        .order_by(AIEvent.timestamp.asc(), AIEvent.created_at.asc())
    )
    return list(result.scalars().all())


async def list_system_events_for_source(session: AsyncSession, source_id: str) -> List[SystemEvent]:
    result = await session.execute(
        select(SystemEvent)
        .where(SystemEvent.source_id == source_id)
        .order_by(SystemEvent.timestamp.asc(), SystemEvent.created_at.asc())
    )
    return list(result.scalars().all())


async def list_sources_for_project(
    session: AsyncSession,
    project_id: str,
) -> List[IngestionSource]:
    result = await session.execute(
        select(IngestionSource)
        .where(IngestionSource.project_id == project_id)
        .order_by(IngestionSource.created_at.asc())
    )
    return list(result.scalars().all())


async def list_ai_events_for_user(
    session: AsyncSession,
    *,
    user_id: str,
    project_id: str | None = None,
    source_id: str | None = None,
    event_type: str | None = None,
    actor_id: str | None = None,
    start_at=None,
    end_at=None,
    limit: int = 50,
) -> List[AIEvent]:
    query = (
        select(AIEvent)
        .join(IngestionSource, IngestionSource.id == AIEvent.source_id)
        .join(Project, Project.id == AIEvent.project_id)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user_id)
        .options(selectinload(AIEvent.source))
    )

    if project_id is not None:
        query = query.where(AIEvent.project_id == project_id)
    if source_id is not None:
        query = query.where(AIEvent.source_id == source_id)
    if event_type is not None:
        query = query.where(AIEvent.event_type == event_type)
    if actor_id is not None:
        query = query.where(
            or_(
                AIEvent.metadata_json["user_id"].astext == actor_id,
                AIEvent.metadata_json["actor_id"].astext == actor_id,
            )
        )
    if start_at is not None:
        query = query.where(AIEvent.timestamp >= start_at)
    if end_at is not None:
        query = query.where(AIEvent.timestamp <= end_at)

    result = await session.execute(
        query.order_by(AIEvent.timestamp.desc(), AIEvent.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def list_system_events_for_user(
    session: AsyncSession,
    *,
    user_id: str,
    project_id: str | None = None,
    source_id: str | None = None,
    service: str | None = None,
    level: str | None = None,
    event_name: str | None = None,
    actor_id: str | None = None,
    start_at=None,
    end_at=None,
    limit: int = 50,
) -> List[SystemEvent]:
    query = (
        select(SystemEvent)
        .join(IngestionSource, IngestionSource.id == SystemEvent.source_id)
        .join(Project, Project.id == SystemEvent.project_id)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user_id)
        .options(selectinload(SystemEvent.source))
    )

    if project_id is not None:
        query = query.where(SystemEvent.project_id == project_id)
    if source_id is not None:
        query = query.where(SystemEvent.source_id == source_id)
    if service is not None:
        query = query.where(SystemEvent.service == service)
    if level is not None:
        query = query.where(SystemEvent.level == level)
    if event_name is not None:
        query = query.where(SystemEvent.event_name == event_name)
    if actor_id is not None:
        query = query.where(
            or_(
                SystemEvent.metadata_json["user_id"].astext == actor_id,
                SystemEvent.metadata_json["actor_id"].astext == actor_id,
            )
        )
    if start_at is not None:
        query = query.where(SystemEvent.timestamp >= start_at)
    if end_at is not None:
        query = query.where(SystemEvent.timestamp <= end_at)

    result = await session.execute(
        query.order_by(SystemEvent.timestamp.desc(), SystemEvent.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_ai_event_for_user(
    session: AsyncSession,
    *,
    event_id: str,
    user_id: str,
) -> Optional[AIEvent]:
    result = await session.execute(
        select(AIEvent)
        .join(Project, Project.id == AIEvent.project_id)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(AIEvent.id == event_id, OrganizationMembership.user_id == user_id)
        .options(selectinload(AIEvent.source))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_system_event_for_user(
    session: AsyncSession,
    *,
    event_id: str,
    user_id: str,
) -> Optional[SystemEvent]:
    result = await session.execute(
        select(SystemEvent)
        .join(Project, Project.id == SystemEvent.project_id)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(SystemEvent.id == event_id, OrganizationMembership.user_id == user_id)
        .options(selectinload(SystemEvent.source))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def count_ai_events_for_project(
    session: AsyncSession,
    *,
    project_id: str,
) -> int:
    result = await session.execute(
        select(func.count()).select_from(AIEvent).where(AIEvent.project_id == project_id)
    )
    return int(result.scalar_one() or 0)


async def count_system_events_for_project(
    session: AsyncSession,
    *,
    project_id: str,
) -> int:
    result = await session.execute(
        select(func.count()).select_from(SystemEvent).where(SystemEvent.project_id == project_id)
    )
    return int(result.scalar_one() or 0)


async def get_latest_ai_event_for_project(
    session: AsyncSession,
    *,
    project_id: str,
) -> Optional[AIEvent]:
    result = await session.execute(
        select(AIEvent)
        .where(AIEvent.project_id == project_id)
        .order_by(AIEvent.timestamp.desc(), AIEvent.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_latest_system_event_for_project(
    session: AsyncSession,
    *,
    project_id: str,
) -> Optional[SystemEvent]:
    result = await session.execute(
        select(SystemEvent)
        .where(SystemEvent.project_id == project_id)
        .order_by(SystemEvent.timestamp.desc(), SystemEvent.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def create_alert(
    session: AsyncSession,
    *,
    project_id: str,
    source_id: str,
    alert_type: str,
    title: str,
    description: str,
    severity: str,
    score: float,
    ai_event_id: str | None = None,
    system_event_id: str | None = None,
    status: str = AlertStatus.OPEN.value,
    metadata_json: dict | None = None,
) -> Alert:
    alert = Alert(
        project_id=project_id,
        source_id=source_id,
        ai_event_id=ai_event_id,
        system_event_id=system_event_id,
        alert_type=alert_type,
        title=title,
        description=description,
        severity=severity,
        status=status,
        score=score,
        metadata_json=metadata_json or {},
    )
    session.add(alert)
    await session.commit()
    await session.refresh(alert)
    return alert


async def list_alerts_for_user(
    session: AsyncSession,
    *,
    user_id: str,
    project_id: str | None = None,
    source_id: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> List[Alert]:
    query = (
        select(Alert)
        .join(Project, Project.id == Alert.project_id)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user_id)
        .options(
            selectinload(Alert.source),
            selectinload(Alert.ai_event),
            selectinload(Alert.system_event),
        )
    )

    if project_id is not None:
        query = query.where(Alert.project_id == project_id)
    if source_id is not None:
        query = query.where(Alert.source_id == source_id)
    if severity is not None:
        query = query.where(Alert.severity == severity)
    if status is not None:
        query = query.where(Alert.status == status)

    result = await session.execute(
        query.order_by(Alert.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_alert_for_user(
    session: AsyncSession,
    *,
    alert_id: str,
    user_id: str,
) -> Optional[Alert]:
    result = await session.execute(
        select(Alert)
        .join(Project, Project.id == Alert.project_id)
        .join(Organization, Organization.id == Project.organization_id)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(Alert.id == alert_id, OrganizationMembership.user_id == user_id)
        .options(
            selectinload(Alert.source),
            selectinload(Alert.ai_event),
            selectinload(Alert.system_event),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


async def update_alert_status(
    session: AsyncSession,
    *,
    alert: Alert,
    status: str,
) -> Alert:
    alert.status = status
    await session.commit()
    await session.refresh(alert)
    return alert


async def count_alerts_for_project(
    session: AsyncSession,
    *,
    project_id: str,
    status: str | None = None,
    severity: str | None = None,
) -> int:
    query = select(func.count()).select_from(Alert).where(Alert.project_id == project_id)
    if status is not None:
        query = query.where(Alert.status == status)
    if severity is not None:
        query = query.where(Alert.severity == severity)

    result = await session.execute(query)
    return int(result.scalar_one() or 0)


async def count_recent_ai_events_for_source(
    session: AsyncSession,
    *,
    source_id: str,
    since,
    actor_id: str | None = None,
    confidence_below: float | None = None,
) -> int:
    query = select(func.count()).select_from(AIEvent).where(
        AIEvent.source_id == source_id,
        AIEvent.timestamp >= since,
    )

    if actor_id is not None:
        query = query.where(
            or_(
                AIEvent.metadata_json["user_id"].astext == actor_id,
                AIEvent.metadata_json["actor_id"].astext == actor_id,
            )
        )

    if confidence_below is not None:
        query = query.where(AIEvent.confidence_score.is_not(None), AIEvent.confidence_score < confidence_below)

    result = await session.execute(query)
    return int(result.scalar_one() or 0)


async def count_recent_ai_events_with_prompt_terms(
    session: AsyncSession,
    *,
    source_id: str,
    since,
    terms: list[str],
) -> int:
    if not terms:
        return 0

    lowered_prompt = func.lower(AIEvent.prompt)
    query = select(func.count()).select_from(AIEvent).where(
        AIEvent.source_id == source_id,
        AIEvent.timestamp >= since,
        AIEvent.prompt.is_not(None),
        or_(*[lowered_prompt.contains(term) for term in terms]),
    )

    result = await session.execute(query)
    return int(result.scalar_one() or 0)


async def count_recent_system_events_for_source(
    session: AsyncSession,
    *,
    source_id: str,
    since,
    service: str | None = None,
    level: str | None = None,
    event_name: str | None = None,
    actor_id: str | None = None,
    ip: str | None = None,
) -> int:
    query = select(func.count()).select_from(SystemEvent).where(
        SystemEvent.source_id == source_id,
        SystemEvent.timestamp >= since,
    )

    if service is not None:
        query = query.where(SystemEvent.service == service)
    if level is not None:
        query = query.where(SystemEvent.level == level)
    if event_name is not None:
        query = query.where(SystemEvent.event_name == event_name)
    if actor_id is not None:
        query = query.where(
            or_(
                SystemEvent.metadata_json["user_id"].astext == actor_id,
                SystemEvent.metadata_json["actor_id"].astext == actor_id,
            )
        )
    if ip is not None:
        query = query.where(SystemEvent.metadata_json["ip"].astext == ip)

    result = await session.execute(query)
    return int(result.scalar_one() or 0)


async def create_chat_session(
    session: AsyncSession,
    user_id: str,
    title: str = "New Chat",
    project_id: str | None = None,
    context_json: dict | None = None,
) -> ChatSession:
    chat_session = ChatSession(
        user_id=user_id,
        project_id=project_id,
        title=title,
        context_json=context_json or {},
    )
    session.add(chat_session)
    await session.commit()
    await session.refresh(chat_session)
    return chat_session


async def list_chat_sessions_for_user(session: AsyncSession, user_id: str) -> List[ChatSession]:
    result = await session.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
    )
    return list(result.scalars().all())


async def get_chat_session_for_user(
    session: AsyncSession,
    session_id: str,
    user_id: str,
) -> Optional[ChatSession]:
    result = await session.execute(
        select(ChatSession)
        .where(ChatSession.id == session_id, ChatSession.user_id == user_id)
        .options(selectinload(ChatSession.messages))
    )
    return result.scalar_one_or_none()


async def create_message(
    session: AsyncSession,
    session_id: str,
    role: MessageRole,
    content: str,
) -> Message:
    message = Message(session_id=session_id, role=role.value, content=content)
    session.add(message)
    await session.commit()
    await session.refresh(message)
    return message


async def list_messages_for_session(session: AsyncSession, session_id: str) -> List[Message]:
    result = await session.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.timestamp.asc())
    )
    return list(result.scalars().all())


async def update_chat_session_title(
    session: AsyncSession,
    chat_session: ChatSession,
    title: str,
) -> ChatSession:
    chat_session.title = title
    await session.commit()
    await session.refresh(chat_session)
    return chat_session
