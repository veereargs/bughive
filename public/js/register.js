if (Auth.isLoggedIn()) window.location.href = '/dashboard.html';

$('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
        const data = await api('/auth/register', {
            method: 'POST',
            body: {
                name: $('name').value,
                email: $('email').value,
                password: $('password').value,
                role: $('role').value
            }
        });
        Auth.save(data.token, data.user);
        toast('Account created!');
        setTimeout(() => (window.location.href = '/dashboard.html'), 600);
    } catch (err) {
        toast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
});