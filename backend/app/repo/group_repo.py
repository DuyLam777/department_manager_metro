from sqlalchemy.orm import Session, joinedload, selectinload

from app.domain.group import Group
from app.domain.sub_department import SubDepartment
from app.domain.user_group import UserGroup


def _group_query_options(q):
    """Apply common eager-load options for group queries."""
    return q.options(
        selectinload(Group.user_assignments).joinedload(UserGroup.user),
        joinedload(Group.sub_department).joinedload(SubDepartment.department),
    )


def get_all_groups(db: Session, include_deleted: bool = False) -> list[Group]:
    q = db.query(Group)
    if not include_deleted:
        q = q.filter(Group.deleted == False)  # noqa: E712
    return _group_query_options(q).all()


def get_groups_by_sub_department_id(
    db: Session, sub_department_id: int, include_deleted: bool = False
) -> list[Group]:
    q = db.query(Group).filter(Group.sub_department_id == sub_department_id)
    if not include_deleted:
        q = q.filter(Group.deleted == False)  # noqa: E712
    return _group_query_options(q).all()


def get_group_by_id(
    db: Session, group_id: int, include_deleted: bool = False
) -> Group | None:
    q = db.query(Group).filter(Group.id == group_id)
    if not include_deleted:
        q = q.filter(Group.deleted == False)  # noqa: E712
    return _group_query_options(q).first()


def get_deleted_groups(db: Session) -> list[Group]:
    q = (
        db.query(Group)
        .filter(Group.deleted == True)  # noqa: E712
        .order_by(Group.deleted_at.desc())
    )
    return _group_query_options(q).all()


def get_groups_for_user(db: Session, user_id: int) -> list[Group]:
    q = (
        db.query(Group)
        .join(UserGroup)
        .filter(UserGroup.user_id == user_id, Group.deleted == False)  # noqa: E712
    )
    return _group_query_options(q).all()
