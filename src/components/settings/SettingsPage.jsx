import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import useWsConnected from "../../hooks/useWsConnected";
import { persistTheme, readStoredThemeId } from "../../lib/theme";
import { resolveThemeId, THEMES } from "../../themes/registry";
import { useAuth } from "../AuthGate";
import StatusBar from "../StatusBar";
import AccountSettings from "./AccountSettings";
import DataSettings from "./DataSettings";
import UsersSettings from "./UsersSettings";
import "./settings.css";

const SECTIONS = [
  { id: "appearance", label: "Appearance", to: "/settings" },
  { id: "account", label: "Account", to: "/settings/account" },
  { id: "users", label: "Users", to: "/settings/users", admin: true },
  { id: "data", label: "Data", to: "/settings/data" },
];

function AppearanceSettings() {
  const [themeId, setThemeId] = useState(() => resolveThemeId(readStoredThemeId()));

  const onThemeChange = (event) => {
    setThemeId(persistTheme(event.target.value));
  };

  return (
    <>
      <h1 className="settings-page__title">Appearance</h1>
      <section className="settings-page__section" aria-labelledby="settings-theme">
        <h2 id="settings-theme" className="settings-page__section-title">
          Theme
        </h2>
        <label className="settings-page__field">
          <span>Theme</span>
          <select value={themeId} onChange={onThemeChange}>
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
        <p className="settings-page__hint">
          Copy <code>src/themes/dark-forge</code> and register it in{" "}
          <code>src/themes/index.js</code>. The choice is saved in this browser.
        </p>
      </section>
    </>
  );
}

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const connected = useWsConnected();
  const me = useAuth();
  const { pathname } = useLocation();
  const dataPage = pathname === "/settings/data" || pathname === "/settings/data/";
  const accountPage = pathname === "/settings/account" || pathname === "/settings/account/";
  const usersPage = pathname === "/settings/users" || pathname === "/settings/users/";
  const sections = SECTIONS.filter((section) => !section.admin || me?.is_admin);

  return (
    <div className="flex flex-col h-full min-h-0">
      <StatusBar connected={connected} />
      <div className="settings-page">
        <nav className="settings-page__nav" aria-label="Settings">
          {sections.map((section) => (
            <NavLink
              key={section.id}
              to={section.to}
              end
              className={({ isActive }) =>
                isActive ? "settings-page__nav-item is-active" : "settings-page__nav-item"
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <div className="settings-page__content">
          {usersPage ? (
            <UsersSettings />
          ) : accountPage ? (
            <AccountSettings />
          ) : dataPage ? (
            <DataSettings />
          ) : (
            <AppearanceSettings />
          )}
        </div>
      </div>
    </div>
  );
}
