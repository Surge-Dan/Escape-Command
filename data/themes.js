// themes.js — 4 主题包（浅雾蓝体系）
// 每个主题对应 app.wxss 中的一个 .theme-{id} 类，运行时通过 root view 注入类名换肤
// preview 字段用于主题选择器里的色卡预览

const themes = [
  {
    id: 'default',
    name: '浅雾蓝',
    desc: '默认主题，清透轻盈的雾蓝色',
    vars: {},
    preview: '#E8F4FC'
  },
  {
    id: 'dark',
    name: '深夜墨蓝',
    desc: '深色模式，护眼静谧的夜',
    vars: {},
    preview: '#152331'
  },
  {
    id: 'warm-orange',
    name: '黄昏紫调',
    desc: '温柔粉紫，像黄昏的余韵',
    vars: {},
    preview: '#F5F0F8'
  },
  {
    id: 'lavender',
    name: '薰衣草夜',
    desc: '淡雅紫色，适合夜晚',
    vars: {},
    preview: '#F0F0FA'
  }
]

module.exports = themes
