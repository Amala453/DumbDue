import { supabase } from "./supabase";

/*
  Convert a DumbDue subscription object
  into the format used by Supabase.
*/
function toDatabaseRow(subscription, userId) {
  return {
    id: subscription.id,
    user_id: userId,

    name: subscription.name,
    category: subscription.category,

    amount: Number(
      subscription.amount || 0
    ),

    currency:
      subscription.currency || "₹",

    cycle:
      subscription.cycle || "Monthly",

    next_payment:
      subscription.nextPayment || null,

    payment_method:
      subscription.paymentMethod || null,

    is_trial:
      Boolean(subscription.isTrial),

    trial_end_date:
      subscription.trialEndDate || null,

    status:
      subscription.status || "Active",

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

    category: row.category,

    amount:
      Number(row.amount || 0),

    currency:
      row.currency || "₹",

    cycle:
      row.cycle || "Monthly",

    nextPayment:
      row.next_payment || "",

    paymentMethod:
      row.payment_method || "Card",

    isTrial:
      Boolean(row.is_trial),

    trialEndDate:
      row.trial_end_date || null,

    status:
      row.status || "Active",

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
  Load all subscriptions belonging
  to the logged-in user.
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
      .from("subscriptions")
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
  Save one subscription to the cloud.
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
      .from("subscriptions")
      .upsert(
        row,
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
  Save the entire current subscription
  list to the cloud.

  Existing rows are updated.
  Removed rows are deleted.
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
    Get the subscription IDs that currently
    exist in the app.
  */
  const currentIds =
    subscriptions.map(
      (subscription) =>
        subscription.id
    );

  /*
    Save current rows.
  */
  if (rows.length > 0) {
    const {
      error,
    } =
      await supabase
        .from("subscriptions")
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
    Find cloud rows for this user.
  */
  const {
    data: existingRows,
    error: fetchError,
  } =
    await supabase
      .from("subscriptions")
      .select("id")
      .eq(
        "user_id",
        user.id
      );

  if (fetchError) {
    throw fetchError;
  }

  /*
    Delete cloud rows that no longer
    exist in the app.
  */
  const idsToDelete =
    (existingRows || [])
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
        .from("subscriptions")
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
  One-time migration:
  copy existing local subscriptions
  to the cloud, but only when the
  cloud account has no subscriptions.
*/
export async function migrateLocalSubscriptions(
  localSubscriptions
) {
  const cloud =
    await loadCloudSubscriptions();

  /*
    Cloud already has data.
    Never overwrite it with local data.
  */
  if (
    cloud.length > 0
  ) {
    return {
      source: "cloud",
      subscriptions:
        cloud,
    };
  }

  /*
    Cloud is empty and local has data.
    Migrate local data.
  */
  if (
    localSubscriptions.length >
    0
  ) {
    await saveAllCloudSubscriptions(
      localSubscriptions
    );

    return {
      source: "local",
      subscriptions:
        localSubscriptions,
    };
  }

  /*
    Both are empty.
  */
  return {
    source: "empty",
    subscriptions: [],
  };
}