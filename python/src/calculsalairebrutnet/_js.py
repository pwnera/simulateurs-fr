"""Équivalents Python des comportements JavaScript dont dépendent les résultats du moteur TypeScript."""
from decimal import ROUND_HALF_UP, Decimal
import math


def js_round(x: float) -> float:
    """Math.round : arrondi à l'entier le plus proche, les .5 vers +∞ (round() de Python arrondit au pair)."""
    return float(math.floor(x + 0.5))


def fr_number(x: float, max_fraction_digits: int = 3) -> str:
    """Number.prototype.toLocaleString("fr-FR", { maximumFractionDigits }) : espace fine insécable, virgule."""
    d = Decimal(repr(float(x))).quantize(Decimal(1).scaleb(-max_fraction_digits), rounding=ROUND_HALF_UP)
    sign = "-" if d < 0 else ""
    entier, _, frac = f"{abs(d):f}".partition(".")
    frac = frac.rstrip("0")
    groupes = []
    while len(entier) > 3:
        groupes.insert(0, entier[-3:])
        entier = entier[:-3]
    groupes.insert(0, entier)
    out = " ".join(groupes)
    return sign + out + ("," + frac if frac else "")


def js_str(x) -> str:
    """String(nombre) / `${nombre}` : 2.0 → "2", 1.5 → "1.5" (str() de Python écrirait "2.0")."""
    if isinstance(x, float):
        if math.isnan(x):
            return "NaN"
        if math.isinf(x):
            return "Infinity" if x > 0 else "-Infinity"
        if x.is_integer() and abs(x) < 1e21:
            return str(int(x))
    return str(x)


def js_sum(values, start=0):
    """array.reduce((s, x) => s + x, start) : addition naïve de gauche à droite (sum() compense les arrondis depuis Python 3.12)."""
    total = start
    for v in values:
        total = total + v
    return total
