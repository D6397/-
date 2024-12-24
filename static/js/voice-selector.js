async function loadVoices() {
    try {
        const response = await fetch('/api/voices');
        const voices = await response.json();
        
        const voiceList = document.getElementById('voiceList');
        voiceList.innerHTML = '';
        
        voices.forEach(voice => {
            const voiceOption = document.createElement('div');
            voiceOption.className = 'voice-option';
            voiceOption.setAttribute('data-voice', voice.name);
            
            // 处理性别显示
            let genderText = '未知';
            if (voice.gender === 'Female') {
                genderText = '女声';
            } else if (voice.gender === 'Male') {
                genderText = '男声';
            }
            
            voiceOption.innerHTML = `
                <div class="voice-info">
                    <div class="voice-description">${voice.description}</div>
                    <div class="voice-details">
                        <span class="voice-gender">${genderText}</span>
                        <span class="voice-language">${voice.language}</span>
                    </div>
                </div>
            `;
            voiceList.appendChild(voiceOption);

            // 更新选中声音的描述
            voiceOption.addEventListener('click', function() {
                document.querySelectorAll('.voice-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                // 更新顶部的声音描述
                const voiceDescription = document.getElementById('voiceDescription');
                if (voiceDescription) {
                    voiceDescription.textContent = voice.description;
                }
            });
        });

        // 默认选中第一个声音
        const firstVoice = voiceList.firstChild;
        if (firstVoice) {
            firstVoice.classList.add('selected');
            const voiceDescription = document.getElementById('voiceDescription');
            if (voiceDescription && voices.length > 0) {
                voiceDescription.textContent = voices[0].description;
            }
        }
    } catch (error) {
        console.error('Failed to load voices:', error);
        // 显示错误信息给用户
        const voiceList = document.getElementById('voiceList');
        if (voiceList) {
            voiceList.innerHTML = '<div class="voice-error">加载声音列表失败，请刷新页面重试</div>';
        }
    }
}

document.addEventListener('DOMContentLoaded', loadVoices);