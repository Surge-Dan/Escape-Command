// utils/arrival-helper.js
// 到达确认工具函数（B2 执行页阶段感设计）
//
// 纯函数模块，零 wx 依赖，context 全部入参传入，可在 Node 直接 require 测试。
// 覆盖：
//   AH-01 calcDistance    Haversine 距离计算（米）
//   AH-02 isArrived       到达判定（距离 ≤ 阈值）
//   AH-03 splitSteps      将步骤分为出发前/到达后两组
//   AH-04 buildPhaseView  构建阶段视图（出发前/到达后/全部解锁）
//   AH-05 shouldShowArriveBtn 判断是否显示「我到了」按钮

'use strict'

// ===== AH-01: Haversine 距离计算（米）=====
function calcDistance(lat1, lng1, lat2, lng2) {
  var R = 6371000
  var toRad = function (deg) { return deg * Math.PI / 180 }
  var dLat = toRad(lat2 - lat1)
  var dLng = toRad(lng2 - lng1)
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ===== AH-02: 到达判定 =====
// userLoc: { latitude, longitude }
// targetLoc: { latitude, longitude }
// threshold: 阈值（米），默认 100
// 返回 { arrived: boolean, distance: number }
function isArrived(userLoc, targetLoc, threshold) {
  var limit = (typeof threshold === 'number' && threshold > 0) ? threshold : 100
  // 参数校验
  if (!userLoc || !targetLoc ||
      typeof userLoc.latitude !== 'number' || typeof userLoc.longitude !== 'number' ||
      typeof targetLoc.latitude !== 'number' || typeof targetLoc.longitude !== 'number' ||
      !isFinite(userLoc.latitude) || !isFinite(userLoc.longitude) ||
      !isFinite(targetLoc.latitude) || !isFinite(targetLoc.longitude)) {
    return { arrived: false, distance: -1 }
  }
  var dist = calcDistance(
    userLoc.latitude, userLoc.longitude,
    targetLoc.latitude, targetLoc.longitude
  )
  return { arrived: dist <= limit, distance: Math.round(dist) }
}

// ===== AH-03: 将步骤分为出发前/到达后两组 =====
// steps: 步骤数组，每个步骤可有 hidden: true 标记
// 返回 { beforeArrival: [], afterArrival: [] }
function splitSteps(steps) {
  if (!Array.isArray(steps)) return { beforeArrival: [], afterArrival: [] }
  var before = []
  var after = []
  for (var i = 0; i < steps.length; i++) {
    var s = steps[i]
    if (s && s.hidden === true) {
      after.push(s)
    } else {
      before.push(s)
    }
  }
  return { beforeArrival: before, afterArrival: after }
}

// ===== AH-04: 构建阶段视图 =====
// steps: 全部步骤数组
// arrived: 是否已到达
// 返回当前应展示的步骤数组 + 阶段标记
function buildPhaseView(steps, arrived) {
  if (!Array.isArray(steps)) return { steps: [], phase: 'before', hiddenCount: 0 }
  var split = splitSteps(steps)
  if (arrived) {
    // 到达后展示全部步骤
    return {
      steps: steps.slice(),
      phase: 'after',
      hiddenCount: 0,
      beforeCount: split.beforeArrival.length,
      afterCount: split.afterArrival.length
    }
  }
  // 出发前仅展示非隐藏步骤
  return {
    steps: split.beforeArrival,
    phase: 'before',
    hiddenCount: split.afterArrival.length,
    beforeCount: split.beforeArrival.length,
    afterCount: split.afterArrival.length
  }
}

// ===== AH-05: 判断是否显示「我到了」按钮 =====
// steps: 全部步骤
// arrived: 是否已到达
// 显示条件：未到达 且 有隐藏步骤
function shouldShowArriveBtn(steps, arrived) {
  if (arrived) return false
  if (!Array.isArray(steps)) return false
  return steps.some(function (s) { return s && s.hidden === true })
}

module.exports = {
  calcDistance: calcDistance,
  isArrived: isArrived,
  splitSteps: splitSteps,
  buildPhaseView: buildPhaseView,
  shouldShowArriveBtn: shouldShowArriveBtn
}
