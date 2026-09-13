import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bell,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Download,
  Edit3,
  History,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  WalletCards,
  X,
} from "lucide-react";

import "./App.css";

import { supabase } from "./lib/supabase";

import {
  migrateLocalSubscriptions,
  saveAllCloudSubscriptions,
} from "./lib/subscriptionSync";

/* =========================================================
   STORAGE KEYS
========================================================= */

const SUBSCRIPTIONS_KEY =
  "dumbdue-subscriptions";

const BACKUP_KEY =
  "dumbdue-subscriptions-backup";

const THEME_KEY =
  "dumbdue-theme";

const DARK_MODE_KEY =
  "dumbdue-dark-mode";

const REMINDERS_KEY =
  "dumbdue-reminders-enabled";

const REMINDER_DAYS_KEY =
  "dumbdue-reminder-days";

const TRIAL_REMINDERS_KEY =
  "dumbdue-trial-reminders";

/* =========================================================
   CONSTANTS
========================================================= */

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    icon: WalletCards,
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
  {
    id: "history",
    label: "History",
    icon: History,
  },
  {
    id: "insights",
    label: "Insights",
    icon: TrendingUp,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
];

const categories = [
  "Entertainment",
  "Music",
  "Software",
  "Fitness",
  "News",
  "Shopping",
  "Education",
  "Other",
];

const themeOptions = [
  "Rose",
  "Forest",
  "Ocean",
  "Midnight",
  "Minimal",
];

const reminderOptions = [
  1,
  3,
  7,
  14,
];

/* =========================================================
   STORAGE HELPERS
========================================================= */

function readStorageArray(key) {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getTodayISO() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getGreeting() {
  const hour =
    new Date().getHours();

  if (
    hour >= 5 &&
    hour < 12
  ) {
    return "Good morning.";
  }

  if (
    hour >= 12 &&
    hour < 17
  ) {
    return "Good afternoon.";
  }

  if (
    hour >= 17 &&
    hour < 21
  ) {
    return "Good evening.";
  }

  return "Good night.";
}

function formatDate(date) {
  if (!date) {
    return "No date";
  }

  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function daysUntil(date) {
  if (!date) {
    return 0;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const target =
    new Date(
      `${date}T00:00:00`
    );

  return Math.ceil(
    (target - today) /
      86400000
  );
}

function addMonths(
  dateString,
  months
) {
  const date =
    new Date(
      `${dateString}T00:00:00`
    );

  const originalDay =
    date.getDate();

  const target =
    new Date(
      date.getFullYear(),
      date.getMonth() +
        months,
      1
    );

  const lastDay =
    new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0
    ).getDate();

  target.setDate(
    Math.min(
      originalDay,
      lastDay
    )
  );

  return `${target.getFullYear()}-${String(
    target.getMonth() + 1
  ).padStart(2, "0")}-${String(
    target.getDate()
  ).padStart(2, "0")}`;
}

function addYears(
  dateString,
  years
) {
  const date =
    new Date(
      `${dateString}T00:00:00`
    );

  const targetYear =
    date.getFullYear() +
    years;

  const targetMonth =
    date.getMonth();

  const originalDay =
    date.getDate();

  const lastDay =
    new Date(
      targetYear,
      targetMonth + 1,
      0
    ).getDate();

  const targetDay =
    Math.min(
      originalDay,
      lastDay
    );

  return `${targetYear}-${String(
    targetMonth + 1
  ).padStart(2, "0")}-${String(
    targetDay
  ).padStart(2, "0")}`;
}

/* =========================================================
   TRIAL HELPERS
========================================================= */

function isTrial(subscription) {
  return Boolean(
    subscription?.isTrial &&
      subscription?.trialEndDate
  );
}

function trialDaysRemaining(
  subscription
) {
  if (
    !isTrial(subscription)
  ) {
    return 0;
  }

  return daysUntil(
    subscription.trialEndDate
  );
}

function processTrial(
  subscription
) {
  if (
    !isTrial(subscription)
  ) {
    return subscription;
  }

  const days =
    trialDaysRemaining(
      subscription
    );

  if (days >= 0) {
    return {
      ...subscription,
      status: "Trial",
    };
  }

  return {
    ...subscription,
    isTrial: false,
    status: "Active",
    nextPayment:
      subscription.nextPayment ||
      subscription.trialEndDate,
  };
}

/* =========================================================
   PAYMENT HISTORY / RECURRING ENGINE
========================================================= */

function processSubscription(
  subscription
) {
  const processed =
    processTrial(
      subscription
    );

  if (
    isTrial(processed)
  ) {
    return processed;
  }

  if (
    !processed?.nextPayment
  ) {
    return processed;
  }

  let nextPayment =
    processed.nextPayment;

  const today =
    getTodayISO();

  const history =
    Array.isArray(
      processed.paymentHistory
    )
      ? [
          ...processed.paymentHistory,
        ]
      : [];

  while (
    nextPayment < today
  ) {
    const exists =
      history.some(
        (payment) =>
          payment.date ===
            nextPayment &&
          payment.subscriptionId ===
            processed.id
      );

    if (!exists) {
      history.push({
        id: `${processed.id}-${nextPayment}`,

        subscriptionId:
          processed.id,

        name:
          processed.name,

        amount:
          Number(
            processed.amount ||
              0
          ),

        currency:
          processed.currency ||
          "₹",

        date:
          nextPayment,

        recordedAt:
          new Date().toISOString(),
      });
    }

    if (
      processed.cycle ===
      "Yearly"
    ) {
      nextPayment =
        addYears(
          nextPayment,
          1
        );
    } else {
      nextPayment =
        addMonths(
          nextPayment,
          1
        );
    }
  }

  return {
    ...processed,

    nextPayment,

    paymentHistory:
      history.sort(
        (a, b) =>
          new Date(
            b.date
          ) -
          new Date(
            a.date
          )
      ),
  };
}

function normalizeSubscriptions(
  subscriptions
) {
  return subscriptions.map(
    processSubscription
  );
}

function getAllHistory(
  subscriptions
) {
  return subscriptions
    .flatMap(
      (subscription) =>
        Array.isArray(
          subscription.paymentHistory
        )
          ? subscription.paymentHistory
          : []
    )
    .sort(
      (a, b) =>
        new Date(
          b.date
        ) -
        new Date(
          a.date
        )
    );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [
    activePage,
    setActivePage,
  ] = useState(
    "dashboard"
  );

  /*
    IMPORTANT:
    Start with an empty array.

    We DO NOT load browser-local subscription
    data before Supabase identifies the current
    account.
  */

  const [
    subscriptions,
    setSubscriptions,
  ] = useState([]);

  const [
    cloudReady,
    setCloudReady,
  ] = useState(false);

  const [
    cloudSyncError,
    setCloudSyncError,
  ] = useState("");

  const [
    accountMenuOpen,
    setAccountMenuOpen,
  ] = useState(false);

  const [
    userEmail,
    setUserEmail,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    showAdd,
    setShowAdd,
  ] = useState(false);

  const [
    editingSubscription,
    setEditingSubscription,
  ] = useState(null);

  const [
    mobileMenu,
    setMobileMenu,
  ] = useState(false);

  const [
    showNotifications,
    setShowNotifications,
  ] = useState(false);

  const fileInputRef =
    useRef(null);

  /* =======================================================
     LOAD CURRENT USER
  ======================================================= */

  useEffect(() => {
    let mounted =
      true;

    async function loadUser() {
      const {
        data,
        error,
      } =
        await supabase.auth.getUser();

      if (
        error ||
        !mounted
      ) {
        return;
      }

      setUserEmail(
        data.user?.email ||
          ""
      );
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     LOAD CLOUD DATA
  ======================================================= */

  useEffect(() => {
    let cancelled =
      false;

    async function initializeCloudData() {
      try {
        setCloudSyncError("");

        /*
          The current account is the only source
          of truth now.

          migrateLocalSubscriptions() no longer
          copies localStorage into the account.
        */

        const result =
          await migrateLocalSubscriptions(
            []
          );

        if (cancelled) {
          return;
        }

        setSubscriptions(
          normalizeSubscriptions(
            result.subscriptions
          )
        );

        setCloudReady(
          true
        );
      } catch (error) {
        console.error(
          "Cloud initialization failed:",
          error
        );

        if (!cancelled) {
          setCloudSyncError(
            "Cloud sync is unavailable right now."
          );

          setSubscriptions(
            []
          );

          setCloudReady(
            true
          );
        }
      }
    }

    initializeCloudData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     SIGN OUT
  ======================================================= */

  async function handleSignOut() {
    const confirmed =
      window.confirm(
        "Sign out of DumbDue on this device?"
      );

    if (!confirmed) {
      return;
    }

    const {
      error,
    } =
      await supabase.auth.signOut({
        scope: "local",
      });

    if (error) {
      alert(
        `Could not sign out: ${error.message}`
      );

      return;
    }

    setAccountMenuOpen(
      false
    );
  }

  /* =======================================================
     THEME
  ======================================================= */

  const [
    theme,
    setTheme,
  ] = useState(() => {
    return (
      localStorage.getItem(
        THEME_KEY
      ) || "Rose"
    );
  });

  const [
    darkMode,
    setDarkMode,
  ] = useState(() => {
    return (
      localStorage.getItem(
        DARK_MODE_KEY
      ) === "true"
    );
  });

  /* =======================================================
     REMINDERS
  ======================================================= */

  const [
    remindersEnabled,
    setRemindersEnabled,
  ] = useState(() => {
    const saved =
      localStorage.getItem(
        REMINDERS_KEY
      );

    return saved === null
      ? true
      : saved === "true";
  });

  const [
    reminderDays,
    setReminderDays,
  ] = useState(() => {
    const saved =
      Number(
        localStorage.getItem(
          REMINDER_DAYS_KEY
        )
      );

    return reminderOptions.includes(
      saved
    )
      ? saved
      : 7;
  });

  const [
    trialRemindersEnabled,
    setTrialRemindersEnabled,
  ] = useState(() => {
    const saved =
      localStorage.getItem(
        TRIAL_REMINDERS_KEY
      );

    return saved === null
      ? true
      : saved === "true";
  });

  /* =======================================================
     LOCAL SETTINGS
  ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      THEME_KEY,
      theme
    );

    localStorage.setItem(
      DARK_MODE_KEY,
      String(
        darkMode
      )
    );

    localStorage.setItem(
      REMINDERS_KEY,
      String(
        remindersEnabled
      )
    );

    localStorage.setItem(
      REMINDER_DAYS_KEY,
      String(
        reminderDays
      )
    );

    localStorage.setItem(
      TRIAL_REMINDERS_KEY,
      String(
        trialRemindersEnabled
      )
    );
  }, [
    theme,
    darkMode,
    remindersEnabled,
    reminderDays,
    trialRemindersEnabled,
  ]);

  /* =======================================================
     NORMALIZE SUBSCRIPTIONS
  ======================================================= */

  useEffect(() => {
    if (!cloudReady) {
      return;
    }

    setSubscriptions(
      (current) => {
        const processed =
          normalizeSubscriptions(
            current
          );

        return JSON.stringify(
          processed
        ) ===
          JSON.stringify(
            current
          )
          ? current
          : processed;
      }
    );
  }, [
    cloudReady,
  ]);

  /* =======================================================
     LOCAL BACKUP
========================================================= */

  useEffect(() => {
    if (!cloudReady) {
      return;
    }

    try {
      const newData =
        JSON.stringify(
          subscriptions
        );

      const existingRaw =
        localStorage.getItem(
          SUBSCRIPTIONS_KEY
        );

      /*
        Preserve previous non-empty local data
        as an emergency browser backup.
      */

      if (
        existingRaw &&
        existingRaw !==
          newData
      ) {
        try {
          const existing =
            JSON.parse(
              existingRaw
            );

          if (
            Array.isArray(
              existing
            ) &&
            existing.length >
              0
          ) {
            localStorage.setItem(
              BACKUP_KEY,
              existingRaw
            );
          }
        } catch {
          // Ignore malformed storage.
        }
      }

      localStorage.setItem(
        SUBSCRIPTIONS_KEY,
        newData
      );
    } catch {
      // Ignore storage errors.
    }
  }, [
    subscriptions,
    cloudReady,
  ]);

  /* =======================================================
     CLOUD AUTO-SAVE
  ======================================================= */

  useEffect(() => {
    if (!cloudReady) {
      return;
    }

    const timer =
      setTimeout(
        async () => {
          try {
            await saveAllCloudSubscriptions(
              subscriptions
            );

            setCloudSyncError("");

            console.log(
              "DumbDue cloud sync complete."
            );
          } catch (error) {
            console.error(
              "Cloud sync failed:",
              error
            );

            setCloudSyncError(
              "Cloud sync failed. Your browser data is still safe."
            );
          }
        },
        400
      );

    return () => {
      clearTimeout(
        timer
      );
    };
  }, [
    subscriptions,
    cloudReady,
  ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredSubscriptions =
    useMemo(() => {
      const query =
        search
          .toLowerCase()
          .trim();

      if (!query) {
        return subscriptions;
      }

      return subscriptions.filter(
        (subscription) =>
          String(
            subscription.name ||
              ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            subscription.category ||
              ""
          )
            .toLowerCase()
            .includes(query) ||
          String(
            subscription.paymentMethod ||
              ""
          )
            .toLowerCase()
            .includes(query)
      );
    }, [
      subscriptions,
      search,
    ]);

  /* =======================================================
     TOTALS
  ======================================================= */

  const paidSubscriptions =
    subscriptions.filter(
      (subscription) =>
        !isTrial(
          subscription
        )
    );

  const monthlyTotal =
    paidSubscriptions.reduce(
      (
        total,
        subscription
      ) => {
        const amount =
          Number(
            subscription.amount ||
              0
          );

        if (
          subscription.cycle ===
          "Yearly"
        ) {
          return (
            total +
            amount / 12
          );
        }

        return (
          total +
          amount
        );
      },
      0
    );

  const yearlyTotal =
    monthlyTotal * 12;

  /* =======================================================
     UPCOMING
  ======================================================= */

  const upcoming =
    [
      ...subscriptions,
    ]
      .filter(
        (subscription) =>
          !isTrial(
            subscription
          ) &&
          subscription.nextPayment
      )
      .sort(
        (a, b) =>
          new Date(
            a.nextPayment
          ) -
          new Date(
            b.nextPayment
          )
      )
      .slice(
        0,
        5
      );

  /* =======================================================
     TRIALS
  ======================================================= */

  const activeTrials =
    subscriptions.filter(
      (subscription) =>
        isTrial(
          subscription
        )
    );

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const paymentNotifications =
    remindersEnabled
      ? subscriptions
          .filter(
            (subscription) =>
              !isTrial(
                subscription
              ) &&
              subscription.nextPayment
          )
          .map(
            (subscription) => ({
              ...subscription,

              days:
                daysUntil(
                  subscription.nextPayment
                ),

              type:
                "payment",
            })
          )
          .filter(
            (subscription) =>
              subscription.days >=
                0 &&
              subscription.days <=
                reminderDays
          )
      : [];

  const trialNotifications =
    remindersEnabled &&
    trialRemindersEnabled
      ? activeTrials
          .map(
            (subscription) => ({
              ...subscription,

              days:
                trialDaysRemaining(
                  subscription
                ),

              type:
                "trial",
            })
          )
          .filter(
            (subscription) =>
              subscription.days >=
                0 &&
              subscription.days <=
                reminderDays
          )
      : [];

  const notifications =
    [
      ...paymentNotifications,
      ...trialNotifications,
    ].sort(
      (a, b) =>
        a.days - b.days
    );

  /* =======================================================
     HISTORY
  ======================================================= */

  const paymentHistory =
    useMemo(
      () =>
        getAllHistory(
          subscriptions
        ),
      [
        subscriptions,
      ]
    );

  /* =======================================================
     ADD
  ======================================================= */

  function addSubscription(
    subscription
  ) {
    const newSubscription = {
      ...subscription,

      id: Date.now(),

      status:
        subscription.isTrial
          ? "Trial"
          : "Active",

      createdAt:
        new Date().toISOString(),

      paymentHistory: [],
    };

    setSubscriptions(
      (current) => [
        ...current,
        newSubscription,
      ]
    );

    setShowAdd(
      false
    );
  }

  /* =======================================================
     EDIT
  ======================================================= */

  function updateSubscription(
    updatedSubscription
  ) {
    const processed =
      processSubscription(
        updatedSubscription
      );

    setSubscriptions(
      (current) =>
        current.map(
          (subscription) =>
            subscription.id ===
            processed.id
              ? processed
              : subscription
        )
    );

    setEditingSubscription(
      null
    );
  }

  /* =======================================================
     DELETE
  ======================================================= */

  function deleteSubscription(
    id
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this subscription?"
      );

    if (!confirmed) {
      return;
    }

    setSubscriptions(
      (current) =>
        current.filter(
          (subscription) =>
            subscription.id !==
            id
        )
    );
  }

  /* =======================================================
     MARK PAID
  ======================================================= */

  function markPaymentAsPaid(
    subscriptionId
  ) {
    setSubscriptions(
      (current) =>
        current.map(
          (subscription) => {
            if (
              subscription.id !==
              subscriptionId
            ) {
              return subscription;
            }

            if (
              isTrial(
                subscription
              )
            ) {
              return subscription;
            }

            if (
              !subscription.nextPayment
            ) {
              return subscription;
            }

            const paymentDate =
              subscription.nextPayment;

            const history =
              Array.isArray(
                subscription.paymentHistory
              )
                ? [
                    ...subscription.paymentHistory,
                  ]
                : [];

            const exists =
              history.some(
                (payment) =>
                  payment.date ===
                    paymentDate &&
                  payment.subscriptionId ===
                    subscription.id
              );

            if (!exists) {
              history.unshift({
                id: `${subscription.id}-${paymentDate}`,

                subscriptionId:
                  subscription.id,

                name:
                  subscription.name,

                amount:
                  Number(
                    subscription.amount ||
                      0
                  ),

                currency:
                  subscription.currency ||
                  "₹",

                date:
                  paymentDate,

                recordedAt:
                  new Date().toISOString(),
              });
            }

            const nextPayment =
              subscription.cycle ===
              "Yearly"
                ? addYears(
                    paymentDate,
                    1
                  )
                : addMonths(
                    paymentDate,
                    1
                  );

            return {
              ...subscription,

              nextPayment,

              paymentHistory:
                history,
            };
          }
        )
    );
  }

  /* =======================================================
     EXPORT
  ======================================================= */

  function exportData() {
    try {
      const backupData = {
        app:
          "DumbDue",

        version:
          1,

        exportedAt:
          new Date().toISOString(),

        subscriptions,

        settings: {
          theme,
          darkMode,
          remindersEnabled,
          reminderDays,
          trialRemindersEnabled,
        },
      };

      const json =
        JSON.stringify(
          backupData,
          null,
          2
        );

      const blob =
        new Blob(
          [json],
          {
            type:
              "application/json",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      const date =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );

      link.href =
        url;

      link.download =
        `dumbdue-backup-${date}.json`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        url
      );

      alert(
        "DumbDue backup exported successfully."
      );
    } catch {
      alert(
        "DumbDue could not export your data."
      );
    }
  }

  /* =======================================================
     IMPORT
  ======================================================= */

  function triggerImport() {
    fileInputRef.current?.click();
  }

  async function handleImport(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text =
        await file.text();

      const imported =
        JSON.parse(
          text
        );

      if (
        !imported ||
        typeof imported !==
          "object"
      ) {
        throw new Error(
          "Invalid backup file."
        );
      }

      if (
        !Array.isArray(
          imported.subscriptions
        )
      ) {
        throw new Error(
          "No subscription data found."
        );
      }

      const confirmed =
        window.confirm(
          "Import this backup? Your current DumbDue data will first be backed up."
        );

      if (!confirmed) {
        event.target.value =
          "";

        return;
      }

      const currentRaw =
        localStorage.getItem(
          SUBSCRIPTIONS_KEY
        );

      if (currentRaw) {
        try {
          const current =
            JSON.parse(
              currentRaw
            );

          if (
            Array.isArray(
              current
            ) &&
            current.length > 0
          ) {
            localStorage.setItem(
              BACKUP_KEY,
              currentRaw
            );
          }
        } catch {
          // Ignore.
        }
      }

      const normalized =
        normalizeSubscriptions(
          imported.subscriptions
        );

      setSubscriptions(
        normalized
      );

      if (
        imported.settings &&
        typeof imported.settings ===
          "object"
      ) {
        const importedSettings =
          imported.settings;

        if (
          themeOptions.includes(
            importedSettings.theme
          )
        ) {
          setTheme(
            importedSettings.theme
          );
        }

        if (
          typeof importedSettings.darkMode ===
          "boolean"
        ) {
          setDarkMode(
            importedSettings.darkMode
          );
        }

        if (
          typeof importedSettings.remindersEnabled ===
          "boolean"
        ) {
          setRemindersEnabled(
            importedSettings.remindersEnabled
          );
        }

        if (
          reminderOptions.includes(
            Number(
              importedSettings.reminderDays
            )
          )
        ) {
          setReminderDays(
            Number(
              importedSettings.reminderDays
            )
          );
        }

        if (
          typeof importedSettings.trialRemindersEnabled ===
          "boolean"
        ) {
          setTrialRemindersEnabled(
            importedSettings.trialRemindersEnabled
          );
        }
      }

      alert(
        "DumbDue data imported successfully."
      );
    } catch (error) {
      alert(
        error?.message ||
          "That backup file could not be imported."
      );
    }

    event.target.value =
      "";
  }

  /* =======================================================
     RESTORE BACKUP
  ======================================================= */

  function restoreAutomaticBackup() {
    const backup =
      readStorageArray(
        BACKUP_KEY
      );

    if (
      !backup ||
      backup.length === 0
    ) {
      alert(
        "No automatic backup was found in this browser."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Restore the last automatic DumbDue backup? Your current data will be backed up first."
      );

    if (!confirmed) {
      return;
    }

    const currentRaw =
      localStorage.getItem(
        SUBSCRIPTIONS_KEY
      );

    if (currentRaw) {
      try {
        const current =
          JSON.parse(
            currentRaw
          );

        if (
          Array.isArray(
            current
          ) &&
          current.length > 0
        ) {
          localStorage.setItem(
            BACKUP_KEY,
            currentRaw
          );
        }
      } catch {
        // Ignore.
      }
    }

    setSubscriptions(
      normalizeSubscriptions(
        backup
      )
    );

    alert(
      "Automatic backup restored."
    );
  }

  /* =======================================================
     EDITOR
  ======================================================= */

  function openEditor(
    subscription
  ) {
    setEditingSubscription(
      subscription
    );
  }

  function closeModal() {
    setShowAdd(
      false
    );

    setEditingSubscription(
      null
    );
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function navigate(page) {
    setActivePage(
      page
    );

    setMobileMenu(
      false
    );

    setShowNotifications(
      false
    );

    setAccountMenuOpen(
      false
    );
  }

  /* =======================================================
     CLOUD LOADING SCREEN
  ======================================================= */

  if (!cloudReady) {
    return (
      <div
        className={`app-loading ${
          darkMode
            ? "dark-mode"
            : ""
        }`}
      >
        <div className="app-loading-inner">
          <div className="app-loading-mark">
            D
          </div>

          <strong>
            DumbDue
          </strong>

          <span>
            Loading your subscriptions...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`app theme-${theme.toLowerCase()} ${
        darkMode
          ? "dark-mode"
          : ""
      }`}
    >

      {/* ===================================================
          SIDEBAR
      =================================================== */}

      <aside
        className={`sidebar ${
          mobileMenu
            ? "open"
            : ""
        }`}
      >

        <div className="brand">

          <div className="brand-mark">
            D
          </div>

          <div>

            <div className="brand-name">
              DumbDue
            </div>

            <div className="brand-subtitle">
              subscription tracker
            </div>

          </div>

        </div>

        <nav className="navigation">

          {navItems.map(
            (item) => {

              const Icon =
                item.icon;

              return (
                <button
                  key={
                    item.id
                  }
                  className={`nav-item ${
                    activePage ===
                    item.id
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    navigate(
                      item.id
                    )
                  }
                >

                  <Icon
                    size={18}
                    strokeWidth={
                      1.8
                    }
                  />

                  <span>
                    {
                      item.label
                    }
                  </span>

                </button>
              );
            }
          )}

        </nav>

        <div className="sidebar-bottom">

          <div className="account-wrapper">

            <button
              className="account-card"
              type="button"
              onClick={() =>
                setAccountMenuOpen(
                  (current) =>
                    !current
                )
              }
              aria-expanded={
                accountMenuOpen
              }
            >

              <div className="avatar">

                {userEmail
                  ? userEmail
                      .charAt(
                        0
                      )
                      .toUpperCase()
                  : "A"}

              </div>

              <div className="account-info">

                <strong>
                  My DumbDue
                </strong>

                <span>
                  {userEmail ||
                    "Personal account"}
                </span>

              </div>

              <ChevronRight
                size={16}
                className={
                  accountMenuOpen
                    ? "account-chevron-open"
                    : ""
                }
              />

            </button>

            {accountMenuOpen && (

              <div className="account-menu">

                <div className="account-menu-email">

                  {userEmail ||
                    "Signed in"}

                </div>

                <button
                  type="button"
                  className="sign-out-button"
                  onClick={
                    handleSignOut
                  }
                >

                  <span>
                    Sign out
                  </span>

                </button>

              </div>

            )}

          </div>

        </div>

      </aside>

      {mobileMenu && (
        <button
          className="mobile-overlay"
          onClick={() =>
            setMobileMenu(
              false
            )
          }
          aria-label="Close menu"
        />
      )}

      {/* ===================================================
          MAIN
      =================================================== */}

      <main className="main">

        <header className="topbar">

          <button
            className="icon-button mobile-menu-button"
            onClick={() =>
              setMobileMenu(
                true
              )
            }
          >

            <Menu size={20} />

          </button>

          <div className="page-heading">

            <span className="eyebrow">
              PAYMENT OVERVIEW
            </span>

            <h1>

              {activePage ===
                "dashboard" &&
                getGreeting()}

              {activePage ===
                "subscriptions" &&
                "Your subscriptions"}

              {activePage ===
                "calendar" &&
                "Payment calendar"}

              {activePage ===
                "history" &&
                "Payment history"}

              {activePage ===
                "insights" &&
                "Your spending"}

              {activePage ===
                "settings" &&
                "Settings"}

            </h1>

          </div>

          <div className="topbar-actions">

            <div className="search-box">

              <Search
                size={17}
              />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search"
              />

            </div>

            <div className="notification-wrap">

              <button
                className="icon-button notification-button"
                title="Notifications"
                type="button"
                onClick={() =>
                  setShowNotifications(
                    (current) =>
                      !current
                  )
                }
                aria-label="Notifications"
              >

                <Bell
                  size={18}
                />

                {notifications.length >
                  0 && (
                  <span />
                )}

              </button>

              {showNotifications && (

                <div className="notification-panel">

                  <div className="notification-panel-header">

                    <div>

                      <strong>
                        Notifications
                      </strong>

                      <small>
                        {
                          notifications.length
                        }{" "}
                        upcoming
                      </small>

                    </div>

                    <button
                      type="button"
                      className="notification-close"
                      onClick={() =>
                        setShowNotifications(
                          false
                        )
                      }
                      aria-label="Close notifications"
                    >

                      <X
                        size={16}
                      />

                    </button>

                  </div>

                  {notifications.length ===
                  0 ? (

                    <div className="notification-empty">

                      <Bell
                        size={20}
                      />

                      <strong>

                        {remindersEnabled
                          ? "You're all caught up"
                          : "Reminders are off"}

                      </strong>

                      <span>

                        {remindersEnabled
                          ? "Nothing matches your current reminder settings."
                          : "Turn reminders back on in Settings to receive alerts."}

                      </span>

                    </div>

                  ) : (

                    <div className="notification-list">

                      {notifications.map(
                        (
                          notification
                        ) => (

                          <button
                            key={`${notification.type}-${notification.id}`}
                            type="button"
                            className="notification-item"
                            onClick={() => {

                              setShowNotifications(
                                false
                              );

                              navigate(
                                "subscriptions"
                              );

                            }}
                          >

                            <div className="notification-icon">

                              <Bell
                                size={15}
                              />

                            </div>

                            <div>

                              <strong>
                                {
                                  notification.name
                                }
                              </strong>

                              <span>

                                {notification.type ===
                                "trial"
                                  ? notification.days ===
                                    0
                                    ? "Trial ends today"
                                    : notification.days ===
                                      1
                                    ? "Trial ends tomorrow"
                                    : `Trial ends in ${notification.days} days`
                                  : notification.days ===
                                    0
                                  ? "Payment due today"
                                  : notification.days ===
                                    1
                                  ? "Payment due tomorrow"
                                  : `Payment due in ${notification.days} days`}

                                {" • ₹"}

                                {
                                  notification.amount
                                }

                              </span>

                            </div>

                          </button>

                        )
                      )}

                    </div>

                  )}

                </div>

              )}

            </div>

          </div>

        </header>

        {cloudSyncError && (
          <div
            style={{
              margin:
                "0 24px 4px",
              padding:
                "9px 12px",
              borderRadius:
                "9px",
              background:
                "rgba(184, 90, 90, 0.10)",
              color:
                "#a04f46",
              fontSize:
                "11px",
            }}
          >

            {cloudSyncError}

          </div>
        )}

        <div className="content">

          {activePage ===
            "dashboard" && (

            <Dashboard
              subscriptions={
                subscriptions
              }
              upcoming={
                upcoming
              }
              activeTrials={
                activeTrials
              }
              monthlyTotal={
                monthlyTotal
              }
              yearlyTotal={
                yearlyTotal
              }
              onAdd={() =>
                setShowAdd(
                  true
                )
              }
              onNavigate={
                navigate
              }
            />

          )}

          {activePage ===
            "subscriptions" && (

            <Subscriptions
              subscriptions={
                filteredSubscriptions
              }
              onAdd={() =>
                setShowAdd(
                  true
                )
              }
              onDelete={
                deleteSubscription
              }
              onEdit={
                openEditor
              }
              onMarkPaid={
                markPaymentAsPaid
              }
            />

          )}

          {activePage ===
            "calendar" && (

            <Calendar
              subscriptions={
                subscriptions
              }
            />

          )}

          {activePage ===
            "history" && (

            <HistoryPage
              history={
                paymentHistory
              }
            />

          )}

          {activePage ===
            "insights" && (

            <Insights
              subscriptions={
                subscriptions
              }
              monthlyTotal={
                monthlyTotal
              }
              yearlyTotal={
                yearlyTotal
              }
            />

          )}

          {activePage ===
            "settings" && (

            <SettingsPage
              theme={
                theme
              }
              setTheme={
                setTheme
              }
              darkMode={
                darkMode
              }
              setDarkMode={
                setDarkMode
              }
              remindersEnabled={
                remindersEnabled
              }
              setRemindersEnabled={
                setRemindersEnabled
              }
              reminderDays={
                reminderDays
              }
              setReminderDays={
                setReminderDays
              }
              trialRemindersEnabled={
                trialRemindersEnabled
              }
              setTrialRemindersEnabled={
                setTrialRemindersEnabled
              }
              onExport={
                exportData
              }
              onImport={
                triggerImport
              }
              onRestoreBackup={
                restoreAutomaticBackup
              }
            />

          )}

        </div>

      </main>

      <input
        ref={
          fileInputRef
        }
        type="file"
        accept="application/json,.json"
        style={{
          display:
            "none",
        }}
        onChange={
          handleImport
        }
      />

      {(showAdd ||
        editingSubscription) && (

        <SubscriptionModal
          subscription={
            editingSubscription
          }
          onClose={
            closeModal
          }
          onAdd={
            addSubscription
          }
          onEdit={
            updateSubscription
          }
        />

      )}

    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  subscriptions,
  upcoming,
  activeTrials,
  monthlyTotal,
  yearlyTotal,
  onAdd,
  onNavigate,
}) {
  return (
    <>
      <section className="welcome-row">

        <div>

          <p className="muted">
            Keep an eye on what's
            leaving your wallet.
          </p>

        </div>

        <button
          className="primary-button"
          onClick={
            onAdd
          }
        >

          <Plus
            size={17}
          />

          Add subscription

        </button>

      </section>

      <section className="stats-grid">

        <div className="stat-card featured">

          <div className="stat-icon">

            <CreditCard
              size={18}
            />

          </div>

          <span>
            Monthly spending
          </span>

          <strong>
            ₹
            {monthlyTotal.toFixed(
              2
            )}
          </strong>

          <small>
            recurring paid
            subscriptions
          </small>

        </div>

        <div className="stat-card">

          <span>
            Yearly projection
          </span>

          <strong>
            ₹
            {yearlyTotal.toFixed(
              2
            )}
          </strong>

          <small>
            if nothing changes
          </small>

        </div>

        <div className="stat-card">

          <span>
            Active trials
          </span>

          <strong>
            {
              activeTrials.length
            }
          </strong>

          <small>
            currently free
          </small>

        </div>

      </section>

      <section className="section-block">

        <div className="section-header">

          <div>

            <span className="section-kicker">
              COMING UP
            </span>

            <h2>
              Upcoming payments
            </h2>

          </div>

          <button
            className="text-button"
            onClick={() =>
              onNavigate(
                "calendar"
              )
            }
          >

            View calendar

            <ChevronRight
              size={15}
            />

          </button>

        </div>

        <div className="payment-list">

          {activeTrials.map(
            (trial) => {

              const days =
                trialDaysRemaining(
                  trial
                );

              return (
                <div
                  className="payment-row"
                  key={`trial-${trial.id}`}
                >

                  <div className="service-letter">

                    {String(
                      trial.name ||
                        "?"
                    )
                      .charAt(
                        0
                      )
                      .toUpperCase()}

                  </div>

                  <div className="payment-main">

                    <strong>
                      {
                        trial.name
                      }
                    </strong>

                    <span>
                      Free trial
                    </span>

                  </div>

                  <div className="payment-date">

                    <span className="due-soon">

                      {days ===
                      0
                        ? "Ends today"
                        : days ===
                          1
                        ? "Ends tomorrow"
                        : `Ends in ${days} days`}

                    </span>

                    <small>
                      {formatDate(
                        trial.trialEndDate
                      )}
                    </small>

                  </div>

                  <div className="payment-amount">
                    Trial
                  </div>

                </div>
              );
            }
          )}

          {upcoming.length ===
            0 &&
          activeTrials.length ===
            0 ? (

            <EmptyState
              title="Nothing due yet"
              text="Add your first subscription and your upcoming payments will appear here."
              action={
                onAdd
              }
            />

          ) : (

            upcoming.map(
              (
                subscription
              ) => (

                <PaymentRow
                  key={
                    subscription.id
                  }
                  subscription={
                    subscription
                  }
                />

              )
            )

          )}

        </div>

      </section>

      <section className="quick-section">

        <div className="section-header">

          <div>

            <span className="section-kicker">
              OVERVIEW
            </span>

            <h2>
              Your subscriptions
            </h2>

          </div>

          <button
            className="text-button"
            onClick={() =>
              onNavigate(
                "subscriptions"
              )
            }
          >

            See all

            <ChevronRight
              size={15}
            />

          </button>

        </div>

        {subscriptions.length ===
        0 ? (

          <EmptyState
            title="Your subscription list is empty"
            text="Start by adding the payments you want DumbDue to track."
            action={
              onAdd
            }
          />

        ) : (

          <div className="mini-grid">

            {subscriptions
              .slice(
                0,
                4
              )
              .map(
                (
                  subscription
                ) => (

                  <div
                    className="mini-card"
                    key={
                      subscription.id
                    }
                  >

                    <div className="mini-card-top">

                      <div className="service-letter">

                        {String(
                          subscription.name ||
                            "?"
                        )
                          .charAt(
                            0
                          )
                          .toUpperCase()}

                      </div>

                      <span>

                        {isTrial(
                          subscription
                        )
                          ? "FREE TRIAL"
                          : subscription.category}

                      </span>

                    </div>

                    <strong>
                      {
                        subscription.name
                      }
                    </strong>

                    <div className="mini-price">

                      {isTrial(
                        subscription
                      )
                        ? "Trial"
                        : `₹${subscription.amount}`}

                      {!isTrial(
                        subscription
                      ) && (

                        <span>
                          {" "}
                          /{" "}
                          {subscription.cycle ===
                          "Monthly"
                            ? "month"
                            : "year"}
                        </span>

                      )}

                    </div>

                  </div>

                )
              )}

          </div>

        )}

      </section>
    </>
  );
}

/* =========================================================
   PAYMENT ROW
========================================================= */

function PaymentRow({
  subscription,
}) {
  const days =
    daysUntil(
      subscription.nextPayment
    );

  let dueText;

  if (days < 0) {
    dueText =
      "Overdue";
  } else if (
    days === 0
  ) {
    dueText =
      "Due today";
  } else if (
    days === 1
  ) {
    dueText =
      "Tomorrow";
  } else {
    dueText =
      `In ${days} days`;
  }

  return (
    <div className="payment-row">

      <div className="service-letter">

        {String(
          subscription.name ||
            "?"
        )
          .charAt(0)
          .toUpperCase()}

      </div>

      <div className="payment-main">

        <strong>
          {
            subscription.name
          }
        </strong>

        <span>
          {
            subscription.category
          }
        </span>

      </div>

      <div className="payment-date">

        <span
          className={
            days <= 3
              ? "due-soon"
              : ""
          }
        >
          {dueText}
        </span>

        <small>
          {formatDate(
            subscription.nextPayment
          )}
        </small>

      </div>

      <div className="payment-amount">

        ₹
        {
          subscription.amount
        }

      </div>

    </div>
  );
}

/* =========================================================
   SUBSCRIPTIONS
========================================================= */

function Subscriptions({
  subscriptions,
  onAdd,
  onDelete,
  onEdit,
  onMarkPaid,
}) {
  return (
    <section>

      <div className="page-actions">

        <div>

          <p className="muted">
            Keep every recurring
            payment in one place.
          </p>

        </div>

        <button
          className="primary-button"
          onClick={
            onAdd
          }
        >

          <Plus
            size={17}
          />

          Add subscription

        </button>

      </div>

      <div className="subscription-table">

        <div className="table-head">

          <span>
            Subscription
          </span>

          <span>
            Billing
          </span>

          <span>
            Next payment
          </span>

          <span>
            Amount
          </span>

          <span>
            Actions
          </span>

        </div>

        {subscriptions.length ===
        0 ? (

          <EmptyState
            title="No subscriptions"
            text="Nothing is being tracked yet."
            action={
              onAdd
            }
          />

        ) : (

          subscriptions.map(
            (
              subscription
            ) => (

              <div
                className="table-row"
                key={
                  subscription.id
                }
              >

                <div className="table-service">

                  <div className="service-letter">

                    {String(
                      subscription.name ||
                        "?"
                    )
                      .charAt(
                        0
                      )
                      .toUpperCase()}

                  </div>

                  <div>

                    <strong>
                      {
                        subscription.name
                      }
                    </strong>

                    <span>

                      {isTrial(
                        subscription
                      )
                        ? `Free trial • ends ${formatDate(
                            subscription.trialEndDate
                          )}`
                        : subscription.category}

                    </span>

                  </div>

                </div>

                <span>

                  {isTrial(
                    subscription
                  )
                    ? "Trial"
                    : subscription.cycle}

                </span>

                <span>

                  {isTrial(
                    subscription
                  )
                    ? formatDate(
                        subscription.trialEndDate
                      )
                    : formatDate(
                        subscription.nextPayment
                      )}

                </span>

                <strong>

                  {isTrial(
                    subscription
                  )
                    ? "Trial"
                    : `₹${subscription.amount}`}

                </strong>

                <div className="row-actions">

                  <button
                    className="edit-button"
                    onClick={() =>
                      onEdit(
                        subscription
                      )
                    }
                    title="Edit subscription"
                  >

                    <Edit3
                      size={14}
                    />

                    Edit

                  </button>

                  {!isTrial(
                    subscription
                  ) && (

                    <button
                      className="edit-button"
                      onClick={() =>
                        onMarkPaid(
                          subscription.id
                        )
                      }
                    >
                      Paid
                    </button>

                  )}

                  <button
                    className="delete-button"
                    onClick={() =>
                      onDelete(
                        subscription.id
                      )
                    }
                    title="Delete subscription"
                  >

                    <Trash2
                      size={15}
                    />

                  </button>

                </div>

              </div>

            )
          )

        )}

      </div>

    </section>
  );
}

/* =========================================================
   CALENDAR
========================================================= */

function Calendar({
  subscriptions,
}) {
  const [
    viewDate,
    setViewDate,
  ] = useState(() => {

    const now =
      new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

  });

  const today =
    new Date();

  const year =
    viewDate.getFullYear();

  const month =
    viewDate.getMonth();

  const monthName =
    viewDate.toLocaleDateString(
      "en-IN",
      {
        month:
          "long",
        year:
          "numeric",
      }
    );

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  const firstDay =
    new Date(
      year,
      month,
      1
    ).getDay();

  const cells = [];

  for (
    let i = 0;
    i < firstDay;
    i++
  ) {
    cells.push(null);
  }

  for (
    let day = 1;
    day <=
      daysInMonth;
    day++
  ) {
    cells.push(day);
  }

  function changeMonth(
    amount
  ) {
    setViewDate(
      (current) =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            amount,
          1
        )
    );
  }

  function getPaymentForDay(
    subscription,
    day
  ) {
    if (
      !subscription.nextPayment ||
      isTrial(
        subscription
      )
    ) {
      return false;
    }

    const anchor =
      new Date(
        `${subscription.nextPayment}T00:00:00`
      );

    const anchorMonth =
      anchor.getMonth();

    const anchorDay =
      anchor.getDate();

    if (
      subscription.cycle ===
      "Monthly"
    ) {
      const targetDay =
        Math.min(
          anchorDay,
          daysInMonth
        );

      return (
        day ===
        targetDay
      );
    }

    if (
      subscription.cycle ===
      "Yearly"
    ) {

      if (
        month !==
        anchorMonth
      ) {
        return false;
      }

      return (
        day ===
        anchorDay
      );

    }

    return false;
  }

  const isCurrentMonth =
    year ===
      today.getFullYear() &&
    month ===
      today.getMonth();

  return (
    <section>

      <div className="calendar-heading">

        <div>

          <span className="section-kicker">
            PAYMENT SCHEDULE
          </span>

          <h2>
            {
              monthName
            }
          </h2>

        </div>

        <div className="calendar-controls">

          <button
            type="button"
            className="calendar-nav-button"
            onClick={() =>
              changeMonth(
                -1
              )
            }
          >
            ‹
          </button>

          <button
            type="button"
            className="calendar-nav-button"
            onClick={() =>
              changeMonth(
                1
              )
            }
          >
            ›
          </button>

        </div>

      </div>

      <div className="calendar">

        {[
          "Sun",
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
        ].map(
          (day) => (

            <div
              className="calendar-day-name"
              key={
                day
              }
            >
              {
                day
              }
            </div>

          )
        )}

        {cells.map(
          (
            day,
            index
          ) => {

            const matching =
              day === null
                ? []
                : subscriptions.filter(
                    (
                      subscription
                    ) =>
                      getPaymentForDay(
                        subscription,
                        day
                      )
                  );

            const isToday =
              isCurrentMonth &&
              day ===
                today.getDate();

            return (

              <div
                className={`calendar-cell ${
                  isToday
                    ? "today"
                    : ""
                }`}
                key={
                  index
                }
              >

                {day && (

                  <span className="calendar-number">
                    {
                      day
                    }
                  </span>

                )}

                {matching.map(
                  (
                    subscription
                  ) => (

                    <div
                      className="calendar-payment"
                      key={
                        subscription.id
                      }
                    >

                      <span>
                        {
                          subscription.name
                        }
                      </span>

                      <strong>
                        ₹
                        {
                          subscription.amount
                        }
                      </strong>

                    </div>

                  )
                )}

              </div>

            );
          }
        )}

      </div>

    </section>
  );
}

/* =========================================================
   HISTORY
========================================================= */

function HistoryPage({
  history,
}) {
  const [
    filter,
    setFilter,
  ] = useState(
    "All"
  );

  const filteredHistory =
    filter ===
    "All"
      ? history
      : history.filter(
          (payment) =>
            payment.name ===
            filter
        );

  const totalPaid =
    filteredHistory.reduce(
      (
        sum,
        payment
      ) =>
        sum +
        Number(
          payment.amount ||
            0
        ),
      0
    );

  const subscriptionNames =
    [
      ...new Set(
        history.map(
          (payment) =>
            payment.name
        )
      ),
    ];

  return (
    <section>

      <div className="section-header">

        <div>

          <span className="section-kicker">
            COMPLETED PAYMENTS
          </span>

          <h2>
            Payment history
          </h2>

        </div>

      </div>

      <div className="stats-grid">

        <div className="stat-card featured">

          <span>
            Recorded payments
          </span>

          <strong>
            {
              filteredHistory.length
            }
          </strong>

          <small>
            payments recorded
          </small>

        </div>

        <div className="stat-card">

          <span>
            Total paid
          </span>

          <strong>
            ₹
            {
              totalPaid.toFixed(
                2
              )
            }
          </strong>

          <small>
            selected history
          </small>

        </div>

        <div className="stat-card">

          <span>
            Subscriptions
          </span>

          <strong>
            {
              subscriptionNames.length
            }
          </strong>

          <small>
            with recorded payments
          </small>

        </div>

      </div>

      <div className="history-toolbar">

        <select
          value={
            filter
          }
          onChange={(
            event
          ) =>
            setFilter(
              event.target
                .value
            )
          }
        >

          <option value="All">
            All subscriptions
          </option>

          {subscriptionNames.map(
            (
              name
            ) => (

              <option
                key={
                  name
                }
                value={
                  name
                }
              >
                {
                  name
                }
              </option>

            )
          )}

        </select>

      </div>

      {filteredHistory.length ===
      0 ? (

        <EmptyState
          title="No payment history yet"
          text="When recurring payments are completed, DumbDue will record them here."
        />

      ) : (

        <div className="payment-history-list">

          {filteredHistory.map(
            (
              payment
            ) => (

              <div
                className="payment-history-row"
                key={
                  payment.id
                }
              >

                <div className="service-letter">

                  {String(
                    payment.name ||
                      "?"
                  )
                    .charAt(
                      0
                    )
                    .toUpperCase()}

                </div>

                <div className="payment-history-main">

                  <strong>
                    {
                      payment.name
                    }
                  </strong>

                  <span>
                    Payment completed
                  </span>

                </div>

                <div className="payment-history-date">

                  {
                    formatDate(
                      payment.date
                    )
                  }

                </div>

                <div className="payment-history-amount">

                  ₹
                  {
                    payment.amount
                  }

                </div>

              </div>

            )
          )}

        </div>

      )}

    </section>
  );
}

/* =========================================================
   INSIGHTS
========================================================= */

function Insights({
  subscriptions,
  monthlyTotal,
  yearlyTotal,
}) {
  const categoryTotals =
    {};

  subscriptions
    .filter(
      (subscription) =>
        !isTrial(
          subscription
        )
    )
    .forEach(
      (
        subscription
      ) => {

        const amount =
          Number(
            subscription.amount ||
              0
          );

        const monthlyAmount =
          subscription.cycle ===
          "Yearly"
            ? amount / 12
            : amount;

        categoryTotals[
          subscription.category
        ] =
          (
            categoryTotals[
              subscription.category
            ] || 0
          ) +
          monthlyAmount;

      }
    );

  const categoryList =
    Object.entries(
      categoryTotals
    ).sort(
      (
        a,
        b
      ) =>
        b[1] -
        a[1]
    );

  const biggest =
    [
      ...subscriptions,
    ]
      .filter(
        (subscription) =>
          !isTrial(
            subscription
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          Number(
            b.amount ||
              0
          ) -
          Number(
            a.amount ||
              0
          )
      )[0];

  return (
    <section>

      <div className="insight-hero">

        <div>

          <span className="section-kicker">
            SPENDING SNAPSHOT
          </span>

          <h2>
            Know where your
            recurring money goes.
          </h2>

          <p>
            DumbDue turns a pile of
            recurring charges into
            something you can actually
            understand.
          </p>

        </div>

        <Sparkles
          size={34}
          strokeWidth={1.4}
        />

      </div>

      <div className="insight-grid">

        <div className="insight-card">

          <span>
            Monthly
          </span>

          <strong>
            ₹
            {
              monthlyTotal.toFixed(
                2
              )
            }
          </strong>

        </div>

        <div className="insight-card">

          <span>
            Yearly projection
          </span>

          <strong>
            ₹
            {
              yearlyTotal.toFixed(
                2
              )
            }
          </strong>

        </div>

        <div className="insight-card">

          <span>
            Subscriptions
          </span>

          <strong>
            {
              subscriptions.length
            }
          </strong>

        </div>

        <div className="insight-card">

          <span>
            Largest charge
          </span>

          <strong>
            {
              biggest
                ? biggest.name
                : "—"
            }
          </strong>

        </div>

      </div>

      <div className="category-section">

        <div className="section-header">

          <div>

            <span className="section-kicker">
              BREAKDOWN
            </span>

            <h2>
              By category
            </h2>

          </div>

        </div>

        {categoryList.length ===
        0 ? (

          <EmptyState
            title="No spending data yet"
            text="Add a paid subscription to see your breakdown."
          />

        ) : (

          categoryList.map(
            (
              [
                category,
                amount,
              ]
            ) => (

              <div
                className="category-row"
                key={
                  category
                }
              >

                <span>
                  {
                    category
                  }
                </span>

                <div className="category-bar">

                  <div
                    style={{
                      width: `${
                        monthlyTotal
                          ? Math.min(
                              (
                                amount /
                                monthlyTotal
                              ) *
                                100,
                              100
                            )
                          : 0
                      }%`,
                    }}
                  />

                </div>

                <strong>
                  ₹
                  {
                    amount.toFixed(
                      0
                    )
                  }
                </strong>

              </div>

            )
          )

        )}

      </div>

    </section>
  );
}

/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage({
  theme,
  setTheme,
  darkMode,
  setDarkMode,
  remindersEnabled,
  setRemindersEnabled,
  reminderDays,
  setReminderDays,
  trialRemindersEnabled,
  setTrialRemindersEnabled,
  onExport,
  onImport,
  onRestoreBackup,
}) {
  return (
    <section className="settings-page">

      <div className="settings-intro">

        <span className="section-kicker">
          PERSONALIZE
        </span>

        <h2>
          Make DumbDue yours.
        </h2>

        <p>
          Control how DumbDue looks,
          behaves, and stores your data.
        </p>

      </div>

      <div className="settings-list">

        <div className="setting">

          <div>

            <strong>
              Theme
            </strong>

            <span>
              Change the entire look
              of DumbDue.
            </span>

          </div>

          <select
            value={
              theme
            }
            onChange={(
              event
            ) =>
              setTheme(
                event.target
                  .value
              )
            }
          >

            {themeOptions.map(
              (
                option
              ) => (

                <option
                  key={
                    option
                  }
                  value={
                    option
                  }
                >
                  {
                    option
                  }
                </option>

              )
            )}

          </select>

        </div>

        <div className="setting">

          <div>

            <strong>
              Dark mode
            </strong>

            <span>
              Keep your selected theme
              while using darker surfaces.
            </span>

          </div>

          <button
            className={`toggle ${
              darkMode
                ? "on"
                : ""
            }`}
            onClick={() =>
              setDarkMode(
                (
                  current
                ) =>
                  !current
              )
            }
            aria-label="Toggle dark mode"
          >

            <span />

          </button>

        </div>

        <div className="setting">

          <div>

            <strong>
              Payment reminders
            </strong>

            <span>
              Show upcoming payment
              reminders.
            </span>

          </div>

          <button
            className={`toggle ${
              remindersEnabled
                ? "on"
                : ""
            }`}
            onClick={() =>
              setRemindersEnabled(
                (
                  current
                ) =>
                  !current
              )
            }
            aria-label="Toggle payment reminders"
          >

            <span />

          </button>

        </div>

        <div className="setting">

          <div>

            <strong>
              Remind me before
            </strong>

            <span>
              Choose when payment
              reminders should appear.
            </span>

          </div>

          <select
            value={
              reminderDays
            }
            onChange={(
              event
            ) =>
              setReminderDays(
                Number(
                  event.target
                    .value
                )
              )
            }
            disabled={
              !remindersEnabled
            }
          >

            <option value={1}>
              1 day before
            </option>

            <option value={3}>
              3 days before
            </option>

            <option value={7}>
              7 days before
            </option>

            <option value={14}>
              14 days before
            </option>

          </select>

        </div>

        <div className="setting">

          <div>

            <strong>
              Trial reminders
            </strong>

            <span>
              Warn me before a free
              trial ends.
            </span>

          </div>

          <button
            className={`toggle ${
              trialRemindersEnabled &&
              remindersEnabled
                ? "on"
                : ""
            }`}
            onClick={() =>
              setTrialRemindersEnabled(
                (
                  current
                ) =>
                  !current
              )
            }
            disabled={
              !remindersEnabled
            }
            aria-label="Toggle trial reminders"
          >

            <span />

          </button>

        </div>

        <div className="settings-section-title">

          <span className="section-kicker">
            DATA & BACKUP
          </span>

        </div>

        <div className="setting data-setting">

          <div>

            <strong>
              Export data
            </strong>

            <span>
              Download all subscriptions,
              payment history, and settings
              as a backup file.
            </span>

          </div>

          <button
            className="secondary-button"
            onClick={
              onExport
            }
          >

            <Download
              size={15}
            />

            Export

          </button>

        </div>

        <div className="setting data-setting">

          <div>

            <strong>
              Import backup
            </strong>

            <span>
              Restore a previously exported
              DumbDue backup file.
            </span>

          </div>

          <button
            className="secondary-button"
            onClick={
              onImport
            }
          >

            <Upload
              size={15}
            />

            Import

          </button>

        </div>

        <div className="setting data-setting">

          <div>

            <strong>
              Automatic backup
            </strong>

            <span>
              Restore the previous browser
              backup before continuing.
            </span>

          </div>

          <button
            className="secondary-button"
            onClick={
              onRestoreBackup
            }
          >
            Restore
          </button>

        </div>

      </div>

    </section>
  );
}

/* =========================================================
   SUBSCRIPTION MODAL
========================================================= */

function SubscriptionModal({
  subscription,
  onClose,
  onAdd,
  onEdit,
}) {
  const [
    name,
    setName,
  ] = useState(
    subscription?.name ||
      ""
  );

  const [
    category,
    setCategory,
  ] = useState(
    subscription?.category ||
      "Entertainment"
  );

  const [
    amount,
    setAmount,
  ] = useState(
    subscription?.amount ||
      ""
  );

  const [
    cycle,
    setCycle,
  ] = useState(
    subscription?.cycle ||
      "Monthly"
  );

  const [
    nextPayment,
    setNextPayment,
  ] = useState(
    subscription?.nextPayment ||
      ""
  );

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(
    subscription?.paymentMethod ||
      "Card"
  );

  const [
    isTrialSubscription,
    setIsTrialSubscription,
  ] = useState(
    Boolean(
      subscription?.isTrial
    )
  );

  const [
    trialEndDate,
    setTrialEndDate,
  ] = useState(
    subscription?.trialEndDate ||
      ""
  );

  function submit(
    event
  ) {
    event.preventDefault();

    if (!name.trim()) {
      alert(
        "Please enter a subscription name."
      );

      return;
    }

    if (
      !isTrialSubscription &&
      (!amount ||
        Number(amount) <=
          0)
    ) {
      alert(
        "Please enter a valid amount."
      );

      return;
    }

    if (
      isTrialSubscription &&
      !trialEndDate
    ) {
      alert(
        "Please choose when the trial ends."
      );

      return;
    }

    if (
      !isTrialSubscription &&
      !nextPayment
    ) {
      alert(
        "Please choose the next payment date."
      );

      return;
    }

    const data = {
      name:
        name.trim(),

      category,

      amount:
        isTrialSubscription
          ? Number(
              amount || 0
            )
          : Number(
              amount
            ),

      currency:
        "₹",

      cycle,

      nextPayment:
        isTrialSubscription
          ? nextPayment ||
            trialEndDate
          : nextPayment,

      paymentMethod,

      isTrial:
        isTrialSubscription,

      trialEndDate:
        isTrialSubscription
          ? trialEndDate
          : null,

      status:
        isTrialSubscription
          ? "Trial"
          : "Active",

      paymentHistory:
        subscription?.paymentHistory ||
        [],
    };

    if (
      subscription
    ) {
      onEdit({
        ...subscription,
        ...data,
      });
    } else {
      onAdd(data);
    }
  }

  return (
    <div className="modal-backdrop">

      <div className="modal">

        <div className="modal-header">

          <div>

            <span className="section-kicker">

              {subscription
                ? "EDIT SUBSCRIPTION"
                : "NEW SUBSCRIPTION"}

            </span>

            <h2>

              {subscription
                ? "Update payment"
                : "Add a payment"}

            </h2>

          </div>

          <button
            className="icon-button"
            onClick={
              onClose
            }
            type="button"
            aria-label="Close"
          >

            <X
              size={19}
            />

          </button>

        </div>

        <form
          onSubmit={
            submit
          }
        >

          <div className="form-grid">

            <label>

              Name

              <input
                value={
                  name
                }
                onChange={(
                  event
                ) =>
                  setName(
                    event.target
                      .value
                  )
                }
                placeholder="Netflix"
                autoFocus
              />

            </label>

            <label>

              Category

              <select
                value={
                  category
                }
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target
                      .value
                  )
                }
              >

                {categories.map(
                  (
                    item
                  ) => (

                    <option
                      key={
                        item
                      }
                    >
                      {
                        item
                      }
                    </option>

                  )
                )}

              </select>

            </label>

            <label>

              Amount

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  amount
                }
                onChange={(
                  event
                ) =>
                  setAmount(
                    event.target
                      .value
                  )
                }
                placeholder="649"
              />

            </label>

            <label>

              Billing cycle

              <select
                value={
                  cycle
                }
                onChange={(
                  event
                ) =>
                  setCycle(
                    event.target
                      .value
                  )
                }
              >

                <option>
                  Monthly
                </option>

                <option>
                  Yearly
                </option>

              </select>

            </label>

            <label>

              Next payment

              <input
                type="date"
                value={
                  nextPayment
                }
                min={
                  getTodayISO()
                }
                onChange={(
                  event
                ) =>
                  setNextPayment(
                    event.target
                      .value
                  )
                }
                onClick={(
                  event
                ) => {
                  if (
                    typeof event
                      .currentTarget
                      .showPicker ===
                    "function"
                  ) {
                    event.currentTarget.showPicker();
                  }
                }}
              />

            </label>

            <label>

              Payment method

              <select
                value={
                  paymentMethod
                }
                onChange={(
                  event
                ) =>
                  setPaymentMethod(
                    event.target
                      .value
                  )
                }
              >

                <option>
                  Card
                </option>

                <option>
                  UPI
                </option>

                <option>
                  Bank account
                </option>

                <option>
                  Other
                </option>

              </select>

            </label>

          </div>

          <div className="trial-section">

            <label className="trial-check">

              <input
                type="checkbox"
                checked={
                  isTrialSubscription
                }
                onChange={(
                  event
                ) =>
                  setIsTrialSubscription(
                    event.target
                      .checked
                  )
                }
              />

              <span>
                This is a free trial
              </span>

            </label>

            {isTrialSubscription && (

              <label className="trial-date">

                Trial ends

                <input
                  type="date"
                  value={
                    trialEndDate
                  }
                  min={
                    getTodayISO()
                  }
                  onChange={(
                    event
                  ) =>
                    setTrialEndDate(
                      event.target
                        .value
                    )
                  }
                />

              </label>

            )}

          </div>

          <button
            className="primary-button full-width"
            type="submit"
          >

            {subscription
              ? (
                <>
                  <Edit3
                    size={16}
                  />

                  Save changes
                </>
              )
              : (
                <>
                  <Plus
                    size={17}
                  />

                  Add subscription
                </>
              )}

          </button>

        </form>

      </div>

    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  title =
    "Nothing here yet",
  text = "",
  action,
}) {
  return (
    <div className="empty-state">

      <strong>
        {
          title
        }
      </strong>

      {text && (
        <p>
          {
            text
          }
        </p>
      )}

      {action && (

        <button
          className="secondary-button"
          onClick={
            action
          }
        >

          <Plus
            size={15}
          />

          Add subscription

        </button>

      )}

    </div>
  );
}

export default App;