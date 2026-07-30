// data/guangzhou-districts.js
// 广州 11 区数据（C-P3 任务大厅城市数据）
// 纯数据模块，零 wx 依赖

'use strict'

const GUANGZHOU_DISTRICTS = [
  {
    id: 'gz_th',
    name: '天河区',
    alias: '天河',
    color: '#C8956E',
    tags: ['商圈', '文艺', '年轻'],
    description: '广州新中轴线，CBD 与文艺街区并存，太古汇、天河公园、红专厂创意园'
  },
  {
    id: 'gz_yx',
    name: '越秀区',
    alias: '越秀',
    color: '#A87B52',
    tags: ['老城', '人文', '历史'],
    description: '广州老城核心，二沙岛、北京路、东山口洋楼群，城市漫游首选'
  },
  {
    id: 'gz_hz',
    name: '海珠区',
    alias: '海珠',
    color: '#7BA098',
    tags: ['江景', '创意', '生活'],
    description: '珠江以南，TIT 创意园、琶醍、江南西，江景与市井交融'
  },
  {
    id: 'gz_lw',
    name: '荔湾区',
    alias: '荔湾',
    color: '#B8A589',
    tags: ['西关', '美食', '老广'],
    description: '西关风情核心区，永庆坊、沙面、上下九，老广州味道'
  },
  {
    id: 'gz_by',
    name: '白云区',
    alias: '白云',
    color: '#8FA86F',
    tags: ['自然', '户外', '山景'],
    description: '白云山脚下，自然生态与市井生活结合，适合户外出逃'
  },
  {
    id: 'gz_py',
    name: '番禺区',
    alias: '番禺',
    color: '#9B7BB8',
    tags: ['休闲', '市井', '美食'],
    description: '岭南文化发源地之一，沙湾古镇、余荫山房，老番禺味道'
  },
  {
    id: 'gz_hp',
    name: '黄埔区',
    alias: '黄埔',
    color: '#6B8E9E',
    tags: ['历史', '海丝', '科技'],
    description: '海上丝绸之路起点，黄埔军校、南海神庙、长洲岛，历史与现代科技并存'
  },
  {
    id: 'gz_hd',
    name: '花都区',
    alias: '花都',
    color: '#C7A03E',
    tags: ['自然', '度假', '山水'],
    description: '广州北部门户，芙蓉嶂、九龙湖、花都湖，山水度假首选'
  },
  {
    id: 'gz_ch',
    name: '从化区',
    alias: '从化',
    color: '#5A9367',
    tags: ['温泉', '森林', '生态'],
    description: '广州后花园，流溪河、石门森林、温泉镇，生态康养胜地'
  },
  {
    id: 'gz_zc',
    name: '增城区',
    alias: '增城',
    color: '#B85C5C',
    tags: ['山水', '古村', '绿道'],
    description: '广州东部生态屏障，白水寨、增江画廊、正果老街，山水与古村交融'
  },
  {
    id: 'gz_ns',
    name: '南沙区',
    alias: '南沙',
    color: '#4A90A4',
    tags: ['滨海', '湿地', '湾区'],
    description: '广州南端出海口，南沙湿地、天后宫、百万葵园，湾区滨海风情'
  }
]

function getDistrictByName(name) {
  if (typeof name !== 'string') return null
  return GUANGZHOU_DISTRICTS.find(function (d) {
    return d.name === name || d.alias === name
  }) || null
}

function getDistrictById(id) {
  if (typeof id !== 'string') return null
  return GUANGZHOU_DISTRICTS.find(function (d) { return d.id === id }) || null
}

module.exports = {
  GUANGZHOU_DISTRICTS: GUANGZHOU_DISTRICTS,
  getDistrictByName: getDistrictByName,
  getDistrictById: getDistrictById
}
