from collections.abc import Callable
from datetime import datetime

type Clock = Callable[[], datetime]
