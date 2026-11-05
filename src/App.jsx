import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import OwnerDashboard from "./components/OwnerDashboard";
import StaffDashboard from "./components/StaffDashboard";

//SECTION 01 - NAVIGATION MENU



// SECTION 21 - LOGIN AND AUTHENTICATION

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;

      if (error) setError(error.message);
      setSession(data?.session ?? null);
      if (data?.session?.user) {
        setRoleLoading(true);

        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .single();

        if (!roleError) {
          setUserRole(roleData.role);
        } else {
          setError("Unable to load user role: " + roleError.message);
        }

        setRoleLoading(false);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", (await supabase.auth.getUser()).data.user.id)
        .single();

      if (roleError) throw roleError;

      setUserRole(roleData.role);
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f9f8fc]">
        <p className="text-sm text-[#716a7d]">Checking your session...</p>
      </div>
    );
  }
  if (session && (roleLoading || !userRole)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f9f8fc]">
        <p className="text-sm text-[#716a7d]">Loading your dashboard...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4fc] p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-2xl border border-[#ebe7f0] bg-white p-8 shadow-sm"
        >
          <div className="mb-7 text-center">
            <div className="mb-3 text-5xl text-[#6944cf]">♢</div>
            <h1 className="text-2xl font-bold text-[#261a45]">ARJ Inventory</h1>
            <p className="mt-2 text-sm text-[#817b8c]">
              Sign in to manage your inventory
            </p>
          </div>

          <label className="mb-2 block text-sm font-medium">
            Email address
          </label>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-[#e5dfed] px-4 py-3 outline-none focus:border-[#7854db]"
            placeholder="you@example.com"
          />

          <label className="mb-2 block text-sm font-medium">Password</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#e5dfed] px-4 py-3 outline-none focus:border-[#7854db]"
            placeholder="Enter your password"
          />

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-[#5934c5] py-3 font-medium text-white hover:bg-[#4825ac] disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-5 text-center text-xs text-[#817b8c]">
            Access is restricted to authorized accounts.
          </p>
        </form>
      </main>
    );
  }

  if (userRole === "owner") {
    return <OwnerDashboard onSignOut={handleSignOut} />;
  }

  if (userRole === "staff") {
    return <StaffDashboard onSignOut={handleSignOut} />;
  }

  return null;
}

export default App;
