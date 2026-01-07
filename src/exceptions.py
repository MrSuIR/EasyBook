from fastapi import HTTPException

class EasyBookException(Exception):
    detail = "Неожиданная ошибка"

    def __init__(self, *args, **kwargs):
        super().__init__(self.detail, *args, **kwargs)

class HotelNotFoundException(EasyBookException):
    detail = "Отель не найден"

class RoomNotFoundException(EasyBookException):
    detail = "Номер не найден"

class ObjectNotFoundException(EasyBookException):
    detail = "Объект не найден"

class AllRoomsAreBookedException(EasyBookException):
    detail = "Не осталось свободных номеров"

class ObjectAlreadyExistException(EasyBookException):
    detail = "Объект уже существует"

class ObjectIntegrityException(EasyBookException):
    detail = "Ошибка интеграции"

class DateValuesException(EasyBookException):
    detail = "Невалидная дата"

class UserAlreadyExistsException(EasyBookException):
    detail = "Пользователь уже существует"

class LoginFailedException(EasyBookException):
    detail = "Неверный логин или пароль"

class IncorrectTokenException(EasyBookException):
    detail = "Некорректный токен"


class EasyBookHTTPException(HTTPException):
    status_code = 500
    detail = None

    def __init__(self):
        super().__init__(self.status_code, self.detail)

class HotelNotFoundHTTPException(EasyBookHTTPException):
    status_code = 404
    detail = "Отель не найден"

class RoomNotFoundHTTPException(EasyBookHTTPException):
    status_code = 404
    detail = "Номер не найден"

class UserAlreadyExistsHTTPException(EasyBookHTTPException):
    status_code = 409
    detail = "Пользователь уже существует"

class LoginFailedHTTPException(EasyBookHTTPException):
    status_code = 401
    detail = "Неверный логин или пароль"

class IncorrectTokenHTTPException(EasyBookHTTPException):
    status_code = 401
    detail = "Некорректный токен"

class AllRoomsAreBookedHTTPException(EasyBookHTTPException):
    status_code = 409
    detail = "Не осталось свободных номеров"