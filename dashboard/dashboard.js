(function() {
    'use strict';

    // ================================================================
    // SUPABASE CLIENT
    // ================================================================
    const SUPABASE_URL = 'https://ftppbncvrkygiuladcbx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0cHBibmN2cmt5Z2l1bGFkY2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MjU4ODksImV4cCI6MjEwMzUwMTg4OX0.5Ceke0GGQcpXvcGWdu9ZW0pHE0vgz1qqCrrpj_P7rsc';

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
