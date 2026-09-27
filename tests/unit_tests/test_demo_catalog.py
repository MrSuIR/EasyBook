from src.service.demo_catalog import (
    DEMO_DESTINATIONS,
    LEGACY_PLACEHOLDER_HOTEL_TITLES,
    REAL_HOTEL_NAMES,
    demo_hotels_count,
)


def test_destination_list_contains_requested_places_with_varied_hotel_counts():
    titles = {destination.title for destination in DEMO_DESTINATIONS}
    assert len(DEMO_DESTINATIONS) == 8
    assert len(titles) == 8
    assert {
        "Санкт-Петербург", "Москва", "Сочи", "Байкал", "Мальдивы", "Казань", "Калининград", "Стамбул"
    } == titles
    counts = {destination.hotels_count for destination in DEMO_DESTINATIONS}
    assert all(10 <= count <= 30 for count in counts)
    assert len(counts) == len(DEMO_DESTINATIONS)
    assert set(REAL_HOTEL_NAMES) == titles
    assert all(
        len(REAL_HOTEL_NAMES[destination.title]) == destination.hotels_count
        for destination in DEMO_DESTINATIONS
    )
    assert all(len(names) == len(set(names)) for names in REAL_HOTEL_NAMES.values())
    assert len(LEGACY_PLACEHOLDER_HOTEL_TITLES) == demo_hotels_count()
