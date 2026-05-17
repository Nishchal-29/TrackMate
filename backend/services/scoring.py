from datetime import date
from decimal import Decimal, ROUND_HALF_UP

def compute_score(
    uom_type: str,
    target_value: Decimal | None = None,
    actual_value: Decimal | None = None,
    target_date: date | None = None,
    actual_date: date | None = None,
) -> Decimal | None:
    if uom_type == "numeric":
        if target_value is None or actual_value is None or target_value == 0:
            return None
        ratio = actual_value / target_value
        score = min(ratio, Decimal("1.0")) * Decimal("100")
        return score.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    elif uom_type == "percentage":
        if target_value is None or actual_value is None or target_value == 0:
            return None
        ratio = actual_value / target_value
        score = min(ratio, Decimal("1.0")) * Decimal("100")
        return score.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    elif uom_type == "zero_based":
        if actual_value is None:
            return None
        return Decimal("100.00") if actual_value == 0 else Decimal("0.00")

    elif uom_type == "timeline":
        if target_date is None or actual_date is None:
            return None

        if actual_date <= target_date:
            return Decimal("100.00")

        days_allowed = max((target_date - date(target_date.year, 1, 1)).days, 30)
        days_late = (actual_date - target_date).days
        penalty_ratio = Decimal(str(days_late)) / Decimal(str(days_allowed))
        score = max(Decimal("0"), Decimal("100") - penalty_ratio * Decimal("100"))
        return score.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return None