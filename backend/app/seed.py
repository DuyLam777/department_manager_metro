from sqlalchemy.orm import Session

from app.domain.app_settings import AppSettings
from app.domain.department import Department
from app.domain.sub_department import SubDepartment
from app.domain.user import User
from app.domain.user_sub_department import UserSubDepartment
from app.service.auth_service import hash_password

# Plain text passwords for development reference (only for admin users)
# In production, these would be set via secure methods
SEED_PASSWORDS = {
    "admin": "Admin@1234",
    "giamdoc": "GiamDoc@123",
    "giamkythuat": "GiamKyThuat@123",
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

    # Placeholder department: holds unassigned users (via a placeholder sub-department)
    placeholder_dept = Department(
        name=PLACEHOLDER_DEPARTMENT_NAME,
        description="Giữ người dùng chưa được phân công bộ phận (không có Phòng)",
        is_placeholder=True,
        deleted=False,
    )
    db.add(placeholder_dept)
    db.flush()

    # Create placeholder sub-department for unassigned users
    placeholder_sub = SubDepartment(
        name="Chưa phân công",
        description="Phòng giữ người dùng chưa được phân công",
        department_id=placeholder_dept.id,
        is_placeholder=True,
    )
    db.add(placeholder_sub)
    db.flush()

    # =============================================
    # 3 DEPARTMENTS WITH 1-2 SUB-DEPARTMENTS EACH
    # =============================================

    # Department 1: Kỹ thuật (2 sub-departments)
    engineering = Department(
        name="Kỹ thuật",
        description="Phòng Kỹ thuật và Phát triển sản phẩm",
        location="Tầng 3",
        is_placeholder=False,
    )

    # Department 2: Nhân sự (2 sub-departments)
    hr = Department(
        name="Nhân sự",
        description="Phòng Nhân sự và Hành chính",
        location="Tầng 2",
        is_placeholder=False,
    )

    # Department 3: Kinh doanh (1 sub-department)
    business = Department(
        name="Kinh doanh",
        description="Phòng Kinh doanh và Marketing",
        location="Tầng 1",
        is_placeholder=False,
    )

    db.add_all([engineering, hr, business])
    db.flush()

    # =============================================
    # SUB-DEPARTMENTS
    # =============================================

    # Engineering sub-departments
    backend = SubDepartment(
        name="Phát triển Backend",
        description="Phát triển hệ thống server và API",
        location="Tầng 3 - Phòng 301",
        department_id=engineering.id,
    )
    frontend = SubDepartment(
        name="Phát triển Frontend",
        description="Phát triển giao diện người dùng",
        location="Tầng 3 - Phòng 302",
        department_id=engineering.id,
    )

    # HR sub-departments
    recruitment = SubDepartment(
        name="Tuyển dụng",
        description="Tuyển dụng và thu hút nhân tài",
        location="Tầng 2 - Phòng 201",
        department_id=hr.id,
    )
    training = SubDepartment(
        name="Đào tạo",
        description="Đào tạo và phát triển nhân viên",
        location="Tầng 2 - Phòng 202",
        department_id=hr.id,
    )

    # Business sub-department
    sales = SubDepartment(
        name="Bán hàng",
        description="Bán hàng trực tiếp và chăm sóc khách hàng",
        location="Tầng 1 - Phòng 101",
        department_id=business.id,
    )

    db.add_all([backend, frontend, recruitment, training, sales])
    db.flush()

    # Helper to generate avatar URL
    def avatar_url(name: str, bg: str = "4f46e5") -> str:
        return f"https://ui-avatars.com/api/?name={name}&background={bg}&color=fff&size=128"

    # =============================================
    # USERS DATA
    # =============================================

    users_data = [
        # =============================================
        # C-SUITE EXECUTIVES (in multiple sub-departments)
        # =============================================
        # 1. Tổng Giám đốc (CEO) - admin, oversees all departments
        {
            "user": User(
                username="admin",
                email="ceo@congty.vn",
                first_name="Minh",
                last_name="Nguyễn Văn",
                password_hash=hash_password(SEED_PASSWORDS["admin"]),
                profile_img=avatar_url("Nguyen+Minh", "dc2626"),
                is_admin=True,
            ),
            "assignments": [
                {"sub_department": backend, "position": "Tổng Giám đốc (CEO)"},
                {"sub_department": recruitment, "position": "Tổng Giám đốc (CEO)"},
                {"sub_department": sales, "position": "Tổng Giám đốc (CEO)"},
            ],
        },
        # 2. Giám đốc Kỹ thuật (CTO) - oversees both Backend and Frontend
        {
            "user": User(
                username="giamkythuat",
                email="cto@congty.vn",
                first_name="Hùng",
                last_name="Trần Quốc",
                password_hash=hash_password(SEED_PASSWORDS["giamkythuat"]),
                profile_img=avatar_url("Tran+Hung", "059669"),
                is_admin=True,
            ),
            "assignments": [
                {"sub_department": backend, "position": "Giám đốc Kỹ thuật (CTO)"},
                {"sub_department": frontend, "position": "Giám đốc Kỹ thuật (CTO)"},
            ],
        },
        # 3. Giám đốc Nhân sự (CHRO) - oversees Recruitment and Training
        {
            "user": User(
                username="giamdoc",
                email="chro@congty.vn",
                first_name="Lan",
                last_name="Lê Thị",
                password_hash=hash_password(SEED_PASSWORDS["giamdoc"]),
                profile_img=avatar_url("Le+Lan", "7c3aed"),
                is_admin=True,
            ),
            "assignments": [
                {"sub_department": recruitment, "position": "Giám đốc Nhân sự (CHRO)"},
                {"sub_department": training, "position": "Giám đốc Nhân sự (CHRO)"},
            ],
        },
        # =============================================
        # BACKEND TEAM (4 regular users)
        # =============================================
        {
            "user": User(
                username=None,
                email="long.tran@congty.vn",
                first_name="Long",
                last_name="Trần Hoàng",
                password_hash=None,
                profile_img=avatar_url("Tran+Long", "6366f1"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": backend, "position": "Kỹ sư Backend"},
            ],
        },
        {
            "user": User(
                username=None,
                email="nam.vo@congty.vn",
                first_name="Nam",
                last_name="Võ Thành",
                password_hash=None,
                profile_img=avatar_url("Vo+Nam", "0d9488"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": backend, "position": "Kỹ sư Backend"},
            ],
        },
        {
            "user": User(
                username=None,
                email="khanh.do@congty.vn",
                first_name="Khánh",
                last_name="Đỗ Quang",
                password_hash=None,
                profile_img=avatar_url("Do+Khanh", "1e40af"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": backend, "position": "Lập trình viên Backend"},
            ],
        },
        # =============================================
        # FRONTEND TEAM (4 regular users)
        # =============================================
        {
            "user": User(
                username=None,
                email="hoa.nguyen@congty.vn",
                first_name="Hoa",
                last_name="Nguyễn Thị",
                password_hash=None,
                profile_img=avatar_url("Nguyen+Hoa", "be185d"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": frontend, "position": "Trưởng nhóm Frontend"},
            ],
        },
        {
            "user": User(
                username=None,
                email="linh.le@congty.vn",
                first_name="Linh",
                last_name="Lê Thùy",
                password_hash=None,
                profile_img=avatar_url("Le+Linh", "9d174d"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": frontend, "position": "Kỹ sư Frontend"},
            ],
        },
        {
            "user": User(
                username=None,
                email="mai.tran@congty.vn",
                first_name="Mai",
                last_name="Trần Ngọc",
                password_hash=None,
                profile_img=avatar_url("Tran+Mai", "b4532e"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": frontend, "position": "Thiết kế UI/UX"},
            ],
        },
        {
            "user": User(
                username=None,
                email="thu.pham@congty.vn",
                first_name="Thu",
                last_name="Phạm Minh",
                password_hash=None,
                profile_img=avatar_url("Pham+Thu", "7c3aed"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": frontend, "position": "Lập trình viên Frontend"},
            ],
        },
        # =============================================
        # RECRUITMENT TEAM (4 regular users)
        # =============================================
        {
            "user": User(
                username=None,
                email="hanh.nguyen@congty.vn",
                first_name="Hạnh",
                last_name="Nguyễn Thị",
                password_hash=None,
                profile_img=avatar_url("Nguyen+Hanh", "059669"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": recruitment, "position": "Trưởng nhóm Tuyển dụng"},
            ],
        },
        {
            "user": User(
                username=None,
                email="nga.le@congty.vn",
                first_name="Nga",
                last_name="Lê Thị",
                password_hash=None,
                profile_img=avatar_url("Le+Nga", "d97706"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": recruitment, "position": "Chuyên viên Tuyển dụng"},
            ],
        },
        {
            "user": User(
                username=None,
                email="yen.tran@congty.vn",
                first_name="Yến",
                last_name="Trần Hải",
                password_hash=None,
                profile_img=avatar_url("Tran+Yen", "0f766e"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": recruitment, "position": "Chuyên viên Tuyển dụng"},
            ],
        },
        {
            "user": User(
                username=None,
                email="trang.vo@congty.vn",
                first_name="Trang",
                last_name="Võ Thị",
                password_hash=None,
                profile_img=avatar_url("Vo+Trang", "be185d"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": recruitment, "position": "Nhân viên Tuyển dụng"},
            ],
        },
        # =============================================
        # TRAINING TEAM (4 regular users)
        # =============================================
        {
            "user": User(
                username=None,
                email="tuan.pham@congty.vn",
                first_name="Tuấn",
                last_name="Phạm Anh",
                password_hash=None,
                profile_img=avatar_url("Pham+Tuan", "4f46e5"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": training, "position": "Trưởng nhóm Đào tạo"},
            ],
        },
        {
            "user": User(
                username=None,
                email="huong.nguyen@congty.vn",
                first_name="Hương",
                last_name="Nguyễn Thu",
                password_hash=None,
                profile_img=avatar_url("Nguyen+Huong", "9d174d"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": training, "position": "Giảng viên nội bộ"},
            ],
        },
        {
            "user": User(
                username=None,
                email="quan.le@congty.vn",
                first_name="Quân",
                last_name="Lê Minh",
                password_hash=None,
                profile_img=avatar_url("Le+Quan", "b4532e"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": training, "position": "Chuyên viên Đào tạo"},
            ],
        },
        {
            "user": User(
                username=None,
                email="thao.nguyen@congty.vn",
                first_name="Thảo",
                last_name="Nguyễn Phương",
                password_hash=None,
                profile_img=avatar_url("Nguyen+Thao", "0d9488"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": training, "position": "Nhân viên Đào tạo"},
            ],
        },
        # =============================================
        # SALES TEAM (5 regular users)
        # =============================================
        {
            "user": User(
                username=None,
                email="son.nguyen@congty.vn",
                first_name="Sơn",
                last_name="Nguyễn Hữu",
                password_hash=None,
                profile_img=avatar_url("Nguyen+Son", "d97706"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": sales, "position": "Trưởng phòng Kinh doanh"},
            ],
        },
        {
            "user": User(
                username=None,
                email="binh.tran@congty.vn",
                first_name="Bình",
                last_name="Trần Quốc",
                password_hash=None,
                profile_img=avatar_url("Tran+Binh", "c2410c"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": sales, "position": "Trưởng nhóm Bán hàng"},
            ],
        },
        {
            "user": User(
                username=None,
                email="hong.vo@congty.vn",
                first_name="Hồng",
                last_name="Võ Thị",
                password_hash=None,
                profile_img=avatar_url("Vo+Hong", "be185d"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": sales, "position": "Nhân viên Kinh doanh"},
            ],
        },
        {
            "user": User(
                username=None,
                email="duy.pham@congty.vn",
                first_name="Duy",
                last_name="Phạm Hoàng",
                password_hash=None,
                profile_img=avatar_url("Pham+Duy", "7c3aed"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": sales, "position": "Nhân viên Kinh doanh"},
            ],
        },
        {
            "user": User(
                username=None,
                email="phuong.le@congty.vn",
                first_name="Phương",
                last_name="Lê Thị",
                password_hash=None,
                profile_img=avatar_url("Le+Phuong", "059669"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": sales, "position": "Nhân viên Kinh doanh"},
            ],
        },
        # =============================================
        # UNASSIGNED USERS (in placeholder sub-department)
        # =============================================
        {
            "user": User(
                username=None,
                email="an.nguyen@congty.vn",
                first_name="An",
                last_name="Nguyễn Văn",
                password_hash=None,
                profile_img=avatar_url("Nguyen+An", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="cuong.tran@congty.vn",
                first_name="Cường",
                last_name="Trần Mạnh",
                password_hash=None,
                profile_img=avatar_url("Tran+Cuong", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="mai.pham@congty.vn",
                first_name="Mai",
                last_name="Phạm Thị",
                password_hash=None,
                profile_img=avatar_url("Pham+Mai", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="tuan.le@congty.vn",
                first_name="Tuấn",
                last_name="Lê Anh",
                password_hash=None,
                profile_img=avatar_url("Le+Tuan", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="hanh.vo@congty.vn",
                first_name="Hạnh",
                last_name="Võ Thị",
                password_hash=None,
                profile_img=avatar_url("Vo+Hanh", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="son.nguyen2@congty.vn",
                first_name="Sơn",
                last_name="Nguyễn Quang",
                password_hash=None,
                profile_img=avatar_url("Nguyen+Son", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="mai.pham@congty.vn",
                first_name="Mai",
                last_name="Phạm Thị",
                password_hash=None,
                profile_img=avatar_url("Pham+Mai", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="tuan.le@congty.vn",
                first_name="Tuấn",
                last_name="Lê Anh",
                password_hash=None,
                profile_img=avatar_url("Le+Tuan", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="hanh.vo@congty.vn",
                first_name="Hạnh",
                last_name="Võ Thị",
                password_hash=None,
                profile_img=avatar_url("Vo+Hanh", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="son.nguyen2@congty.vn",
                first_name="Sơn",
                last_name="Nguyễn Quang",
                password_hash=None,
                profile_img=avatar_url("Nguyen+Son", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
    ]

    # Create users and their sub-department assignments
    for user_data in users_data:
        user = user_data["user"]
        db.add(user)
        db.flush()  # Get user ID

        for assignment_data in user_data["assignments"]:
            assignment = UserSubDepartment(
                user_id=user.id,
                sub_department_id=assignment_data["sub_department"].id,
                position=assignment_data["position"],
            )
            db.add(assignment)

    db.commit()
    print("=" * 60)
    print("SEEDED DATA SUMMARY")
    print("=" * 60)
    print("\nDepartments (3):")
    print("  1. Kỹ thuật (Tầng 3)")
    print("  2. Nhân sự (Tầng 2)")
    print("  3. Kinh doanh (Tầng 1)")
    print("\nSub-departments (5):")
    print("  - Kỹ thuật: Phát triển Backend, Phát triển Frontend")
    print("  - Nhân sự: Tuyển dụng, Đào tạo")
    print("  - Kinh doanh: Bán hàng")
    print("\nUsers (28 total):")
    print("  - 3 C-suite admins (in multiple sub-departments)")
    print("  - 20 regular users (4-5 per sub-department)")
    print("  - 5 unassigned users")
    print("\nC-Suite Executives (in multiple sub-departments):")
    print("  1. Nguyễn Văn Minh - Tổng Giám đốc (CEO)")
    print("     → Backend, Tuyển dụng, Bán hàng")
    print("  2. Trần Quốc Hùng - Giám đốc Kỹ thuật (CTO)")
    print("     → Backend, Frontend")
    print("  3. Lê Thị Lan - Giám đốc Nhân sự (CHRO)")
    print("     → Tuyển dụng, Đào tạo")
    print("\nAdmin credentials:")
    print("  - username: admin, password: Admin@1234 (CEO)")
    print("  - username: giamkythuat, password: GiamKyThuat@123 (CTO)")
    print("  - username: giamdoc, password: GiamDoc@123 (CHRO)")
    print("=" * 60)
