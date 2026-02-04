from sqlalchemy.orm import Session

from app.domain.app_settings import AppSettings
from app.domain.department import Department
from app.domain.sub_department import SubDepartment
from app.domain.user import User
from app.service.auth_service import hash_password

# Plain text passwords for development reference (only for admin users)
# In production, these would be set via secure methods
SEED_PASSWORDS = {
    "admin": "Admin@1234",
    "truongphong": "TruongPhong@123",
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

    # Seed users with Vietnamese names
    # Only admin users have username and password
    # Regular users don't have login credentials
    users = [
        # ===== ADMIN USERS (have username/password) =====
        # Engineering (direct) - System Admin
        User(
            username="admin",
            email="admin@congty.vn",
            first_name="Minh",
            last_name="Nguyễn Văn",
            password_hash=hash_password(SEED_PASSWORDS["admin"]),
            profile_img=avatar_url("Nguyen+Minh", "dc2626"),
            position="Quản trị hệ thống",
            is_admin=True,
            department_id=engineering.id,
            sub_department_id=None,
        ),
        # HR - Department Head Admin
        User(
            username="truongphong",
            email="truongphong@congty.vn",
            first_name="Lan",
            last_name="Trần Thị",
            password_hash=hash_password(SEED_PASSWORDS["truongphong"]),
            profile_img=avatar_url("Tran+Lan", "059669"),
            position="Trưởng phòng Nhân sự",
            is_admin=True,
            department_id=hr.id,
            sub_department_id=None,
        ),
        # ===== REGULAR USERS (no username/password) =====
        # Engineering (direct)
        User(
            username=None,
            email="hung.le@congty.vn",
            first_name="Hùng",
            last_name="Lê Quốc",
            password_hash=None,
            profile_img=avatar_url("Le+Hung", "6366f1"),
            position="Kỹ sư phần mềm",
            is_admin=False,
            department_id=engineering.id,
            sub_department_id=None,
        ),
        User(
            username=None,
            email="tuan.pham@congty.vn",
            first_name="Tuấn",
            last_name="Phạm Anh",
            password_hash=None,
            profile_img=avatar_url("Pham+Tuan", "4f46e5"),
            position="Kỹ sư trưởng",
            is_admin=False,
            department_id=engineering.id,
            sub_department_id=None,
        ),
        # Engineering > Backend
        User(
            username=None,
            email="duc.nguyen@congty.vn",
            first_name="Đức",
            last_name="Nguyễn Tiến",
            password_hash=None,
            profile_img=avatar_url("Nguyen+Duc", "4f46e5"),
            position="Lập trình viên Backend",
            is_admin=False,
            department_id=None,
            sub_department_id=backend.id,
        ),
        User(
            username=None,
            email="long.tran@congty.vn",
            first_name="Long",
            last_name="Trần Hoàng",
            password_hash=None,
            profile_img=avatar_url("Tran+Long", "7c3aed"),
            position="Lập trình viên Backend",
            is_admin=False,
            department_id=None,
            sub_department_id=backend.id,
        ),
        User(
            username=None,
            email="nam.vo@congty.vn",
            first_name="Nam",
            last_name="Võ Thành",
            password_hash=None,
            profile_img=avatar_url("Vo+Nam", "0d9488"),
            position="Kỹ sư Backend",
            is_admin=False,
            department_id=None,
            sub_department_id=backend.id,
        ),
        User(
            username=None,
            email="khanh.do@congty.vn",
            first_name="Khánh",
            last_name="Đỗ Quang",
            password_hash=None,
            profile_img=avatar_url("Do+Khanh", "4f46e5"),
            position="Kỹ sư Backend",
            is_admin=False,
            department_id=None,
            sub_department_id=backend.id,
        ),
        # Engineering > Frontend
        User(
            username=None,
            email="hoa.nguyen@congty.vn",
            first_name="Hoa",
            last_name="Nguyễn Thị",
            password_hash=None,
            profile_img=avatar_url("Nguyen+Hoa", "be185d"),
            position="Lập trình viên Frontend",
            is_admin=False,
            department_id=None,
            sub_department_id=frontend.id,
        ),
        User(
            username=None,
            email="linh.le@congty.vn",
            first_name="Linh",
            last_name="Lê Thùy",
            password_hash=None,
            profile_img=avatar_url("Le+Linh", "059669"),
            position="Kỹ sư Frontend",
            is_admin=False,
            department_id=None,
            sub_department_id=frontend.id,
        ),
        User(
            username=None,
            email="mai.tran@congty.vn",
            first_name="Mai",
            last_name="Trần Ngọc",
            password_hash=None,
            profile_img=avatar_url("Tran+Mai", "b4532e"),
            position="Thiết kế giao diện",
            is_admin=False,
            department_id=None,
            sub_department_id=frontend.id,
        ),
        User(
            username=None,
            email="thu.pham@congty.vn",
            first_name="Thu",
            last_name="Phạm Minh",
            password_hash=None,
            profile_img=avatar_url("Pham+Thu", "7c3aed"),
            position="Kỹ sư Frontend",
            is_admin=False,
            department_id=None,
            sub_department_id=frontend.id,
        ),
        # HR (direct)
        User(
            username=None,
            email="hanh.nguyen@congty.vn",
            first_name="Hạnh",
            last_name="Nguyễn Thị",
            password_hash=None,
            profile_img=avatar_url("Nguyen+Hanh", "1e40af"),
            position="Chuyên viên Nhân sự",
            is_admin=False,
            department_id=hr.id,
            sub_department_id=None,
        ),
        # HR > Recruitment
        User(
            username=None,
            email="nga.le@congty.vn",
            first_name="Nga",
            last_name="Lê Thị",
            password_hash=None,
            profile_img=avatar_url("Le+Nga", "9d174d"),
            position="Chuyên viên Tuyển dụng",
            is_admin=False,
            department_id=None,
            sub_department_id=recruitment.id,
        ),
        User(
            username=None,
            email="yen.tran@congty.vn",
            first_name="Yến",
            last_name="Trần Hải",
            password_hash=None,
            profile_img=avatar_url("Tran+Yen", "0f766e"),
            position="Nhân viên Tuyển dụng",
            is_admin=False,
            department_id=None,
            sub_department_id=recruitment.id,
        ),
        # Sales
        User(
            username=None,
            email="son.nguyen@congty.vn",
            first_name="Sơn",
            last_name="Nguyễn Hữu",
            password_hash=None,
            profile_img=avatar_url("Nguyen+Son", "d97706"),
            position="Trưởng nhóm Kinh doanh",
            is_admin=False,
            department_id=sales.id,
            sub_department_id=None,
        ),
        User(
            username=None,
            email="binh.tran@congty.vn",
            first_name="Bình",
            last_name="Trần Quốc",
            password_hash=None,
            profile_img=avatar_url("Tran+Binh", "c2410c"),
            position="Nhân viên Kinh doanh",
            is_admin=False,
            department_id=sales.id,
            sub_department_id=None,
        ),
        User(
            username=None,
            email="hong.vo@congty.vn",
            first_name="Hồng",
            last_name="Võ Thị",
            password_hash=None,
            profile_img=avatar_url("Vo+Hong", "be185d"),
            position="Nhân viên Kinh doanh",
            is_admin=False,
            department_id=sales.id,
            sub_department_id=None,
        ),
        # Unassigned users (for testing: users without department/sub-department)
        User(
            username=None,
            email="duy.pham@congty.vn",
            first_name="Duy",
            last_name="Phạm Hoàng",
            password_hash=None,
            profile_img=avatar_url("Pham+Duy", "7c3aed"),
            position=None,
            is_admin=False,
            department_id=placeholder_dept.id,
            sub_department_id=None,
        ),
        User(
            username=None,
            email="thao.nguyen@congty.vn",
            first_name="Thảo",
            last_name="Nguyễn Phương",
            password_hash=None,
            profile_img=avatar_url("Nguyen+Thao", "0d9488"),
            position=None,
            is_admin=False,
            department_id=placeholder_dept.id,
            sub_department_id=None,
        ),
        User(
            username=None,
            email="quan.le@congty.vn",
            first_name="Quân",
            last_name="Lê Minh",
            password_hash=None,
            profile_img=avatar_url("Le+Quan", "b4532e"),
            position=None,
            is_admin=False,
            department_id=placeholder_dept.id,
            sub_department_id=None,
        ),
    ]

    db.add_all(users)
    db.commit()
    print("Seeded departments: Kỹ thuật, Nhân sự, Bán hàng")
    print(
        "Seeded sub-departments: Phát triển Backend, Phát triển Frontend (Kỹ thuật); Tuyển dụng (Nhân sự)"
    )
    print(
        "Seeded users: 21 total (2 admins + 16 regular users in departments + 3 unassigned)"
    )
    print("Admin credentials:")
    print("  - username: admin, password: Admin@1234")
    print("  - username: truongphong, password: TruongPhong@123")
