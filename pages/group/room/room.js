const app = getApp()
const roomStore = require('../../../utils/group-room-store.js')
const { VOTE_OPTIONS, PREFERENCE_OPTIONS, ROOM_STATUS } = roomStore

const USE_LOCAL_MODE = true

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
    groupRecordId: ''
  },

  onLoad(options) {
    this.applyNavMetrics()
    const roomId = (options && options.roomId) || ''
    const fromShare = !!(options && options.from === 'share')
    this.setData({ roomId, fromShare })
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
