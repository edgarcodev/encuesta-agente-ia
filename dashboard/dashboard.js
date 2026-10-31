(function() {
    'use strict';

    // ================================================================
    // SUPABASE CLIENT — variables inyectadas por el build
    // ================================================================
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ================================================================
    // REQUIRE AUTH — redirect to /login if no session
    // ================================================================
    async function requireAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/login';
            return null;
        }
        return session;
    }

    // ================================================================
    // SIGN OUT
    // ================================================================
    async function signOut() {
        await supabase.auth.signOut();
        window.location.href = '/login';
    }

    // ================================================================
    // INIT
    // ================================================================
    async function init() {
        const session = await requireAuth();
        if (!session) return;

        // Show user email
        const emailEl = document.getElementById('userEmail');
        if (emailEl && session.user.email) {
            emailEl.textContent = session.user.email;
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', signOut);
        }
    }

    window.addEventListener('load', init);
})();
