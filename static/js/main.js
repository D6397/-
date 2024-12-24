let currentAudioUrl = null;
let currentSubtitleUrl = null;

// 字符数限制
const MAX_CHARS = 3000;

// 声音描述映射
const voiceDescriptions = {
    'zh-CN-XiaoxiaoNeural': '小晓 - 温柔甜美的女声',
    'zh-CN-YunxiNeural': '云希 - 阳光活力的男声',
    'zh-CN-YunjianNeural': '云健 - 成熟稳重的男声',
    'zh-CN-XiaoyiNeural': '小艺 - 清新自然的女声',
    'zh-CN-YunyangNeural': '云扬 - 专业播音的男声',
    'zh-CN-XiaochenNeural': '小陈 - 知性优雅的女声',
    'zh-CN-XiaohanNeural': '小涵 - 温暖亲切的女声',
    'zh-CN-XiaomengNeural': '小梦 - 甜美可爱的女声',
    'zh-CN-XiaomoNeural': '小墨 - 清脆悦耳的女声',
    'zh-CN-XiaoqiuNeural': '小秋 - 温婉动人的女声',
    'zh-CN-XiaoruiNeural': '小蕊 - 活泼可爱的女声',
    'zh-CN-XiaoshuangNeural': '小双 - 青春活力的女声',
    'zh-CN-XiaoxuanNeural': '小轩 - 温和儒雅的女声',
    'zh-CN-XiaoyanNeural': '小妍 - 优雅大方的女声',
    'zh-CN-XiaozhenNeural': '小甄 - 知性成熟的女声'
};

// 更新剩余字符数
function updateRemainingChars() {
    const textInput = document.getElementById('textInput');
    if (!textInput) return;
    
    const remaining = MAX_CHARS - textInput.value.length;
    console.log('Remaining chars:', remaining);
}

// 清空文本
function clearText() {
    const textInput = document.getElementById('textInput');
    textInput.value = '';
    updateRemainingChars();
}

// 下载文件函数
async function downloadFile(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    } catch (error) {
        console.error('下载失败:', error);
        showMessage('下载失败，请重试', 'error');
    }
}

// 转换文本为语音
async function convertToSpeech() {
    try {
        const text = document.getElementById('textInput')?.value.trim();
        const subtitleCheckbox = document.getElementById('subtitleCheckbox');
        const selectedVoice = document.querySelector('input[name="voice"]:checked');
        const speedSlider = document.getElementById('speed');
        const pitchSlider = document.getElementById('pitch');
        const audioControls = document.querySelector('.audio-controls');
        const audioPlayer = document.getElementById('audioPlayer');
        const downloadButton = document.querySelector('.download-button.action-button:not(.subtitle-button)');
        const subtitleButton = document.querySelector('.download-button.action-button.subtitle-button');

        if (!text) {
            showMessage('请输入要转换的文本', 'error');
            return;
        }

        if (!selectedVoice) {
            showMessage('请选择一个声音', 'error');
            return;
        }

        const speedValue = speedSlider ? parseFloat(speedSlider.value) : 1.0;
        const pitchValue = pitchSlider ? parseFloat(pitchSlider.value) : 1.0;

        showMessage('正在转换中，请稍候...', 'info');

        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                voice: selectedVoice.value,
                subtitle: subtitleCheckbox?.checked || false,
                speed: speedValue,
                pitch: pitchValue
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '转换失败');
        }

        const data = await response.json();
        
        if (!data.audio_url) {
            throw new Error('服务器未返回音频URL');
        }

        if (audioPlayer) {
            audioPlayer.src = data.audio_url;
        }
        
        if (audioControls) {
            audioControls.style.display = 'flex';
        }

        // 更新音频下载按钮
        if (downloadButton) {
            downloadButton.onclick = () => {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                downloadFile(data.audio_url, `tts_${timestamp}.mp3`);
            };
        }

        // 更新字幕下载按钮
        if (subtitleButton) {
            if (data.subtitle_url) {
                subtitleButton.style.display = 'flex';
                subtitleButton.onclick = () => {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    downloadFile(data.subtitle_url, `tts_${timestamp}.srt`);
                };
            } else {
                subtitleButton.style.display = 'none';
            }
        }

        showMessage('转换成功！');
    } catch (error) {
        console.error('转换失败:', error);
        showMessage(error.message || '转换失败，请重试', 'error');
    }
}

// 加载声音列表
async function loadVoices() {
    try {
        const response = await fetch('/api/voices');
        const voices = await response.json();
        const voiceList = document.getElementById('voiceList');
        voiceList.innerHTML = ''; // 清空现有列表

        voices.forEach((voice, index) => {
            const voiceOption = document.createElement('div');
            voiceOption.className = 'voice-option';
            voiceOption.dataset.voice = voice.name;
            voiceOption.innerHTML = `
                <input type="radio" id="voice_${index}" name="voice" value="${voice.name}" ${index === 0 ? 'checked' : ''}>
                <label for="voice_${index}">
                    <div class="voice-details">
                        <span class="voice-name">${voiceDescriptions[voice.name]}</span>
                    </div>
                </label>
            `;
            voiceList.appendChild(voiceOption);

            // 为每个选项添加点击事件
            voiceOption.addEventListener('click', function(e) {
                const radio = this.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    updateVoiceDescription(radio.value);
                    localStorage.setItem('selectedVoice', radio.value);
                    
                    // 添加选中效果
                    document.querySelectorAll('.voice-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    this.classList.add('selected');
                }
            });
        });

        // 从localStorage恢复上次选择的声音
        const savedVoice = localStorage.getItem('selectedVoice');
        if (savedVoice) {
            const savedOption = voiceList.querySelector(`input[value="${savedVoice}"]`);
            if (savedOption) {
                savedOption.checked = true;
                savedOption.closest('.voice-option').classList.add('selected');
                updateVoiceDescription(savedVoice);
            }
        } else {
            // 默认选择第一个音
            const firstOption = voiceList.querySelector('.voice-option');
            if (firstOption) {
                const firstRadio = firstOption.querySelector('input[type="radio"]');
                firstRadio.checked = true;
                firstOption.classList.add('selected');
                updateVoiceDescription(firstRadio.value);
                localStorage.setItem('selectedVoice', firstRadio.value);
            }
        }
    } catch (error) {
        console.error('加载声音列表失败:', error);
        showMessage('加载声音列表失败', 'error');
    }
}

// 显示消息提示
function showMessage(message, type = 'success') {
    // 如果message是对象，尝试提取错误信息
    if (typeof message === 'object') {
        if (message.detail) {
            message = message.detail;
        } else if (message.message) {
            message = message.message;
        } else {
            message = '发生未知错误';
        }
    }

    // 移除现有消息
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
    messageElement.style.backgroundColor = type === 'success' ? '#4CAF50' : 
                                         type === 'error' ? '#f44336' : 
                                         type === 'info' ? '#2196F3' : '#4CAF50';
    messageElement.style.color = 'white';
    messageElement.style.zIndex = '1000';

    // 添加到页面
    document.body.appendChild(messageElement);

    // 3秒后移除
    setTimeout(() => {
        messageElement.remove();
    }, 3000);
}

// 更新声音描述
function updateVoiceDescription(voiceName) {
    const descriptionElement = document.getElementById('voiceDescription');
    if (descriptionElement && voiceDescriptions[voiceName]) {
        descriptionElement.textContent = voiceDescriptions[voiceName];
        
        // 添加过渡动画
        descriptionElement.style.opacity = '0';
        setTimeout(() => {
            descriptionElement.textContent = voiceDescriptions[voiceName];
            descriptionElement.style.opacity = '1';
        }, 150);
    }
}

// 在选择声音时更新描述
document.addEventListener('DOMContentLoaded', function() {
    const voiceList = document.getElementById('voiceList');
    if (voiceList) {
        voiceList.addEventListener('click', function(e) {
            const voiceOption = e.target.closest('.voice-option');
            if (voiceOption) {
                const voiceName = voiceOption.dataset.voice;
                updateVoiceDescription(voiceName);
            }
        });
    }
});

// 初始化文本
function initText() {
    const textInput = document.getElementById('textInput');
    const defaultText = "欢迎使用文本转语音服务！\n\n这是一段示例文本，您可以在这里输入任何想要转换的中文内容。我们提供多种专业的配音选择，可以生成自然流畅的语音。\n\n您还可以选择生成字幕，方便用于视频���作。";
    textInput.value = defaultText;
    updateRemainingChars();
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');

    // 加载声音列表
    loadVoices();

    // 绑定事件监听器
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.addEventListener('input', updateRemainingChars);
    }

    const clearTextBtn = document.getElementById('clearText');
    if (clearTextBtn) {
        clearTextBtn.addEventListener('click', clearText);
    }

    const initTextBtn = document.getElementById('initText');
    if (initTextBtn) {
        initTextBtn.addEventListener('click', initText);
    }

    const convertBtn = document.querySelector('.convert-button');
    if (convertBtn) {
        convertBtn.addEventListener('click', convertToSpeech);
    }

    // 初始化字符计数
    updateRemainingChars();

    // 初始化滑块
    initializeSliders();
});

// 初始化滑块
function initializeSliders() {
    const speedSlider = document.getElementById('speed');
    const pitchSlider = document.getElementById('pitch');
    const speedDisplay = document.getElementById('speedValue');
    const pitchDisplay = document.getElementById('pitchValue');

    // 更新块值的函数
    function updateSliderValue(slider, display) {
        if (!slider || !display) {
            console.error('Slider or display element not found:', slider?.id);
            return;
        }
        const value = parseFloat(slider.value).toFixed(1);
        display.textContent = value;
        console.log(`${slider.id} updated to:`, value);
    }

    // 为速度滑块添加事件监听
    if (speedSlider && speedDisplay) {
        console.log('Speed slider found:', speedSlider.id);
        // 使用 input 事件实时更新值
        speedSlider.addEventListener('input', () => {
            requestAnimationFrame(() => {
                updateSliderValue(speedSlider, speedDisplay);
            });
        });
        // 初始化速度显示
        updateSliderValue(speedSlider, speedDisplay);
    } else {
        console.error('Speed slider or display not found');
    }

    // 为音调滑块添加事件监听
    if (pitchSlider && pitchDisplay) {
        console.log('Pitch slider found:', pitchSlider.id);
        // 使用 input 事件实时更新值
        pitchSlider.addEventListener('input', () => {
            requestAnimationFrame(() => {
                updateSliderValue(pitchSlider, pitchDisplay);
            });
        });
        // 初始化音调显示
        updateSliderValue(pitchSlider, pitchDisplay);
    } else {
        console.error('Pitch slider or display not found');
    }

    // 在窗口加载完成后再次更新值
    window.addEventListener('load', () => {
        if (speedSlider && speedDisplay) {
            updateSliderValue(speedSlider, speedDisplay);
        }
        if (pitchSlider && pitchDisplay) {
            updateSliderValue(pitchSlider, pitchDisplay);
        }
    });
}