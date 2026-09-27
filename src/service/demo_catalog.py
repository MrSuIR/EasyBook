from dataclasses import dataclass

from src.service.demo_photos import read_demo_photos


@dataclass(frozen=True)
class DemoDestination:
    title: str
    country: str
    hotels_count: int

    @property
    def location(self) -> str:
        return f"{self.title}, {self.country}"


@dataclass(frozen=True)
class DemoHotelSource:
    title: str
    location: str
    image_path: str
    image_source_url: str
    image_page_url: str
    image_author: str
    image_license: str
    image_license_url: str = ""


DEMO_DESTINATIONS = (
    DemoDestination("Москва", "Россия", 30),
    DemoDestination("Санкт-Петербург", "Россия", 24),
    DemoDestination("Сочи", "Россия", 18),
    DemoDestination("Байкал", "Россия", 10),
    DemoDestination("Казань", "Россия", 16),
    DemoDestination("Калининград", "Россия", 12),
    DemoDestination("Мальдивы", "Мальдивы", 20),
    DemoDestination("Стамбул", "Турция", 26),
)

REAL_HOTEL_NAMES: dict[str, tuple[str, ...]] = {
    "Москва": (
        "Гостиница Метрополь", "Лотте Отель Москва", "Арарат Парк Хаятт Москва",
        "Отель Балчуг Кемпински Москва", "Отель Националь", "Swissôtel Красные Холмы",
        "Radisson Collection Hotel, Moscow", "Radisson Blu Олимпийский", "Москва Марриотт Империал Плаза",
        "Отель Савой Москва", "Mercure Арбат Москва", "Mercure Москва Бауманская",
        "Mercure Москва Павелецкая", "Novotel Москва Сити", "Novotel Москва Центр",
        "Novotel Москва Шереметьево", "ibis Москва Центр Бахрушина", "ibis Москва Павелецкая",
        "Cosmos Moscow Paveletskaya Hotel", "Cosmos Moscow VDNH Hotel", "AZIMUT Сити Отель Смоленская Москва",
        "AZIMUT Сити Отель Олимпик Москва", "AZIMUT Сити Отель Тульская Москва",
        "AZIMUT Сити Отель Комсити Москва", "AZIMUT Отель Аэростар Москва", "Palmira Business Club",
        "Holiday Inn Moscow Sokolniki", "Holiday Inn Moscow Tagansky", "DoubleTree by Hilton Moscow Marina",
        "Hotel Moscow Krasnoselskaya",
    ),
    "Санкт-Петербург": (
        "Гранд Отель Европа", "Гостиница Астория", "Отель Англетер", "Corinthia Санкт-Петербург",
        "Лотте Отель Санкт-Петербург", "Domina St. Petersburg", "Отель Wawelberg", "Гостиница Гельвеция",
        "Radisson Royal Hotel, St. Petersburg", "Radisson Sonya Hotel", "Park Inn by Radisson Прибалтийская",
        "Park Inn by Radisson Пулковская", "Cosmos Saint-Petersburg Pulkovskaya Hotel", "Novotel Санкт-Петербург Центр",
        "ibis Санкт-Петербург Центр", "AZIMUT Сити Отель Санкт-Петербург", "Гостиница Москва",
        "Гостиница Санкт-Петербург", "Гранд Отель Эмеральд", "Petro Palace Hotel", "SO/ Санкт-Петербург",
        "Rossi Boutique Hotel", "Taleon Imperial Hotel", "Theatre Square Hotel",
    ),
    "Сочи": (
        "Swissôtel Resort Сочи Камелия", "Pullman Сочи Центр", "Grand Karat Sochi", "Radisson Collection Paradise Resort & Spa",
        "Radisson Blu Resort & Congress Centre", "Rixos Красная Поляна Сочи", "Novotel Resort Красная Поляна Сочи",
        "Marriott Красная Поляна", "Courtyard by Marriott Сочи Красная Поляна", "Panorama By Mercure",
        "Mercure Роза Хутор", "Golden Tulip Роза Хутор", "Green Flow Роза Хутор", "Mövenpick Красная Поляна",
        "Hyatt Regency Sochi", "Sea Galaxy Hotel Congress & Spa", "Zvezdny Wellness & SPA", "Cosmos Sochi Hotel",
    ),
    "Байкал": (
        "Байкал Терра", "Baikal Village", "Байкальская Ривьера", "Загородный отель Байкал",
        "Усадьба Набаймар", "Байкальское шале", "Парк-отель Сагаан Морин", "Байкал Плаза",
        "Baikal Wood Hotel", "Эко-отель Тотем",
    ),
    "Казань": (
        "Крутушка", "AZIMUT Отель Бауман Казань", "Ramada by Wyndham Kazan City Centre", "Ногай",
        "Гранд Отель Казань", "Отель Казан Султан", "Отель Джузеппе", "Арт Отель Казань",
        "Cosmos Kazan Hotel", "Отель Каганат", "DoubleTree by Hilton Kazan City Center", "Courtyard by Marriott Kazan Kremlin",
        "Luciano Residence Kazan", "Hayall Hotel", "Отель Мираж", "Отель Ривьера",
    ),
    "Калининград": (
        "Crystal House Suite Hotel & SPA", "Отель Навигатор", "Отель Турист", "Radisson Blu Hotel, Kaliningrad",
        "Отель Королева Луиза", "ibis Калининград Центр", "Mercure Калининград Центр", "Парк-отель Маяковский",
        "Отель Балтика", "Гостиница Дона", "HARTMAN Hotel", "Friday Center",
    ),
    "Мальдивы": (
        "Soneva Fushi", "Soneva Jani", "Gili Lankanfushi Maldives", "Baros Maldives", "W Maldives",
        "Four Seasons Resort Maldives at Landaa Giraavaru", "Four Seasons Resort Maldives at Kuda Huraa",
        "Anantara Kihavah Maldives Villas", "Anantara Dhigu Maldives Resort", "Conrad Maldives Rangali Island",
        "The St. Regis Maldives Vommuli Resort", "The Ritz-Carlton Maldives, Fari Islands", "Patina Maldives, Fari Islands",
        "Cheval Blanc Randheli", "JOALI Maldives", "JOALI BEING", "Velaa Private Island Maldives",
        "One&Only Reethi Rah", "Waldorf Astoria Maldives Ithaafushi", "Park Hyatt Maldives Hadahaa",
    ),
    "Стамбул": (
        "Çırağan Palace Kempinski Istanbul", "Four Seasons Hotel Istanbul at Sultanahmet", "Four Seasons Hotel Istanbul at the Bosphorus",
        "The Peninsula Istanbul", "Raffles Istanbul", "Mandarin Oriental Bosphorus, Istanbul", "Shangri-La Bosphorus, Istanbul",
        "Swissôtel The Bosphorus, Istanbul", "Hilton Istanbul Bosphorus", "Conrad Istanbul Bosphorus", "The Ritz-Carlton, Istanbul",
        "Park Hyatt Istanbul - Maçka Palas", "Fairmont Quasar Istanbul", "The St. Regis Istanbul", "W Istanbul",
        "CVK Park Bosphorus Hotel Istanbul", "Radisson Blu Hotel, Istanbul Pera", "Pera Palace Hotel", "Hotel Sultania",
        "Sura Hagia Sophia Hotel", "Hagia Sofia Mansions Istanbul", "AJWA Sultanahmet", "Legacy Ottoman Hotel",
        "The Marmara Taksim", "Grand Hyatt Istanbul", "InterContinental Istanbul",
    ),
}

LEGACY_PLACEHOLDER_NAME_PARTS = (
    "Гранд", "Панорама", "Резиденция", "Тихая гавань", "Белые ночи",
    "Золотой берег", "Северный ветер", "Лазурный", "Городской сад", "Маяк",
)
LEGACY_PLACEHOLDER_HOTEL_TITLES = tuple(
    f"{name_part} — {destination.title} {number:02d}"
    for destination in DEMO_DESTINATIONS
    for number in range(1, destination.hotels_count + 1)
    for name_part in (LEGACY_PLACEHOLDER_NAME_PARTS[(number - 1) % len(LEGACY_PLACEHOLDER_NAME_PARTS)],)
)


def demo_hotels_count() -> int:
    return sum(destination.hotels_count for destination in DEMO_DESTINATIONS)


class DemoCatalogProvider:
    """Deterministic catalog using photographs stored with the static images."""

    async def load(self) -> tuple[DemoHotelSource, ...]:
        photos = read_demo_photos()
        return tuple(
            DemoHotelSource(
                title=REAL_HOTEL_NAMES[destination.title][number - 1],
                location=destination.location,
                image_path=f"demo/{photos[index]['file']}",
                image_source_url=photos[index]["url"],
                image_page_url=photos[index]["source_page"],
                image_author=photos[index]["author"],
                image_license=photos[index]["license"],
                image_license_url=photos[index]["license_url"],
            )
            for index, (destination, number) in enumerate(
                (destination, number)
                for destination in DEMO_DESTINATIONS
                for number in range(1, destination.hotels_count + 1)
            )
        )
