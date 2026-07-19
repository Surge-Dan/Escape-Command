/**
 * 出逃指令 · v3 水彩厚涂风格 SVG 图标生成器
 * 
 * 使用 SVG 原生滤镜模拟水彩效果：
 * - feTurbulence + feColorMatrix: 纸张纹理
 * - feGaussianBlur + feOffset: 柔和投影
 * - radialGradient / linearGradient: 水彩渐变
 * - feDisplacementMap: 边缘不规则（手绘感）
 * 
 * 输出: assets/icons-v3/*.svg
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'icons-v3');

// ===== 色彩系统 =====
const COLORS = {
  // 容器
  paperBg: '#F4EFE3',
  paperEdge: '#E8DFC9',
  paperShadow: '#D4C9A8',
  highlight: '#FFFFFF',
  // 类型色
  blue: { main: '#5B8FB9', light: '#8FB5D1', accent: '#F5C28A' },
  coral: { main: '#D98A5C', light: '#E8AE89', accent: '#A8C97F' },
  lavender: { main: '#9B7BB8', light: '#BFA5D1', accent: '#F5D88A' },
  gold: { main: '#C9B037', light: '#DBC664', accent: '#8B7B5C' },
  brown: { main: '#A67C52', light: '#C49A75', accent: '#E8B5A0' },
  mint: { main: '#5CBF9E', light: '#86D4B8', accent: '#F5E6C8' },
  // 中性
  ink: '#4A5568',
  inkLight: '#A8ADB5',
  cream: '#F5E6C8',
  white: '#FFFFFF',
  goldActive: '#C9B037',
  warmOrange: '#F5C28A',
};

// ===== SVG 滤镜定义（所有图标共用） =====
function getDefs(idSuffix = '') {
  return `
  <defs>
    <!-- 纸张纹理 -->
    <filter id="paper${idSuffix}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" seed="2" result="noise"/>
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.93  0 0 0 0 0.91  0 0 0 0 0.85  0 0 0 0.08 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <!-- 水彩晕染 -->
    <filter id="watercolor${idSuffix}" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" seed="5" result="turb"/>
      <feDisplacementMap in="SourceGraphic" in2="turb" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <!-- 柔和投影 -->
    <filter id="dropShadow${idSuffix}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
      <feOffset dx="0.5" dy="1.5" result="shadow"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.25"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- 内高光 -->
    <filter id="innerGlow${idSuffix}" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.5"/>
      <feOffset dx="0" dy="-0.5" result="glow"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <!-- 水彩边缘不规则 -->
    <filter id="handDrawn${idSuffix}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="2" seed="3" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="0.8"/>
    </filter>
  </defs>`;
}

// ===== 容器（圆角矩形 + 纸纹底） =====
function container(active = false) {
  const bg = active ? '#FFF7E0' : COLORS.paperBg;
  const stroke = active ? COLORS.goldActive : COLORS.paperEdge;
  const sw = active ? 1.5 : 1;
  return `
    <!-- 容器底色 -->
    <rect x="2" y="2" width="44" height="44" rx="10" ry="10" fill="${bg}" stroke="${stroke}" stroke-width="${sw}"/>
    <!-- 纸张纹理叠加 -->
    <rect x="2" y="2" width="44" height="44" rx="10" ry="10" fill="${COLORS.paperEdge}" opacity="0.15" filter="url(#paper${active ? 'A' : ''})"/>
    <!-- 容器底部阴影 -->
    <ellipse cx="24" cy="44" rx="16" ry="1.5" fill="#000000" opacity="0.06"/>`;
}

// ===== 微配件（随机选 3-4 个） =====
function microAccessories(seed = 0) {
  const items = [
    // 叶子（需要旋转参数）
    (x, y, rot) => `<g transform="translate(${x},${y}) rotate(${rot})"><path d="M0,0 Q2,-3 0,-6 Q-2,-3 0,0 Z" fill="${COLORS.mint.main}" opacity="0.5"/></g>`,
    // 水滴
    (x, y) => `<circle cx="${x}" cy="${y}" r="1" fill="${COLORS.blue.light}" opacity="0.6"/>`,
    // 星点
    (x, y) => `<g transform="translate(${x},${y})"><path d="M0,-1.5 L0.4,-0.4 L1.5,0 L0.4,0.4 L0,1.5 L-0.4,0.4 L-1.5,0 L-0.4,-0.4 Z" fill="${COLORS.gold.light}" opacity="0.7"/></g>`,
    // 小圆点（忽略第三个参数，始终用固定颜色）
    (x, y) => `<circle cx="${x}" cy="${y}" r="0.8" fill="${COLORS.coral.accent}" opacity="0.5"/>`,
    // 麻绳结
    (x, y) => `<circle cx="${x}" cy="${y}" r="1.2" fill="none" stroke="${COLORS.brown.main}" stroke-width="0.5" opacity="0.5"/>`,
  ];
  // 根据种子选 3 个
  const positions = [
    { x: 8, y: 10, r: -20 }, { x: 38, y: 12, r: 15 }, { x: 10, y: 38, r: 30 },
    { x: 36, y: 36, r: -10 }, { x: 40, y: 24, r: 0 }, { x: 8, y: 24, r: 45 },
  ];
  const picked = [];
  for (let i = 0; i < 3; i++) {
    const idx = (seed + i * 2) % items.length;
    const pos = positions[(seed + i) % positions.length];
    // 叶子需要旋转参数，其他忽略
    if (idx === 0) {
      picked.push(items[idx](pos.x, pos.y, pos.r));
    } else {
      picked.push(items[idx](pos.x, pos.y));
    }
  }
  return picked.join('\n    ');
}

// ===== 图标绘制函数 =====
// 每个函数返回主体 SVG 内容（不含容器和 defs）

// --- A1/A2: 出逃（门） ---
function drawDoor(active, color) {
  const c = active ? { main: '#8B6B3D', light: '#A67C52' } : { main: COLORS.brown.main, light: COLORS.brown.light };
  const lightColor = active ? COLORS.warmOrange : '#F5C28A';
  return `
    <!-- 门框 -->
    <rect x="12" y="12" width="20" height="26" rx="2" fill="${c.light}" stroke="${c.main}" stroke-width="1" filter="url(#handDrawn)"/>
    <!-- 门板（半开） -->
    <rect x="14" y="14" width="16" height="22" rx="1" fill="${c.main}" opacity="0.85" filter="url(#handDrawn)"/>
    <!-- 门缝光线 -->
    <rect x="12" y="14" width="3" height="22" fill="${lightColor}" opacity="${active ? 0.9 : 0.6}"/>
    <!-- 黄铜把手 -->
    <circle cx="26" cy="26" r="1.5" fill="${COLORS.gold.main}" stroke="${COLORS.gold.accent}" stroke-width="0.5" filter="url(#dropShadow)"/>
    <circle cx="26" cy="26" r="0.5" fill="${COLORS.highlight}" opacity="0.8"/>
    <!-- 欢迎地垫 -->
    <rect x="16" y="36" width="14" height="3" rx="0.5" fill="${COLORS.brown.accent}" opacity="0.6"/>
    <!-- 光晕粒子 -->
    <circle cx="13" cy="20" r="0.5" fill="${lightColor}" opacity="0.8"/>
    <circle cx="13" cy="28" r="0.4" fill="${lightColor}" opacity="0.6"/>`;
}

// --- A3/A4: 地图 ---
function drawMap(active, color) {
  const paperColor = active ? '#FFF5D6' : COLORS.cream;
  const pinColor = active ? COLORS.mint.main : COLORS.mint.light;
  return `
    <!-- 地图折叠形状 -->
    <path d="M10,14 L20,12 L28,14 L38,12 L38,34 L28,36 L20,34 L10,36 Z" fill="${paperColor}" stroke="${COLORS.paperShadow}" stroke-width="0.8" filter="url(#handDrawn)"/>
    <!-- 折痕 -->
    <line x1="20" y1="12" x2="20" y2="34" stroke="${COLORS.paperShadow}" stroke-width="0.5" opacity="0.5"/>
    <line x1="28" y1="14" x2="28" y2="36" stroke="${COLORS.paperShadow}" stroke-width="0.5" opacity="0.5"/>
    <!-- 路径 -->
    <path d="M14,20 Q20,18 24,24 T34,28" fill="none" stroke="${COLORS.brown.main}" stroke-width="0.8" stroke-dasharray="1.5,1" opacity="0.7"/>
    <!-- 定位针 -->
    <g transform="translate(24,18)" filter="url(#dropShadow)">
      <path d="M0,0 C-3,0 -3,-4 0,-4 C3,-4 3,0 0,0 Z" fill="${pinColor}"/>
      <circle cx="0" cy="-2" r="1" fill="${COLORS.highlight}" opacity="0.8"/>
    </g>
    <!-- 小树 -->
    <circle cx="32" cy="22" r="1.5" fill="${COLORS.mint.main}" opacity="0.6"/>
    <rect x="31.5" y="23" width="1" height="2" fill="${COLORS.brown.main}" opacity="0.5"/>`;
}

// --- A5/A6: 我的（人形） ---
function drawProfile(active, color) {
  const skinColor = '#E8B5A0';
  const clothColor = active ? COLORS.cream : '#F5E6C8';
  return `
    <!-- 肩膀 -->
    <path d="M12,36 Q12,28 24,28 Q36,28 36,36 L36,40 L12,40 Z" fill="${clothColor}" stroke="${COLORS.paperShadow}" stroke-width="0.8" filter="url(#handDrawn)"/>
    <!-- 领口 -->
    <path d="M20,30 Q24,32 28,30" fill="none" stroke="${COLORS.paperShadow}" stroke-width="0.5" opacity="0.5"/>
    <!-- 脖子 -->
    <rect x="22" y="22" width="4" height="6" rx="1" fill="${skinColor}" opacity="0.8"/>
    <!-- 头部 -->
    <circle cx="24" cy="17" r="7" fill="${skinColor}" stroke="${COLORS.brown.accent}" stroke-width="0.5" filter="url(#dropShadow)"/>
    <!-- 头发 -->
    <path d="M17,15 Q18,10 24,10 Q30,10 31,15 Q31,12 24,12 Q17,12 17,15 Z" fill="${COLORS.brown.main}" opacity="0.7"/>
    <!-- 微笑 -->
    <path d="M22,19 Q24,20 26,19" fill="none" stroke="${COLORS.ink}" stroke-width="0.6" stroke-linecap="round"/>
    <!-- 腮红 -->
    <circle cx="20" cy="19" r="1" fill="#F5A8A0" opacity="0.5"/>
    <circle cx="28" cy="19" r="1" fill="#F5A8A0" opacity="0.5"/>
    <!-- 装饰花 -->
    <circle cx="18" cy="14" r="1" fill="${COLORS.lavender.main}" opacity="0.6"/>
    <circle cx="30" cy="14" r="1" fill="${COLORS.lavender.main}" opacity="0.6"/>`;
}

// --- B1: 左箭头 ---
function drawChevronLeft(color) {
  return `
    <path d="M30,14 L18,24 L30,34" fill="none" stroke="${COLORS.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#dropShadow)"/>
    <path d="M30,14 L18,24 L30,34" fill="none" stroke="${COLORS.highlight}" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>`;
}

// --- B2: 右箭头（细） ---
function drawChevronRight(faint) {
  const c = faint ? COLORS.inkLight : COLORS.ink;
  return `
    <path d="M18,14 L30,24 L18,34" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" filter="url(#dropShadow)"/>`;
}

// --- B3: 对勾 ---
function drawCheck(color) {
  return `
    <path d="M14,24 L21,31 L34,16" fill="none" stroke="${COLORS.mint.main}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#dropShadow)"/>
    <path d="M14,24 L21,31 L34,16" fill="none" stroke="${COLORS.highlight}" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/>`;
}

// --- B4: X ---
function drawX(color) {
  return `
    <path d="M16,16 L32,32 M32,16 L16,32" stroke="${COLORS.inkLight}" stroke-width="2.5" stroke-linecap="round" filter="url(#dropShadow)"/>`;
}

// --- B5: 刷新 ---
function drawRefresh(color) {
  return `
    <path d="M30,14 A10,10 0 1,0 34,30" fill="none" stroke="${COLORS.blue.main}" stroke-width="2.5" stroke-linecap="round" filter="url(#dropShadow)"/>
    <path d="M30,14 L34,11 L34,18 Z" fill="${COLORS.blue.main}" filter="url(#dropShadow)"/>
    <path d="M34,30 L30,33 L30,26 Z" fill="${COLORS.blue.main}" filter="url(#dropShadow)" opacity="0.7"/>`;
}

// --- B6: 更多（三点） ---
function drawMoreDots(color) {
  return `
    <circle cx="16" cy="24" r="2" fill="${COLORS.ink}" filter="url(#dropShadow)"/>
    <circle cx="24" cy="24" r="2" fill="${COLORS.ink}" filter="url(#dropShadow)"/>
    <circle cx="32" cy="24" r="2" fill="${COLORS.ink}" filter="url(#dropShadow)"/>
    <circle cx="16" cy="23.5" r="0.6" fill="${COLORS.highlight}" opacity="0.6"/>
    <circle cx="24" cy="23.5" r="0.6" fill="${COLORS.highlight}" opacity="0.6"/>
    <circle cx="32" cy="23.5" r="0.6" fill="${COLORS.highlight}" opacity="0.6"/>`;
}

// --- B7: 靶心 ---
function drawTarget(color) {
  return `
    <circle cx="24" cy="24" r="10" fill="none" stroke="${COLORS.ink}" stroke-width="1.5" opacity="0.5" filter="url(#handDrawn)"/>
    <circle cx="24" cy="24" r="6" fill="none" stroke="${COLORS.ink}" stroke-width="1.5" opacity="0.7" filter="url(#handDrawn)"/>
    <circle cx="24" cy="24" r="2.5" fill="${COLORS.ink}" filter="url(#dropShadow)"/>
    <circle cx="24" cy="23.5" r="0.8" fill="${COLORS.highlight}" opacity="0.6"/>`;
}

// --- B8: 齿轮 ---
function drawSettings(color) {
  const c = COLORS.mint;
  return `
    <g transform="translate(24,24)" filter="url(#dropShadow)">
      ${Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45) * Math.PI / 180;
        const x1 = Math.cos(a) * 7, y1 = Math.sin(a) * 7;
        const x2 = Math.cos(a) * 10, y2 = Math.sin(a) * 10;
        return `<rect x="${Math.min(x1, x2) - 1.5}" y="${Math.min(y1, y2) - 1.5}" width="3" height="3" rx="0.5" fill="${c.main}" transform="rotate(${i * 45})"/>`;
      }).join('\n      ')}
      <circle r="7" fill="${c.light}" stroke="${c.main}" stroke-width="1"/>
      <circle r="2.5" fill="${COLORS.paperBg}"/>
      <circle r="7" fill="none" stroke="${COLORS.highlight}" stroke-width="0.5" opacity="0.3"/>
    </g>`;
}

// --- B9: 铅笔 ---
function drawPencil(color) {
  return `
    <g transform="rotate(-45, 24, 24)" filter="url(#dropShadow)">
      <!-- 铅笔杆 -->
      <rect x="14" y="22" width="20" height="4" rx="0.5" fill="#F5C28A" stroke="${COLORS.brown.main}" stroke-width="0.5"/>
      <!-- 笔尖 -->
      <path d="M34,22 L38,24 L34,26 Z" fill="${COLORS.brown.main}"/>
      <path d="M36,23 L38,24 L36,25 Z" fill="${COLORS.ink}"/>
      <!-- 橡皮 -->
      <rect x="12" y="22" width="3" height="4" rx="0.5" fill="#F5A8A0"/>
      <rect x="11" y="22" width="1.5" height="4" fill="${COLORS.gold.main}"/>
      <!-- 高光 -->
      <rect x="16" y="22.5" width="16" height="0.8" fill="${COLORS.highlight}" opacity="0.4"/>
    </g>`;
}

// --- B10: 相机 ---
function drawCamera(color) {
  const c = COLORS.brown;
  return `
    <g filter="url(#dropShadow)">
      <!-- 机身 -->
      <rect x="10" y="18" width="28" height="18" rx="3" fill="${c.main}" stroke="${c.accent}" stroke-width="0.5"/>
      <!-- 顶部突起 -->
      <rect x="18" y="15" width="8" height="4" rx="1" fill="${c.main}"/>
      <!-- 镜头外圈 -->
      <circle cx="24" cy="27" r="6" fill="${COLORS.ink}" stroke="${c.accent}" stroke-width="0.5"/>
      <!-- 镜头内圈 -->
      <circle cx="24" cy="27" r="4" fill="${COLORS.inkLight}"/>
      <circle cx="24" cy="27" r="2.5" fill="${COLORS.ink}"/>
      <!-- 镜头反光 -->
      <ellipse cx="22.5" cy="25.5" rx="1.5" ry="1" fill="${COLORS.highlight}" opacity="0.5"/>
      <!-- 闪光灯 -->
      <circle cx="34" cy="21" r="1" fill="${COLORS.warmOrange}" opacity="0.7"/>
      <!-- 皮革纹理点 -->
      <circle cx="13" cy="21" r="0.3" fill="${c.accent}" opacity="0.4"/>
      <circle cx="15" cy="33" r="0.3" fill="${c.accent}" opacity="0.4"/>
    </g>`;
}

// --- B11: 指南针 ---
function drawNavigation(color) {
  const c = COLORS.blue;
  return `
    <g filter="url(#dropShadow)">
      <!-- 表盘 -->
      <circle cx="24" cy="24" r="11" fill="${COLORS.cream}" stroke="${c.main}" stroke-width="1"/>
      <!-- 刻度 -->
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30) * Math.PI / 180;
        const x1 = 24 + Math.cos(a) * 9, y1 = 24 + Math.sin(a) * 9;
        const x2 = 24 + Math.cos(a) * 10, y2 = 24 + Math.sin(a) * 10;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c.main}" stroke-width="0.4" opacity="0.4"/>`;
      }).join('\n      ')}
      <!-- 指针 -->
      <path d="M24,14 L26,24 L24,26 L22,24 Z" fill="#E85D6A"/>
      <path d="M24,34 L22,24 L24,22 L26,24 Z" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.3"/>
      <!-- 中心点 -->
      <circle cx="24" cy="24" r="1.5" fill="${COLORS.gold.main}"/>
      <circle cx="24" cy="24" r="0.5" fill="${COLORS.highlight}" opacity="0.8"/>
    </g>`;
}

// --- B12: 地图品牌 ---
function drawMapBrand(color) {
  return drawMap(false, color);
}

// --- B13: 定位针 ---
function drawMapPin(color) {
  const c = COLORS.mint;
  return `
    <g transform="translate(24,20)" filter="url(#dropShadow)">
      <path d="M0,0 C-7,0 -7,-12 0,-12 C7,-12 7,0 0,0 Z" fill="${c.main}" stroke="${c.light}" stroke-width="0.5"/>
      <path d="M0,0 C-7,0 -7,-12 0,-12 C7,-12 7,0 0,0 Z" fill="url(#pinGrad)" opacity="0.3"/>
      <circle cx="0" cy="-6" r="3.5" fill="${COLORS.paperBg}"/>
      <ellipse cx="-1.5" cy="-8" rx="1.5" ry="2" fill="${COLORS.highlight}" opacity="0.5"/>
    </g>
    <defs>
      <linearGradient id="pinGrad" x1="0" y1="-12" x2="0" y2="0">
        <stop offset="0%" stop-color="${COLORS.highlight}" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="${c.main}" stop-opacity="0"/>
      </linearGradient>
    </defs>`;
}

// --- B14: 时钟 ---
function drawClock(color) {
  const c = COLORS.mint;
  return `
    <g filter="url(#dropShadow)">
      <circle cx="24" cy="24" r="11" fill="${COLORS.cream}" stroke="${c.main}" stroke-width="1.5"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 - 90) * Math.PI / 180;
        const x1 = 24 + Math.cos(a) * 9, y1 = 24 + Math.sin(a) * 9;
        const x2 = 24 + Math.cos(a) * 10, y2 = 24 + Math.sin(a) * 10;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS.ink}" stroke-width="0.5"/>`;
      }).join('\n      ')}
      <!-- 时针 -->
      <line x1="24" y1="24" x2="24" y2="18" stroke="${COLORS.ink}" stroke-width="1.5" stroke-linecap="round"/>
      <!-- 分针 -->
      <line x1="24" y1="24" x2="30" y2="24" stroke="${COLORS.ink}" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="24" cy="24" r="1.2" fill="${COLORS.gold.main}"/>
    </g>`;
}

// --- B15: 人数 ---
function drawUser(color) {
  return drawProfile(false, color);
}

// --- B16/B17: 书签 ---
function drawBookmark(filled, color) {
  const c = filled ? COLORS.warmOrange : COLORS.inkLight;
  const fill = filled ? c : 'none';
  return `
    <g filter="url(#dropShadow)">
      <path d="M16,12 L32,12 L32,36 L24,30 L16,36 Z" fill="${fill}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round" filter="url(#handDrawn)"/>
      ${filled ? `<path d="M16,12 L32,12 L32,36 L24,30 L16,36 Z" fill="${COLORS.highlight}" opacity="0.15"/>` : ''}
      <rect x="23" y="12" width="2" height="3" fill="${COLORS.gold.main}" opacity="0.6"/>
    </g>`;
}

// --- B18: 锁 ---
function drawLock(color) {
  const c = COLORS.coral;
  return `
    <g filter="url(#dropShadow)">
      <!-- 锁体 -->
      <rect x="15" y="22" width="18" height="14" rx="2" fill="${c.main}" stroke="${c.accent}" stroke-width="0.5"/>
      <!-- 锁环 -->
      <path d="M18,22 L18,18 Q18,12 24,12 Q30,12 30,18 L30,22" fill="none" stroke="${c.main}" stroke-width="2.5" stroke-linecap="round"/>
      <!-- 钥匙孔 -->
      <circle cx="24" cy="28" r="1.5" fill="${COLORS.paperBg}"/>
      <rect x="23.5" y="28" width="1" height="3" fill="${COLORS.paperBg}"/>
      <!-- 高光 -->
      <rect x="17" y="24" width="14" height="1" fill="${COLORS.highlight}" opacity="0.3"/>
    </g>`;
}

// --- C1: 水滴/调色板 ---
function drawDroplet(color) {
  const c = COLORS.blue;
  return `
    <g filter="url(#dropShadow)">
      <!-- 调色板 -->
      <path d="M12,20 Q12,14 20,14 L28,14 Q36,14 36,20 Q36,26 30,28 Q28,28 28,30 Q28,34 24,34 Q16,34 12,28 Z" fill="${COLORS.brown.light}" stroke="${COLORS.brown.main}" stroke-width="0.8" filter="url(#handDrawn)"/>
      <!-- 拇指孔 -->
      <circle cx="28" cy="22" r="2" fill="${COLORS.paperBg}"/>
      <!-- 颜料团 -->
      <circle cx="18" cy="20" r="2" fill="${c.main}" opacity="0.8"/>
      <circle cx="23" cy="18" r="2" fill="#F5C28A" opacity="0.8"/>
      <circle cx="32" cy="20" r="2" fill="#E85D6A" opacity="0.8"/>
      <!-- 画笔 -->
      <rect x="30" y="26" width="8" height="1.5" rx="0.5" fill="${COLORS.brown.main}" transform="rotate(30, 30, 26)"/>
      <rect x="37" y="24.5" width="3" height="2.5" rx="0.5" fill="${COLORS.gold.main}" transform="rotate(30, 30, 26)"/>
    </g>`;
}

// --- C2: 脚印 ---
function drawFootprints(color) {
  const c = COLORS.coral;
  return `
    <g filter="url(#dropShadow)">
      <!-- 左脚印 -->
      <ellipse cx="18" cy="28" rx="4" ry="6" fill="${c.main}" opacity="0.8" transform="rotate(-10, 18, 28)"/>
      <circle cx="14" cy="20" r="1.2" fill="${c.main}" opacity="0.8"/>
      <circle cx="17" cy="18" r="1.2" fill="${c.main}" opacity="0.8"/>
      <circle cx="20" cy="18" r="1.2" fill="${c.main}" opacity="0.8"/>
      <circle cx="22" cy="20" r="1" fill="${c.main}" opacity="0.8"/>
      <!-- 右脚印 -->
      <ellipse cx="30" cy="28" rx="4" ry="6" fill="${c.main}" opacity="0.8" transform="rotate(10, 30, 28)"/>
      <circle cx="26" cy="20" r="1.2" fill="${c.main}" opacity="0.8"/>
      <circle cx="29" cy="18" r="1.2" fill="${c.main}" opacity="0.8"/>
      <circle cx="32" cy="18" r="1.2" fill="${c.main}" opacity="0.8"/>
      <circle cx="34" cy="20" r="1" fill="${c.main}" opacity="0.8"/>
    </g>`;
}

// --- C3: 闪光 ---
function drawSparkles(color) {
  const c = COLORS.lavender;
  return `
    <g filter="url(#dropShadow)">
      <!-- 大星 -->
      <path d="M24,10 L26,20 L36,24 L26,28 L24,38 L22,28 L12,24 L22,20 Z" fill="${c.main}" stroke="${c.light}" stroke-width="0.5" opacity="0.85"/>
      <ellipse cx="22" cy="18" rx="2" ry="3" fill="${COLORS.highlight}" opacity="0.4"/>
      <!-- 小星 1 -->
      <path d="M14,14 L14.8,17 L18,14.8 L15.2,17.2 L14,20 L13,17.2 L10,14.8 L13,17 Z" fill="${COLORS.warmOrange}" opacity="0.7"/>
      <!-- 小星 2 -->
      <path d="M34,34 L34.8,37 L38,34.8 L35.2,37.2 L34,40 L33,37.2 L30,34.8 L33,37 Z" fill="${COLORS.gold.light}" opacity="0.7"/>
    </g>`;
}

// --- C4: 咖啡 ---
function drawCoffee(color) {
  const c = COLORS.brown;
  return `
    <g filter="url(#dropShadow)">
      <!-- 碟子 -->
      <ellipse cx="24" cy="36" rx="14" ry="2" fill="${c.accent}" opacity="0.6"/>
      <!-- 杯身 -->
      <path d="M14,18 L34,18 L32,34 Q32,36 30,36 L18,36 Q16,36 16,34 Z" fill="${COLORS.cream}" stroke="${c.main}" stroke-width="0.8" filter="url(#handDrawn)"/>
      <!-- 杯口 -->
      <ellipse cx="24" cy="18" rx="10" ry="2" fill="${c.main}" opacity="0.85"/>
      <!-- 拉花 -->
      <path d="M22,17 Q24,15 26,17 Q24,18 22,17 Z" fill="${COLORS.cream}" opacity="0.7"/>
      <!-- 蒸汽 -->
      <path d="M20,12 Q18,8 20,6" fill="none" stroke="${COLORS.paperShadow}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <path d="M24,12 Q22,8 24,5" fill="none" stroke="${COLORS.paperShadow}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <path d="M28,12 Q26,8 28,6" fill="none" stroke="${COLORS.paperShadow}" stroke-width="1" stroke-linecap="round" opacity="0.5"/>
      <!-- 把手 -->
      <path d="M34,22 Q38,22 38,26 Q38,30 34,30" fill="none" stroke="${c.main}" stroke-width="1.5"/>
    </g>`;
}

// --- C5: 指南针品牌 ---
function drawCompass(color) {
  return drawNavigation(color);
}

// --- D1/D2: 骰子 ---
function drawDice(active, color) {
  const c = COLORS.mint;
  const dotColor = active ? COLORS.ink : COLORS.ink;
  return `
    <g filter="url(#dropShadow)">
      <!-- 骰子主体（3D透视） -->
      <path d="M14,16 L34,14 L36,18 L36,34 L16,36 L14,32 Z" fill="${c.light}" stroke="${c.main}" stroke-width="0.8" filter="url(#handDrawn)"/>
      <!-- 顶面 -->
      <path d="M14,16 L34,14 L32,18 L12,20 Z" fill="${c.main}" opacity="0.85"/>
      <!-- 5点 -->
      <circle cx="20" cy="22" r="1.2" fill="${dotColor}"/>
      <circle cx="28" cy="21" r="1.2" fill="${dotColor}"/>
      <circle cx="24" cy="26" r="1.2" fill="${dotColor}"/>
      <circle cx="20" cy="30" r="1.2" fill="${dotColor}"/>
      <circle cx="28" cy="29" r="1.2" fill="${dotColor}"/>
      <!-- 高光 -->
      <path d="M14,16 L34,14 L32,18 L12,20 Z" fill="${COLORS.highlight}" opacity="0.15"/>
    </g>`;
}

// --- D3/D4: 嫩芽 ---
function drawSprout(active, color) {
  const c = COLORS.mint;
  return `
    <g filter="url(#dropShadow)">
      <!-- 土壤 -->
      <ellipse cx="24" cy="34" rx="10" ry="3" fill="${COLORS.brown.main}" opacity="0.7"/>
      <!-- 茎 -->
      <path d="M24,34 Q24,28 24,22" fill="none" stroke="${c.main}" stroke-width="1.5" stroke-linecap="round"/>
      <!-- 左叶 -->
      <path d="M24,24 Q18,22 16,18 Q20,18 24,22 Z" fill="${c.light}" stroke="${c.main}" stroke-width="0.5"/>
      <!-- 右叶 -->
      <path d="M24,22 Q30,20 32,16 Q28,16 24,20 Z" fill="${c.main}" stroke="${c.main}" stroke-width="0.5"/>
      <!-- 叶脉 -->
      <path d="M20,20 Q22,21 24,22" fill="none" stroke="${c.main}" stroke-width="0.3" opacity="0.5"/>
      <path d="M28,18 Q26,19 24,20" fill="none" stroke="${c.main}" stroke-width="0.3" opacity="0.5"/>
    </g>`;
}

// --- E1: 太阳 ---
function drawSun(color) {
  const c = COLORS.warmOrange;
  return `
    <g filter="url(#dropShadow)">
      <circle cx="24" cy="24" r="8" fill="${COLORS.gold.light}" stroke="${c}" stroke-width="0.8"/>
      ${Array.from({ length: 8 }, (_, i) => {
        const a = (i * 45) * Math.PI / 180;
        const x1 = 24 + Math.cos(a) * 9, y1 = 24 + Math.sin(a) * 9;
        const x2 = 24 + Math.cos(a) * 12, y2 = 24 + Math.sin(a) * 12;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1.5" stroke-linecap="round"/>`;
      }).join('\n      ')}
      <!-- 笑脸 -->
      <circle cx="21" cy="22" r="0.8" fill="${COLORS.ink}"/>
      <circle cx="27" cy="22" r="0.8" fill="${COLORS.ink}"/>
      <path d="M20,26 Q24,29 28,26" fill="none" stroke="${COLORS.ink}" stroke-width="0.8" stroke-linecap="round"/>
      <circle cx="20" cy="25" r="0.8" fill="#F5A8A0" opacity="0.5"/>
      <circle cx="28" cy="25" r="0.8" fill="#F5A8A0" opacity="0.5"/>
    </g>`;
}

// --- E2: 云雨 ---
function drawCloudRain(color) {
  const c = COLORS.blue;
  return `
    <g filter="url(#dropShadow)">
      <!-- 云后层 -->
      <ellipse cx="20" cy="20" rx="8" ry="5" fill="${COLORS.cream}" opacity="0.6"/>
      <!-- 云前层 -->
      <ellipse cx="28" cy="22" rx="10" ry="6" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.5"/>
      <circle cx="20" cy="20" r="4" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.5"/>
      <!-- 雨滴 -->
      <path d="M18,30 L17,34" stroke="${c.main}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M24,30 L23,35" stroke="${c.main}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M30,30 L29,34" stroke="${c.main}" stroke-width="1.2" stroke-linecap="round"/>
      <!-- 云高光 -->
      <ellipse cx="25" cy="19" rx="4" ry="1.5" fill="${COLORS.highlight}" opacity="0.3"/>
    </g>`;
}

// --- E3: 闪电 ---
function drawZap(color) {
  const c = COLORS.coral;
  return `
    <g filter="url(#dropShadow)">
      <path d="M26,8 L16,24 L22,24 L20,40 L32,22 L26,22 L28,8 Z" fill="${c.main}" stroke="${c.light}" stroke-width="0.5" filter="url(#handDrawn)"/>
      <path d="M26,8 L16,24 L22,24 L20,40 L32,22 L26,22 L28,8 Z" fill="${COLORS.highlight}" opacity="0.2"/>
      <!-- 小星 -->
      <path d="M36,14 L36.5,16 L38,14.5 L36.5,16.5 L36,18 L35.5,16.5 L34,14.5 L35.5,16 Z" fill="${COLORS.gold.light}" opacity="0.7"/>
    </g>`;
}

// --- F1: 微笑 ---
function drawSmile(color) {
  const c = COLORS.gold;
  return `
    <g filter="url(#dropShadow)">
      <circle cx="24" cy="24" r="11" fill="${COLORS.gold.light}" stroke="${COLORS.warmOrange}" stroke-width="0.8"/>
      <!-- 闭眼 -->
      <path d="M19,22 Q21,20 23,22" fill="none" stroke="${COLORS.ink}" stroke-width="1" stroke-linecap="round"/>
      <path d="M25,22 Q27,20 29,22" fill="none" stroke="${COLORS.ink}" stroke-width="1" stroke-linecap="round"/>
      <!-- 笑 -->
      <path d="M19,26 Q24,31 29,26" fill="none" stroke="${COLORS.ink}" stroke-width="1.2" stroke-linecap="round"/>
      <!-- 腮红 -->
      <circle cx="18" cy="25" r="1.5" fill="#F5A8A0" opacity="0.5"/>
      <circle cx="30" cy="25" r="1.5" fill="#F5A8A0" opacity="0.5"/>
    </g>`;
}

// --- F2: 平静 ---
function drawMeh(color) {
  const c = COLORS.mint;
  return `
    <g filter="url(#dropShadow)">
      <circle cx="24" cy="24" r="11" fill="${c.light}" stroke="${c.main}" stroke-width="0.8"/>
      <circle cx="20" cy="22" r="1" fill="${COLORS.ink}"/>
      <circle cx="28" cy="22" r="1" fill="${COLORS.ink}"/>
      <line x1="19" y1="28" x2="29" y2="28" stroke="${COLORS.ink}" stroke-width="1" stroke-linecap="round"/>
    </g>`;
}

// --- F3: 惊喜 ---
function drawSparklesCoral(color) {
  const c = COLORS.coral;
  return `
    <g filter="url(#dropShadow)">
      <circle cx="24" cy="24" r="11" fill="${c.light}" stroke="${c.main}" stroke-width="0.8"/>
      <circle cx="20" cy="22" r="1.5" fill="${COLORS.ink}"/>
      <circle cx="28" cy="22" r="1.5" fill="${COLORS.ink}"/>
      <ellipse cx="24" cy="29" rx="2" ry="2.5" fill="${COLORS.ink}" opacity="0.7"/>
      <!-- 星 -->
      <path d="M36,14 L36.5,16 L38,14.5 L36.5,16.5 L36,18 L35.5,16.5 L34,14.5 L35.5,16 Z" fill="${COLORS.gold.light}" opacity="0.8"/>
      <circle cx="12" cy="32" r="0.8" fill="${COLORS.gold.light}" opacity="0.6"/>
    </g>`;
}

// --- F4: 心 ---
function drawHeart(color) {
  const c = COLORS.lavender;
  return `
    <g filter="url(#dropShadow)">
      <path d="M24,36 C24,36 10,28 10,20 Q10,14 16,14 Q20,14 24,18 Q28,14 32,14 Q38,14 38,20 C38,28 24,36 24,36 Z" fill="${c.main}" stroke="${c.light}" stroke-width="0.5" filter="url(#handDrawn)"/>
      <ellipse cx="20" cy="18" rx="3" ry="4" fill="${COLORS.highlight}" opacity="0.35"/>
    </g>`;
}

// --- F5: 大笑 ---
function drawLaugh(color) {
  const c = COLORS.blue;
  return `
    <g filter="url(#dropShadow)">
      <circle cx="24" cy="24" r="11" fill="${c.light}" stroke="${c.main}" stroke-width="0.8"/>
      <!-- 眯眼 -->
      <path d="M18,22 Q21,19 23,22" fill="none" stroke="${COLORS.ink}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M25,22 Q28,19 30,22" fill="none" stroke="${COLORS.ink}" stroke-width="1.2" stroke-linecap="round"/>
      <!-- 大笑 -->
      <path d="M17,25 Q24,34 31,25 Q24,28 17,25 Z" fill="${COLORS.ink}" opacity="0.7"/>
      <path d="M20,28 Q24,30 28,28" fill="#E85D6A" opacity="0.6"/>
      <circle cx="17" cy="25" r="1.5" fill="#F5A8A0" opacity="0.5"/>
      <circle cx="31" cy="25" r="1.5" fill="#F5A8A0" opacity="0.5"/>
    </g>`;
}

// --- G1-G9: 徽章 ---
function drawBadge(type, active, color) {
  const c = COLORS.gold;
  const medalColor = COLORS.gold.light;
  const ribbonColor = COLORS.coral.main;
  return `
    <g filter="url(#dropShadow)">
      <!-- 丝带 -->
      <path d="M20,8 L18,20 M28,8 L30,20" stroke="${ribbonColor}" stroke-width="2" stroke-linecap="round"/>
      <path d="M20,8 L22,12 L18,12 Z" fill="${ribbonColor}" opacity="0.8"/>
      <path d="M28,8 L26,12 L30,12 Z" fill="${ribbonColor}" opacity="0.8"/>
      <!-- 奖牌 -->
      <circle cx="24" cy="24" r="10" fill="${medalColor}" stroke="${c.main}" stroke-width="1.2" filter="url(#handDrawn)"/>
      <circle cx="24" cy="24" r="10" fill="url(#badgeGrad)" opacity="0.3"/>
      ${type === 'star' ? `<path d="M24,18 L26,22 L30,22 L27,25 L28,29 L24,27 L20,29 L21,25 L18,22 L22,22 Z" fill="${c.main}" opacity="0.85"/>` : ''}
      ${type === 'seven' ? `<text x="24" y="28" text-anchor="middle" font-size="10" font-weight="bold" fill="${c.main}" font-family="serif">7</text>` : ''}
      ${type === 'laurel' ? `
        <path d="M16,20 Q12,24 14,30" fill="none" stroke="${COLORS.mint.main}" stroke-width="1.5" opacity="0.7"/>
        <path d="M32,20 Q36,24 34,30" fill="none" stroke="${COLORS.mint.main}" stroke-width="1.5" opacity="0.7"/>
        <circle cx="24" cy="30" r="1.5" fill="${c.main}" opacity="0.8"/>
      ` : ''}
      ${type === 'eye' ? `
        <ellipse cx="24" cy="24" rx="5" ry="3" fill="${COLORS.white}" stroke="${COLORS.ink}" stroke-width="0.5"/>
        <circle cx="24" cy="24" r="2" fill="${COLORS.blue.main}"/>
        <circle cx="24" cy="24" r="1" fill="${COLORS.ink}"/>
        <circle cx="23.5" cy="23.5" r="0.4" fill="${COLORS.highlight}"/>
      ` : ''}
      ${type === 'moon' ? `
        <path d="M28,18 Q20,18 20,26 Q20,32 28,30 Q24,28 24,24 Q24,20 28,18 Z" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.5"/>
        <path d="M32,16 L32.5,18 L34,16.5 L32.5,18.5 L32,20 L31.5,18.5 L30,16.5 L31.5,18 Z" fill="${COLORS.gold.light}" opacity="0.8"/>
      ` : ''}
      ${type === 'umbrella' ? `
        <path d="M14,22 Q24,14 34,22" fill="${COLORS.blue.main}" stroke="${COLORS.blue.light}" stroke-width="0.5"/>
        <line x1="24" y1="22" x2="24" y2="30" stroke="${COLORS.ink}" stroke-width="1"/>
        <path d="M20,30 L19,33" stroke="${COLORS.blue.main}" stroke-width="0.8"/>
        <path d="M28,30 L27,33" stroke="${COLORS.blue.main}" stroke-width="0.8"/>
      ` : ''}
      ${type === 'basket' ? `
        <path d="M16,22 L32,22 L30,32 L18,32 Z" fill="${COLORS.brown.light}" stroke="${COLORS.brown.main}" stroke-width="0.5"/>
        <line x1="16" y1="25" x2="32" y2="25" stroke="${COLORS.brown.main}" stroke-width="0.3" opacity="0.5"/>
        <line x1="17" y1="28" x2="31" y2="28" stroke="${COLORS.brown.main}" stroke-width="0.3" opacity="0.5"/>
        <path d="M20,22 Q20,18 22,18 Q24,18 24,16" fill="${COLORS.mint.main}" opacity="0.6"/>
      ` : ''}
      ${type === 'magnifier' ? `
        <circle cx="22" cy="22" r="5" fill="none" stroke="${COLORS.ink}" stroke-width="1.5"/>
        <circle cx="22" cy="22" r="3" fill="${COLORS.cream}" opacity="0.5"/>
        <line x1="26" y1="26" x2="31" y2="31" stroke="${COLORS.ink}" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="20" y="20" width="4" height="4" fill="${COLORS.coral.main}" opacity="0.4"/>
      ` : ''}
      ${type === 'crown' ? `
        <path d="M16,28 L18,18 L22,24 L24,16 L26,24 L30,18 L32,28 Z" fill="${c.main}" stroke="${c.accent}" stroke-width="0.5"/>
        <circle cx="24" cy="20" r="1.5" fill="${COLORS.warmOrange}"/>
        <rect x="16" y="28" width="16" height="3" fill="${c.accent}" opacity="0.6"/>
      ` : ''}
      ${type === 'book' ? `
        <path d="M14,16 L24,14 L34,16 L34,32 L24,30 L14,32 Z" fill="${COLORS.cream}" stroke="${COLORS.brown.main}" stroke-width="0.8" filter="url(#handDrawn)"/>
        <line x1="24" y1="14" x2="24" y2="30" stroke="${COLORS.brown.main}" stroke-width="0.5" opacity="0.5"/>
        <line x1="17" y1="19" x2="22" y2="18" stroke="${COLORS.ink}" stroke-width="0.3" opacity="0.5"/>
        <line x1="17" y1="22" x2="22" y2="21" stroke="${COLORS.ink}" stroke-width="0.3" opacity="0.5"/>
        <line x1="26" y1="18" x2="31" y2="19" stroke="${COLORS.ink}" stroke-width="0.3" opacity="0.5"/>
        <line x1="26" y1="21" x2="31" y2="22" stroke="${COLORS.ink}" stroke-width="0.3" opacity="0.5"/>
        <circle cx="24" cy="16" r="0.8" fill="${COLORS.lavender.main}" opacity="0.7"/>
      ` : ''}
      ${type === 'sprout' ? `
        <path d="M24,32 L24,22" stroke="${COLORS.brown.main}" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M24,24 Q18,22 16,18 Q20,18 24,22 Z" fill="${COLORS.mint.main}" opacity="0.8" filter="url(#handDrawn)"/>
        <path d="M24,22 Q30,20 32,16 Q28,16 24,20 Z" fill="${COLORS.mint.light}" opacity="0.8" filter="url(#handDrawn)"/>
        <ellipse cx="24" cy="33" rx="6" ry="1.2" fill="${COLORS.brown.accent}" opacity="0.5"/>
        <circle cx="24" cy="14" r="0.6" fill="${COLORS.warmOrange}" opacity="0.8"/>
      ` : ''}
      ${type === 'footprints' ? `
        <g opacity="0.85">
          <ellipse cx="18" cy="18" rx="3" ry="4" fill="${COLORS.coral.main}" filter="url(#handDrawn)"/>
          <circle cx="15" cy="13" r="1" fill="${COLORS.coral.main}" opacity="0.7"/>
          <circle cx="17" cy="12" r="0.8" fill="${COLORS.coral.main}" opacity="0.7"/>
          <circle cx="19" cy="12" r="0.8" fill="${COLORS.coral.main}" opacity="0.7"/>
          <ellipse cx="30" cy="30" rx="3" ry="4" fill="${COLORS.coral.light}" filter="url(#handDrawn)"/>
          <circle cx="27" cy="25" r="1" fill="${COLORS.coral.light}" opacity="0.7"/>
          <circle cx="29" cy="24" r="0.8" fill="${COLORS.coral.light}" opacity="0.7"/>
          <circle cx="31" cy="24" r="0.8" fill="${COLORS.coral.light}" opacity="0.7"/>
        </g>
      ` : ''}
      ${type === 'people' ? `
        <circle cx="18" cy="18" r="3.5" fill="${COLORS.lavender.light}" stroke="${COLORS.lavender.main}" stroke-width="0.5"/>
        <path d="M12,30 Q12,24 18,24 Q24,24 24,30 L24,32 L12,32 Z" fill="${COLORS.lavender.main}" opacity="0.85"/>
        <circle cx="30" cy="20" r="3.5" fill="${COLORS.coral.light}" stroke="${COLORS.coral.main}" stroke-width="0.5"/>
        <path d="M24,32 Q24,26 30,26 Q36,26 36,32 L36,34 L24,34 Z" fill="${COLORS.coral.main}" opacity="0.85"/>
        <path d="M16,18 Q18,19 20,18" fill="none" stroke="${COLORS.ink}" stroke-width="0.4" stroke-linecap="round"/>
        <path d="M28,20 Q30,21 32,20" fill="none" stroke="${COLORS.ink}" stroke-width="0.4" stroke-linecap="round"/>
      ` : ''}
      ${type === 'star_night' ? `
        <circle cx="20" cy="20" r="0.8" fill="${COLORS.gold.light}" opacity="0.9"/>
        <circle cx="28" cy="18" r="0.6" fill="${COLORS.gold.light}" opacity="0.8"/>
        <circle cx="30" cy="26" r="0.5" fill="${COLORS.gold.light}" opacity="0.7"/>
        <circle cx="16" cy="26" r="0.5" fill="${COLORS.gold.light}" opacity="0.7"/>
        <path d="M28,16 Q22,16 22,24 Q22,30 28,28 Q25,26 25,22 Q25,18 28,16 Z" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.5"/>
        <path d="M24,14 L24.5,16 L26,16.5 L24.5,17 L24,19 L23.5,17 L22,16.5 L23.5,16 Z" fill="${COLORS.gold.light}" opacity="0.9"/>
      ` : ''}
      ${type === 'rain' ? `
        <path d="M16,18 Q14,14 18,12 Q22,12 22,16 Q24,14 28,14 Q32,16 30,20 Q34,20 34,24 Q34,28 30,28 L18,28 Q14,28 14,24 Q14,20 16,18 Z" fill="${COLORS.cream}" stroke="${COLORS.blue.light}" stroke-width="0.5" opacity="0.7"/>
        <line x1="18" y1="30" x2="16" y2="34" stroke="${COLORS.blue.main}" stroke-width="1" stroke-linecap="round"/>
        <line x1="22" y1="30" x2="20" y2="34" stroke="${COLORS.blue.main}" stroke-width="1" stroke-linecap="round"/>
        <line x1="26" y1="30" x2="24" y2="34" stroke="${COLORS.blue.main}" stroke-width="1" stroke-linecap="round"/>
        <line x1="30" y1="30" x2="28" y2="34" stroke="${COLORS.blue.main}" stroke-width="1" stroke-linecap="round"/>
      ` : ''}
      ${type === 'chat' ? `
        <path d="M14,16 L34,16 Q36,16 36,18 L36,26 Q36,28 34,28 L24,28 L20,32 L20,28 L14,28 Q12,28 12,26 L12,18 Q12,16 14,16 Z" fill="${COLORS.lavender.light}" stroke="${COLORS.lavender.main}" stroke-width="0.6" filter="url(#handDrawn)"/>
        <circle cx="20" cy="22" r="1.2" fill="${COLORS.white}"/>
        <circle cx="25" cy="22" r="1.2" fill="${COLORS.white}"/>
        <circle cx="30" cy="22" r="1.2" fill="${COLORS.white}"/>
      ` : ''}
      ${type === 'gem' ? `
        <path d="M18,16 L30,16 L34,22 L24,34 L14,22 Z" fill="${COLORS.lavender.main}" stroke="${COLORS.lavender.light}" stroke-width="0.5" filter="url(#handDrawn)"/>
        <path d="M18,16 L24,22 L30,16" fill="none" stroke="${COLORS.highlight}" stroke-width="0.6" opacity="0.5"/>
        <path d="M14,22 L24,22 L34,22" fill="none" stroke="${COLORS.lavender.light}" stroke-width="0.4" opacity="0.6"/>
        <path d="M24,22 L24,34" fill="none" stroke="${COLORS.lavender.light}" stroke-width="0.4" opacity="0.5"/>
        <path d="M20,18 L22,20" stroke="${COLORS.highlight}" stroke-width="0.5" opacity="0.6"/>
      ` : ''}
      ${type === 'compass' ? `
        <circle cx="24" cy="24" r="9" fill="${COLORS.cream}" stroke="${COLORS.brown.main}" stroke-width="1" filter="url(#handDrawn)"/>
        <circle cx="24" cy="24" r="6" fill="none" stroke="${COLORS.paperShadow}" stroke-width="0.4" opacity="0.5"/>
        <path d="M24,17 L26,24 L24,31 L22,24 Z" fill="${COLORS.coral.main}" opacity="0.8"/>
        <path d="M24,17 L26,24 L24,24 Z" fill="${COLORS.coral.light}"/>
        <circle cx="24" cy="24" r="1" fill="${COLORS.brown.main}"/>
        <text x="24" y="16" text-anchor="middle" font-size="3" fill="${COLORS.ink}" font-family="serif">N</text>
      ` : ''}
      ${type === 'trophy' ? `
        <path d="M16,14 L32,14 L31,22 Q31,26 24,26 Q17,26 17,22 Z" fill="${c.main}" stroke="${c.accent}" stroke-width="0.5" filter="url(#handDrawn)"/>
        <path d="M16,16 L12,16 L12,20 Q12,22 16,22" fill="none" stroke="${c.main}" stroke-width="1"/>
        <path d="M32,16 L36,16 L36,20 Q36,22 32,22" fill="none" stroke="${c.main}" stroke-width="1"/>
        <rect x="22" y="26" width="4" height="4" fill="${c.accent}"/>
        <rect x="18" y="30" width="12" height="3" rx="0.5" fill="${c.main}" stroke="${c.accent}" stroke-width="0.3"/>
        <path d="M24,16 L24.5,18 L26,18.5 L24.5,19 L24,21 L23.5,19 L22,18.5 L23.5,18 Z" fill="${COLORS.highlight}" opacity="0.5"/>
      ` : ''}
      <!-- 中心高光 -->
      <ellipse cx="21" cy="20" rx="2" ry="3" fill="${COLORS.highlight}" opacity="0.25"/>
    </g>
    <defs>
      <radialGradient id="badgeGrad" cx="35%" cy="30%">
        <stop offset="0%" stop-color="${COLORS.highlight}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="${c.main}" stop-opacity="0"/>
      </radialGradient>
    </defs>`;
}

// --- H1-H6: 地图标记针 ---
function drawPin(typeColor) {
  const c = typeColor;
  return `
    <g transform="translate(24,22)" filter="url(#dropShadow)">
      <path d="M0,6 C-8,6 -8,-8 0,-14 C8,-8 8,6 0,6 Z" fill="${c.main}" stroke="${c.light}" stroke-width="0.5" filter="url(#handDrawn)"/>
      <path d="M0,6 C-8,6 -8,-8 0,-14 C8,-8 8,6 0,6 Z" fill="url(#pinGradH)" opacity="0.3"/>
      <circle cx="0" cy="-5" r="4" fill="${COLORS.paperBg}"/>
      <ellipse cx="-1.5" cy="-8" rx="1.5" ry="2" fill="${COLORS.highlight}" opacity="0.5"/>
    </g>
    <defs>
      <linearGradient id="pinGradH" x1="0" y1="-14" x2="0" y2="6">
        <stop offset="0%" stop-color="${COLORS.highlight}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${c.main}" stop-opacity="0"/>
      </linearGradient>
    </defs>`;
}

// --- I1: 出发（门+箭头） ---
function drawStepLeave(color) {
  const c = COLORS.mint;
  return `
    <g filter="url(#dropShadow)">
      <rect x="14" y="12" width="16" height="26" rx="1.5" fill="${COLORS.brown.light}" stroke="${COLORS.brown.main}" stroke-width="0.8" filter="url(#handDrawn)"/>
      <rect x="16" y="14" width="12" height="22" fill="${COLORS.brown.main}" opacity="0.7"/>
      <circle cx="25" cy="26" r="1" fill="${COLORS.gold.main}"/>
      <!-- 箭头 -->
      <path d="M30,24 L36,24 M34,21 L36,24 L34,27" fill="none" stroke="${c.main}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
}

// --- I2: 探索（雷达） ---
function drawStepExplore(color) {
  const c = COLORS.blue;
  return `
    <g filter="url(#dropShadow)">
      <path d="M12,30 Q24,10 36,30" fill="${c.light}" stroke="${c.main}" stroke-width="0.8" opacity="0.6"/>
      <path d="M16,30 Q24,18 32,30" fill="none" stroke="${c.main}" stroke-width="0.6" opacity="0.5"/>
      <path d="M20,30 Q24,24 28,30" fill="none" stroke="${c.main}" stroke-width="0.5" opacity="0.4"/>
      <circle cx="24" cy="30" r="1.5" fill="${c.main}"/>
      <!-- 扫描线 -->
      <line x1="24" y1="30" x2="33" y2="20" stroke="${COLORS.warmOrange}" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="33" cy="20" r="0.8" fill="${COLORS.warmOrange}" opacity="0.8"/>
      <!-- 底座 -->
      <rect x="20" y="32" width="8" height="4" rx="1" fill="${COLORS.brown.main}" opacity="0.5"/>
    </g>`;
}

// --- I3: 发现（放大镜） ---
function drawStepDiscover(color) {
  const c = COLORS.gold;
  return `
    <g filter="url(#dropShadow)">
      <circle cx="21" cy="21" r="8" fill="${COLORS.cream}" stroke="${c.main}" stroke-width="1.5"/>
      <circle cx="21" cy="21" r="5" fill="${c.light}" opacity="0.4"/>
      <line x1="27" y1="27" x2="34" y2="34" stroke="${COLORS.brown.main}" stroke-width="2.5" stroke-linecap="round"/>
      <!-- 闪光 -->
      <path d="M19,16 L19.5,18 L21,16.5 L19.5,18.5 L19,20 L18.5,18.5 L17,16.5 L18.5,18 Z" fill="${COLORS.warmOrange}" opacity="0.8"/>
    </g>`;
}

// --- I4: 记录（笔记本） ---
function drawStepRecord(color) {
  const c = COLORS.brown;
  return `
    <g filter="url(#dropShadow)">
      <!-- 笔记本 -->
      <rect x="12" y="12" width="20" height="24" rx="1.5" fill="${COLORS.cream}" stroke="${c.main}" stroke-width="0.8" filter="url(#handDrawn)"/>
      <!-- 螺旋装订 -->
      ${Array.from({ length: 5 }, (_, i) => `<circle cx="14" cy="${16 + i * 5}" r="0.8" fill="none" stroke="${COLORS.ink}" stroke-width="0.5"/>`).join('\n      ')}
      <!-- 横线 -->
      <line x1="18" y1="18" x2="28" y2="18" stroke="${COLORS.paperShadow}" stroke-width="0.4" opacity="0.5"/>
      <line x1="18" y1="22" x2="28" y2="22" stroke="${COLORS.paperShadow}" stroke-width="0.4" opacity="0.5"/>
      <line x1="18" y1="26" x2="28" y2="26" stroke="${COLORS.paperShadow}" stroke-width="0.4" opacity="0.5"/>
      <!-- 铅笔 -->
      <rect x="28" y="14" width="8" height="2" rx="0.3" fill="#F5C28A" stroke="${c.main}" stroke-width="0.3" transform="rotate(30, 28, 14)"/>
      <path d="M36,14 L38,15 L36,16 Z" fill="${c.main}" transform="rotate(30, 28, 14)"/>
    </g>`;
}

// --- J1: 双人 ---
function drawUsers(color) {
  const c = COLORS.lavender;
  return `
    <g filter="url(#dropShadow)">
      <!-- 后面人 -->
      <circle cx="18" cy="18" r="5" fill="#E8B5A0" opacity="0.7"/>
      <path d="M10,36 Q10,28 18,28 Q22,28 22,32 L22,36 Z" fill="${c.light}" opacity="0.7"/>
      <!-- 前面人 -->
      <circle cx="28" cy="20" r="5" fill="#E8B5A0"/>
      <path d="M20,38 Q20,30 28,30 Q36,30 36,38 L36,40 L20,40 Z" fill="${c.main}" opacity="0.85"/>
      <!-- 笑 -->
      <path d="M26,21 Q28,22 30,21" fill="none" stroke="${COLORS.ink}" stroke-width="0.5" stroke-linecap="round"/>
      <path d="M16,19 Q18,20 20,19" fill="none" stroke="${COLORS.ink}" stroke-width="0.5" stroke-linecap="round" opacity="0.7"/>
    </g>`;
}

// --- J2: 奖牌 ---
function drawAward(color) {
  return drawBadge('star', false, color);
}

// --- J3: 云备份 ---
function drawCloudBackup(color) {
  const c = COLORS.blue;
  return `
    <g filter="url(#dropShadow)">
      <ellipse cx="20" cy="20" rx="8" ry="5" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.5"/>
      <ellipse cx="28" cy="22" rx="10" ry="6" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.5"/>
      <!-- 下箭头 -->
      <path d="M24,18 L24,28 M20,24 L24,28 L28,24" fill="none" stroke="${c.main}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- 小点 -->
      <circle cx="18" cy="14" r="0.5" fill="${c.light}" opacity="0.6"/>
      <circle cx="30" cy="14" r="0.5" fill="${c.light}" opacity="0.6"/>
    </g>`;
}

// --- K1: 空收藏 ---
function drawEmptyCollection(color) {
  return `
    <g opacity="0.5" filter="url(#dropShadow)">
      <rect x="14" y="12" width="20" height="24" rx="1" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.5"/>
      <rect x="16" y="14" width="16" height="16" fill="${COLORS.paperEdge}" opacity="0.3"/>
      <!-- 铅笔 -->
      <rect x="30" y="32" width="8" height="1.5" rx="0.3" fill="#F5C28A" transform="rotate(-30, 30, 32)"/>
    </g>`;
}

// --- K2: 空地图 ---
function drawEmptyMap(color) {
  return `
    <g opacity="0.5" filter="url(#dropShadow)">
      <path d="M12,16 L20,14 L28,16 L36,14 L36,34 L28,36 L20,34 L12,36 Z" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.5"/>
      <circle cx="24" cy="24" r="2" fill="${COLORS.paperEdge}" opacity="0.5"/>
    </g>`;
}

// --- L1: 分享 ---
function drawShare(color) {
  const c = COLORS.blue;
  return `
    <g filter="url(#dropShadow)">
      <circle cx="16" cy="24" r="3" fill="${c.main}" opacity="0.85"/>
      <circle cx="32" cy="16" r="3" fill="${c.main}" opacity="0.85"/>
      <circle cx="32" cy="32" r="3" fill="${c.main}" opacity="0.85"/>
      <circle cx="16" cy="23.5" r="0.8" fill="${COLORS.highlight}" opacity="0.6"/>
      <circle cx="32" cy="15.5" r="0.8" fill="${COLORS.highlight}" opacity="0.6"/>
      <circle cx="32" cy="31.5" r="0.8" fill="${COLORS.highlight}" opacity="0.6"/>
      <line x1="18.5" y1="22" x2="29.5" y2="18" stroke="${c.main}" stroke-width="1.2" opacity="0.6"/>
      <line x1="18.5" y1="26" x2="29.5" y2="30" stroke="${c.main}" stroke-width="1.2" opacity="0.6"/>
    </g>`;
}

// --- L2: 星星 ---
function drawStar(color) {
  const c = COLORS.gold;
  return `
    <g filter="url(#dropShadow)">
      <path d="M24,12 L27,20 L36,21 L29,27 L31,36 L24,31 L17,36 L19,27 L12,21 L21,20 Z" fill="${c.main}" stroke="${c.accent}" stroke-width="0.5" filter="url(#handDrawn)"/>
      <path d="M24,12 L27,20 L24,22 Z" fill="${COLORS.highlight}" opacity="0.4"/>
      <circle cx="24" cy="24" r="1.5" fill="${c.light}" opacity="0.6"/>
    </g>`;
}

// --- L3: 月亮 ---
function drawMoon(color) {
  return `
    <g filter="url(#dropShadow)">
      <path d="M30,14 Q20,14 20,24 Q20,34 30,34 Q24,34 24,24 Q24,14 30,14 Z" fill="${COLORS.cream}" stroke="${COLORS.paperShadow}" stroke-width="0.8" filter="url(#handDrawn)"/>
      <circle cx="26" cy="18" r="1" fill="${COLORS.paperShadow}" opacity="0.5"/>
      <circle cx="24" cy="24" r="0.8" fill="${COLORS.paperShadow}" opacity="0.4"/>
      <circle cx="27" cy="28" r="0.6" fill="${COLORS.paperShadow}" opacity="0.4"/>
      <path d="M34,16 L34.5,18 L36,16.5 L34.5,18.5 L34,20 L33.5,18.5 L32,16.5 L33.5,18 Z" fill="${COLORS.gold.light}" opacity="0.8"/>
      <circle cx="14" cy="30" r="0.5" fill="${COLORS.gold.light}" opacity="0.7"/>
    </g>`;
}

// --- L4: 图层 ---
function drawLayers(color) {
  const c = COLORS.blue;
  return `
    <g filter="url(#dropShadow)">
      <path d="M24,12 L36,18 L24,24 L12,18 Z" fill="${c.light}" stroke="${c.main}" stroke-width="0.6" opacity="0.85" filter="url(#handDrawn)"/>
      <path d="M12,24 L24,30 L36,24" fill="none" stroke="${c.main}" stroke-width="1" opacity="0.6"/>
      <path d="M12,30 L24,36 L36,30" fill="none" stroke="${c.main}" stroke-width="1" opacity="0.4"/>
      <circle cx="24" cy="18" r="0.8" fill="${COLORS.highlight}" opacity="0.7"/>
    </g>`;
}

// --- L5: 发送（纸飞机） ---
function drawSend(color) {
  const c = COLORS.mint;
  return `
    <g filter="url(#dropShadow)">
      <path d="M12,24 L36,12 L28,36 L24,26 Z" fill="${c.main}" stroke="${c.light}" stroke-width="0.5" filter="url(#handDrawn)"/>
      <path d="M12,24 L28,36 L24,26 Z" fill="${c.light}" opacity="0.6"/>
      <path d="M12,24 L24,26" stroke="${COLORS.highlight}" stroke-width="0.6" opacity="0.4"/>
    </g>`;
}

// ===== 图标配置表 =====
const ICON_CONFIG = [
  // A. TabBar
  { name: 'tab-escape', draw: () => drawDoor(false), active: false },
  { name: 'tab-escape-active', draw: () => drawDoor(true), active: true },
  { name: 'tab-map', draw: () => drawMap(false), active: false },
  { name: 'tab-map-active', draw: () => drawMap(true), active: true },
  { name: 'tab-profile', draw: () => drawProfile(false), active: false },
  { name: 'tab-profile-active', draw: () => drawProfile(true), active: true },
  // B. 导航操作
  { name: 'chevron-left-ink', draw: () => drawChevronLeft() },
  { name: 'chevron-right-faint', draw: () => drawChevronRight(true) },
  { name: 'check-white', draw: () => drawCheck() },
  { name: 'x-ink-faint', draw: () => drawX() },
  { name: 'refresh-cw-ink-soft', draw: () => drawRefresh() },
  { name: 'more-horizontal-ink', draw: () => drawMoreDots() },
  { name: 'target-ink', draw: () => drawTarget() },
  { name: 'settings-brand', draw: () => drawSettings() },
  { name: 'pencil-brand', draw: () => drawPencil() },
  { name: 'camera-ink-soft', draw: () => drawCamera() },
  { name: 'navigation-brand', draw: () => drawNavigation() },
  { name: 'map-brand', draw: () => drawMapBrand() },
  { name: 'map-pin-brand', draw: () => drawMapPin() },
  { name: 'clock-brand', draw: () => drawClock() },
  { name: 'user-brand', draw: () => drawUser() },
  { name: 'bookmark', draw: () => drawBookmark(false) },
  { name: 'bookmark-brand', draw: () => drawBookmark(true) },
  { name: 'lock-coral', draw: () => drawLock() },
  // C. 类型图标
  { name: 'droplet', draw: () => drawDroplet() },
  { name: 'footprints-coral', draw: () => drawFootprints() },
  { name: 'sparkles', draw: () => drawSparkles() },
  { name: 'coffee', draw: () => drawCoffee() },
  { name: 'compass-brand', draw: () => drawCompass() },
  // D. 模式
  { name: 'dice-5-brand-strong', draw: () => drawDice(false) },
  { name: 'dice-5-white', draw: () => drawDice(true) },
  { name: 'sprout-brand-strong', draw: () => drawSprout(false) },
  { name: 'sprout-white', draw: () => drawSprout(true) },
  { name: 'footprints-white', draw: () => drawFootprints() },
  // E. 滤镜
  { name: 'sun-lemon-fg', draw: () => drawSun() },
  { name: 'cloud-rain-sky-fg', draw: () => drawCloudRain() },
  { name: 'zap-coral', draw: () => drawZap() },
  // F. 心情
  { name: 'smile-lemon', draw: () => drawSmile() },
  { name: 'meh-brand', draw: () => drawMeh() },
  { name: 'sparkles-coral', draw: () => drawSparklesCoral() },
  { name: 'heart-lavender', draw: () => drawHeart() },
  { name: 'laugh-sky', draw: () => drawLaugh() },
  // G. 徽章
  { name: 'badge-first-escape', draw: () => drawBadge('star') },
  { name: 'badge-seven-streak', draw: () => drawBadge('seven') },
  { name: 'badge-thirty-streak', draw: () => drawBadge('laurel') },
  { name: 'badge-color-hunter', draw: () => drawBadge('eye') },
  { name: 'badge-night-walker', draw: () => drawBadge('moon') },
  { name: 'badge-rainy-walker', draw: () => drawBadge('umbrella') },
  { name: 'badge-market-regular', draw: () => drawBadge('basket') },
  { name: 'badge-city-detective', draw: () => drawBadge('magnifier') },
  { name: 'badge-member-pro', draw: () => drawBadge('crown') },
  { name: 'badge-culture-lover', draw: () => drawBadge('book') },
  { name: 'badge-micro-master', draw: () => drawBadge('sprout') },
  { name: 'badge-walk-master', draw: () => drawBadge('footprints') },
  { name: 'badge-double-master', draw: () => drawBadge('people') },
  { name: 'badge-night-master', draw: () => drawBadge('star_night') },
  { name: 'badge-rainy-master', draw: () => drawBadge('rain') },
  { name: 'badge-social-master', draw: () => drawBadge('chat') },
  { name: 'badge-collector', draw: () => drawBadge('gem') },
  { name: 'badge-explorer', draw: () => drawBadge('compass') },
  { name: 'badge-challenge-king', draw: () => drawBadge('trophy') },
  // H. 地图标记
  { name: 'pin-color', draw: () => drawPin(COLORS.blue) },
  { name: 'pin-walk', draw: () => drawPin(COLORS.coral) },
  { name: 'pin-sense', draw: () => drawPin(COLORS.lavender) },
  { name: 'pin-collect', draw: () => drawPin(COLORS.gold) },
  { name: 'pin-food', draw: () => drawPin(COLORS.brown) },
  { name: 'pin-culture', draw: () => drawPin(COLORS.mint) },
  // I. 步骤
  { name: 'step-leave', draw: () => drawStepLeave() },
  { name: 'step-explore', draw: () => drawStepExplore() },
  { name: 'step-discover', draw: () => drawStepDiscover() },
  { name: 'step-record', draw: () => drawStepRecord() },
  // J. 会员
  { name: 'users-lavender', draw: () => drawUsers() },
  { name: 'award-lemon', draw: () => drawAward() },
  { name: 'cloud-rain-sky', draw: () => drawCloudBackup() },
  // K. 空状态
  { name: 'empty-collection', draw: () => drawEmptyCollection() },
  { name: 'empty-map', draw: () => drawEmptyMap() },
  // 附加
  { name: 'check-brand', draw: () => drawCheck() },
  { name: 'chevron-right-brand', draw: () => drawChevronRight(false) },
  { name: 'chevron-down-ink', draw: () => {
    return `<g transform="rotate(90, 24, 24)">${drawChevronRight(false)}</g>`;
  }},
  // M. 固定配图
  { name: 'avatar', draw: () => drawProfile(false), isImage: true },
  { name: 'paper-texture', draw: () => {
    return `<rect x="0" y="0" width="48" height="48" fill="${COLORS.paperBg}"/>
    <rect x="0" y="0" width="48" height="48" fill="${COLORS.paperEdge}" opacity="0.15" filter="url(#paper)"/>
    <rect x="0" y="0" width="48" height="48" fill="${COLORS.paperShadow}" opacity="0.05" filter="url(#watercolor)"/>`;
  }, isImage: true },
  { name: 'empty-collection-large', draw: () => drawEmptyCollection(), isImage: true },
  // N. 旧引用补充（v3 风格覆盖旧图标）
  { name: 'award', draw: () => drawAward() },
  { name: 'lock', draw: () => drawLock() },
  { name: 'share-2', draw: () => drawShare() },
  { name: 'share-2-ink-soft', draw: () => drawShare() },
  { name: 'star-lemon', draw: () => drawStar() },
  { name: 'target', draw: () => drawTarget() },
  { name: 'award-brand-strong', draw: () => drawAward() },
  { name: 'crown-lemon', draw: () => drawBadge('crown') },
  { name: 'sun-lemon', draw: () => drawSun() },
  { name: 'sun', draw: () => drawSun() },
  { name: 'moon-gray', draw: () => drawMoon() },
  { name: 'moon-white', draw: () => drawMoon() },
  { name: 'layers', draw: () => drawLayers() },
  { name: 'layers-ink-soft', draw: () => drawLayers() },
  { name: 'compass', draw: () => drawCompass() },
  { name: 'compass-ink-faint', draw: () => drawCompass() },
  { name: 'clock', draw: () => drawClock() },
  { name: 'footprints', draw: () => drawFootprints() },
  { name: 'map-pin', draw: () => drawMapPin() },
  { name: 'send', draw: () => drawSend() },
  { name: 'users-white', draw: () => drawUsers() },
  { name: 'cloud-rain-white', draw: () => drawCloudRain() },
];

// ===== 生成单个 SVG =====
function generateSVG(icon) {
  const active = icon.active || false;
  const suffix = active ? 'A' : '';
  const subject = icon.draw();

  // 固定配图（无容器、无微配件）
  if (icon.isImage && icon.name === 'paper-texture') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  ${getDefs(suffix)}
  ${subject}
</svg>`;
  }

  // 固定配图（有容器但无微配件）
  if (icon.isImage) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  ${getDefs(suffix)}
  ${container(active)}
  <g>
    ${subject}
  </g>
</svg>`;
  }

  // 普通图标（容器 + 微配件 + 主体）
  const accessories = microAccessories(icon.name.length % 6);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  ${getDefs(suffix)}
  ${container(active)}
  <g>
    ${accessories}
  </g>
  <g>
    ${subject}
  </g>
</svg>`;
}

// ===== 主流程 =====
function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\n🎨 出逃指令 v3 SVG 图标生成器`);
  console.log(`   共 ${ICON_CONFIG.length} 个图标\n`);

  let ok = 0;
  let fail = 0;

  ICON_CONFIG.forEach((icon, i) => {
    try {
      const svg = generateSVG(icon);
      const outputPath = path.join(OUTPUT_DIR, icon.name + '.svg');
      fs.writeFileSync(outputPath, svg);
      console.log(`   [${i + 1}/${ICON_CONFIG.length}] ✅ ${icon.name}.svg (${Math.round(svg.length / 1024)}KB)`);
      ok++;
    } catch (err) {
      console.log(`   [${i + 1}/${ICON_CONFIG.length}] ❌ ${icon.name}: ${err.message}`);
      fail++;
    }
  });

  console.log(`\n   ✅ 成功 ${ok} | ❌ 失败 ${fail}\n`);

  // 保存清单
  const manifest = {
    generatedAt: new Date().toISOString(),
    total: ICON_CONFIG.length,
    success: ok,
    fail: fail,
    icons: ICON_CONFIG.map(ic => ({ name: ic.name + '.svg', status: 'success' })),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, '_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`   📋 清单已保存: ${path.join(OUTPUT_DIR, '_manifest.json')}\n`);
}

main();
