import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { ApiError, api } from "./api.js";
import SiteHeader from "./components/SiteHeader.jsx";
import { addLocalDays, localDateKey } from "./dateUtils.js";
import AccountPage from "./pages/AccountPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import {
  LoginPage,
  RegisterPage,
  RegistrationSuccessPage,
} from "./pages/AuthPages.jsx";
import BookingFlowPage from "./pages/BookingFlowPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import HotelDetailsPage from "./pages/HotelDetailsPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import { normalizeImageUrl } from "./utils/formatters.js";

function getInitialSearch() {
  const from = addLocalDays(new Date(), 1);
  const defaults = {
    date_from: localDateKey(from),
    date_to: localDateKey(addLocalDays(from, 3)),
  };
  const params = new URLSearchParams(window.location.search);
  return {
    location: params.get("location") || "",
    date_from: params.get("date_from") || defaults.date_from,
    date_to: params.get("date_to") || defaults.date_to,
    sort_by: params.get("sort_by") || "id",
    sort_order: params.get("sort_order") || "asc",
  };
}

function LoadingPage({ className, children }) {
  return (
    <main className={className}>
      <LoaderCircle className="spin" />
      {children}
    </main>
  );
}

export default function App() {
  const [initialSearch] = useState(getInitialSearch);
  const [searchValues, setSearchValues] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [path, setPath] = useState(window.location.pathname);
  const requestId = useRef(0);

  const navigate = (destination) => {
    const url = new URL(destination, window.location.origin);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setPath(url.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
    if (url.hash) {
      window.setTimeout(
        () =>
          document
            .querySelector(url.hash)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        30,
      );
    }
  };

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch((exception) => {
        if (!(exception instanceof ApiError && exception.status === 401))
          setError(exception.message);
      })
      .finally(() => setAuthReady(true));
  }, []);

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  useEffect(() => {
    if (path !== "/") return undefined;
    const id = ++requestId.current;
    const controller = new AbortController();
    api.hotels
      .list(
        {
          page: 1,
          per_page: 9,
          date_from: query.date_from,
          date_to: query.date_to,
          location: query.location || undefined,
          sort_by: query.sort_by,
          sort_order: query.sort_order,
        },
        { signal: controller.signal },
      )
      .then(async (response) => {
        const enriched = await Promise.all(
          response.items.map(async (hotel) => {
            const [rooms, images] = await Promise.all([
              api.rooms.list(
                hotel.id,
                { date_from: query.date_from, date_to: query.date_to },
                { signal: controller.signal },
              ),
              api.images.list(hotel.id, { signal: controller.signal }),
            ]);
            return {
              ...hotel,
              price: rooms.length
                ? Math.min(...rooms.map((room) => room.price))
                : null,
              image: normalizeImageUrl(images[0]),
            };
          }),
        );
        if (id === requestId.current)
          setHotels(enriched.filter((hotel) => hotel.price !== null));
      })
      .catch((exception) => {
        if (exception.name !== "AbortError" && id === requestId.current)
          setError(exception.message);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    return () => controller.abort();
  }, [query, path]);

  useEffect(() => {
    if (
      (path === "/account" || path === "/booking" || path === "/admin") &&
      authReady &&
      !user
    ) {
      const returnTo =
        path === "/booking"
          ? `${window.location.pathname}${window.location.search}`
          : "/account";
      const timer = window.setTimeout(
        () => navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`),
        0,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [authReady, path, user]);

  const submitSearch = (nextQuery) => {
    if (nextQuery.date_to <= nextQuery.date_from) {
      setError("Дата выезда должна быть позже даты заезда.");
      return;
    }
    const params = new URLSearchParams(
      Object.entries(nextQuery).filter(([, value]) => value),
    );
    window.history.pushState({}, "", `/?${params}`);
    setLoading(true);
    setError("");
    setQuery(nextQuery);
    window.setTimeout(
      () =>
        document
          .getElementById("catalog")
          ?.scrollIntoView({ behavior: "smooth" }),
      30,
    );
  };

  const search = (event) => {
    event.preventDefault();
    submitSearch({ ...searchValues });
  };

  const searchDestination = (location) => {
    const nextQuery = { ...searchValues, location };
    setSearchValues(nextQuery);
    submitSearch(nextQuery);
  };

  const logout = async () => {
    await api.auth.logout().catch(() => null);
    setUser(null);
    navigate("/");
  };

  const header = (page = "") => (
    <SiteHeader
      user={user}
      onAuth={() => navigate("/login")}
      onLogout={logout}
      onNavigate={navigate}
      isHome={path === "/"}
      page={page}
    />
  );

  if (path === "/login")
    return <LoginPage onNavigate={navigate} onAuthenticated={setUser} />;
  if (path === "/register") return <RegisterPage onNavigate={navigate} />;
  if (path === "/register/success")
    return <RegistrationSuccessPage onNavigate={navigate} />;
  if (path === "/booking") {
    if (!authReady || !user)
      return (
        <LoadingPage className="checkout-state">
          {authReady ? "Переходим ко входу…" : "Подготавливаем бронирование…"}
        </LoadingPage>
      );
    return <BookingFlowPage user={user} onNavigate={navigate} />;
  }
  if (path === "/account") {
    if (!authReady || !user)
      return (
        <LoadingPage className="account-auth-state">
          {authReady ? "Переходим ко входу…" : "Загружаем личный кабинет…"}
        </LoadingPage>
      );
    return (
      <>
        {header("account")}
        <AccountPage user={user} onNavigate={navigate} onUserUpdate={setUser} />
      </>
    );
  }
  if (path === "/admin") {
    if (!authReady || !user)
      return (
        <LoadingPage className="account-auth-state">
          {authReady ? "Переходим ко входу…" : "Проверяем права…"}
        </LoadingPage>
      );
    if (user.role !== "admin") return <NotFoundPage onNavigate={navigate} />;
    return <AdminPage user={user} onNavigate={navigate} onLogout={logout} />;
  }

  const hotelMatch = path.match(/^\/hotels\/(\d+)$/);
  if (!hotelMatch && path !== "/")
    return <NotFoundPage onNavigate={navigate} />;
  if (hotelMatch) {
    return (
      <>
        {header()}
        <HotelDetailsPage
          hotelId={Number(hotelMatch[1])}
          initialDates={{
            date_from: initialSearch.date_from,
            date_to: initialSearch.date_to,
          }}
          user={user}
          onNavigate={navigate}
        />
      </>
    );
  }

  return (
    <>
      {header()}
      <HomePage
        user={user}
        values={searchValues}
        setValues={setSearchValues}
        query={query}
        hotels={hotels}
        loading={loading}
        error={error}
        onSearch={search}
        onDestination={searchDestination}
        onNavigate={navigate}
      />
    </>
  );
}
