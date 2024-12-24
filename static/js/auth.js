// 显示/隐藏模态框
function showLoginModal() {
    document.getElementById('login-modal').classList.add('show');
}

function showRegisterModal() {
    document.getElementById('register-modal').classList.add('show');
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.remove('show');
}

function closeRegisterModal() {
    document.getElementById('register-modal').classList.remove('show');
}

// 切换登录/注册表单
function switchToRegister() {
    closeLoginModal();
    showRegisterModal();
}

function switchToLogin() {
    closeRegisterModal();
    showLoginModal();
}

// 处理登录
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        // 将数据转换为 x-www-form-urlencoded 格式
        const urlEncodedData = new URLSearchParams();
        urlEncodedData.append('username', formData.get('username'));
        urlEncodedData.append('password', formData.get('password'));

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: urlEncodedData.toString()
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('username', formData.get('username'));
            updateUserInterface(true);
            closeLoginModal();
            showMessage('登录成功！');
        } else {
            showMessage(data.detail || '登录失败，请重试', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('登录失败，请重试', 'error');
    }
}

// 处理注册
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    if (formData.get('password') !== formData.get('confirm_password')) {
        showMessage('两次输入的密码不一致', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password'),
            }),
        });

        const data = await response.json();

        if (response.ok) {
            closeRegisterModal();
            showLoginModal();
            showMessage('注册成功，请登录！');
        } else {
            showMessage(data.detail || '注册失败，请重试', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage('注册失败，请重试', 'error');
    }
}

// 处理登出
async function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}

// 更新用户界面
function updateUserInterface(isLoggedIn) {
    const guestButtons = document.getElementById('guest-buttons');
    const userMenu = document.getElementById('user-menu');
    
    if (!guestButtons || !userMenu) {
        // 如果在用户页面，这些元素可能不存在
        return;
    }

    if (isLoggedIn) {
        guestButtons.style.display = 'none';
        userMenu.style.display = 'block';
        const username = document.getElementById('username');
        if (username) {
            username.textContent = localStorage.getItem('username');
        }
    } else {
        guestButtons.style.display = 'block';
        userMenu.style.display = 'none';
    }
}

// 显示消息提示
function showMessage(message, type = 'success') {
    // 移除现有的消息
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.top = '20px';
    messageElement.style.right = '20px';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
    messageElement.style.color = 'white';
    messageElement.style.zIndex = '1000';

    // 添加到页面
    document.body.appendChild(messageElement);

    // 3秒后移除
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

// 检查登录状态
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        updateUserInterface(true);
    } else {
        updateUserInterface(false);
    }
}

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', checkAuthStatus);

// 用户菜单交互
document.addEventListener('DOMContentLoaded', () => {
    const userMenu = document.getElementById('user-menu');
    const userMenuButton = userMenu?.querySelector('.user-menu-button');
    
    if (userMenuButton) {
        userMenuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('active');
        });
        
        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                userMenu.classList.remove('active');
            }
        });
    }
});

// 退出登录
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/';
} 