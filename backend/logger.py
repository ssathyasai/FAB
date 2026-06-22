"""
Structured logging configuration for FAB Finance API
"""
import logging
import sys
from datetime import datetime

# Configure logging format
LOG_FORMAT = "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Create logger
logger = logging.getLogger("fab_finance")
logger.setLevel(logging.INFO)

# Console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
console_handler.setFormatter(formatter)

# Add handler to logger
if not logger.handlers:
    logger.addHandler(console_handler)


def log_user_action(user_id: str, action: str, details: str = ""):
    """Log user actions for audit trail"""
    logger.info(f"[USER_ACTION] user_id={user_id} action={action} details={details}")


def log_security_event(event_type: str, details: str, user_id: str = None):
    """Log security-related events"""
    user_info = f"user_id={user_id}" if user_id else "anonymous"
    logger.warning(f"[SECURITY] {event_type} {user_info} details={details}")


def log_performance(endpoint: str, duration_ms: float, user_id: str = None):
    """Log performance metrics"""
    user_info = f"user_id={user_id}" if user_id else "anonymous"
    logger.info(f"[PERFORMANCE] endpoint={endpoint} duration_ms={duration_ms:.2f} {user_info}")


def log_error(error: Exception, context: str = "", user_id: str = None):
    """Log errors with context"""
    user_info = f"user_id={user_id}" if user_id else "anonymous"
    logger.error(f"[ERROR] {context} {user_info} error={str(error)}", exc_info=True)


def log_database_operation(operation: str, collection: str, user_id: str = None):
    """Log database operations"""
    user_info = f"user_id={user_id}" if user_id else "system"
    logger.debug(f"[DATABASE] operation={operation} collection={collection} {user_info}")
