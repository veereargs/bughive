if (Auth.isLoggedIn()) window.location.href = '/dashboard.html';

$('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
        const data = await api('/auth/login', {
            method: 'POST',
            body: { email: $('email').value, password: $('password').value }
        });
        Auth.save(data.token, data.user);
        window.location.href = '/dashboard.html';
    } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Login';
    }
});
