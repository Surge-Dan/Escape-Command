// themes.js — 3 主题包
// 每个主题定义一组 CSS 变量，运行时注入 :root 实现整体换肤
// preview 字段用于主题选择器里的色卡预览

const themes = [
  {
    id: 'default',
    name: '暖白原野',
    desc: '默认主题，温暖的奶白色调',
    vars: {
      '--canvas': '#F5F3EF',
      '--brand': '#5CBF9E',
      '--brand-dark': '#45B08C',
      '--brand-tint': '#E0F5EF'
    },
    preview: '#F5F3EF'
  },
  {
    id: 'warm-orange',
    name: '黄昏暖橙',
    desc: '温暖的橙色调，像黄昏的光',
    vars: {
      '--canvas': '#FFF8F0',
      '--brand': '#D98A5C',
      '--brand-dark': '#B87042',
      '--brand-tint': '#FFE8D6'
    },
    preview: '#FFE8D6'
  },
  {
    id: 'lavender',
    name: '薰衣草夜',
    desc: '安静的紫色调，适合夜晚',
    vars: {
      '--canvas': '#F5F0FA',
      '--brand': '#9B7BB8',
      '--brand-dark': '#7B5B98',
      '--brand-tint': '#E8D5F5'
    },
    preview: '#E8D5F5'
  }
]

module.exports = themes
