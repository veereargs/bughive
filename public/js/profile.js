const profileUser = requireAuth();

function showProfile(user) {
    $('bigAvatar').innerHTML = avatar(user, 'avatar-lg');
    $('pName').textContent = user.name;
    $('pEmail').textContent = user.email;
    $('pRole').innerHTML = badge(user.role);
    $('nameInput').value = user.name;
}

if (profileUser) {
    renderNavbar('profile');
    showProfile(profileUser);

    $('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await api('/auth/me', { method: 'PUT', body: { name: $('nameInput').value } });
            Auth.saveUser(res.user);
            showProfile(res.user);
            renderNavbar('profile');
            toast('Profile updated');
        } catch (err) { toast(err.message, 'error'); }
    });

    $('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await api('/auth/change-password', {
                method: 'PUT',
                body: { currentPassword: $('currentPassword').value, newPassword: $('newPassword').value }
            });
            Auth.save(res.token, res.user); // new token issued
            $('passwordForm').reset();
            toast('Password changed');
        } catch (err) { toast(err.message, 'error'); }
    });
}
