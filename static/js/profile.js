document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    try {
        // 显示加载状态
        document.getElementById('conversion-count').textContent = '加载中...';
        document.getElementById('subtitle-count').textContent = '加载中...';
        document.getElementById('total-words').textContent = '加载中...';
        
        // 获取用户信息
        console.log('正在获取用户信息...');
        const userResponse = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user info');
        }

        const userData = await userResponse.json();
        console.log('用户信息:', userData);
        
        // 更新用户信息显示
        document.getElementById('profile-username').textContent = userData.username;
        document.getElementById('username').textContent = userData.username;
        
        // 格式化注册时间
        const registrationDate = new Date(userData.registration_date);
        document.getElementById('registration-date').textContent = registrationDate.toLocaleDateString();

        // 获取用户统计信息
        console.log('正在获取统计信息...');
        const statsResponse = await fetch('/api/user/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!statsResponse.ok) {
            throw new Error('Failed to fetch user stats');
        }

        const statsData = await statsResponse.json();
        console.log('统计信息:', statsData);
        
        // 更新统计信息显示
        document.getElementById('conversion-count').textContent = statsData.total_conversions || '0';
        document.getElementById('subtitle-count').textContent = statsData.total_subtitles || '0';
        document.getElementById('total-words').textContent = statsData.total_chars || '0';

        // 获取历史记录
        console.log('正在获取历史记录...');
        const historyResponse = await fetch('/api/user/history', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!historyResponse.ok) {
            throw new Error('Failed to fetch history');
        }

        const historyData = await historyResponse.json();
        console.log('历史记录:', historyData);
        
        const historyList = document.getElementById('history-list');
        
        // 移除加载提示
        const loadingElement = historyList.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (!historyData || historyData.length === 0) {
            console.log('没有历史记录');
            const emptyState = historyList.querySelector('.empty-state');
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }

        // 创建历史记录列表
        const historyContent = document.createElement('div');
        historyContent.className = 'history-content';
        
        historyData.forEach(record => {
            console.log('处理历史记录:', record);
            const recordElement = document.createElement('div');
            recordElement.className = 'history-item';
            
            const date = new Date(record.created_at);
            const formattedDate = date.toLocaleString();
            
            recordElement.innerHTML = `
                <div class="history-item-header">
                    <span class="history-date">${formattedDate}</span>
                    <span class="history-type">${record.subtitle_path ? '字幕生成' : '音频转换'}</span>
                </div>
                <div class="history-text">${record.text}</div>
                <div class="history-actions">
                    <a href="${record.audio_path}" class="download-button" download>下载音频</a>
                    ${record.subtitle_path ? `<a href="${record.subtitle_path}" class="download-button" download>下载字幕</a>` : ''}
                </div>
            `;
            
            historyContent.appendChild(recordElement);
        });

        // 清空现有内容
        while (historyList.firstChild) {
            historyList.removeChild(historyList.firstChild);
        }
        
        // 添加新内容
        historyList.appendChild(historyContent);

    } catch (error) {
        console.error('Error:', error);
        // 显示错误状态
        document.getElementById('conversion-count').textContent = '-';
        document.getElementById('subtitle-count').textContent = '-';
        document.getElementById('total-words').textContent = '-';
        
        // 显示错误提示
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = '加载数据失败，请刷新页面重试';
        document.querySelector('.profile-main').appendChild(errorMessage);
        
        // 隐藏加载提示
        const historyList = document.getElementById('history-list');
        const loadingElement = historyList.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // 显示错误状态
        const emptyState = historyList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.textContent = '加载失败，请刷新页面重试';
            emptyState.style.display = 'block';
        }
    }
}); 