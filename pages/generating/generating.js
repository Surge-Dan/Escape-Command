// pages/generating/generating.js
// B-01 骰子生成动画页
//
// 流程：
//   1. onLoad 接收 mode/duration 参数，构造 engine ctx
//   2. 取 loading copy（B-02）显示
//   3. 启动 3D 骰子滚动动画（CSS transform，6 面立方体）
//   4. 动画期间调用 engine.generate（B-03~B-06）生成 command
//   5. 动画结束 → 骰子停在 type 对应面（B-01 getFaceForType）
//   6. 写入 app.globalData.currentCommand → 跳转 executing
//
// 设计要点：
//   - 无新增图片资源，6 面用 CSS 渐变 + 文字符号绘制
//   - reduceMotion 用户跳过滚动动画，直接显示结果
//   - 引擎生成与动画并行，互不阻塞

const app = getApp()
const generatorEngine = require('../../utils/generator-engine.js')

// 骰子 6 面对应的旋转角度（让指定面朝向用户）
// 面编号：1=front, 2=back, 3=right, 4=left, 5=top, 6=bottom
// 标准骰子：1↔6, 2↔5, 3↔4（对面之和为 7）
const FACE_ROTATIONS = {
  1: 'rotateX(0deg) rotateY(0deg)',       // 1 朝前
  2: 'rotateX(0deg) rotateY(180deg)',     // 2 朝前（背面翻转）
  3: 'rotateX(0deg) rotateY(-90deg)',     // 3 朝前（右面转来）
  4: 'rotateX(0deg) rotateY(90deg)',      // 4 朝前（左面转来）
  5: 'rotateX(-90deg) rotateY(0deg)',     // 5 朝前（顶面转来）
  6: 'rotateX(90deg) rotateY(0deg)'       // 6 朝前（底面转来）
}

// 骰子面贴：1-6 点
// 用 view 圆点布局，遵循标准骰子点数排布
const FACE_DOTS = {
  1: ['c'],
  2: ['tl', 'br'],
  3: ['tl', 'c', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'c', 'bl', 'br'],
  6: ['tl', 'tr', 'cl', 'cr', 'bl', 'br']
}

// 动画阶段时长（ms）
const PHASE_SHAKE = 600     // 抖动期
const PHASE_ROLL = 1200     // 滚动期
const PHASE_SETTLE = 600    // 落定期（旋转到目标面）
const PHASE_HOLD = 400      // 停留期（让用户看清面）
const TOTAL = PHASE_SHAKE + PHASE_ROLL + PHASE_SETTLE + PHASE_HOLD

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    requestMode: '',
    requestDuration: 0,
    loadingCopy: '',
    dicePhase: 'idle',      // idle | shaking | rolling | settled
    diceTransform: 'rotateX(0deg) rotateY(0deg)',
    reduceMotion: false,
    // 6 面的点数布局（供 wxml 渲染）
    faces: [1, 2, 3, 4, 5, 6].map(n => ({ num: n, dots: FACE_DOTS[n] })),
    targetFace: 1,
    showResult: false,
    lowEnd: false      // pixelRatio<2 关投影/阴影
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const reduceMotion = !!wx.getStorageSync('reduceMotion')
    const pixelRatio = (app.globalData && app.globalData.pixelRatio) || 2
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      reduceMotion,
      lowEnd: pixelRatio < 2
    })

    if (options && options.mode) {
      this.setData({ requestMode: options.mode })
    }
    if (options && options.duration) {
      const d = parseInt(options.duration, 10)
      if (!isNaN(d)) this.setData({ requestDuration: d })
    }

    // B-02: 取加载文案
    const ctx = this._buildCtx()
    const copy = generatorEngine.getLoadingCopy(ctx)
    this.setData({ loadingCopy: copy })

    // 引擎生成（B-03~B-06）：与动画并行
    this._generateAsync(ctx)

    // 启动动画
    if (reduceMotion) {
      // reduceMotion 用户：跳过滚动，1s 后直接显示结果
      this.setData({ dicePhase: 'rolling' })
      this.animTimer = setTimeout(() => this._onDiceSettled(), 1000)
    } else {
      this._startDiceAnimation()
    }
  },

  onUnload() {
    if (this.animTimer) clearTimeout(this.animTimer)
    if (this.rollTimer) clearTimeout(this.rollTimer)
    if (this.settleTimer) clearTimeout(this.settleTimer)
    if (this.holdTimer) clearTimeout(this.holdTimer)
    if (this.navTimer) clearTimeout(this.navTimer)
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  // ===== 构造 engine ctx =====
  _buildCtx() {
    // 复用 app 的 _buildEngineCtx，但补 duration
    const ctx = app._buildEngineCtx ? app._buildEngineCtx(this.data.requestMode) : {}
    ctx.duration = this.data.requestDuration || 0
    ctx.mode = this.data.requestMode || ctx.mode || ''
    return ctx
  },

  // ===== 异步生成 command =====
  _generateAsync(ctx) {
    // 引擎本身是同步的，但放在 setTimeout 中避免阻塞动画启动
    setTimeout(() => {
      try {
        const result = generatorEngine.generate(ctx)
        if (result && result.ok && result.command) {
          this._generatedCommand = result.command
          this._generatedFallback = !!result.fallback
        } else {
          this._generatedCommand = null
        }
      } catch (e) {
        console.error('[generating] engine.generate 异常', e)
        this._generatedCommand = null
      }
    }, 50)
  },

  // ===== 骰子动画状态机 =====
  _startDiceAnimation() {
    // Phase 1: 抖动
    this.setData({ dicePhase: 'shaking' })

    // Phase 2: 滚动（随机旋转）
    this.rollTimer = setTimeout(() => {
      this.setData({
        dicePhase: 'rolling',
        diceTransform: this._randomRollTransform()
      })
    }, PHASE_SHAKE)

    // Phase 3: 落定（旋转到目标面）
    this.settleTimer = setTimeout(() => this._onDiceSettled(), PHASE_SHAKE + PHASE_ROLL)
  },

  _onDiceSettled() {
    // 优先用已生成的 command 的 type 决定面；未生成完则用随机面
    let face = 1
    if (this._generatedCommand && this._generatedCommand.type) {
      face = generatorEngine.getFaceForType(this._generatedCommand.type)
    } else {
      face = Math.floor(Math.random() * 6) + 1
    }
    this.setData({
      dicePhase: 'settled',
      targetFace: face,
      diceTransform: FACE_ROTATIONS[face] || FACE_ROTATIONS[1]
    })

    // Phase 4: 停留后跳转
    this.holdTimer = setTimeout(() => this._advance(), this.data.reduceMotion ? 200 : PHASE_HOLD)
  },

  // 随机滚动 transform：多圈旋转 + 随机面
  _randomRollTransform() {
    const xRounds = 2 + Math.floor(Math.random() * 2)  // 2-3 圈
    const yRounds = 2 + Math.floor(Math.random() * 2)
    const xDeg = 360 * xRounds + Math.floor(Math.random() * 90)
    const yDeg = 360 * yRounds + Math.floor(Math.random() * 90)
    return `rotateX(${xDeg}deg) rotateY(${yDeg}deg)`
  },

  // ===== 跳转下一页 =====
  _advance() {
    const cmd = this._generatedCommand
    if (cmd) {
      // engine 返回的 cmd 可能是 pool 中的（已 normalize）或 fallback 原始结构，统一 normalize
      const poolCmd = (app.globalData.commandPool || []).find(c => c.id === cmd.id)
      const finalCmd = app.normalizeCommand ? app.normalizeCommand(poolCmd || cmd) : cmd
      if (app.rememberLastType) app.rememberLastType(finalCmd.type)

      // 关键：补 startTime（executing 页 tickTimer 依赖 cmd.startTime 计算 elapsed）
      // 漏设会导致 Date.now() - undefined = NaN → elapsedMinutes 渲染成 "null 分钟"
      // 同步用户选择的时长：微逃模式用 requestDuration 覆盖，保证计时与选择一致
      if (this.data.requestMode === 'micro' && this.data.requestDuration > 0) {
        finalCmd.duration = this.data.requestDuration
        finalCmd.distance = finalCmd.distance || (this.data.requestDuration <= 10 ? '300m' : '500m')
      }
      finalCmd.startTime = Date.now()
      finalCmd.photos = finalCmd.photos || []

      app.globalData.currentCommand = finalCmd
      app.globalData.commandStatus = 'executing'
      app.saveCurrentCommand()

      this.setData({ showResult: true })
      this.navTimer = setTimeout(() => {
        wx.redirectTo({
          url: '/pages/executing/executing',
          fail: () => wx.switchTab({ url: '/pages/map/map' })
        })
      }, 300)
    } else {
      // 引擎未生成 → 兜底走 app.rollCommand
      const fallbackCmd = app.rollCommand ? app.rollCommand(this.data.requestMode) : null
      if (fallbackCmd) {
        // 兜底同样补 startTime + 微逃时长覆盖
        if (this.data.requestMode === 'micro' && this.data.requestDuration > 0) {
          fallbackCmd.duration = this.data.requestDuration
        }
        fallbackCmd.startTime = Date.now()
        fallbackCmd.photos = fallbackCmd.photos || []
        app.globalData.currentCommand = fallbackCmd
        app.globalData.commandStatus = 'executing'
        app.saveCurrentCommand()
        this.navTimer = setTimeout(() => {
          wx.redirectTo({
            url: '/pages/executing/executing',
            fail: () => wx.switchTab({ url: '/pages/map/map' })
          })
        }, 300)
      } else {
        // 终极兜底：去 map
        wx.switchTab({ url: '/pages/map/map' })
      }
    }
  }
})
