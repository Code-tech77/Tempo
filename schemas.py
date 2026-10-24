"""Locked data contracts for Tempo's scenario-aware scheduling API.

These models are the single source of truth shared by the FastAPI endpoint,
Gemini structured output, deterministic validation, scheduler wrapper, and
React client. Do not duplicate them in ``main.py`` or change field names
without coordinating the backend, validator, and frontend at the same time.
"""

from datetime import datetime
from enum import Enum
import re
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


LOCAL_DATETIME_PATTERN = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$"
LOCAL_TIME_PATTERN = r"^(?:[01]\d|2[0-3]):[0-5]\d$"
UTC_SLOT_PATTERN = r"^(?:\d{4}-\d{2}-\d{2}T)?(?:[01]\d|2[0-3]):(?:00|30)Z$"


class LockedModel(BaseModel):
    """Base configuration for all public and LLM-facing contracts."""

    model_config = ConfigDict(
        extra="forbid",
        frozen=True,
        str_strip_whitespace=True,
        use_enum_values=True,
    )


class ApplianceType(str, Enum):
    EV_CHARGER = "ev_charger"
    DISHWASHER = "dishwasher"
    WASHING_MACHINE = "washing_machine"


class RiskAppetite(str, Enum):
    SAFE = "safe"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"


class ResponseStatus(str, Enum):
    SUCCESS = "success"
    NEEDS_CLARIFICATION = "needs_clarification"
    IMPOSSIBLE_CONSTRAINT = "impossible_constraint"


class EvidenceQuotes(LockedModel):
    """Literal substrings supporting each deadline interpretation."""

    earliest: str = Field(..., min_length=1, max_length=500)
    expected: str = Field(..., min_length=1, max_length=500)
    latest: str = Field(..., min_length=1, max_length=500)


class ScheduleExtractionSchema(LockedModel):
    """Exact structured-output schema returned by Gemini.

    Times are naive Europe/London wall-clock values at this boundary. Only
    deterministic application code may resolve them to timezone-aware UTC.
    Partial values are permitted only when Gemini explicitly requests
    clarification.
    """

    appliance: Optional[ApplianceType] = None
    required_kwh: Optional[float] = Field(default=None, gt=0.0, le=200.0)
    run_duration_hours: Optional[float] = Field(default=None, gt=0.0, le=24.0)
    is_contiguous: Optional[bool] = None
    earliest_local_deadline: Optional[str] = Field(
        default=None,
        pattern=LOCAL_DATETIME_PATTERN,
        description="Europe/London wall-clock value in YYYY-MM-DDTHH:MM format.",
    )
    expected_local_deadline: Optional[str] = Field(
        default=None,
        pattern=LOCAL_DATETIME_PATTERN,
        description="Europe/London wall-clock value in YYYY-MM-DDTHH:MM format.",
    )
    latest_local_deadline: Optional[str] = Field(
        default=None,
        pattern=LOCAL_DATETIME_PATTERN,
        description="Europe/London wall-clock value in YYYY-MM-DDTHH:MM format.",
    )
    quiet_hours_start: Optional[str] = Field(default=None, pattern=LOCAL_TIME_PATTERN)
    quiet_hours_end: Optional[str] = Field(default=None, pattern=LOCAL_TIME_PATTERN)
    evidence_quotes: Optional[EvidenceQuotes] = None
    needs_clarification: bool

    @field_validator(
        "earliest_local_deadline",
        "expected_local_deadline",
        "latest_local_deadline",
    )
    @classmethod
    def validate_local_calendar_value(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            datetime.strptime(value, "%Y-%m-%dT%H:%M")
        return value

    @model_validator(mode="after")
    def validate_extraction_completeness(self):
        quiet_pair = (self.quiet_hours_start, self.quiet_hours_end)
        if (quiet_pair[0] is None) != (quiet_pair[1] is None):
            raise ValueError("quiet_hours_start and quiet_hours_end must be provided together")

        if self.needs_clarification:
            return self

        required_fields = {
            "appliance": self.appliance,
            "is_contiguous": self.is_contiguous,
            "earliest_local_deadline": self.earliest_local_deadline,
            "expected_local_deadline": self.expected_local_deadline,
            "latest_local_deadline": self.latest_local_deadline,
            "evidence_quotes": self.evidence_quotes,
        }
        missing = [name for name, value in required_fields.items() if value is None]
        if missing:
            raise ValueError(
                "complete extraction required when needs_clarification is false; "
                f"missing: {', '.join(missing)}"
            )

        energy_fields = (self.required_kwh, self.run_duration_hours)
        if sum(value is not None for value in energy_fields) != 1:
            raise ValueError("provide exactly one of required_kwh or run_duration_hours")
        return self


class ParseAndScheduleRequest(LockedModel):
    """POST /api/parse-and-schedule request body."""

    user_prompt: str = Field(..., min_length=3, max_length=4000)
    current_time_iso: datetime
    carbon_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    risk_appetite: RiskAppetite = RiskAppetite.BALANCED

    @field_validator("current_time_iso")
    @classmethod
    def require_aware_utc_time(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("current_time_iso must include a UTC timezone offset")
        if value.utcoffset().total_seconds() != 0:
            raise ValueError("current_time_iso must be expressed in UTC")
        return value


class ParsedConstraints(LockedModel):
    appliance: str = Field(..., min_length=1, max_length=100)
    energy_kwh: float = Field(..., gt=0.0, le=200.0)
    is_contiguous: bool
    earliest_local: str = Field(..., min_length=1, max_length=100)
    expected_local: str = Field(..., min_length=1, max_length=100)
    latest_local: str = Field(..., min_length=1, max_length=100)
    evidence: EvidenceQuotes
    read_back_summary: str = Field(..., min_length=1, max_length=1500)


class ScenarioResult(LockedModel):
    label: str = Field(..., min_length=1, max_length=150)
    deadline_local: str = Field(..., min_length=1, max_length=100)
    deadline_utc: datetime
    estimated_cost_gbp: float = Field(..., ge=0.0)
    savings_vs_now_gbp: float
    wait_probability_pct: float = Field(..., ge=0.0, le=100.0)
    worst_case_loss_pence: float = Field(..., ge=0.0)
    carbon_g_co2: float = Field(..., ge=0.0)
    recommended_slots_utc: List[str] = Field(..., min_length=1, max_length=96)

    @field_validator("deadline_utc")
    @classmethod
    def require_utc_deadline(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("deadline_utc must be timezone-aware")
        if value.utcoffset().total_seconds() != 0:
            raise ValueError("deadline_utc must be expressed in UTC")
        return value

    @field_validator("recommended_slots_utc")
    @classmethod
    def validate_half_hour_slots(cls, values: List[str]) -> List[str]:
        invalid = [value for value in values if re.fullmatch(UTC_SLOT_PATTERN, value) is None]
        if invalid:
            raise ValueError(
                "recommended slots must be UTC half-hours formatted as HH:00Z, "
                "HH:30Z, or an ISO date followed by one of those times"
            )
        return values


class ScenarioComparison(LockedModel):
    earliest_interpretation: ScenarioResult
    expected_interpretation: ScenarioResult
    latest_interpretation: ScenarioResult


class ParseAndScheduleResponse(LockedModel):
    """Stable response envelope for every endpoint outcome."""

    status: ResponseStatus
    needs_clarification: bool
    clarification_message: Optional[str] = Field(default=None, min_length=1, max_length=1500)
    validation_warning: Optional[str] = Field(default=None, min_length=1, max_length=1500)
    parsed_constraints: Optional[ParsedConstraints] = None
    scenarios: Optional[ScenarioComparison] = None
    flexibility_spread_pence: Optional[int] = None

    @model_validator(mode="after")
    def validate_response_state(self):
        if self.status == ResponseStatus.SUCCESS:
            if self.needs_clarification:
                raise ValueError("a success response cannot need clarification")
            if self.clarification_message is not None:
                raise ValueError("a success response cannot include clarification_message")
            if self.parsed_constraints is None or self.scenarios is None:
                raise ValueError("a success response requires parsed_constraints and scenarios")
            if self.flexibility_spread_pence is None:
                raise ValueError("a success response requires flexibility_spread_pence")
            return self

        if not self.needs_clarification:
            raise ValueError("non-success responses must set needs_clarification to true")
        if self.clarification_message is None:
            raise ValueError("non-success responses require clarification_message")
        if self.scenarios is not None or self.flexibility_spread_pence is not None:
            raise ValueError("non-success responses cannot include scenario results")
        return self


# Useful to endpoint implementations that prefer a typed mapping while keeping
# the public JSON object keys exactly as specified in the execution plan.
ScenarioMap = Dict[
    Literal[
        "earliest_interpretation",
        "expected_interpretation",
        "latest_interpretation",
    ],
    ScenarioResult,
]
