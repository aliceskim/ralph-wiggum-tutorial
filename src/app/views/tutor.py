"""Tutor view (route).

Serves the Socratic tutor page. The interactive UI is a React Island mounted
into the `[data-island="tutor"]` element; the backend provides only the HTML
shell.
"""
from flask import Blueprint, render_template

tutor_bp = Blueprint('tutor', __name__)


@tutor_bp.route('/tutor')
def index():  # type: ignore[no-untyped-def]
    """Render the Socratic Tutor page."""
    return render_template('tutor.html')
