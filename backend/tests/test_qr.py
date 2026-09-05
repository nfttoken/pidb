from app.services.qr import create_short_code


def test_short_code_is_uppercase_and_fixed_length() -> None:
    short_code = create_short_code()

    assert len(short_code) == 6
    assert short_code.isalnum()
    assert short_code == short_code.upper()

