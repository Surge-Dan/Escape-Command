Component({
  properties: {
    selected: {
      type: Number,
      value: 0
    },
    // 控制显隐：弹窗弹出时设为 true，TabBar 滑出屏幕
    tabbarHidden: {
      type: Boolean,
      value: false
    }
  },
  data: {
    list: [
      {
        pagePath: "/pages/index/index",
        text: "出逃",
        icon: "/assets/icons/tab-escape.svg",
        iconActive: "/assets/icons/tab-escape-active.svg"
      },
      {
        pagePath: "/pages/map/map",
        text: "地图",
        icon: "/assets/icons/tab-map.svg",
        iconActive: "/assets/icons/tab-map-active.svg"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "我的",
        icon: "/assets/icons/tab-profile.svg",
        iconActive: "/assets/icons/tab-profile-active.svg"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const url = this.data.list[index].pagePath
      wx.switchTab({ url })
    }
  }
})
