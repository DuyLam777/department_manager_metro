import re

with open("app/seed.py", "r", encoding="utf-8") as f:
    content = f.read()

# ── 1. Add Group and UserGroup imports ───────────────────────────────────────
if "from app.domain.group import Group" not in content:
    content = content.replace(
        "from app.domain.department import Department",
        "from app.domain.department import Department\nfrom app.domain.group import Group",
    )
if "from app.domain.user_group import UserGroup" not in content:
    content = content.replace(
        "from app.domain.user import User",
        "from app.domain.user import User\nfrom app.domain.user_group import UserGroup",
    )

# ── 2. Fix duplicate unassigned users ────────────────────────────────────────
# The seed has mai.pham, tuan.le, hanh.vo, son.nguyen2 each listed twice.
# We replace the SECOND occurrence of each email with a unique user.
replacements = [
    (
        """\
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

    # Create users and their sub-department assignments""",
        """\
        {
            "user": User(
                username=None,
                email="bao.nguyen@congty.vn",
                first_name="Bảo",
                last_name="Nguyễn Thanh",
                password_hash=None,
                profile_img=avatar_url("Nguyen+Bao", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="diep.tran@congty.vn",
                first_name="Điệp",
                last_name="Trần Thị",
                password_hash=None,
                profile_img=avatar_url("Tran+Diep", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="khoa.le@congty.vn",
                first_name="Khoa",
                last_name="Lê Minh",
                password_hash=None,
                profile_img=avatar_url("Le+Khoa", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
        {
            "user": User(
                username=None,
                email="nhi.pham@congty.vn",
                first_name="Nhi",
                last_name="Phạm Thị",
                password_hash=None,
                profile_img=avatar_url("Pham+Nhi", "6b7280"),
                is_admin=False,
            ),
            "assignments": [
                {"sub_department": placeholder_sub, "position": None},
            ],
        },
    ]

    # Create users and their sub-department assignments""",
    ),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new, 1)
        print("Duplicate block replaced OK")
    else:
        print("WARNING: duplicate block not found — may already be patched")

# ── 3. Add group seeding after the main db.commit() ──────────────────────────
group_seed_block = """
    # =============================================
    # SEED GROUPS
    # =============================================
    user_by_email = {
        u.email: u for u in db.query(User).filter(User.deleted == False).all()
    }

    groups_data = [
        {
            "group": Group(
                name="Tổ API & Services",
                description="Phát triển và duy trì hệ thống API nội bộ",
                sub_department_id=backend.id,
            ),
            "member_emails": [
                "long.tran@congty.vn",
                "nam.vo@congty.vn",
                "khanh.do@congty.vn",
            ],
        },
        {
            "group": Group(
                name="Tổ DevOps & Hạ tầng",
                description="Vận hành hệ thống và hạ tầng kỹ thuật",
                sub_department_id=backend.id,
            ),
            "member_emails": [
                "long.tran@congty.vn",
                "nam.vo@congty.vn",
            ],
        },
        {
            "group": Group(
                name="Tổ UI/UX",
                description="Thiết kế giao diện và trải nghiệm người dùng",
                sub_department_id=frontend.id,
            ),
            "member_emails": [
                "linh.le@congty.vn",
                "mai.tran@congty.vn",
                "thu.pham@congty.vn",
            ],
        },
        {
            "group": Group(
                name="Tổ Tuyển dụng nội bộ",
                description="Tuyển dụng nhân sự cho nội bộ công ty",
                sub_department_id=recruitment.id,
            ),
            "member_emails": [
                "hanh.nguyen@congty.vn",
                "nga.le@congty.vn",
                "yen.tran@congty.vn",
            ],
        },
        {
            "group": Group(
                name="Tổ Tuyển dụng thị trường",
                description="Tuyển dụng nhân sự từ thị trường lao động",
                sub_department_id=recruitment.id,
            ),
            "member_emails": [
                "hanh.nguyen@congty.vn",
                "trang.vo@congty.vn",
            ],
        },
        {
            "group": Group(
                name="Tổ Đào tạo kỹ năng mềm",
                description="Đào tạo kỹ năng mềm cho nhân viên",
                sub_department_id=training.id,
            ),
            "member_emails": [
                "tuan.pham@congty.vn",
                "huong.nguyen@congty.vn",
                "quan.le@congty.vn",
            ],
        },
        {
            "group": Group(
                name="Tổ Đào tạo chuyên môn",
                description="Đào tạo chuyên môn nghiệp vụ cho nhân viên",
                sub_department_id=training.id,
            ),
            "member_emails": [
                "tuan.pham@congty.vn",
                "thao.nguyen@congty.vn",
            ],
        },
        {
            "group": Group(
                name="Tổ B2B",
                description="Kinh doanh với khách hàng doanh nghiệp",
                sub_department_id=sales.id,
            ),
            "member_emails": [
                "son.nguyen@congty.vn",
                "binh.tran@congty.vn",
                "hong.vo@congty.vn",
            ],
        },
        {
            "group": Group(
                name="Tổ B2C",
                description="Kinh doanh trực tiếp với khách hàng cá nhân",
                sub_department_id=sales.id,
            ),
            "member_emails": [
                "son.nguyen@congty.vn",
                "duy.pham@congty.vn",
                "phuong.le@congty.vn",
                "hoa.nguyen@congty.vn",
            ],
        },
    ]

    for group_data in groups_data:
        group = group_data["group"]
        db.add(group)
        db.flush()  # Get group ID
        for email in group_data["member_emails"]:
            user = user_by_email.get(email)
            if user:
                db.add(UserGroup(user_id=user.id, group_id=group.id))

    db.commit()
"""

anchor = '    db.commit()\n    print("=" * 60)'
if "groups_data" not in content:
    content = content.replace(anchor, group_seed_block + '    print("=" * 60)', 1)
    print("Group seed block inserted OK")
else:
    print("Group seed block already present — skipping")

with open("app/seed.py", "w", encoding="utf-8") as f:
    f.write(content)

print("seed.py patched successfully")
print("  Group import:", "from app.domain.group import Group" in content)
print("  UserGroup import:", "from app.domain.user_group import UserGroup" in content)
print("  Duplicate fix:", "bao.nguyen@congty.vn" in content)
print("  Group seeding:", "groups_data" in content)
