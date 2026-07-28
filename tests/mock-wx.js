// tests/mock-wx.js
// Mock wx API for Node.js testing

const storage = {}

const wx = {
  getStorageSync(key) {
    return storage[key] !== undefined ? JSON.parse(JSON.stringify(storage[key])) : ''
  },
  setStorageSync(key, value) {
    storage[key] = JSON.parse(JSON.stringify(value))
  },
  removeStorageSync(key) {
    delete storage[key]
  },
  clearStorageSync() {
    Object.keys(storage).forEach(k => delete storage[k])
  },
  showToast() {},
  showModal() {},
  vibrateShort() {},
  setClipboardData() {},
  navigateBack() {},
  switchTab() {},
  navigateTo() {},
  cloud: {
    callFunction() {},
    database() { return { collection: () => ({ where: () => ({ limit: () => ({ get: () => {} }) }) }) } }
  }
}

// Expose storage for test inspection/reset
wx._storage = storage
wx._reset = function() {
  Object.keys(storage).forEach(k => delete storage[k])
}

module.exports = wx
