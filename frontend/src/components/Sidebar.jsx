import { NavLink } from "react-router-dom";

function Sidebar() {
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: "🏠",
    },
    {
      name: "Scan Waste",
      path: "/scan",
      icon: "📷",
    },
    {
      name: "Waste Map",
      path: "/map",
      icon: "🗺️",
    },
    {
      name: "Environmental Impact",
      path: "/impact",
      icon: "🌱",
    },
    {
      name: "AI Chatbot",
      path: "/chatbot",
      icon: "🤖",
    },
    {
      name: "History",
      path: "/history",
      icon: "🕘",
    },
  ];

  return (
    <aside className="sidebar">

      <div className="logo-section">
        <div className="logo-icon">
          ♻️
        </div>

        <div>
          <h2>EcoSort</h2>
          <span>AI</span>
        </div>
      </div>

      <nav className="sidebar-nav">

        <p className="menu-title">
          MAIN MENU
        </p>

        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? "nav-item active"
                : "nav-item"
            }
          >
            <span className="nav-icon">
              {item.icon}
            </span>

            <span>
              {item.name}
            </span>
          </NavLink>
        ))}

        <p className="menu-title account-title">
          ACCOUNT
        </p>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive
              ? "nav-item active"
              : "nav-item"
          }
        >
          <span className="nav-icon">
            👤
          </span>

          <span>
            Profile
          </span>
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            isActive
              ? "nav-item active"
              : "nav-item"
          }
        >
          <span className="nav-icon">
            ⚙️
          </span>

          <span>
            Settings
          </span>
        </NavLink>

      </nav>

      <div className="sidebar-bottom">

        <div className="eco-tip">

          <span>🌍</span>

          <div>
            <strong>
              Eco Tip
            </strong>

            <p>
              Clean containers before
              putting them in the
              recycling bin.
            </p>
          </div>

        </div>

      </div>

    </aside>
  );
}

export default Sidebar;