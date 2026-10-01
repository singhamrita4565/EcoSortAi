import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import ScanWaste from "./pages/ScanWaste";
import Result from "./pages/Result";
import History from "./pages/History";
import WasteMapPage from "./pages/WasteMapPage";
import Impact from "./pages/Impact";
import Chatbot from "./pages/Chatbot";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import Register from "./pages/Register";


function ProtectedRoute({ children }) {
  const user = localStorage.getItem("ecosort_user");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {

  return (

    <Routes>

      {/* DEFAULT */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />


      {/* AUTHENTICATION */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />


      {/* MAIN APPLICATION */}

      <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>

     <Route
  path="/scan"
  element={
    <ProtectedRoute>
      <ScanWaste />
    </ProtectedRoute>
  }
/>

<Route
  path="/result"
  element={
    <ProtectedRoute>
      <Result />
    </ProtectedRoute>
  }
/>

<Route
  path="/history"
  element={
    <ProtectedRoute>
      <History />
    </ProtectedRoute>
  }
/>

<Route
  path="/map"
  element={
    <ProtectedRoute>
      <WasteMapPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/impact"
  element={
    <ProtectedRoute>
      <Impact />
    </ProtectedRoute>
  }
/>

<Route
  path="/chatbot"
  element={
    <ProtectedRoute>
      <Chatbot />
    </ProtectedRoute>
  }
/>

<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>

<Route
  path="/settings"
  element={
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  }
/>

    </Routes>

  );
}


export default App;