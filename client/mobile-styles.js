// 移动端适配样式（自 client/index.js 拆出的 ~800 行 CSS，T3.5）
// 由 setupMobileExperience() 注入 <style id="dsh-bridge-mobile-styles">。
// 注意：选择器硬编码了宿主构建产物的 CSS-module 哈希类名，宿主升级可能需要同步更新。
export const MOBILE_STYLES_CSS = `
    /* DSH Bridge 隐藏 Tab 栏原生滚动条并保持平滑滑动 */
    .dsh-tabbar-container {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .dsh-tabbar-container::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    /* DSH Bridge 移动端自适应与触控交互增强样式 */
    :root {
      --dsh-mobile-header-h: 52px;
      --dsh-mobile-safe-top: env(safe-area-inset-top, 0px);
      --dsh-mobile-safe-bottom: env(safe-area-inset-bottom, 0px);
    }

    @media (max-width: 768px) {
      /* 1. 主框架为 Header 腾出顶部空间 */
      div[class*="_frame"] {
        display: flex !important;
        flex-direction: column !important;
        width: 100vw !important;
        height: 100dvh !important;
        margin: 0 !important;
        padding-top: var(--dsh-mobile-header-h) !important;
        position: relative !important;
        grid-template-columns: 1fr !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }

      /* 2. 顶部原生导航条：100% 还原 DeepSeek App (左侧双横线，右侧(+)，中间留白，无多余设置按钮) */
      .dsh-mobile-app-header {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: var(--dsh-mobile-header-h) !important;
        padding-top: var(--dsh-mobile-safe-top) !important;
        background: transparent !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding-left: 16px !important;
        padding-right: 16px !important;
        z-index: 9998 !important;
        box-sizing: border-box !important;
        user-select: none !important;
        pointer-events: none !important;
      }

      /* 左侧双横线按钮 (DeepSeek App 原生图标) */
      .dsh-header-menu-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--dsw-alias-label-primary, #111827);
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        cursor: pointer;
        padding: 0;
        transition: opacity 0.15s;
        pointer-events: auto !important;
      }
      .dsh-header-menu-btn:active {
        opacity: 0.6;
      }

      /* 右侧 (+) 新建会话按钮 (DeepSeek App 原生图标) */
      .dsh-header-new-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: var(--dsw-alias-label-primary, #111827);
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        cursor: pointer;
        padding: 0;
        transition: opacity 0.15s;
        pointer-events: auto !important;
      }
      .dsh-header-new-btn:active {
        opacity: 0.6;
      }

      /* 中间动态会话标题 (单行居中打点截断，100% 还原原生 App 导航体验) */
      .dsh-mobile-header-title {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        text-align: center !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        padding: 0 10px !important;
        user-select: none !important;
        pointer-events: none !important;
        letter-spacing: -0.2px !important;
      }

      /* 3. 中间主内容区与输入框 */
      div[class*="_centerCol"] {
        flex: 1 1 100% !important;
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        display: flex !important;
        height: 100% !important;
      }

      div[class*="_detailsCol"],
      div[class*="toggleCluster"],
      div[class*="W-zNGW_toggleCluster"] {
        display: none !important;
      }

      /* 3.0 工作区 Workbench / 任务管理 / 多 Tab 栏移动端自适应适配 */
      body:not(.dsh-workbench-open) div[class*="nArs4W_panel"],
      body:not(.dsh-workbench-open) div[class*="workbench_panel"],
      body:not(.dsh-workbench-open) div[class*="workbenchPanel"],
      div[class*="nArs4W_panel"][class*="panelHidden"],
      div[class*="workbench_panel"][class*="panelHidden"],
      div[class*="workbenchPanel"][class*="panelHidden"],
      div[class*="panelHidden"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        max-height: 0 !important;
        z-index: -1 !important;
        opacity: 0 !important;
        transform: translateX(105%) !important;
      }

      body.dsh-workbench-open div[class*="nArs4W_panel"]:not([class*="panelHidden"]),
      body.dsh-workbench-open div[class*="workbench_panel"]:not([class*="panelHidden"]),
      body.dsh-workbench-open div[class*="workbenchPanel"]:not([class*="panelHidden"]) {
        display: flex !important;
        visibility: visible !important;
        pointer-events: auto !important;
        top: var(--dsh-mobile-header-h, 52px) !important;
        height: calc(100dvh - var(--dsh-mobile-header-h, 52px)) !important;
        max-height: calc(100dvh - var(--dsh-mobile-header-h, 52px)) !important;
        z-index: 50 !important;
        box-sizing: border-box !important;
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        transform: none !important;
        opacity: 1 !important;
      }

      /* Tab 栏：横向滑动手势 + 干净的底部边框，杜绝与顶部移动端 Header 重叠 */
      div[class*="nArs4W_tabBar"],
      div[class*="workbench_tabBar"],
      div[class*="tabBar"] {
        min-height: 40px !important;
        height: 40px !important;
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 8px !important;
        gap: 6px !important;
        overflow: visible !important;
        box-sizing: border-box !important;
      }

      div[class*="nArs4W_tabList"],
      div[class*="tabList"] {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        overflow-x: auto !important;
        scrollbar-width: none !important;
        -webkit-overflow-scrolling: touch !important;
      }
      div[class*="nArs4W_tabList"]::-webkit-scrollbar,
      div[class*="tabList"]::-webkit-scrollbar {
        display: none !important;
      }

      /* 单个 Tab 胶囊化，文字超长自动打点，防止 Tab 互相挤压 */
      div[class*="nArs4W_tab"],
      div[class*="workbench_tab"] {
        flex: 0 0 auto !important;
        max-width: 170px !important;
        min-width: 70px !important;
        height: 30px !important;
        padding: 0 8px 0 10px !important;
        border-radius: 6px !important;
        font-size: 12.5px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        background: var(--dsw-alias-bg-layer-2, #f3f4f6) !important;
        color: var(--dsw-alias-label-secondary, #6b7280) !important;
        cursor: pointer !important;
        user-select: none !important;
        box-sizing: border-box !important;
      }

      div[class*="nArs4W_tabActive"],
      div[class*="workbench_tabActive"] {
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
        font-weight: 600 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      }

      span[class*="nArs4W_tabTitle"],
      span[class*="tabTitle"] {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        flex: 1 1 auto !important;
      }

      button[class*="nArs4W_tabClose"],
      button[class*="tabClose"] {
        width: 18px !important;
        height: 18px !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        opacity: 0.6 !important;
        padding: 0 !important;
      }

      button[class*="nArs4W_tabBarPlus"],
      button[class*="tabBarPlus"] {
        width: 28px !important;
        height: 28px !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }

      /* 移动端面板右上角“返回对话 / ✕ 收起”按钮：常驻右侧，醒目且易触达 */
      .dsh-mobile-panel-close-btn {
        margin-left: 8px !important;
        flex: 0 0 auto !important;
        height: 28px !important;
        padding: 0 10px !important;
        border-radius: 14px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        background: #2563eb !important;
        color: #ffffff !important;
        border: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        cursor: pointer !important;
        user-select: none !important;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.28) !important;
        white-space: nowrap !important;
        transition: transform 0.1s, opacity 0.15s !important;
        z-index: 10 !important;
      }
      .dsh-mobile-panel-close-btn:active {
        transform: scale(0.95) !important;
        opacity: 0.85 !important;
      }

      /* 3.1 会话对话头部顶栏：移动端防挤压与空间释放优化（严格排除 .dsh-mobile-app-header） */
      div[class*="_centerCol"] header,
      header[class*="wSkVaW_header"] {
        padding: 4px 16px 2px 16px !important;
        position: relative !important;
        overflow: visible !important;
      }

      div[class*="wSkVaW_titleRow"],
      div[class*="titleRow"] {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        min-height: 32px !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 移动端将原有嵌入在内容区的长面包屑标题隐藏（已统一提升至顶部导航栏正中），彻底释放第二行空间 */
      nav[class*="wSkVaW_crumbs"],
      nav[class*="crumbs"],
      div[class*="wSkVaW_crumbs"],
      div[class*="crumbs"],
      [class*="wSkVaW_crumbs"] {
        display: none !important;
      }

      /* 子代理/智能体模式胶囊 (Actions)：紧凑圆角胶囊 */
      div[class*="wSkVaW_headerActions"],
      div[class*="headerActions"] {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin-left: 0 !important;
      }

      button[class*="h8S2Va_trigger"],
      button[class*="subagent"] {
        min-height: 26px !important;
        height: 26px !important;
        padding: 2px 8px !important;
        font-size: 11.5px !important;
        line-height: 16px !important;
        border-radius: 13px !important;
        background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.04)) !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
      }

      /* Session Log 导出下载按钮 (Utilities)：在移动端极简为 28px 圆形纯图标按钮，隐藏长文本，极大释放顶部空间 */
      div[class*="wSkVaW_headerUtilities"],
      div[class*="headerUtilities"] {
        flex: 0 0 auto !important;
        margin-left: 4px !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      button[class*="nL4_yW_sessionLogButton"],
      button[class*="sessionLogButton"] {
        min-width: 28px !important;
        width: 28px !important;
        height: 28px !important;
        padding: 0 !important;
        border-radius: 50% !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1)) !important;
        background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.03)) !important;
        color: var(--dsw-alias-label-secondary, #6b7280) !important;
        margin-left: 0 !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
      }

      button[class*="nL4_yW_sessionLogButton"]:hover:not(:disabled),
      button[class*="sessionLogButton"]:hover:not(:disabled) {
        background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
      }

      button[class*="nL4_yW_sessionLogButton"] span,
      button[class*="sessionLogButton"] span {
        display: none !important;
      }

      button[class*="nL4_yW_sessionLogButton"] svg,
      button[class*="sessionLogButton"] svg {
        width: 13px !important;
        height: 13px !important;
        margin: 0 !important;
      }

      /* 子代理展开菜单在移动端右对齐与宽度自适应 */
      div[class*="h8S2Va_menu"] {
        max-width: calc(100vw - 32px) !important;
        left: auto !important;
        right: 0 !important;
      }

      /* 输入框底座：DeepSeek App 居中及底部固定 */
      div[class*="wSkVaW_scrollBody"] {
        padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
      }

      /* 输入卡片：DeepSeek App 圆角大胶囊造型 */
      div[class*="uV2eYG_card"] {
        border-radius: 26px !important;
        padding: 14px 16px 12px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgba(0, 0, 0, 0.07) !important;
        background: var(--dsw-alias-bg-layer-2, #f4f4f7) !important;
      }

      /* 输入框底部工具栏：弹性自适应，彻底杜绝权限选择器(Full access)与模型选择器重叠碰撞 */
      div[class*="uV2eYG_row"] {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        width: 100% !important;
        padding: 2px 2px 4px !important;
        box-sizing: border-box !important;
      }

      div[class*="uV2eYG_tools"] {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      div[class*="uV2eYG_modes"] {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      button[class*="Sh0Q9G_trigger"] {
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      div[class*="uV2eYG_trailing"] {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 6px !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }

      div[class*="_7KE1Ra_root"] {
        flex: 0 1 auto !important;
        min-width: 0 !important;
        max-width: 180px !important;
      }

      button[class*="_7KE1Ra_trigger"] {
        max-width: 100% !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
        padding: 0 4px 0 6px !important;
      }

      span[class*="_7KE1Ra_triggerLabel"] {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        min-width: 0 !important;
      }

      /* 4. 原生侧边栏抽屉化 (Drawer) */
      div[class*="_sidebarCol"] {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        height: 100dvh !important;
        width: 290px !important;
        max-width: 82vw !important;
        z-index: 10000 !important;
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        transform: translateX(-105%);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        overflow-y: auto !important;
        border-right: 1px solid rgba(0, 0, 0, 0.06) !important;
        pointer-events: auto !important;
      }
      body.dsh-drawer-open div[class*="_sidebarCol"] {
        transform: translateX(0) !important;
        box-shadow: 4px 0 28px rgba(0, 0, 0, 0.25) !important;
        pointer-events: auto !important;
      }

      /* 抽屉内部：强制 100% 宽度，无论内部状态如何均正常展开并展示 DSH 自带的顶部收起侧边栏图标 */
      body.dsh-drawer-open div[class*="hHd-Xa_root"] {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
      }
      body.dsh-drawer-open div[class*="hHd-Xa_collapsed"] div[class*="hHd-Xa_regionArea"],
      body.dsh-drawer-open div[class*="hHd-Xa_collapsed"] button[class*="hHd-Xa_newSession"],
      body.dsh-drawer-open div[class*="hHd-Xa_collapsed"] div[class*="qDHVXG_root"] {
        display: flex !important;
        visibility: visible !important;
      }
      div[class*="hHd-Xa_logoRow"] {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
        padding: 10px 14px 6px 14px !important;
        box-sizing: border-box !important;
      }
      div[class*="hHd-Xa_logoRow"] button[class*="hHd-Xa_toggle"] {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 32px !important;
        height: 32px !important;
        border-radius: 8px !important;
        color: var(--dsw-alias-label-secondary, #6b7280) !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        margin-left: auto !important;
        transition: background 0.15s, color 0.15s !important;
      }
      div[class*="hHd-Xa_logoRow"] button[class*="hHd-Xa_toggle"]:active {
        background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.06)) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
      }

      /* 设置弹窗打开时解除抽屉隐藏限制 */
      div[class*="_sidebarCol"]:has(div[class*="VOzbGW_overlay"]) {
        transform: none !important;
        width: 100vw !important;
        max-width: 100vw !important;
        background: transparent !important;
        box-shadow: none !important;
        pointer-events: none !important;
      }

      /* 5. 半透明背景遮罩 */
      .dsh-mobile-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 9999;
        display: none !important;
      }
      body.dsh-drawer-open .dsh-mobile-backdrop {
        display: block !important;
        pointer-events: auto !important;
      }

      /* 6. 设置中心全自适应适配 */
      div[class*="VOzbGW_overlay"] {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100dvh !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(0, 0, 0, 0.45) !important;
        backdrop-filter: blur(4px) !important;
        -webkit-backdrop-filter: blur(4px) !important;
        z-index: 10002 !important;
        padding: 10px !important;
        box-sizing: border-box !important;
        pointer-events: auto !important;
      }
      div[class*="VOzbGW_panel"] {
        width: 100% !important;
        max-width: 100% !important;
        height: 92dvh !important;
        max-height: 92dvh !important;
        display: flex !important;
        flex-direction: row !important;
        border-radius: 18px !important;
        overflow: hidden !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25) !important;
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
      }
      nav[class*="VOzbGW_nav"] {
        width: 78px !important;
        min-width: 78px !important;
        max-width: 78px !important;
        padding: 10px 4px !important;
        box-sizing: border-box !important;
        border-right: 1px solid var(--dsw-alias-border-l2, #e5e7eb) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        overflow-y: auto !important;
      }
      nav[class*="VOzbGW_nav"] button[class*="VOzbGW_navCell"],
      button[class*="VOzbGW_navCell"] {
        padding: 8px 2px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        height: auto !important;
        min-height: 48px !important;
        gap: 4px !important;
        border-radius: 10px !important;
      }
      span[class*="VOzbGW_navLabel"] {
        font-size: 10.5px !important;
        line-height: 1.2 !important;
        white-space: normal !important;
        word-break: break-all !important;
        text-align: center !important;
      }
      div[class*="VOzbGW_content"] {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        width: calc(100% - 78px) !important;
        max-width: calc(100% - 78px) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
      }
      div[class*="VOzbGW_options"] {
        flex: 1 1 auto !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        padding: 0 14px 20px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
      }

      /* 设置中心选项行手机自适应（垂直流式，防文字单字折行） */
      div[class*="VOzbGW_options"] div[class*="_row"] {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
        width: 100% !important;
        padding: 12px 0 !important;
        box-sizing: border-box !important;
      }
      div[class*="VOzbGW_options"] div[class*="_rowText"] {
        width: 100% !important;
        max-width: 100% !important;
      }
      div[class*="VOzbGW_options"] button[class*="_selector"],
      div[class*="VOzbGW_options"] select,
      div[class*="VOzbGW_options"] input {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 7. 代码块、表格与徽标自适应 */
      pre, code, pre > code, table {
        max-width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        font-size: 12.5px !important;
      }

      /* 状态徽标与药丸按钮永不折字 */
      span[style*="border-radius: 999"],
      span[style*="border-radius:999"] {
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        min-width: max-content !important;
      }

      /* 二维码与图片移动端弹性缩放 */
      img[alt="QR"], img[src^="data:image"] {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 8. 确保所有 Popover 弹出菜单、操作气泡、下拉框位于抽屉之上且支持触控交互 */
      div[class*="_portal"],
      div[class*="portal"],
      div[class*="popup"],
      div[class*="dropdown"],
      div[class*="menu"],
      div[role="menu"],
      div[role="dialog"] {
        z-index: 10005 !important;
        pointer-events: auto !important;
      }

      /* 9. 移动端侧边栏：会话与工作区三点操作按钮始终清晰可见且易于点击 */
      div[class*="sessionRow"] span[class*="rowActions"],
      div[class*="sessionRow"] button[class*="iconButton"],
      div[class*="treeBody"] button[class*="iconButton"] {
        opacity: 0.8 !important;
        display: inline-flex !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
      div[class*="sessionRow"]:active {
        background: var(--dsw-alias-bg-layer-2, #f3f4f6) !important;
      }

      /* 全局 overlayLayer 绝不被染黑 */
      div[class*="overlayLayer"],
      div[class*="uV2eYG_overlayAnchor"] {
        background: transparent !important;
        pointer-events: none !important;
      }
      div[class*="overlayLayer"] > * {
        pointer-events: auto !important;
      }
    }

    /* 远程工作区选择弹窗移动端/桌面端自适应样式 */
    #dsh-remote-workspace-modal {
      position: fixed !important;
      inset: 0 !important;
      z-index: 100000 !important;
      background: rgba(0, 0, 0, 0.65) !important;
      backdrop-filter: blur(5px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: var(--dsw-alias-label-primary, #111827) !important;
    }

    .dsh-ws-dialog-card {
      background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
      border: 1px solid var(--dsw-alias-border-l1, #e5e7eb) !important;
      border-radius: 16px !important;
      width: 100% !important;
      max-width: 620px !important;
      max-height: 88vh !important;
      display: flex !important;
      flex-direction: column !important;
      box-shadow: 0 25px 35px -5px rgba(0,0,0,0.3), 0 12px 16px -5px rgba(0,0,0,0.2) !important;
      overflow: hidden !important;
      animation: dshModalFadeIn 0.2s ease-out !important;
    }

    .dsh-ws-chips-scroll {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      overflow-x: auto !important;
      white-space: nowrap !important;
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
      -webkit-overflow-scrolling: touch !important;
      padding: 2px 0 !important;
    }
    .dsh-ws-chips-scroll::-webkit-scrollbar {
      display: none !important;
    }

    @media (max-width: 640px) {
      #dsh-remote-workspace-modal {
        align-items: flex-end !important;
        padding: 0 !important;
      }

      .dsh-ws-dialog-card {
        max-height: 92dvh !important;
        height: 92dvh !important;
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
        border-left: none !important;
        border-right: none !important;
        border-bottom: none !important;
        max-width: 100vw !important;
        width: 100vw !important;
        margin: 0 !important;
        animation: dshBottomSheetUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      .dsh-ws-drag-handle {
        display: block !important;
      }
    }

    @keyframes dshModalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes dshBottomSheetUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    /* 深色模式适配：dsh-bridge 目录浏览器弹窗使用了 DSH 主题系统未定义的
       state-*-bg / state-*-border / state-*-primary 变量，补上深色模式值，避免浅色 fallback 永远生效 */
    body[data-ds-dark-theme] {
      --dsw-alias-state-info-bg: rgba(65, 118, 230, 0.12);
      --dsw-alias-state-info-border: rgba(65, 118, 230, 0.25);
      --dsw-alias-state-info-primary: #60a5fa;
      --dsw-alias-state-success-bg: rgba(34, 197, 94, 0.12);
      --dsw-alias-state-success-border: rgba(34, 197, 94, 0.25);
      --dsw-alias-state-success-primary: #4ade80;
      --dsw-alias-state-warn-bg: rgba(245, 158, 11, 0.12);
      --dsw-alias-state-warn-border: rgba(245, 158, 11, 0.25);
      --dsw-alias-state-warn-primary: #fbbf24;
      --dsw-alias-state-error-bg: rgba(239, 68, 68, 0.12);
      --dsw-alias-state-error-border: rgba(239, 68, 68, 0.25);
      --dsw-alias-state-error-primary: #f87171;
    }

    /* 深色模式：直接覆盖弹窗内所有使用 #fff/#ffffff fallback 的内联背景，
       确保即使 CSS 变量未正确继承，弹窗也不会显示白色背景 */
    body[data-ds-dark-theme] #dsh-remote-workspace-modal .dsh-ws-dialog-card,
    body[data-ds-dark-theme] #dsh-remote-workspace-modal .dsh-ws-dialog-card * {
      --dsw-alias-bg-layer-1: #1b1b1c;
      --dsw-alias-bg-layer-2: #2c2c2e;
      --dsw-alias-bg-layer-3: #353638;
      --dsw-alias-border-l2: #3c3c3d;
      --dsw-alias-label-primary: #f9fafb;
      --dsw-alias-label-secondary: #adb2b8;
      --dsw-alias-label-tertiary: #81858c;
      --dsw-alias-brand-primary: #f9fafb;
      --dsw-alias-label-primary-foreground: #0f1115;
    }

    @media (min-width: 769px) {
      .dsh-mobile-app-header,
      .dsh-mobile-backdrop,
      .dsh-mobile-panel-close-btn {
        display: none !important;
      }
    }
`;
