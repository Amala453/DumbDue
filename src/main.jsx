import {
  StrictMode,
  useEffect,
  useState,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import "./index.css";

import App from "./App.jsx";
import Auth from "./Auth.jsx";
import Landing from "./Landing.jsx";

import { supabase } from "./lib/supabase";

function Root() {
  const [
    session,
    setSession,
  ] = useState(undefined);

  const [
    path,
    setPath,
  ] = useState(
    window.location.pathname
  );

  useEffect(() => {
    function handleNavigation() {
      setPath(
        window.location.pathname
      );
    }

    window.addEventListener(
      "popstate",
      handleNavigation
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handleNavigation
      );
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data,
        error,
      } =
        await supabase.auth.getSession();

      if (error) {
        console.error(
          "Failed to load Supabase session:",
          error
        );

        if (mounted) {
          setSession(null);
        }

        return;
      }

      if (mounted) {
        setSession(
          data.session
        );
      }
    }

    loadSession();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          currentSession
        ) => {
          console.log(
            "Supabase auth event:",
            event
          );

          setSession(
            currentSession
          );
        }
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  /*
    Supabase is checking the current session.
  */

  if (session === undefined) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background:
            "#f8f4f1",
          color:
            "#302725",
          fontFamily:
            "Inter, system-ui, sans-serif",
          fontSize: "16px",
        }}
      >
        Loading DumbDue...
      </div>
    );
  }

  /*
    Logged-in users always go directly
    to the application.
  */

  if (session) {
    return <App />;
  }

  /*
    Public pages for logged-out visitors.
  */

  if (
    path === "/login"
  ) {
    return <Auth />;
  }

  if (
    path === "/signup"
  ) {
    return (
      <Auth />
    );
  }

  /*
    Everything else opens the landing page.
  */

  return (
    <Landing />
  );
}

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <StrictMode>
    <Root />
  </StrictMode>
);