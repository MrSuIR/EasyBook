import { useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BedDouble,
  Building2,
  Database,
  LogOut,
  Users,
} from "lucide-react";

import ThemeToggle from "../theme.jsx";
import AnalyticsPanel from "./admin/AnalyticsPanel.jsx";
import BookingPanel from "./admin/BookingPanel.jsx";
import FacilityPanel from "./admin/FacilityPanel.jsx";
import HotelPanel from "./admin/HotelPanel.jsx";
import OverviewPanel from "./admin/OverviewPanel.jsx";
import UserPanel from "./admin/UserPanel.jsx";

const tabs = [
  ["overview", "Обзор", Activity],
  ["hotels", "Отели и номера", Building2],
  ["facilities", "Удобства", BedDouble],
  ["bookings", "Бронирования", Database],
  ["users", "Пользователи", Users],
  ["analytics", "Аналитика", BarChart3],
];

const panels = {
  overview: OverviewPanel,
  hotels: HotelPanel,
  facilities: FacilityPanel,
  bookings: BookingPanel,
  analytics: AnalyticsPanel,
};

export default function AdminPage({ user, onNavigate, onLogout }) {
  const [tab, setTab] = useState("overview");
  const ActivePanel = tab === "users" ? null : panels[tab];

  return (
    <main className="admin-page">
      <header className="admin-header">
        <button className="brand" type="button" onClick={() => onNavigate("/")}>
          <span>Easy</span>Book.
        </button>
        <div>
          <ThemeToggle />
          <button type="button" onClick={() => onNavigate("/")}>
            <ArrowLeft />
            Каталог
          </button>
          <button type="button" onClick={onLogout}>
            <LogOut />
            Выйти
          </button>
        </div>
      </header>
      <div className="admin-layout">
        <aside>
          <p className="eyebrow">Панель управления</p>
          <div className="admin-identity">
            <span>{user.first_name.charAt(0)}</span>
            <div>
              <strong>
                {user.first_name} {user.last_name}
              </strong>
              <small>{user.email}</small>
            </div>
          </div>
          <nav>
            {tabs.map(([id, label, Icon]) => (
              <button
                className={tab === id ? "active" : ""}
                type="button"
                key={id}
                onClick={() => setTab(id)}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="admin-content">
          {tab === "users" ? <UserPanel currentUser={user} /> : <ActivePanel />}
        </div>
      </div>
    </main>
  );
}
