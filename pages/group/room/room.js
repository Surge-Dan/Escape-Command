const app = getApp()
const roomStore = require('../../../utils/group-room-store.js')
const hallStore = require('../../../utils/task-hall-store.js')
const chatStore = require('../../../utils/chat-store.js')
const trustStore = require('../../../utils/player-trust-store.js')
const { VOTE_OPTIONS, PREFERENCE_OPTIONS, ROOM_STATUS } = roomStore

const USE_LOCAL_MODE = true

// C-P4: 预设评价标签 + 举报理由
const REVIEW_TAGS = ['准时', '友善', '有趣', '靠谱', '会聊天', '懂拍照']
const REPORT_REASONS = ['迟到', '爽约', '骚扰', '其他']

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    roomId: '',
    room: null,
    loading: true,
    cancelling: false,
    isHostView: true,
    memberSlots: [],
    membersCount: 0,
    statusText: '等待成员加入',
    statusColor: '#5CBF9E',
    voteOptions: VOTE_OPTIONS,
    preferenceOptions: PREFERENCE_OPTIONS,
    voteStats: null,
    myVotes: { time: null, budget: null, style: null },
    myPreference: { interests: [], intensity: '' },
    interestSelectedMap: {},
    script: null,
    generatingScript: false,
    allMembersReady: false,
    allVoted: false,
    fromShare: false,
    // v11: 邀请弹窗状态
    showInvitePopup: false,
    // C-12: FINISHED 状态同频记录入口（groupId 命中的最新记录 id）
    groupRecordId: '',
    // C-P3 联动：来自任务大厅的 taskId（用于回写 hall task 状态）
    taskId: '',
    // C-P3 联动：任务大厅 POI（出逃地点展示）
    hallPoi: null,
    // C-P4: Tab 切换（members/chat/record），ready 状态后展示
    activeTab: 'members',
    showTabs: false,
    // C-P4: 聊天
    messages: [],
    inputContent: '',
    chatSending: false,
    chatScrollIntoView: '',
    // C-P4: 成员信任标签
    memberTrustMap: {},
    // C-P4: 当前用户 openId（WXML 区分自己/他人消息用）
    currentOpenId: '',
    // C-P4: 评价弹窗
    showReviewModal: false,
    reviewTarget: null,
    reviewRating: 0,
    reviewTags: REVIEW_TAGS,
    reviewSelectedTags: [],
    reviewSelectedTagMap: {},
    reviewComment: '',
    reviewSubmitting: false,
    // C-P4: 举报弹窗
    showReportModal: false,
    reportTarget: null,
    reportReasons: REPORT_REASONS,
    reportSelectedReason: '',
    reportSubmitting: false
  },

  onLoad(options) {
    this.applyNavMetrics()
    const roomId = (options && options.roomId) || ''
    const fromShare = !!(options && options.from === 'share')
    const taskId = (options && options.taskId) || ''
    this.setData({ roomId, fromShare, taskId })
    // C-P3 联动：来自任务大厅时，读取 hall task POI 作为出逃地点展示
    if (taskId) {
      this.loadHallTaskPoi(taskId)
    }
    if (roomId) {
      if (USE_LOCAL_MODE) {
        this.loadRoomLocal(roomId, fromShare)
      } else {
        this.loadRoomCloud(roomId)
      }
    } else {
      this.setData({ loading: false, room: null })
    }
  },

  // ===== C-P3 联动：加载任务大厅 POI =====
  loadHallTaskPoi(taskId) {
    try {
      const result = hallStore.getTaskDetail(taskId)
      if (result && result.ok && result.task && result.task.poi) {
        const poi = result.task.poi
        this.setData({
          hallPoi: {
            name: poi.name || '',
            address: poi.address || '',
            latitude: poi.latitude || 0,
            longitude: poi.longitude || 0
          }
        })
      }
    } catch (e) {
      console.warn('[room] loadHallTaskPoi 失败', e)
    }
  },

  // ===== C-P3 联动：房间完成后回写 hall task 状态为 finished =====
  syncHallTaskFinished() {
    const taskId = this.data.taskId
    if (!taskId) return
    try {
      // dice match 路径任务可能还停留在 ready，先推进到 started 再 finished
      const detail = hallStore.getTaskDetail(taskId)
      if (detail && detail.ok && detail.task) {
        if (detail.task.status === 'ready') {
          hallStore.updateTaskStatus(taskId, 'started')
        }
      }
      hallStore.updateTaskStatus(taskId, 'finished')
    } catch (e) {
      console.warn('[room] 回写 hall task 状态失败', e)
    }
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  // ===== 加载房间 =====
  loadRoomLocal(roomId, fromShare) {
    setTimeout(() => {
      const result = roomStore.loadRoom(roomId)
      if (result.ok && result.room) {
        this.applyRoom(result.room)
      } else if (fromShare) {
        // C-02: 分享进入但本地无房间 → mock 成员视角
        this.applyMockMemberView(roomId)
      } else {
        this.setData({ loading: false, room: null })
      }
    }, 500)
  },

  loadRoomCloud(roomId) {
    if (!app.globalData.cloudReady) {
      this.setData({ loading: false, room: null })
      return
    }
    const db = wx.cloud.database()
    db.collection('rooms').where({ roomId }).limit(1).get({
      success: (res) => {
        const list = (res && res.data) || []
        if (list.length === 0) {
          this.setData({ loading: false, room: null })
          return
        }
        this.applyRoom(list[0])
      },
      fail: () => {
        this.setData({ loading: false, room: null })
      }
    })
  },

  // ===== 渲染房间 =====
  applyRoom(room) {
    const members = room.members || []
    const maxMembers = room.maxMembers || 4
    const slots = []
    for (let i = 0; i < maxMembers; i++) {
      if (i < members.length) {
        slots.push({
          isHost: members[i].isHost,
          nickname: members[i].nickname,
          hasPreference: !!(members[i].preference),
          hasVoted: !!(members[i].votes && members[i].votes.time && members[i].votes.budget && members[i].votes.style)
        })
      } else {
        slots.push({ isHost: false, nickname: '', hasPreference: false, hasVoted: false })
      }
    }

    let statusText = '等待成员加入'
    let statusColor = '#5CBF9E'
    if (room.status === 'cancelled') { statusText = '已取消'; statusColor = '#999' }
    else if (room.status === 'ready') { statusText = '已到齐'; statusColor = '#5C9EBF' }
    else if (room.status === 'voting') { statusText = '投票中'; statusColor = '#D98A5C' }
    else if (room.status === 'generating') { statusText = '生成中'; statusColor = '#D98A5C' }
    else if (room.status === 'finished') { statusText = '剧本已生成'; statusColor = '#7BAE7F' }

    const allMembersReady = members.length >= maxMembers

    // 投票统计
    let voteStats = null
    let allVoted = false
    if (room.status === 'voting' || room.status === 'finished') {
      const statsResult = roomStore.getVoteStats(room.roomId)
      if (statsResult.ok) {
        voteStats = statsResult.stats
        allVoted = statsResult.stats.allVoted
      }
    }

    // 我的投票
    const myMember = members[0]
    const myVotes = myMember ? (myMember.votes || { time: null, budget: null, style: null }) : { time: null, budget: null, style: null }
    const myPreference = myMember && myMember.preference ? myMember.preference : { interests: [], intensity: '' }

    // 预计算兴趣选中状态（WXML 不支持 indexOf）
    const interestSelectedMap = {}
    PREFERENCE_OPTIONS.interests.forEach(opt => {
      interestSelectedMap[opt.value] = (myPreference.interests || []).indexOf(opt.value) >= 0
    })

    // C-12: FINISHED 状态查找同频记录入口（globalData.records 中 groupId 命中的最新记录）
    let groupRecordId = ''
    if (room.status === 'finished') {
      const records = (app.globalData && app.globalData.records) || []
      const rec = records.find(r => r && r.isGroup && r.groupId === room.roomId)
      if (rec) groupRecordId = rec.id
    }

    this.setData({
      room,
      memberSlots: slots,
      membersCount: members.length,
      statusText,
      statusColor,
      loading: false,
      allMembersReady,
      voteStats,
      allVoted,
      myVotes,
      myPreference,
      interestSelectedMap,
      script: room.script || null,
      isHostView: true,
      groupRecordId
    })

    // C-P4: 联动聊天/信任/Tab
    this.refreshChatState(room)
  },

  // ===== C-P4: 聊天/信任/Tab 联动 =====
  refreshChatState(room) {
    if (!room || !room.roomId) return
    const activeStatuses = ['ready', 'voting', 'generating', 'finished']
    const showTabs = activeStatuses.indexOf(room.status) !== -1
    this.setData({ showTabs, currentOpenId: this._getCurrentUser().openId })

    // 加载本地聊天历史
    const messages = chatStore.loadMessages(room.roomId)
    this.setData({ messages: this._trimMessages(messages) })

    // 加载成员信任标签（不阻断页面）
    this.loadMemberTrust(room)

    // 轮询控制：未 finished 才轮询
    if (showTabs && room.status !== 'finished' && room.status !== 'cancelled') {
      this._startChatPolling(room)
    } else {
      chatStore.stopPolling()
    }
  },

  _startChatPolling(room) {
    const ctx = this._buildChatCtx(room)
    chatStore.startPolling(room.roomId, ctx, (newMsgs, allMsgs) => {
      this.setData({
        messages: this._trimMessages(allMsgs),
        chatScrollIntoView: 'chat-msg-last'
      })
    })
  },

  // 裁剪到最近 50 条，避免渲染压力
  _trimMessages(list) {
    const arr = Array.isArray(list) ? list : []
    return arr.slice(-50)
  },

  // 构造聊天上下文（注入 cloudReady/callFunction/currentUser）
  _buildChatCtx(room) {
    const self = this
    const cloudReady = !!(app.globalData && app.globalData.cloudReady)
    return {
      cloudReady: cloudReady,
      currentUser: this._getCurrentUser(),
      roomMembers: (room && room.members || []).map(m => m.openId).filter(Boolean),
      roomStatus: room && room.status || '',
      pollInterval: chatStore.POLL_INTERVAL,
      callFunction: function (opts) {
        if (!cloudReady || !wx.cloud || typeof wx.cloud.callFunction !== 'function') {
          return Promise.reject(new Error('cloud unavailable'))
        }
        return new Promise(function (resolve, reject) {
          wx.cloud.callFunction({
            name: opts.name,
            data: opts.data || {},
            success: function (res) { resolve(res) },
            fail: function (err) { reject(err) }
          })
        })
      }
    }
  },

  _getCurrentUser() {
    let openId = ''
    try { openId = roomStore.getHostOpenId() } catch (e) {}
    const nickname = (app.globalData && app.globalData.escapeName) || '出逃者'
    return { openId: openId, nickname: nickname }
  },

  loadMemberTrust(room) {
    if (!room || !room.members || room.members.length === 0) return
    const openIds = room.members.map(m => m.openId).filter(id => id && id.indexOf('mock_') !== 0)
    if (openIds.length === 0) {
      // 全是 mock 成员 → 用默认信任分填充（新手）
      const map = {}
      room.members.forEach(m => { if (m.openId) map[m.openId] = { tier: 'newbie', label: '新手', score: 5.0, count: 0 } })
      this.setData({ memberTrustMap: map })
      return
    }
    const ctx = { cloudReady: !!(app.globalData && app.globalData.cloudReady) }
    try {
      trustStore.getTrustBatch(openIds, ctx).then((trusts) => {
        // mock 成员补默认值
        const map = Object.assign({}, trusts)
        room.members.forEach(m => {
          if (m.openId && !map[m.openId]) {
            map[m.openId] = { tier: 'newbie', label: '新手', score: 5.0, count: 0 }
          }
        })
        this.setData({ memberTrustMap: map })
      }).catch(() => {})
    } catch (e) {}
  },

  // ===== C-P4: Tab 切换 =====
  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
    if (tab === 'chat') {
      this.setData({ chatScrollIntoView: 'chat-msg-last' })
    }
  },

  // ===== C-P4: 聊天输入/发送 =====
  onChatInput(e) {
    this.setData({ inputContent: e.detail.value || '' })
  },

  onSendTap() {
    const content = (this.data.inputContent || '').trim()
    if (!content) return
    if (this.data.chatSending) return
    const room = this.data.room
    if (!room) return
    if (room.status === 'finished' || room.status === 'cancelled') {
      wx.showToast({ title: '任务已结束，聊天已关闭', icon: 'none' })
      return
    }
    this.setData({ chatSending: true, inputContent: '' })
    const ctx = this._buildChatCtx(room)
    const self = this
    chatStore.sendMessage(room.roomId, this.data.taskId, content, ctx).then(function (res) {
      // 乐观消息已在 store 内同步写入，这里刷新视图
      self.setData({
        messages: self._trimMessages(chatStore.loadMessages(room.roomId)),
        chatScrollIntoView: 'chat-msg-last'
      })
      if (!res.ok) {
        wx.showToast({ title: res.errMsg || '发送失败', icon: 'none' })
      }
    }).catch(function () {
      wx.showToast({ title: '发送异常', icon: 'none' })
    }).then(function () {
      self.setData({ chatSending: false })
    })
  },

  // ===== C-P4: 评价弹窗 =====
  onReviewTap(e) {
    const openId = e.currentTarget.dataset.openid
    const room = this.data.room
    if (!room) return
    const target = (room.members || []).find(m => m.openId === openId)
    if (!target) return
    this.setData({
      showReviewModal: true,
      reviewTarget: target,
      reviewRating: 0,
      reviewSelectedTags: [],
      reviewSelectedTagMap: {},
      reviewComment: ''
    })
  },

  onReviewRatingTap(e) {
    this.setData({ reviewRating: e.currentTarget.dataset.value })
  },

  onReviewTagTap(e) {
    const tag = e.currentTarget.dataset.value
    const tags = (this.data.reviewSelectedTags || []).slice()
    const idx = tags.indexOf(tag)
    if (idx >= 0) {
      tags.splice(idx, 1)
    } else {
      if (tags.length >= 5) {
        wx.showToast({ title: '最多选5个标签', icon: 'none' })
        return
      }
      tags.push(tag)
    }
    // 预计算选中 map（WXML 不支持 indexOf）
    const map = {}
    tags.forEach(t => { map[t] = true })
    this.setData({ reviewSelectedTags: tags, reviewSelectedTagMap: map })
  },

  onReviewCommentInput(e) {
    this.setData({ reviewComment: (e.detail.value || '').slice(0, 100) })
  },

  onSubmitReview() {
    if (this.data.reviewSubmitting) return
    const target = this.data.reviewTarget
    if (!target) return
    if (!this.data.reviewRating) {
      wx.showToast({ title: '请选择评分', icon: 'none' })
      return
    }
    const room = this.data.room
    const ctx = { cloudReady: !!(app.globalData && app.globalData.cloudReady) }
    const target2 = {
      openId: target.openId,
      roomId: room.roomId,
      taskId: this.data.taskId,
      roomMembers: (room.members || []).map(m => m.openId),
      roomStatus: room.status
    }
    const review = {
      rating: this.data.reviewRating,
      comment: this.data.reviewComment,
      tags: this.data.reviewSelectedTags
    }
    this.setData({ reviewSubmitting: true })
    const self = this
    trustStore.submitReview(target2, review, ctx).then(function (res) {
      if (res.ok) {
        wx.showToast({ title: '评价已提交', icon: 'success' })
        // 更新本地信任标签缓存
        if (target.openId) {
          const map = Object.assign({}, self.data.memberTrustMap)
          map[target.openId] = res.trust || map[target.openId]
          self.setData({ memberTrustMap: map })
        }
        self.setData({ showReviewModal: false })
      } else {
        wx.showToast({ title: res.errMsg || '评价失败', icon: 'none' })
      }
    }).catch(function () {
      wx.showToast({ title: '评价异常', icon: 'none' })
    }).then(function () {
      self.setData({ reviewSubmitting: false })
    })
  },

  onReviewModalClose() {
    this.setData({ showReviewModal: false })
  },

  // 阻止弹窗内部点击冒泡
  onReviewPanelTap() {},

  // ===== C-P4: 举报弹窗 =====
  onReportTap(e) {
    const openId = e.currentTarget.dataset.openid
    const room = this.data.room
    if (!room) return
    const target = (room.members || []).find(m => m.openId === openId)
    if (!target) return
    this.setData({
      showReportModal: true,
      reportTarget: target,
      reportSelectedReason: ''
    })
  },

  onReportReasonTap(e) {
    this.setData({ reportSelectedReason: e.currentTarget.dataset.value })
  },

  onSubmitReport() {
    if (this.data.reportSubmitting) return
    const target = this.data.reportTarget
    if (!target) return
    if (!this.data.reportSelectedReason) {
      wx.showToast({ title: '请选择举报理由', icon: 'none' })
      return
    }
    const room = this.data.room
    const ctx = { cloudReady: !!(app.globalData && app.globalData.cloudReady) }
    this.setData({ reportSubmitting: true })
    const self = this
    trustStore.reportPlayer(
      { openId: target.openId, roomId: room.roomId },
      this.data.reportSelectedReason,
      ctx
    ).then(function (res) {
      if (res.ok) {
        wx.showToast({ title: '举报已提交', icon: 'success' })
        self.setData({ showReportModal: false })
      } else {
        wx.showToast({ title: res.errMsg || '举报失败', icon: 'none' })
      }
    }).catch(function () {
      wx.showToast({ title: '举报异常', icon: 'none' })
    }).then(function () {
      self.setData({ reportSubmitting: false })
    })
  },

  onReportModalClose() {
    this.setData({ showReportModal: false })
  },

  onReportPanelTap() {},

  // ===== C-P4: 生命周期 - 停止轮询 =====
  onHide() {
    chatStore.stopPolling()
  },

  onUnload() {
    chatStore.stopPolling()
  },

  // ===== C-02: mock 成员视角 =====
  applyMockMemberView(roomId) {
    const slots = [
      { isHost: true, nickname: '发起人', hasPreference: true, hasVoted: true },
      { isHost: false, nickname: '你', hasPreference: false, hasVoted: false }
    ]
    // 补满到 4 个位
    for (let i = 2; i < 4; i++) {
      slots.push({ isHost: false, nickname: '', hasPreference: false, hasVoted: false })
    }
    const mockRoom = {
      roomId,
      topic: '同频出逃',
      maxMembers: 4,
      members: [
        { openId: 'host', nickname: '发起人', isHost: true },
        { openId: 'me', nickname: '你', isHost: false }
      ],
      status: 'waiting_members',
      script: null
    }
    this.setData({
      room: mockRoom,
      memberSlots: slots,
      membersCount: 2,
      statusText: '已加入',
      statusColor: '#5C9EBF',
      loading: false,
      isHostView: false
    })
  },

  // ===== C-02: 微信分享（个人小程序未认证时无法触发，作为降级备份）=====
  onShareAppMessage() {
    const room = this.data.room
    const roomId = this.data.roomId
    return {
      title: room ? `${room.topic} | 同频出逃等你加入` : '同频出逃等你加入',
      path: `/pages/group/room/room?roomId=${roomId}&from=share`,
      imageUrl: '/assets/images/coffee-shop.webp'
    }
  },

  // ===== v11: 邀请朋友（个人小程序无 open-type=share，降级为复制）=====
  onInviteTap() {
    this.setData({ showInvitePopup: true })
  },

  onInvitePopupClose() {
    this.setData({ showInvitePopup: false })
  },

  onCopyRoomIdFromPopup() {
    if (!this.data.room) return
    wx.setClipboardData({
      data: this.data.room.roomId,
      success: () => {
        wx.showToast({ title: '房间号已复制', icon: 'success' })
        this.setData({ showInvitePopup: false })
      }
    })
  },

  onCopyInviteLink() {
    if (!this.data.room) return
    const link = `escape-command://group/room?roomId=${this.data.room.roomId}`
    wx.setClipboardData({
      data: link,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' })
        this.setData({ showInvitePopup: false })
      }
    })
  },

  // ===== C-01: 复制 roomId =====
  onCopyRoomId() {
    if (!this.data.room) return
    wx.setClipboardData({
      data: this.data.room.roomId,
      success: () => wx.showToast({ title: '房间号已复制', icon: 'success' })
    })
  },

  // ===== C-03: 添加假成员（demo）=====
  onAddMockMember() {
    const result = roomStore.addMockMember(this.data.roomId)
    if (result.ok) {
      this.applyRoom(result.room)
      try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    } else {
      wx.showToast({ title: this.mapErrMsg(result.errCode), icon: 'none' })
    }
  },

  // ===== C-03: 一键填满假成员（demo）=====
  onFillMockMembers() {
    const result = roomStore.fillMockMembers(this.data.roomId)
    if (result.ok) {
      this.applyRoom(result.room)
      wx.showToast({ title: '成员已到齐', icon: 'success' })
    } else {
      wx.showToast({ title: this.mapErrMsg(result.errCode), icon: 'none' })
    }
  },

  // ===== C-09: 到齐确认（WAITING → READY）=====
  onConfirmReady() {
    if (!this.data.room) return
    if (this.data.membersCount < 2) {
      wx.showToast({ title: '至少 2 人才能开始', icon: 'none' })
      return
    }
    const result = roomStore.confirmReady(this.data.roomId)
    if (result.ok) {
      this.applyRoom(result.room)
      try { wx.vibrateShort({ type: 'medium' }) } catch (e) {}
    } else {
      wx.showToast({ title: this.mapErrMsg(result.errCode), icon: 'none' })
    }
  },

  // ===== 进入投票阶段（READY → VOTING，兼容 WAITING 满员快速路径）=====
  onStartVoting() {
    const room = this.data.room
    if (!room) return
    // READY 状态直接进投票；WAITING 满员也允许（保留原兼容路径）
    if (room.status !== ROOM_STATUS.READY && !this.data.allMembersReady) {
      wx.showToast({ title: '成员未到齐', icon: 'none' })
      return
    }
    const result = roomStore.updateRoomStatus(this.data.roomId, ROOM_STATUS.VOTING)
    if (result.ok) {
      this.applyRoom(result.room)
      try { wx.vibrateShort({ type: 'medium' }) } catch (e) {}
    }
  },

  // ===== C-04: 偏好 - 兴趣选择 =====
  onPreferenceInterestTap(e) {
    const value = e.currentTarget.dataset.value
    const interests = (this.data.myPreference.interests || []).slice()
    const idx = interests.indexOf(value)
    if (idx >= 0) {
      interests.splice(idx, 1)
    } else {
      if (interests.length >= 3) {
        wx.showToast({ title: '最多选3个', icon: 'none' })
        return
      }
      interests.push(value)
    }
    // 同步更新选中状态 map（WXML 不支持 indexOf）
    const interestSelectedMap = {}
    PREFERENCE_OPTIONS.interests.forEach(opt => {
      interestSelectedMap[opt.value] = interests.indexOf(opt.value) >= 0
    })
    this.setData({
      'myPreference.interests': interests,
      interestSelectedMap
    })
  },

  // ===== C-04: 偏好 - 强度选择 =====
  onPreferenceIntensityTap(e) {
    const value = e.currentTarget.dataset.value
    this.setData({ 'myPreference.intensity': value })
  },

  // ===== C-04: 提交偏好 =====
  onSubmitPreference() {
    const pref = this.data.myPreference
    if (!pref.interests || pref.interests.length === 0) {
      wx.showToast({ title: '请选择至少1个兴趣', icon: 'none' })
      return
    }
    if (!pref.intensity) {
      wx.showToast({ title: '请选择强度', icon: 'none' })
      return
    }
    const result = roomStore.submitPreference(this.data.roomId, pref)
    if (result.ok) {
      this.applyRoom(result.room)
      wx.showToast({ title: '偏好已提交', icon: 'success' })
    } else {
      wx.showToast({ title: '提交失败', icon: 'none' })
    }
  },

  // ===== C-05/06/07: 投票 =====
  onVoteTime(e) { this.doVote('time', e.currentTarget.dataset.value) },
  onVoteBudget(e) { this.doVote('budget', e.currentTarget.dataset.value) },
  onVoteStyle(e) { this.doVote('style', e.currentTarget.dataset.value) },

  doVote(voteType, voteValue) {
    const result = roomStore.submitVote(this.data.roomId, voteType, voteValue)
    if (result.ok) {
      this.applyRoom(result.room)
      try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    } else {
      wx.showToast({ title: '投票失败', icon: 'none' })
    }
  },

  // ===== C-08: 生成剧本 =====
  onGenerateScript() {
    if (this.data.generatingScript) return
    if (!this.data.allVoted) {
      wx.showToast({ title: '还有成员未投票', icon: 'none' })
      return
    }
    this.setData({ generatingScript: true })

    // 模拟生成动画 1.5 秒
    setTimeout(() => {
      const result = roomStore.generateScript(this.data.roomId)
      if (result.ok) {
        this.applyRoom(result.room)
        try { wx.vibrateShort({ type: 'heavy' }) } catch (e) {}
        // C-P3 联动：房间 finished 后回写 hall task 状态
        this.syncHallTaskFinished()
      } else {
        wx.showToast({ title: '生成失败', icon: 'none' })
      }
      this.setData({ generatingScript: false })
    }, 1500)
  },

  // ===== C-08: 重新生成 =====
  onRegenerateScript() {
    // 重置状态到投票阶段
    const result = roomStore.updateRoomStatus(this.data.roomId, ROOM_STATUS.VOTING)
    if (result.ok) {
      this.applyRoom(result.room)
    }
  },

  // ===== C-08: 确认剧本，开始出逃（v11: 跳转到出逃执行页，不再直接回首页）=====
  onStartEscape() {
    if (!this.data.script) {
      wx.showToast({ title: '剧本还没准备好', icon: 'none' })
      return
    }
    // 写入全局，执行页从 globalData 读取
    try {
      app.globalData.currentGroupScript = {
        script: this.data.script,
        room: this.data.room,
        steps: []
      }
    } catch (e) {}
    wx.redirectTo({
      url: '/pages/group/escape-record/escape-record?roomId=' + this.data.roomId
    })
  },

  // ===== C-12: 查看本次同频出逃记录 =====
  onViewGroupRecord() {
    if (!this.data.groupRecordId) return
    wx.navigateTo({
      url: '/pages/record-detail/record-detail?id=' + this.data.groupRecordId
    })
  },

  // ===== C-01: 取消组局 =====
  onCancelTap() {
    if (this.data.cancelling) return
    if (!this.data.room) return
    wx.showModal({
      title: '取消组局？',
      content: '成员将收到通知，房间会被关闭',
      confirmText: '取消组局',
      confirmColor: '#E07A5F',
      success: (res) => {
        if (!res.confirm) return
        this.doCancel()
      }
    })
  },

  doCancel() {
    this.setData({ cancelling: true })
    if (USE_LOCAL_MODE) {
      setTimeout(() => {
        const result = roomStore.cancelRoom(this.data.room.roomId)
        if (result.ok) {
          wx.showToast({ title: '组局已取消', icon: 'success' })
          setTimeout(() => {
            wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
          }, 800)
        } else {
          this.setData({ cancelling: false })
          wx.showToast({ title: this.mapCancelErrMsg(result.errCode), icon: 'none' })
        }
      }, 500)
    }
  },

  // ===== C-10: 临时退出房间 =====
  onExitRoom() {
    if (!this.data.room) return
    const isHost = this.data.isHostView
    wx.showModal({
      title: isHost ? '退出组局？' : '离开房间？',
      content: isHost ? '退出后房间将关闭，成员会收到通知' : '离开后可重新通过房间号加入',
      confirmText: isHost ? '退出并关闭' : '离开',
      confirmColor: '#E07A5F',
      success: (res) => {
        if (!res.confirm) return
        this.doLeaveRoom()
      }
    })
  },

  doLeaveRoom() {
    if (!this.data.room) return
    const result = roomStore.leaveRoom(this.data.room.roomId)
    if (!result.ok) {
      wx.showToast({ title: this.mapErrMsg(result.errCode), icon: 'none' })
      return
    }
    if (result.hostLeft) {
      // 房主退出 → 房间已关闭，返回首页
      wx.showToast({ title: '组局已关闭', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
      }, 800)
      return
    }
    // 非房主退出 → 刷新视图 + 人数兜底提示
    this.applyRoom(result.room)
    const q = result.quorum || {}
    if (q.suggestion === 'cancel') {
      wx.showToast({ title: '人数不足，建议取消', icon: 'none' })
    } else if (q.suggestion === 'small_team') {
      wx.showToast({ title: '已离开，当前为小队模式', icon: 'none' })
    } else {
      wx.showToast({ title: '已离开房间', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
      }, 800)
    }
  },

  // ===== 返回 =====
  onBackTap() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },

  mapErrMsg(errCode) {
    const map = {
      'ROOM_NOT_FOUND': '房间不存在',
      'ROOM_FULL': '房间已满',
      'ROOM_CANCELLED': '房间已取消',
      'ALREADY_JOINED': '已加入房间',
      'NOT_ENOUGH_MEMBERS': '至少 2 人才能开始',
      'INVALID_STATUS': '当前阶段无法操作',
      'NOT_MEMBER': '你不在房间中',
      'NOT_HOST': '只有发起人可以操作'
    }
    return map[errCode] || '操作失败'
  },

  mapCancelErrMsg(errCode) {
    const map = {
      'ROOM_NOT_FOUND': '房间不存在',
      'NOT_HOST': '只有发起人可以取消',
      'ALREADY_CANCELLED': '组局已取消'
    }
    return map[errCode] || '取消失败'
  }
})
