from sqlalchemy.orm import Session

from app.domain.department import Department
from app.domain.user import User
from app.service.auth_service import hash_password


# Plain text passwords for development reference
# In production, these would be set via secure methods
SEED_PASSWORDS = {
    "admin": "Admin@1234",
    "alice": "alice123",
    "bob": "bob123",
    "carol": "carol123",
}


def seed_data(db: Session):
    """Seed initial data if database is empty."""
    existing = db.query(Department).first()
    if existing:
        return

    # Seed departments
    engineering = Department(name="Engineering", description="Software development team")
    hr = Department(name="HR", description="Human resources team")
    sales = Department(name="Sales", description="Sales and marketing team")

    db.add_all([engineering, hr, sales])
    db.flush()  # Get IDs before creating users

    # Helper to generate avatar URL
    def avatar_url(name: str, bg: str = "4f46e5") -> str:
        return f"https://ui-avatars.com/api/?name={name}&background={bg}&color=fff&size=128"

    # Seed users with department assignments (passwords are hashed)
    users = [
        User(
            username="admin",
            email="admin@example.com",
            first_name="System",
            last_name="Admin",
            password_hash=hash_password(SEED_PASSWORDS["admin"]),
            profile_img=avatar_url("System+Admin", "dc2626"),
            is_admin=True,
            department_id=engineering.id,
        ),
        User(
            username="alice",
            email="alice@example.com",
            first_name="Alice",
            last_name="Johnson",
            password_hash=hash_password(SEED_PASSWORDS["alice"]),
            profile_img=avatar_url("Alice+Johnson", "4f46e5"),
            is_admin=False,
            department_id=engineering.id,
        ),
        User(
            username="bob",
            email="bob@example.com",
            first_name="Bob",
            last_name="Smith",
            password_hash=hash_password(SEED_PASSWORDS["bob"]),
            profile_img=avatar_url("Bob+Smith", "059669"),
            is_admin=False,
            department_id=hr.id,
        ),
        User(
            username="carol",
            email="carol@example.com",
            first_name="Carol",
            last_name="Williams",
            password_hash=hash_password(SEED_PASSWORDS["carol"]),
            profile_img=avatar_url("Carol+Williams", "d97706"),
            is_admin=False,
            department_id=sales.id,
        ),
    ]

    db.add_all(users)
    db.commit()
    print("Seeded departments: Engineering, HR, Sales")
    print("Seeded users: admin (Admin@1234), alice, bob, carol")
