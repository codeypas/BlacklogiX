from __future__ import annotations

import re
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    AIEvent,
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
) -> IngestionSource:
    source = IngestionSource(
        project_id=project_id,
        type=source_type.value,
        name=name,
        status=status.value,
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


async def create_chat_session(
    session: AsyncSession,
    user_id: str,
    title: str = "New Chat",
) -> ChatSession:
    chat_session = ChatSession(user_id=user_id, title=title)
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
