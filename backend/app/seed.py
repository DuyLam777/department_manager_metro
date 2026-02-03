from sqlalchemy.orm import Session

from app.domain.app_settings import AppSettings
from app.domain.department import Department
from app.domain.sub_department import SubDepartment
from app.domain.user import User
from app.service.auth_service import hash_password

# Plain text passwords for development reference
# In production, these would be set via secure methods
SEED_PASSWORDS = {
    "admin": "Admin@1234",
    "alice": "alice123",
    "bob": "bob123",
    "carol": "carol123",
    "dave": "dave123",
    "eve": "eve123",
    "frank": "frank123",
    "grace": "grace123",
    "henry": "henry123",
    "ivy": "ivy123",
    "jack": "jack123",
    "kate": "kate123",
    "leo": "leo123",
    "mia": "mia123",
    "nina": "nina123",
    "oscar": "oscar123",
    "quinn": "quinn123",
    "ryan": "ryan123",
    "sara": "sara123",
}


PLACEHOLDER_DEPARTMENT_NAME = "Chưa phân công"


def seed_data(db: Session):
    """Seed initial data if database is empty."""
    existing = db.query(Department).first()
    if existing:
        return

    # Seed default app settings with a placeholder logo
    settings = db.query(AppSettings).filter(AppSettings.id == 1).first()
    if not settings:
        settings = AppSettings(
            id=1,
            app_title="Phần mềm quản lý nhân sự",
            app_logo_img="https://ui-avatars.com/api/?name=QL&background=4f46e5&color=fff&size=128&bold=true",
        )
        db.add(settings)
        db.flush()

    # Placeholder department (no sub-departments): holds unassigned users
    placeholder_dept = Department(
        name=PLACEHOLDER_DEPARTMENT_NAME,
        description="Giữ người dùng chưa được phân công bộ phận (không có ban)",
        is_placeholder=True,
        deleted=False,
    )
    db.add(placeholder_dept)
    db.flush()

    # Seed actual departments
    engineering = Department(
        name="Kỹ thuật",
        description="Đội phát triển phần mềm",
        location="Tầng 3",
        is_placeholder=False,
    )
    hr = Department(
        name="Nhân sự",
        description="Đội nhân sự",
        location="Tầng 2",
        is_placeholder=False,
    )
    sales = Department(
        name="Bán hàng",
        description="Đội bán hàng và tiếp thị",
        location="Tầng 1",
        is_placeholder=False,
    )

    db.add_all([engineering, hr, sales])
    db.flush()  # Get IDs before creating sub_departments and users

    # Seed sub-departments
    backend = SubDepartment(
        name="Phát triển Backend",
        description="Phát triển phía server / backend",
        location="Tầng 3 - Phòng 301",
        department_id=engineering.id,
    )
    frontend = SubDepartment(
        name="Phát triển Frontend",
        description="Phát triển giao diện / frontend",
        location="Tầng 3 - Phòng 302",
        department_id=engineering.id,
    )
    recruitment = SubDepartment(
        name="Tuyển dụng",
        description="Đội tuyển dụng",
        location="Tầng 2 - Phòng 201",
        department_id=hr.id,
    )

    db.add_all([backend, frontend, recruitment])
    db.flush()

    # Helper to generate avatar URL
    def avatar_url(name: str, bg: str = "4f46e5") -> str:
        return f"https://ui-avatars.com/api/?name={name}&background={bg}&color=fff&size=128"

    # Seed users: spread across departments and sub_departments
    users = [
        # Engineering (direct)
        User(
            username="admin",
            email="admin@example.com",
            first_name="System",
            last_name="Admin",
            password_hash=hash_password(SEED_PASSWORDS["admin"]),
            profile_img=avatar_url("System+Admin", "dc2626"),
            position="Giám đốc hệ thống",
            is_admin=True,
            department_id=engineering.id,
            sub_department_id=None,
        ),
        User(
            username="dave",
            email="dave@example.com",
            first_name="Dave",
            last_name="Brown",
            password_hash=hash_password(SEED_PASSWORDS["dave"]),
            profile_img=avatar_url("Dave+Brown", "6366f1"),
            position="Kỹ sư phần mềm",
            is_admin=False,
            department_id=engineering.id,
            sub_department_id=None,
        ),
        # Engineering > Backend
        User(
            username="alice",
            email="alice@example.com",
            first_name="Alice",
            last_name="Johnson",
            password_hash=hash_password(SEED_PASSWORDS["alice"]),
            profile_img=avatar_url("Alice+Johnson", "4f46e5"),
            position="Lập trình viên Backend",
            is_admin=False,
            department_id=None,
            sub_department_id=backend.id,
        ),
        User(
            username="frank",
            email="frank@example.com",
            first_name="Frank",
            last_name="Miller",
            password_hash=hash_password(SEED_PASSWORDS["frank"]),
            profile_img=avatar_url("Frank+Miller", "7c3aed"),
            position="Lập trình viên Backend",
            is_admin=False,
            department_id=None,
            sub_department_id=backend.id,
        ),
        User(
            username="henry",
            email="henry@example.com",
            first_name="Henry",
            last_name="Davis",
            password_hash=hash_password(SEED_PASSWORDS["henry"]),
            profile_img=avatar_url("Henry+Davis", "0d9488"),
            position="Kỹ sư Backend",
            is_admin=False,
            department_id=None,
            sub_department_id=backend.id,
        ),
        User(
            username="jack",
            email="jack@example.com",
            first_name="Jack",
            last_name="Wilson",
            password_hash=hash_password(SEED_PASSWORDS["jack"]),
            profile_img=avatar_url("Jack+Wilson", "4f46e5"),
            position="Kỹ sư Backend",
            is_admin=False,
            department_id=None,
            sub_department_id=backend.id,
        ),
        # Engineering > Frontend
        User(
            username="eve",
            email="eve@example.com",
            first_name="Eve",
            last_name="Martinez",
            password_hash=hash_password(SEED_PASSWORDS["eve"]),
            profile_img=avatar_url("Eve+Martinez", "be185d"),
            position="Lập trình viên Frontend",
            is_admin=False,
            department_id=None,
            sub_department_id=frontend.id,
        ),
        User(
            username="grace",
            email="grace@example.com",
            first_name="Grace",
            last_name="Lee",
            password_hash=hash_password(SEED_PASSWORDS["grace"]),
            profile_img=avatar_url("Grace+Lee", "059669"),
            position="Kỹ sư Frontend",
            is_admin=False,
            department_id=None,
            sub_department_id=frontend.id,
        ),
        User(
            username="ivy",
            email="ivy@example.com",
            first_name="Ivy",
            last_name="Taylor",
            password_hash=hash_password(SEED_PASSWORDS["ivy"]),
            profile_img=avatar_url("Ivy+Taylor", "b4532e"),
            position="Thiết kế giao diện",
            is_admin=False,
            department_id=None,
            sub_department_id=frontend.id,
        ),
        User(
            username="kate",
            email="kate@example.com",
            first_name="Kate",
            last_name="Anderson",
            password_hash=hash_password(SEED_PASSWORDS["kate"]),
            profile_img=avatar_url("Kate+Anderson", "7c3aed"),
            position="Front-end Engineer",
            is_admin=False,
            department_id=None,
            sub_department_id=frontend.id,
        ),
        # HR (direct)
        User(
            username="bob",
            email="bob@example.com",
            first_name="Bob",
            last_name="Smith",
            password_hash=hash_password(SEED_PASSWORDS["bob"]),
            profile_img=avatar_url("Bob+Smith", "059669"),
            position="Chuyên viên Nhân sự",
            is_admin=False,
            department_id=hr.id,
            sub_department_id=None,
        ),
        User(
            username="leo",
            email="leo@example.com",
            first_name="Leo",
            last_name="Thomas",
            password_hash=hash_password(SEED_PASSWORDS["leo"]),
            profile_img=avatar_url("Leo+Thomas", "1e40af"),
            position="Tư vấn Nhân sự",
            is_admin=False,
            department_id=hr.id,
            sub_department_id=None,
        ),
        # HR > Recruitment
        User(
            username="mia",
            email="mia@example.com",
            first_name="Mia",
            last_name="Jackson",
            password_hash=hash_password(SEED_PASSWORDS["mia"]),
            profile_img=avatar_url("Mia+Jackson", "9d174d"),
            position="Chuyên viên Tuyển dụng",
            is_admin=False,
            department_id=None,
            sub_department_id=recruitment.id,
        ),
        User(
            username="nina",
            email="nina@example.com",
            first_name="Nina",
            last_name="White",
            password_hash=hash_password(SEED_PASSWORDS["nina"]),
            profile_img=avatar_url("Nina+White", "0f766e"),
            position="Nhân viên Tuyển dụng",
            is_admin=False,
            department_id=None,
            sub_department_id=recruitment.id,
        ),
        # Sales
        User(
            username="carol",
            email="carol@example.com",
            first_name="Carol",
            last_name="Williams",
            password_hash=hash_password(SEED_PASSWORDS["carol"]),
            profile_img=avatar_url("Carol+Williams", "d97706"),
            position="Nhân viên Kinh doanh",
            is_admin=False,
            department_id=sales.id,
            sub_department_id=None,
        ),
        User(
            username="oscar",
            email="oscar@example.com",
            first_name="Oscar",
            last_name="Harris",
            password_hash=hash_password(SEED_PASSWORDS["oscar"]),
            profile_img=avatar_url("Oscar+Harris", "c2410c"),
            position="Account Executive",
            is_admin=False,
            department_id=sales.id,
            sub_department_id=None,
        ),
        # Unassigned users (for testing: users without department/sub-department)
        User(
            username="quinn",
            email="quinn@example.com",
            first_name="Quinn",
            last_name="Clark",
            password_hash=hash_password(SEED_PASSWORDS["quinn"]),
            profile_img=avatar_url("Quinn+Clark", "7c3aed"),
            position=None,
            is_admin=False,
            department_id=placeholder_dept.id,
            sub_department_id=None,
        ),
        User(
            username="ryan",
            email="ryan@example.com",
            first_name="Ryan",
            last_name="Lewis",
            password_hash=hash_password(SEED_PASSWORDS["ryan"]),
            profile_img=avatar_url("Ryan+Lewis", "0d9488"),
            position=None,
            is_admin=False,
            department_id=placeholder_dept.id,
            sub_department_id=None,
        ),
        User(
            username="sara",
            email="sara@example.com",
            first_name="Sara",
            last_name="Young",
            password_hash=hash_password(SEED_PASSWORDS["sara"]),
            profile_img=avatar_url("Sara+Young", "b4532e"),
            position=None,
            is_admin=False,
            department_id=placeholder_dept.id,
            sub_department_id=None,
        ),
    ]

    db.add_all(users)
    db.commit()
    print("Seeded departments: Engineering, HR, Sales")
    print("Seeded sub-departments: Backend, Frontend (Engineering); Recruitment (HR)")
    print("Seeded users: 19 total (16 in departments + 3 unassigned)")
