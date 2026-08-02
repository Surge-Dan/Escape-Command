// themes.js — 4 主题包
// 每个主题定义一组 CSS 变量，运行时通过 root view 的 .theme-{{id}} 类注入实现整体换肤
// preview 字段用于主题选择器里的色卡预览
// 注意：default 主题的 vars 与 app.wxss 中 page 的默认变量保持一致（暖棕褐品牌色 #C8956E）

const themes = [
  {
    id: 'default',
    name: '奶油暖棕',
    desc: '默认主题，温暖的奶白与棕褐',
    vars: {
      '--canvas': '#F5F3EF',
      '--brand': '#C8956E',
      '--brand-dark': '#A87B52',
      '--brand-tint': '#F5E6D8'
    },
    preview: '#F5E6D8'
  },
  {
    id: 'dark',
    name: '深夜墨色',
    desc: '深色模式，护眼夜行',
    vars: {
      '--canvas': '#1A1B1E',
      '--white': '#26282C',
      '--ink': '#EDEEF1',
      '--ink-soft': '#A0A4AD',
      '--ink-faint': '#6B7079',
      '--brand': '#C8956E',
      '--brand-dark': '#A87B52',
      '--brand-tint': '#2A2520',
      '--brand-weak': '#1F1C19',
      '--line': 'rgba(255, 255, 255, 0.08)'
    },
    preview: '#1A1B1E'
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
