// 移动端适配样式（自 client/index.js 拆出的 ~800 行 CSS，T3.5）
// 由 setupMobileExperience() 注入 <style id="dsh-bridge-mobile-styles">。
//
// 【占位符约定】涉及宿主 CSS-module 类名的选择器一律写成 `[class*="__F_<SLOT>__<本地名>"]`，
// 由 client/host-families.js 在运行时把 `__F_<SLOT>__` 换成宿主真实前缀后再注入：
//   0.1.x: VOzbGW_overlay / wSkVaW_header / hHd-Xa_root / uV2eYG_card …
//   0.2.0: wCInkW_overlay / Dc7zOa_header / _2H3hWW_root / RlGAzG_card …
// 宿主升级重算哈希时不再需要改这份 CSS（探测优先，已核实基线兜底，都拿不到则显式降级告警）。
// 详见 host-families.js 的 slot 表与 client/index.js 的 refreshHostFamilies()。
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

    /* 挂在 <body> 下、自带遮罩的「模态根」必须能盖在设置弹窗之上。
       —— 这是本插件抬高设置弹窗层叠后必须自己补上的一环（谁抬的谁负责）。

       故障现象：插件市场设置页点「安装」没有任何反应。
       根因链：
         1) 本插件把设置弹窗抬到 z-index:10002（见下面 @media 块），以便盖住自己渲染的
            移动端顶栏(9998)/抽屉遮罩(9999)；
         2) 插件市场（dshmarket 1.44.0）的安装确认框是挂在 <body> 下的
            div._root_w1urq_2，position:fixed，但只有 z-index:1000；
         3) 该浮层内部的对话框 div._dialog_w1urq_22 虽然带 role="dialog"、被下面的
            10005 规则抬起来了，**但 z-index 无法逃出祖先的层叠上下文** —— 外层模态根
            只有 1000，整棵子树（连同那个 10005）一起被设置弹窗(10002)盖死；
         4) 结果：竖屏点安装完全看不到浮层（设置弹窗的遮罩在 elementFromPoint 上命中）；
            横屏（宽度 > 767 时本插件样式不生效，设置弹窗回落成宿主的 1000）浮层虽出现，
            却与页面内容互相穿透、显示不完整。

       选择器刻意不硬编码任何第三方类名/哈希，只认模态根的两个**结构特征**：
       「body 的直接子级」+「自带遮罩子元素（或有 role=dialog 子元素）」。
       实测在打开设置前/后/点安装后三个阶段，本页面上该选择器**只命中市场那一个浮层**，
       无误伤；本插件自己的 #dsh-remote-workspace-modal 有 ID 规则(100000)，优先级更高，
       不受影响。仅在设置弹窗打开时生效（body:has(...)），把影响面压到最小。

       【已知边界】判据只看结构，无法区分「真模态」与「恰好长成这样、且不可关闭的全屏
       遮罩」。若某个插件往 <body> 下挂一个带 mask 子元素的全屏层，它也会被抬到设置
       弹窗之上并盖住设置页。这是「模态就该盖在设置弹窗之上」的既定取舍：宁可让真模态
       可见，也不接受"弹了却点不到"。独立验收已实测该构造会命中；若将来真踩到，
       应改为按「该浮层是否可关闭」进一步收窄，而不是回退这条规则。 */
    /* ⚠️ 必须排除设置弹窗自身：DSH 0.1.7 起设置弹窗的 overlay 变成了 <body> 的直接子级
       （0.1.5 里它嵌在 #root 内部；0.2.0 依旧如此，只是哈希从 VOzbGW_ 换成 wCInkW_，
       故这里用 __F_SETTINGS__ 占位符而非硬编码），它同样满足「body 子级 + 含 role=dialog
       子元素」，会被本条一并抬到 10050 —— 于是与第三方模态根同层、退化成按 DOM 顺序决胜，
       刚修好的「安装确认框被盖住」就可能复发。:not(...) 把它排除，让设置弹窗继续由
       它自己的 10002 规则定位，本条只抬**其它**顶层模态。 */
    body:has(div[class*="__F_SETTINGS__overlay"]) > div:has(> div[class*="mask"], > div[role="dialog"]):not([class*="__F_SETTINGS__overlay"]) {
      z-index: 10050 !important;
    }

    /* 同上场景的第二个独立问题：第三方模态对话框「比视口还高」。
       插件市场的安装确认框是固定 584px 高 + overflow-y:hidden，在矮视口（横屏手机
       320–430px 高，以及 320×480 这类小屏）里被居中撑开 → 上下同时被切掉，底部
       「Cancel / Confirm install」落到视口之外，用户点不到、流程走不下去
       （实测 667×375 时对话框 rect y=-116 h=608、按钮 y=432；844×390 同样）。

       修法是让模态对话框不超过视口并允许内部滚动。这条是**自限性**的：
       max-height 只在「视口比对话框矮」时才起作用 —— 375×667 / 390×844 等正常竖屏下
       100dvh-16px(=651/828) > 584，声明不产生任何视觉变化。
       vh 与 dvh 各写一遍：不支持 dvh 的环境退回 vh；两条都失效也只是保持原样。 */
    body:has(div[class*="__F_SETTINGS__overlay"]) > div:has(> div[role="dialog"]) > div[role="dialog"] {
      /* 留 32px 而不是 16px：该对话框是 content-box + 24px 纵向内边距，
         按内容盒算的 max-height 会再多出内边距的边框盒高度，16px 时仍溢出 4px。 */
      max-height: calc(100vh - 32px) !important;
      max-height: calc(100dvh - 32px) !important;
      overflow-y: auto !important;
    }

    /* 断点与宿主判据对齐：宿主用 viewportWidth < 768 决定右侧栏自动全屏
       （dsh-client-ui-sidebar-right/lib/client.js），故移动端样式取 <=767px，
       768px 起彻底交还桌面布局，避免"桥渲染顶栏、宿主却未全屏"的错位。 */
    @media (max-width: 767px) {
      /* 1. 主框架为 Header 腾出顶部空间。

         选择器必须限定在布局外壳（dsh-client-ui-layout 的 AppFrame，即
         [data-slot="root"] 的直接子元素）。宿主的 CSS-module 哈希只保证同文件
         内唯一，*="_frame" 是跨包通配：聊天记录容器（dsh-client-ui-chat 的
         .EvIC1a_frame，同样以 _frame 结尾）也会被命中。一旦命中，它被强加
         height:100dvh + overflow:hidden，在手机上被钳到视口高度并裁掉溢出内容：
         外层 [data-conversation-scroll] 已滚到底、内部却还有数千 px 读不到，
         表现为「看不到最新消息」。官方给该容器的规则是 flex:none;height:auto
         （让记录随内容自然增高、由外层统一滚动），与这里冲突，故必须排除。 */
      [data-slot="root"] > div[class*="_frame"] {
        display: grid !important;
        grid-template-columns: 0px minmax(0px, 1fr) minmax(0px, 0px) !important;
        grid-template-rows: minmax(0, 100%) !important;
        width: 100vw !important;
        height: 100dvh !important;
        margin: 0 !important;
        padding-top: var(--dsh-mobile-header-h) !important;
        position: relative !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }

      /* 宿主 0.1.7 的 frame 是 grid 三列布局（sidebar | center | rightbar），JS 按状态注入
         grid-template-columns；插件把左侧栏抽屉化后 sidebarCol 变成 fixed（脱离 grid 流），
         若不显式指定列位，centerCol 会被自动排进第 1 列（56px 轨道）、rightbarCol 塌陷到
         视口底部 → 右侧栏点开后面板被定位到视口外（用户看到的「按钮消失、右侧栏没出来」）。
         这里显式归位：sidebar 抽屉不占列（第 1 列 0px）、center 占满（第 2 列 1fr）、
         rightbar 保留宿主右侧栏列（第 3 列 0px 折叠，全屏面板 fixed 相对视口、不依赖此列）。 */
      div[class*="_centerCol"] { grid-column: 2 !important; }
      div[class*="_rightbarCol"] { grid-column: 3 !important; }
      div[class*="_overlayLayer"] { grid-column: 1 / -1 !important; }

      /* 1.1 fixed 全屏面板单独让位：position:fixed 的包含块是 viewport（CSS 2.1 §10.1），
         不跟随上面 frame 的 padding-top，因此顶部 52px 会落进顶栏覆盖区（#41）。
         官方右侧栏在 <768px 自动全屏，这里按 data 属性直接位移容器本身，不依赖宿主
         CSS-module 哈希类名。
         宿主版本差异（0.1.5 vs 0.1.7）：0.1.5 的面板自身就是 position:fixed; inset:0
         （相对视口），top 让位直接生效；0.1.7 把面板改成 position:absolute 相对
         rightbarCol 列定位，且宿主已把它放在内容区起点——若插件仍只改 top，会在宿主
         定位之上再叠加 52px（面板被推到视口外，表现为「点开右侧栏按钮消失、面板不
         出来」）。修法：把面板统一强制为 fixed 相对视口 + top:52px 让位，两版宿主
         行为一致。 */
      [data-sidebar-right-panel="fullscreen"] {
        position: fixed !important;
        top: var(--dsh-mobile-header-h, 52px) !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: calc(100dvh - var(--dsh-mobile-header-h, 52px)) !important;
        max-height: calc(100dvh - var(--dsh-mobile-header-h, 52px)) !important;
        z-index: 40 !important;
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
      div[class*="__F_TOGGLE__toggleCluster"] {
        display: none !important;
      }

      /* 3.0 工作区 Workbench / 任务管理 / 多 Tab 栏移动端自适应适配。
         注：__F_WB__(nArs4W) 与 __F_TOGGLE__(W-zNGW) 这两族只在 0.1.x 采到过；
         0.2.0 的 app.asar 类名映射里已不存在 tabBar/tabList/tabClose/tabBarPlus/toggleCluster
         这些本地名（右侧栏 Tab 改名为 dsh-client-ui-sidebar-right 的 OUqwTW_tabTitle），
         因此这几条在桌面版上不命中。留着不改动旧宿主行为，收敛需另采锚点（见 host-families.js）。 */
      body:not(.dsh-workbench-open) div[class*="__F_WB__panel"],
      body:not(.dsh-workbench-open) div[class*="workbench_panel"],
      body:not(.dsh-workbench-open) div[class*="workbenchPanel"],
      div[class*="__F_WB__panel"][class*="panelHidden"],
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

      body.dsh-workbench-open div[class*="__F_WB__panel"]:not([class*="panelHidden"]),
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
      div[class*="__F_WB__tabBar"],
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

      div[class*="__F_WB__tabList"],
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
      div[class*="__F_WB__tabList"]::-webkit-scrollbar,
      div[class*="tabList"]::-webkit-scrollbar {
        display: none !important;
      }

      /* 单个 Tab 胶囊化，文字超长自动打点，防止 Tab 互相挤压 */
      div[class*="__F_WB__tab"],
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

      div[class*="__F_WB__tabActive"],
      div[class*="workbench_tabActive"] {
        background: var(--dsw-alias-bg-layer-1, #ffffff) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
        font-weight: 600 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      }

      span[class*="__F_WB__tabTitle"],
      span[class*="tabTitle"] {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
        flex: 1 1 auto !important;
      }

      button[class*="__F_WB__tabClose"],
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

      button[class*="__F_WB__tabBarPlus"],
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
      header[class*="__F_CONV__header"] {
        padding: 4px 16px 2px 16px !important;
        position: relative !important;
        overflow: visible !important;
      }

      div[class*="__F_CONV__titleRow"],
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
      nav[class*="__F_CONV__crumbs"],
      nav[class*="crumbs"],
      div[class*="__F_CONV__crumbs"],
      div[class*="crumbs"],
      [class*="__F_CONV__crumbs"] {
        display: none !important;
      }

      /* 子代理/智能体模式胶囊 (Actions)：紧凑圆角胶囊 */
      div[class*="__F_CONV__headerActions"],
      div[class*="headerActions"] {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin-left: 0 !important;
      }

      /* Agent 预设胶囊：本地名历代不一 —— 0.1.x 与 0.2.0 实测都是 _seat
         （cubgiG_seat / _oGoKq_seat），插件早期采到的 trigger 两代都不存在，故两个都收。 */
      button[class*="__F_PRESET__trigger"],
      button[class*="__F_PRESET__seat"],
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

      /* Session Log 导出下载按钮 (Utilities)：在移动端极简为 28px 圆形纯图标按钮，隐藏长文本，极大释放顶部空间。
         裸本地名 sessionLogButton 兜底是版本无关的（0.1.x 为 nL4_yW_sessionLogButton）；
         0.2.0 的 app.asar 里该本地名已不存在（该按钮被移除/改名），故桌面版不适用。 */
      div[class*="__F_CONV__headerUtilities"],
      div[class*="headerUtilities"] {
        flex: 0 0 auto !important;
        margin-left: 4px !important;
        display: inline-flex !important;
        align-items: center !important;
      }

      button[class*="__F_LOG__sessionLogButton"],
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

      button[class*="__F_LOG__sessionLogButton"]:hover:not(:disabled),
      button[class*="sessionLogButton"]:hover:not(:disabled) {
        background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.06)) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
      }

      button[class*="__F_LOG__sessionLogButton"] span,
      button[class*="sessionLogButton"] span {
        display: none !important;
      }

      button[class*="__F_LOG__sessionLogButton"] svg,
      button[class*="sessionLogButton"] svg {
        width: 13px !important;
        height: 13px !important;
        margin: 0 !important;
      }

      /* 子代理展开菜单在移动端右对齐与宽度自适应。
         注：menu 这个本地名在 0.1.x(cubgiG) 与 0.2.0(_oGoKq) 的 Agent 预设族里都不存在
         （实测），本规则在这两个宿主上不命中；保留是为了不改动旧行为，等采到真实锚点再收敛。 */
      div[class*="__F_PRESET__menu"] {
        max-width: calc(100vw - 32px) !important;
        left: auto !important;
        right: 0 !important;
      }

      /* 输入框底座：DeepSeek App 居中及底部固定 */
      div[class*="__F_CONV__scrollBody"] {
        padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
      }

      /* ── 移动端输入框折叠模式（body.dsh-composer-collapsed）──────────────
         折叠后隐藏吸底输入区，让消息 viewArea 自动伸展到全高，最大化阅读区。
         入口：聊天头部工具栏（Session 下载钮旁）的折叠按钮，或折叠态底部细输入条点它唤回。
         状态持久化到 localStorage。 */
      body.dsh-composer-collapsed div[class*="__F_CONV__composerSeat"] {
        display: none !important;
      }
      body.dsh-composer-collapsed div[class*="__F_CONV__viewArea"] {
        flex: 1 1 auto !important;
        height: auto !important;
        min-height: 0 !important;
      }
      /* 折叠时滚动区底部对齐 safe-area，避免内容被 iPhone 底部横条遮挡 */
      body.dsh-composer-collapsed div[class*="__F_CONV__scrollBody"] {
        padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
      }

      /* 折叠输入框按钮：注入在聊天头部工具栏（Session 下载钮旁），
         与 DSH sessionLogButton 同规格（28px 圆形图标钮），视觉与原生一致 */
      .dsh-header-fold-btn {
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
        cursor: pointer !important;
        transition: opacity 0.15s !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      .dsh-header-fold-btn:active {
        opacity: 0.6 !important;
      }
      .dsh-header-fold-btn svg {
        width: 15px !important;
        height: 15px !important;
      }

      /* 折叠态底部细输入条：点击唤起输入框（位于原输入区位置，sticky 底部） */
      .dsh-composer-collapsed-bar {
        display: none !important;
        position: sticky !important;
        bottom: 0 !important;
        margin: 8px 12px max(8px, env(safe-area-inset-bottom, 0px)) 12px !important;
        padding: 11px 16px !important;
        border-radius: 22px !important;
        background: var(--dsw-alias-bg-layer-2, #f4f4f7) !important;
        border: 1px solid rgba(0, 0, 0, 0.07) !important;
        color: var(--dsw-alias-label-tertiary, #8b93a1) !important;
        font-size: 13.5px !important;
        line-height: 1.4 !important;
        cursor: pointer !important;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04) !important;
        -webkit-tap-highlight-color: transparent !important;
        z-index: 40 !important;
        box-sizing: border-box !important;
      }
      body.dsh-composer-collapsed .dsh-composer-collapsed-bar {
        display: block !important;
      }

      /* 输入卡片：DeepSeek App 圆角大胶囊造型 */
      div[class*="__F_COMPOSER__card"] {
        border-radius: 26px !important;
        padding: 14px 16px 12px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgba(0, 0, 0, 0.07) !important;
        background: var(--dsw-alias-bg-layer-2, #f4f4f7) !important;
      }

      /* 输入框底部工具栏：弹性自适应，彻底杜绝权限选择器(Full access)与模型选择器重叠碰撞 */
      div[class*="__F_COMPOSER__row"] {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 6px !important;
        width: 100% !important;
        padding: 2px 2px 4px !important;
        box-sizing: border-box !important;
      }

      div[class*="__F_COMPOSER__tools"] {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      div[class*="__F_COMPOSER__modes"] {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      button[class*="__F_ACCESS__trigger"] {
        flex: 0 0 auto !important;
        min-width: 0 !important;
      }

      div[class*="__F_COMPOSER__trailing"] {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 6px !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }

      div[class*="__F_MODEL__root"] {
        flex: 0 1 auto !important;
        min-width: 0 !important;
        max-width: 180px !important;
      }

      button[class*="__F_MODEL__trigger"] {
        max-width: 100% !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
        padding: 0 4px 0 6px !important;
      }

      span[class*="__F_MODEL__triggerLabel"] {
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
      body.dsh-drawer-open div[class*="__F_SIDEBAR__root"] {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
      }
      body.dsh-drawer-open div[class*="__F_SIDEBAR__collapsed"] div[class*="__F_SIDEBAR__regionArea"],
      body.dsh-drawer-open div[class*="__F_SIDEBAR__collapsed"] button[class*="__F_SIDEBAR__newSession"],
      body.dsh-drawer-open div[class*="__F_SIDEBAR__collapsed"] div[class*="__F_WS__root"] {
        display: flex !important;
        visibility: visible !important;
      }
      div[class*="__F_SIDEBAR__logoRow"] {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
        padding: 10px 14px 6px 14px !important;
        box-sizing: border-box !important;
      }
      div[class*="__F_SIDEBAR__logoRow"] button[class*="__F_SIDEBAR__toggle"] {
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
      div[class*="__F_SIDEBAR__logoRow"] button[class*="__F_SIDEBAR__toggle"]:active {
        background: var(--dsw-alias-bg-layer-2, rgba(0, 0, 0, 0.06)) !important;
        color: var(--dsw-alias-label-primary, #111827) !important;
      }

      /* 设置弹窗打开时解除抽屉隐藏限制 */
      div[class*="_sidebarCol"]:has(div[class*="__F_SETTINGS__overlay"]) {
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
      div[class*="__F_SETTINGS__overlay"] {
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
      div[class*="__F_SETTINGS__panel"] {
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
      /* 6.1 481–767px：保留左侧图标轨道。
         78px 轨道把 "Agent presets"/"Plugin Market" 挤到两侧只剩 ~5px、标签被压到
         10.5px 且 word-break:break-all 会从词中间断字，故放宽到 88px / 11.5px，
         并改用 overflow-wrap 兜底（正常单词不再被拆）。 */
      nav[class*="__F_SETTINGS__nav"] {
        width: 88px !important;
        min-width: 88px !important;
        max-width: 88px !important;
        padding: 10px 6px !important;
        box-sizing: border-box !important;
        border-right: 1px solid var(--dsw-alias-border-l2, #e5e7eb) !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 6px !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
      }
      nav[class*="__F_SETTINGS__nav"] button[class*="__F_SETTINGS__navCell"],
      button[class*="__F_SETTINGS__navCell"] {
        padding: 7px 2px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        height: auto !important;
        min-height: 46px !important;
        /* flex:none：单元格不得被压缩，否则矮视口下末项会贴着轨道下沿被切掉 */
        flex: 0 0 auto !important;
        gap: 3px !important;
        border-radius: 10px !important;
      }
      span[class*="__F_SETTINGS__navLabel"] {
        font-size: 11.5px !important;
        line-height: 1.25 !important;
        white-space: normal !important;
        word-break: normal !important;
        overflow-wrap: anywhere !important;
        text-align: center !important;
      }

      /* 矮视口（横屏手机）：压缩轨道单元格，保证 6 个分类全部落在面板内，
         而不是靠 nav 自身的 overflow-y 滚动把末项藏起来（当前无任何可滚动提示）。 */
      @media (max-height: 500px) {
        nav[class*="__F_SETTINGS__nav"] {
          padding: 8px 6px !important;
          gap: 4px !important;
        }
        nav[class*="__F_SETTINGS__nav"] button[class*="__F_SETTINGS__navCell"],
        button[class*="__F_SETTINGS__navCell"] {
          min-height: 40px !important;
          padding: 4px 2px !important;
        }
        div[class*="__F_SETTINGS__navTitle"] {
          font-size: 13px !important;
          line-height: 1.3 !important;
          padding: 0 4px !important;
        }
      }

      div[class*="__F_SETTINGS__content"] {
        flex: 1 1 auto !important;
        min-width: 0 !important;
        width: calc(100% - 88px) !important;
        max-width: calc(100% - 88px) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
      }
      /* overflow-x 必须是 auto 而不是 hidden：宿主原样式只写了 overflow-y:auto，
         按 CSS Overflow 规范 overflow-x 会计算为 auto（可横滑）。此前插件强制
         hidden，把「可滚动」降级成「静默裁切」——溢出内容既看不到也滑不出来
         （实测 375px 下裁掉 42px，Plugin Market 的 Installed/Advanced 两个 Tab
         直接不可达）。这里恢复宿主默认，保证任何第三方设置节的内容至少可达。 */
      div[class*="__F_SETTINGS__options"] {
        flex: 1 1 auto !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        padding: 0 14px 20px !important;
        overflow-x: auto !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
      }

      /* 设置中心选项行手机自适应（垂直流式，防文字单字折行） */
      div[class*="__F_SETTINGS__options"] div[class*="_row"] {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
        width: 100% !important;
        /* min-width:0：让 flex 子项可以真正收缩，而不是把父容器顶宽后溢出 */
        min-width: 0 !important;
        padding: 12px 0 !important;
        box-sizing: border-box !important;
      }
      div[class*="__F_SETTINGS__options"] div[class*="_rowText"] {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }
      div[class*="__F_SETTINGS__options"] button[class*="_selector"],
      div[class*="__F_SETTINGS__options"] select,
      div[class*="__F_SETTINGS__options"] input {
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
      div[class*="__F_COMPOSER__overlayAnchor"] {
        background: transparent !important;
        pointer-events: none !important;
      }
      div[class*="overlayLayer"] > * {
        pointer-events: auto !important;
      }
    }

    /* 6.2 <=480px 手机竖屏：设置中心改为「两级钻取」。
       侧边轨道在 375px 屏上要吃掉 88px（21% 宽度），内容列只剩 277px，第三方设置节
       （Plugin Market 的 Tab 条需 470px）必然溢出。改为：分类列表页 ↔ 内容详情页，
       内容独占整宽（375px 下由 277px 提升到 355px，+28%），标签回到 15px、触控行 52px。

       【整块由 html[data-dshbr-drilldown="ready"] 门控】
       本块默认把内容区（options）隐藏、只显示分类列表；能不能从列表走进内容，完全
       取决于 client/index.js 的点击监听器。所以本块不能以「JS 一定在」为无条件前提：
       开关没打开时本块整体惰性，<=480px 退回 767 块的 88px 图标轨道（窄，但分类与
       内容都完整可达），不会出现「内容被藏了、又没人能把用户带进去」的死列表。

       开关何时打开（client/index.js 的 setupSettingsDrilldown）：
         - 该函数是 apply() 的第一条语句，早于注入本 CSS 的 injectMobileStyles()；
         - 只有 document.addEventListener('click', …) 成功返回后才打上 ready。
       因此「本 CSS 已生效、而点击监听器没装上」在可执行路径上不可达；即使将来有人把
       该调用挪到会抛异常的初始化之后，开关未开也只是退回轨道布局。

       明确未覆盖：无法在脚本内探测「addEventListener 被环境静默丢弃」这类异常 ——
       要做这种自检就必须在 document 上派发合成 click，而宿主与第三方插件合计有 6 个
       document 级 click 监听（另有多组 mousedown/pointerdown）会被误触发，得不偿失。
       插件 JS 完全不执行时本 CSS 也不会注入，同样不会藏内容。

       开关放在 <html> 而非 panel：监听器必须在弹窗出现之前就装好，那时 panel 还不存在。

       panel 上的 data-dshbr-settings-view 只表达「列表页 / 详情页」：
         - 无该属性（含开关刚打开的首帧）→ 分类列表页
         - "detail"                        → 内容详情页 */
    @media (max-width: 480px) {
      /* 面板由 767 块的横向轨道布局（row）改为纵向：列表页/详情页都是上下结构。
         漏掉这一条会让 nav 与 content 并排抢宽度，分类列表被压成 0 宽（实测 options
         只剩 24px），是本方案最容易漏的关键一步。 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"] {
        flex-direction: column !important;
        /* ✕ 要绝对定位到面板右上角，必须有定位祖先 */
        position: relative !important;
      }

      /* 关闭按钮钉在面板右上角，与标题/返回行同处第一行 —— 这是弹窗的常规约定。
         之所以要绝对定位：宿主 DOM 里 ✕ 属于 content>header，而标题属于 nav，二者是
         两棵子树。此前靠 order:-1 把 content 提到 nav 之前，结果 ✕ 落在标题上面一行；
         详情页反过来，✕ 落到返回行下面一行。绝对定位是唯一能在不注入 DOM 的前提下
         把两者拉回同一行的办法。 */
      html[data-dshbr-drilldown="ready"] button[class*="__F_SETTINGS__close"] {
        position: absolute !important;
        /* 40×40 触控区（宿主原为 28px）：配 top/right 4px 后中心落在 y=24，
           与标题文字中心（约 23）基本重合；右侧 4+40=44px 的占位仍在标题 52px 留白之内。 */
        top: 4px !important;
        right: 4px !important;
        width: 40px !important;
        height: 40px !important;
        z-index: 5 !important;
      }

      /* 分类列表页：内容区只剩 header（宿主/第三方 action 槽），下沉为底部动作栏。
         不再用 order:-1 —— 标题回到 DOM 顺序的第一行，顺带让焦点顺序与视觉顺序一致。 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"]:not([data-dshbr-settings-view="detail"]) > div[class*="__F_SETTINGS__content"] {
        flex: 0 0 auto !important;
        width: 100% !important;
        max-width: 100% !important;
        border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb) !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"]:not([data-dshbr-settings-view="detail"]) div[class*="__F_SETTINGS__options"] {
        display: none !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"]:not([data-dshbr-settings-view="detail"]) > nav[class*="__F_SETTINGS__nav"] {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
      }

      /* 详情页：折叠导航为「‹ 标题」一行，充当返回入口 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] div[class*="__F_SETTINGS__navList"] {
        display: none !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] > nav[class*="__F_SETTINGS__nav"] {
        flex: 0 0 auto !important;
        overflow: visible !important;
        cursor: pointer !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] > nav[class*="__F_SETTINGS__nav"]:active {
        background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, 0.05)) !important;
      }
      /* 详情页也把动作栏沉到底部，与列表页保持一致。
         用 flex order 交换 header/options 的视觉位置：options 仍是那个 overflow:auto
         的滚动容器，滚动语义不变（不用 column-reverse，避免滚动原点翻转）。 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] div[class*="__F_SETTINGS__header"] {
        order: 2 !important;
        border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb) !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] div[class*="__F_SETTINGS__options"] {
        order: 1 !important;
      }

      /* 轨道在窄屏改成整宽列表容器 */
      html[data-dshbr-drilldown="ready"] nav[class*="__F_SETTINGS__nav"] {
        width: 100% !important;
        min-width: 0 !important;
        max-width: 100% !important;
        padding: 10px 12px 12px !important;
        gap: 4px !important;
        border-right: none !important;
        border-bottom: none !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__navTitle"] {
        font-size: 17px !important;
        line-height: 1.3 !important;
        /* 不可折行的超长 token（无空格长串）会整块溢出、把文字顶到 ✕ 下面。
           独立验收实测 81 字符无空格标题时文字右端 823px、与 ✕ 交叠 707px²。
           overflow-wrap: anywhere 让这种 token 也能断行 —— 留白只管盒内，管不住溢出。 */
        overflow-wrap: anywhere !important;
        /* 右侧 52px 给绝对定位的 ✕ 让位（紧邻规则里的声明会被后置同名规则覆盖，
           所以留白必须写在这一条上，不能只写在前面那条） */
        padding: 0 52px 4px 4px !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__navList"] {
        flex-direction: column !important;
        gap: 2px !important;
        width: 100% !important;
        min-width: 0 !important;
      }

      /* 列表行：图标左、文字右、行尾 › 指示 */
      html[data-dshbr-drilldown="ready"] nav[class*="__F_SETTINGS__nav"] button[class*="__F_SETTINGS__navCell"],
      html[data-dshbr-drilldown="ready"] button[class*="__F_SETTINGS__navCell"] {
        flex-direction: row !important;
        justify-content: flex-start !important;
        align-items: center !important;
        text-align: left !important;
        width: 100% !important;
        min-height: 52px !important;
        padding: 12px 14px !important;
        gap: 12px !important;
        border-radius: 12px !important;
      }
      html[data-dshbr-drilldown="ready"] nav[class*="__F_SETTINGS__nav"] button[class*="__F_SETTINGS__navCell"]::after {
        content: '' !important;
        width: 7px !important;
        height: 7px !important;
        margin-left: auto !important;
        flex: none !important;
        border-right: 1.7px solid var(--dsw-alias-label-tertiary, #9ca3af) !important;
        border-bottom: 1.7px solid var(--dsw-alias-label-tertiary, #9ca3af) !important;
        transform: rotate(-45deg) !important;
      }
      html[data-dshbr-drilldown="ready"] nav[class*="__F_SETTINGS__nav"] button[class*="__F_SETTINGS__navCell"] svg {
        width: 20px !important;
        height: 20px !important;
      }
      html[data-dshbr-drilldown="ready"] span[class*="__F_SETTINGS__navLabel"] {
        font-size: 15px !important;
        line-height: 1.35 !important;
        white-space: normal !important;
        word-break: normal !important;
        text-align: left !important;
        flex: 0 1 auto !important;
      }

      /* 详情页返回行：‹ 箭头 + 标题 */
      /* 详情页返回行：‹ 箭头 + 标题。右侧同样要留 52px 给 ✕ ——
         本条比基类多一个属性选择器、特异性更高，会**整体覆盖**基类的 padding，
         所以留白必须在这里再写一遍（漏写时基类的 52px 会被这条的 4px 顶掉，
         长标题会钻到 ✕ 下面；独立验收实测注入 61 字符标题后交叠 608/707 px²）。 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] div[class*="__F_SETTINGS__navTitle"] {
        display: flex !important;
        align-items: center !important;
        overflow-wrap: anywhere !important;
        padding: 2px 52px 2px 4px !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] div[class*="__F_SETTINGS__navTitle"]::before {
        content: '' !important;
        width: 8px !important;
        height: 8px !important;
        margin: 0 10px 0 6px !important;
        flex: none !important;
        border-left: 2px solid var(--dsw-alias-label-primary, #111827) !important;
        border-bottom: 2px solid var(--dsw-alias-label-primary, #111827) !important;
        transform: rotate(45deg) !important;
      }

      /* content/header 必须是 static —— ✕ 是绝对定位的，它的包含块取决于最近的**定位祖先**。
         本来这个祖先就是 panel（宿主自带 position:relative）；但一旦 content 或 header 被
         任何来源（本块、宿主其它规则、第三方插件）设成 relative/absolute，包含块就会下移，
         ✕ 会从面板右上角跑到内容区里去。独立验收实测：给 content 加 position:relative 后
         ✕ 的 relTop 由 9 变成 579、并与底部动作栏重叠 837 px²。 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__content"] {
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        flex: 1 1 auto !important;
      }
      /* header 不再当顶栏用：它现在只承载 action 槽，高度随内容（可能是宿主的一个
         按钮，也可能是多个插件注入的多行按钮），靠 flex 自然撑开，不设固定高度。 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__header"] {
        position: static !important;
        height: auto !important;
        padding: 8px 10px !important;
        align-items: center !important;
        justify-content: flex-end !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__options"] {
        padding: 0 12px 16px !important;
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

    /* 深色模式适配已迁移到 client/theme-tokens.js 并改为**无条件注入**：
       原来这两块在这里，而 injectMobileStyles() 会在 __TAURI__ / __DSH_DESKTOP__ /
       外部响应式插件存在时直接 return，导致桌面端 Shell 下深色补丁从未生效。
       这里不再重复定义，避免两处版本漂移。 */

    @media (min-width: 768px) {
      .dsh-mobile-app-header,
      .dsh-mobile-backdrop,
      .dsh-mobile-panel-close-btn {
        display: none !important;
      }
    }
`;
