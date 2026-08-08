// utils/execution-progress.js
// 出逃执行进度管理（纯函数，零 wx 依赖）
//
// 解决「中途退出/锁屏/进程被清除后步骤进度丢失」问题：
//   - 进度挂在 currentCommand.executionProgress，复用 app.saveCurrentCommand 持久化
//   - 冷启动 app.loadLocalData 恢复 currentCommand → executing.onLoad 从 executionProgress 恢复步骤 done 状态
//   - 每步 completedAt 时间戳单调递增、已完成不覆盖，保证全程留痕可追溯
//
// 普通出逃（executing）与同频出逃（group/escape-record）共用此模块。
// 可在 Node 直接 require 测试，无需 mock wx。

'use strict'

// 初始化进度
//   steps: 字符串数组 或 {text} 对象数组（兼容 executing.js 现有结构）
function initProgress(steps) {
  var arr = Array.isArray(steps) ? steps : []
  return {
    steps: arr.map(function (s, i) {
      var isObj = (typeof s === 'object' && s !== null)
      var text = isObj ? (s.text || '') : String(s == null ? '' : s)
      return { id: i + 1, text: text, done: false, completedAt: null }
    }),
    currentStep: 0,
    lastActiveAt: Date.now()
  }
}

// 标记第 index 步完成
//   progress: 现有进度对象
//   index: 步骤索引（0-based）
//   now: 可选时间戳（测试可复现）
// 不变量：
//   1. 已完成步骤不重复标记、不覆盖 completedAt（时间戳单调递增、留痕不可篡改）
//   2. 越界 index 原样返回（防御）
//   3. currentStep 指向第一个未完成步骤；全完成则指向最后一步（避免 -1）
function markStepDone(progress, index, now) {
  if (!progress || typeof progress !== 'object') return progress
  var steps = Array.isArray(progress.steps) ? progress.steps.slice() : []
  var ts = (typeof now === 'number' && Number.isFinite(now)) ? now : Date.now()
  if (!Number.isInteger(index) || index < 0 || index >= steps.length) return progress
  // 已完成不重复标记，保证 completedAt 不可篡改
  if (steps[index] && steps[index].done) return progress
  steps[index] = Object.assign({}, steps[index], { done: true, completedAt: ts })
  var next = -1
  for (var i = 0; i < steps.length; i++) {
    if (!steps[i].done) { next = i; break }
  }
  var currentStep = next === -1 ? steps.length - 1 : next
  return {
    steps: steps,
    currentStep: currentStep,
    lastActiveAt: ts
  }
}

// 把持久化的 done 状态合并到当前构建的 steps 数组
// 用于 executing.onLoad：页面重建 steps 后，用持久化 progress 覆盖 done/completedAt
function mergeProgress(steps, progress) {
  var arr = Array.isArray(steps) ? steps : []
  if (!progress || !Array.isArray(progress.steps)) {
    return recompute(arr.map(function (s) {
      return Object.assign({}, s, { done: false, completedAt: null })
    }))
  }
  var merged = arr.map(function (s, i) {
    var saved = progress.steps[i] || {}
    return Object.assign({}, s, {
      done: !!saved.done,
      completedAt: saved.completedAt || null
    })
  })
  return recompute(merged)
}

// 统计：doneCount / currentStep / allDone
function recompute(steps) {
  var arr = Array.isArray(steps) ? steps : []
  var doneCount = 0
  var next = -1
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i].done) doneCount++
    else if (next === -1) next = i
  }
  var allDone = arr.length > 0 && doneCount === arr.length
  // currentStep 全完成时指向最后一步，避免 -1（下游 data.currentStep 不能为负）
  var currentStep = next === -1 ? arr.length - 1 : next
  return { steps: arr, currentStep: currentStep, doneCount: doneCount, allDone: allDone }
}

// 判断是否全部完成（finishCommand 前置校验）
function isAllDone(progress) {
  if (!progress || !Array.isArray(progress.steps) || progress.steps.length === 0) return false
  return progress.steps.every(function (s) { return s && s.done })
}

module.exports = {
  initProgress: initProgress,
  markStepDone: markStepDone,
  mergeProgress: mergeProgress,
  recompute: recompute,
  isAllDone: isAllDone
}
