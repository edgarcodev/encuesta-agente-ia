(function() {
    'use strict';

    // ================================================================
    // SUPABASE CLIENT — variables inyectadas por el build
    // ================================================================
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ================================================================
    // CHECK IF ALREADY LOGGED IN
    // ================================================================
    async function checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            window.location.href = '/dashboard';
        }
    }

    // ================================================================
    // LOGIN FORM HANDLER
    // ================================================================
    function init() {
        checkSession();

        const form = document.getElementById('loginForm');
        const errorDiv = document.getElementById('loginError');
        const loginBtn = document.getElementById('loginBtn');

        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // UI loading state
            loginBtn.disabled = true;
            loginBtn.textContent = 'Iniciando sesión...';
            errorDiv.style.display = 'none';

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    showError(error.message);
                    return;
                }

                if (data.session) {
                    window.location.href = '/dashboard';
                }
            } catch (err) {
                showError('Error de conexión. Intenta de nuevo.');
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Iniciar sesión';
            }
        });
    }

    function showError(message) {
        const errorDiv = document.getElementById('loginError');
        // Map Supabase error messages to user-friendly Spanish messages
        const messages = {
            'Invalid login credentials': 'Credenciales incorrectas. Verifica tu correo y contraseña.',
            'Email not confirmed': 'Tu correo no ha sido verificado. Contacta al administrador.',
            'User not found': 'No existe una cuenta con este correo.',
            'Invalid email': 'El formato del correo no es válido.',
        };

        const friendlyMessage = messages[message] || message;
        errorDiv.textContent = friendlyMessage;
        errorDiv.style.display = 'block';
    }

    window.addEventListener('load', init);
})();
