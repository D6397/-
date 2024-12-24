const config = {
    maxChars: 3000,
    voices: [
        {
            id: '1506',
            name: 'al 阿乐-推荐朗读/短视频/播音员声',
            description: '示例',
            limit: '6000字符'
        },
        {
            id: '1501',
            name: 'jing 静静-标准通用女声 (暖甜队合成)',
            description: '示例',
            limit: '1000字符'
        },
        {
            id: '1515',
            name: 'long 小龙-通用/小说/故事/新闻男声 (暖甜队合成)',
            description: '示例',
            limit: '1000字符'
        }
    ],
    steps: [
        {
            icon: 'file-text',
            title: '准备文本',
            description: '将您想要转换的文本复制到输入框中'
        },
        {
            icon: 'user-cog',
            title: '选择声音',
            description: '从多种声音中选择最适合您需求的声音'
        },
        {
            icon: 'file-edit',
            title: '调整设置',
            description: '根据需要调整语速、音调等参数'
        },
        {
            icon: 'volume',
            title: '生成语音',
            description: '点击转换按钮，即可生成高质量的语音文件'
        }
    ]
};