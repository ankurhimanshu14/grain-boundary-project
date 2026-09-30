from pathlib import Path

from cqi9.analysis import T_MAX, T_MIN, Params, analyse, load_scada

F = Path(__file__).parent.parent / "sample_data" / "furnace4_2026-09-29.xlsx"


def _r():
    df, m = load_scada(F)
    return analyse(df, m, Params())


def test_load():
    df, m = load_scada(F)
    assert len(df) == 1422 and "Mass Wire" in m["company"]


def test_offline_and_fault_detected():
    r = _r()
    assert r.in_service == [1, 2, 3, 4, 6]
    assert r.verdict == "NON-CONFORMING"
    assert r.main_sp == 940 and len(r.gaps) == 1


def test_no_invalid_values_remain():
    r = _r()
    for n in r.in_service:
        s = r.df[f"PV-{n}"].dropna()
        assert s.between(T_MIN, T_MAX).all()
