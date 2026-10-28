"""Compare le portage Python au moteur TypeScript sur les cas de fixtures/ (générés par packages/core/scripts/gen-fixtures.mjs)."""
import json
import math
import pathlib
import re

import pytest

import calculsalairebrutnet as m

FIXTURES = pathlib.Path(__file__).resolve().parents[2] / "fixtures"


def snake(name: str) -> str:
    """camelCase → snake_case, la règle de nommage du portage : brutToNet → brut_to_net, caHTAnnuel → ca_ht_annuel."""
    s = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", name)
    s = re.sub(r"([^\W_A-Z])([A-Z])", r"\1_\2", s)
    return s.lower()


def conv(v):
    if isinstance(v, dict):
        return {snake(k): conv(x) for k, x in v.items()}
    if isinstance(v, list):
        return [conv(x) for x in v]
    return v


def check(expected, actual, path):
    if isinstance(expected, dict):
        assert isinstance(actual, dict), f"{path}: dict attendu, {type(actual).__name__} obtenu"
        for k, v in expected.items():
            assert k in actual, f"{path}.{k} manquant"
            check(v, actual[k], f"{path}.{k}")
        extra = [k for k in actual if k not in expected and actual[k] is not None]
        assert not extra, f"{path}: clés en trop {extra}"
    elif isinstance(expected, list):
        assert isinstance(actual, (list, tuple)) and len(actual) == len(expected), f"{path}: liste de {len(expected)} attendue"
        for i, (e, a) in enumerate(zip(expected, actual)):
            check(e, a, f"{path}[{i}]")
    elif expected is None:
        # JSON.stringify écrit null pour null, Infinity et NaN.
        ok = actual is None or (isinstance(actual, float) and (math.isinf(actual) or math.isnan(actual)))
        assert ok, f"{path}: None attendu, {actual!r} obtenu"
    elif isinstance(expected, bool):
        assert actual is expected, f"{path}: {expected!r} attendu, {actual!r} obtenu"
    elif isinstance(expected, (int, float)):
        assert isinstance(actual, (int, float)) and not isinstance(actual, bool), f"{path}: nombre attendu, {actual!r} obtenu"
        assert math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-6), f"{path}: {expected!r} attendu, {actual!r} obtenu"
    else:
        assert actual == expected, f"{path}: {expected!r} attendu, {actual!r} obtenu"


CASES = [
    pytest.param(f.stem, case, id=f"{f.stem}-{i}")
    for f in sorted(FIXTURES.glob("*.json"))
    for i, case in enumerate(json.loads(f.read_text(encoding="utf-8")))
]


@pytest.mark.parametrize("fn,case", CASES)
def test_fixture(fn, case):
    func = getattr(m, snake(fn))
    args = conv(case["args"])
    result = func(**args[0]) if len(args) == 1 and isinstance(args[0], dict) else func(*args)
    check(conv(case["result"]), result, fn)
