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

import { supabase } from "./lib/supabase";

function Root() {
  const [
    session,
    setSession,
  ] = useState(undefined);

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

  /* -------------------------------------------------------
     Loading
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     Not logged in
  ------------------------------------------------------- */

  if (!session) {
    return <Auth />;
  }

  /* -------------------------------------------------------
     Logged in
  ------------------------------------------------------- */

  return <App />;
}

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <Root />
  </StrictMode>
);