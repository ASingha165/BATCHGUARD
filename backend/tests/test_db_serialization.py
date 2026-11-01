"""Unit tests for DynamoDB serialization and deserialization utilities."""

from decimal import Decimal
from backend.common.db import decimal_to_native, native_to_decimal


def test_decimal_to_native_conversion():
    data = {
        "integer_dec": Decimal("100"),
        "float_dec": Decimal("3.14"),
        "nested_list": [Decimal("1"), Decimal("2.5"), "string_val"],
        "nested_dict": {"inner_dec": Decimal("42")},
        "regular_str": "BatchGuard",
    }
    converted = decimal_to_native(data)
    assert converted["integer_dec"] == 100
    assert isinstance(converted["integer_dec"], int)
    assert converted["float_dec"] == 3.14
    assert isinstance(converted["float_dec"], float)
    assert converted["nested_list"] == [1, 2.5, "string_val"]
    assert converted["nested_dict"]["inner_dec"] == 42
    assert converted["regular_str"] == "BatchGuard"


def test_native_to_decimal_conversion():
    data = {
        "float_val": 4.5,
        "nested_floats": [1.1, 2.2],
        "nested_dict": {"inner_float": 99.9},
        "int_val": 10,
    }
    converted = native_to_decimal(data)
    assert isinstance(converted["float_val"], Decimal)
    assert converted["float_val"] == Decimal("4.5")
    assert isinstance(converted["nested_floats"][0], Decimal)
    assert isinstance(converted["nested_dict"]["inner_float"], Decimal)
    assert converted["int_val"] == 10
