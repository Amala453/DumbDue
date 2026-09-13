import { supabase } from "./supabase";

/*
  Convert a DumbDue subscription object
  into the format used by Supabase.
*/
function toDatabaseRow(
  subscription,
  userId
) {
  return {
    id: subscription.id,

    user_id: userId,

    name: subscription.name,

    category:
      subscription.category,

    amount: Number(
      subscription.amount || 0
    ),

    currency:
      subscription.currency || "₹",

    cycle:
      subscription.cycle ||
      "Monthly",

    next_payment:
      subscription.nextPayment ||
      null,

    payment_method:
      subscription.paymentMethod ||
      null,

    is_trial:
      Boolean(
        subscription.isTrial
      ),

    trial_end_date:
      subscription.trialEndDate ||
      null,

    status:
      subscription.status ||
      "Active",

    payment_history:
      Array.isArray(
        subscription.paymentHistory
      )
        ? subscription.paymentHistory
        : [],

    updated_at:
      new Date().toISOString(),
  };
}

/*
  Convert a Supabase row back into
  DumbDue's existing format.
*/
function fromDatabaseRow(row) {
  return {
    id: row.id,

    name: row.name,

    category:
      row.category,

    amount:
      Number(
        row.amount || 0
      ),

    currency:
      row.currency || "₹",

    cycle:
      row.cycle || "Monthly",

    nextPayment:
      row.next_payment || "",

    paymentMethod:
      row.payment_method ||
      "Card",

    isTrial:
      Boolean(
        row.is_trial
      ),

    trialEndDate:
      row.trial_end_date ||
      null,

    status:
      row.status ||
      "Active",

    paymentHistory:
      Array.isArray(
        row.payment_history
      )
        ? row.payment_history
        : [],

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
  };
}

/*
  Get the currently logged-in user.
*/
export async function getCurrentUser() {
  const {
    data,
    error,
  } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

/*
  Load ONLY the subscriptions belonging
  to the currently logged-in user.

  IMPORTANT:
  We never read localStorage here.
*/
export async function loadCloudSubscriptions() {
  const user =
    await getCurrentUser();

  if (!user) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "subscriptions"
      )
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .order(
        "next_payment",
        {
          ascending: true,
          nullsFirst: false,
        }
      );

  if (error) {
    throw error;
  }

  return (
    data || []
  ).map(
    fromDatabaseRow
  );
}

/*
  Save one subscription.
*/
export async function saveCloudSubscription(
  subscription
) {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "No logged-in user found."
    );
  }

  const row =
    toDatabaseRow(
      subscription,
      user.id
    );

  const {
    error,
  } =
    await supabase
      .from(
        "subscriptions"
      )
      .upsert(
        row,
        {
          onConflict: "id",
        }
      );

  if (error) {
    throw error;
  }
}

/*
  Save the complete subscription list
  for the CURRENT logged-in user.

  There is intentionally NO localStorage
  migration in this function.
*/
export async function saveAllCloudSubscriptions(
  subscriptions
) {
  const user =
    await getCurrentUser();

  if (!user) {
    throw new Error(
      "No logged-in user found."
    );
  }

  const rows =
    subscriptions.map(
      (subscription) =>
        toDatabaseRow(
          subscription,
          user.id
        )
    );

  /*
    Save current subscriptions.
  */
  if (
    rows.length > 0
  ) {
    const {
      error,
    } =
      await supabase
        .from(
          "subscriptions"
        )
        .upsert(
          rows,
          {
            onConflict:
              "id",
          }
        );

    if (error) {
      throw error;
    }
  }

  /*
    Find rows owned by THIS user only.
  */
  const {
    data: existingRows,
    error: fetchError,
  } =
    await supabase
      .from(
        "subscriptions"
      )
      .select("id")
      .eq(
        "user_id",
        user.id
      );

  if (fetchError) {
    throw fetchError;
  }

  /*
    IDs currently in the app.
  */
  const currentIds =
    subscriptions.map(
      (subscription) =>
        subscription.id
    );

  /*
    Delete ONLY this user's cloud rows
    that no longer exist locally.
  */
  const idsToDelete =
    (
      existingRows || []
    )
      .map(
        (row) =>
          row.id
      )
      .filter(
        (id) =>
          !currentIds.includes(
            id
          )
      );

  if (
    idsToDelete.length >
    0
  ) {
    const {
      error:
        deleteError,
    } =
      await supabase
        .from(
          "subscriptions"
        )
        .delete()
        .eq(
          "user_id",
          user.id
        )
        .in(
          "id",
          idsToDelete
        );

    if (deleteError) {
      throw deleteError;
    }
  }
}

/*
  IMPORTANT SECURITY CHANGE

  This function keeps the same name so
  your existing App.jsx does not need to
  be rewritten.

  It completely ignores localSubscriptions.

  A newly logged-in account therefore
  NEVER receives another account's
  browser-local subscriptions.
*/
export async function migrateLocalSubscriptions(
  localSubscriptions
) {
  const cloud =
    await loadCloudSubscriptions();

  return {
    source: "cloud",
    subscriptions:
      cloud,
  };
}