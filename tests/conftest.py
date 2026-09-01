import os


os.environ.setdefault("MODE", "TEST")
os.environ.setdefault("DB_NAME", "easybook_test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_USER", "postgres")
os.environ.setdefault("DB_PASS", "postgres")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")
