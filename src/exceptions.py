class EasyBookException(Exception):
    status_code = 500
    code = "internal_error"
    detail = "Неожиданная ошибка"

    def __init__(self, detail: str | None = None):
        self.detail = detail or self.detail
        super().__init__(self.detail)


class ObjectNotFoundException(EasyBookException):
    status_code = 404
    code = "object_not_found"
    detail = "Объект не найден"


class HotelNotFoundException(ObjectNotFoundException):
    code = "hotel_not_found"
    detail = "Отель не найден"


class RoomNotFoundException(ObjectNotFoundException):
    code = "room_not_found"
    detail = "Номер не найден"


class BookingNotFoundException(ObjectNotFoundException):
    code = "booking_not_found"
    detail = "Бронирование не найдено"


class FacilityNotFoundException(ObjectNotFoundException):
    code = "facility_not_found"
    detail = "Одно или несколько удобств не найдены"


class ImageNotFoundException(ObjectNotFoundException):
    code = "image_not_found"
    detail = "Изображение не найдено"


class ReviewNotFoundException(ObjectNotFoundException):
    code = "review_not_found"
    detail = "Отзыв не найден"


class ObjectAlreadyExistException(EasyBookException):
    status_code = 409
    code = "object_already_exists"
    detail = "Объект уже существует"


class ObjectIntegrityException(EasyBookException):
    status_code = 409
    code = "integrity_conflict"
    detail = "Операция нарушает целостность данных"


class DateValuesException(EasyBookException):
    status_code = 400
    code = "invalid_date_range"
    detail = "Невалидный диапазон дат"


class AllRoomsAreBookedException(EasyBookException):
    status_code = 409
    code = "room_unavailable"
    detail = "На выбранные даты не осталось свободных номеров"


class ReviewAlreadyExistsException(ObjectAlreadyExistException):
    code = "review_already_exists"
    detail = "Для этого бронирования уже существует отзыв"


class ReviewNotAllowedException(EasyBookException):
    status_code = 409
    code = "review_not_allowed"
    detail = "Отзыв можно оставить только после завершения подтверждённого бронирования"


class BookingHasReviewException(EasyBookException):
    status_code = 409
    code = "booking_has_review"
    detail = "Нельзя отменить бронирование, для которого оставлен отзыв"


class BookingCancellationClosedException(EasyBookException):
    status_code = 409
    code = "booking_cancellation_closed"
    detail = "Бронирование можно отменить только до даты заезда"


class UserAlreadyExistsException(ObjectAlreadyExistException):
    code = "user_already_exists"
    detail = "Пользователь уже существует"


class LoginFailedException(EasyBookException):
    status_code = 401
    code = "login_failed"
    detail = "Неверный логин или пароль"


class IncorrectTokenException(EasyBookException):
    status_code = 401
    code = "invalid_token"
    detail = "Некорректный или истёкший токен"


class AuthenticationRequiredException(IncorrectTokenException):
    code = "authentication_required"
    detail = "Необходима авторизация"


class ForbiddenException(EasyBookException):
    status_code = 403
    code = "forbidden"
    detail = "Недостаточно прав для выполнения операции"


class ImageValidationException(EasyBookException):
    status_code = 422
    code = "invalid_image"
    detail = "Файл не является допустимым изображением JPEG, PNG или WebP"


class ImageTooLargeException(EasyBookException):
    status_code = 413
    code = "image_too_large"
    detail = "Размер изображения превышает 5 МБ"
