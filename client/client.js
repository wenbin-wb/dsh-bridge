window.__ModuleLoader__.load({
  id: "@wenbin_wb/dsh-bridge",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// client/mobile-styles.js
var MOBILE_STYLES_CSS = `
    /* DSH Bridge \u9690\u85CF Tab \u680F\u539F\u751F\u6EDA\u52A8\u6761\u5E76\u4FDD\u6301\u5E73\u6ED1\u6ED1\u52A8 */
    .dsh-tabbar-container {
      scrollbar-width: none !important;
      -ms-overflow-style: none !important;
    }
    .dsh-tabbar-container::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    /* DSH Bridge \u79FB\u52A8\u7AEF\u81EA\u9002\u5E94\u4E0E\u89E6\u63A7\u4EA4\u4E92\u589E\u5F3A\u6837\u5F0F */
    :root {
      --dsh-mobile-header-h: 52px;
      --dsh-mobile-safe-top: env(safe-area-inset-top, 0px);
      --dsh-mobile-safe-bottom: env(safe-area-inset-bottom, 0px);
    }

    /* \u6302\u5728 <body> \u4E0B\u3001\u81EA\u5E26\u906E\u7F69\u7684\u300C\u6A21\u6001\u6839\u300D\u5FC5\u987B\u80FD\u76D6\u5728\u8BBE\u7F6E\u5F39\u7A97\u4E4B\u4E0A\u3002
       \u2014\u2014 \u8FD9\u662F\u672C\u63D2\u4EF6\u62AC\u9AD8\u8BBE\u7F6E\u5F39\u7A97\u5C42\u53E0\u540E\u5FC5\u987B\u81EA\u5DF1\u8865\u4E0A\u7684\u4E00\u73AF\uFF08\u8C01\u62AC\u7684\u8C01\u8D1F\u8D23\uFF09\u3002

       \u6545\u969C\u73B0\u8C61\uFF1A\u63D2\u4EF6\u5E02\u573A\u8BBE\u7F6E\u9875\u70B9\u300C\u5B89\u88C5\u300D\u6CA1\u6709\u4EFB\u4F55\u53CD\u5E94\u3002
       \u6839\u56E0\u94FE\uFF1A
         1) \u672C\u63D2\u4EF6\u628A\u8BBE\u7F6E\u5F39\u7A97\u62AC\u5230 z-index:10002\uFF08\u89C1\u4E0B\u9762 @media \u5757\uFF09\uFF0C\u4EE5\u4FBF\u76D6\u4F4F\u81EA\u5DF1\u6E32\u67D3\u7684
            \u79FB\u52A8\u7AEF\u9876\u680F(9998)/\u62BD\u5C49\u906E\u7F69(9999)\uFF1B
         2) \u63D2\u4EF6\u5E02\u573A\uFF08dshmarket 1.44.0\uFF09\u7684\u5B89\u88C5\u786E\u8BA4\u6846\u662F\u6302\u5728 <body> \u4E0B\u7684
            div._root_w1urq_2\uFF0Cposition:fixed\uFF0C\u4F46\u53EA\u6709 z-index:1000\uFF1B
         3) \u8BE5\u6D6E\u5C42\u5185\u90E8\u7684\u5BF9\u8BDD\u6846 div._dialog_w1urq_22 \u867D\u7136\u5E26 role="dialog"\u3001\u88AB\u4E0B\u9762\u7684
            10005 \u89C4\u5219\u62AC\u8D77\u6765\u4E86\uFF0C**\u4F46 z-index \u65E0\u6CD5\u9003\u51FA\u7956\u5148\u7684\u5C42\u53E0\u4E0A\u4E0B\u6587** \u2014\u2014 \u5916\u5C42\u6A21\u6001\u6839
            \u53EA\u6709 1000\uFF0C\u6574\u68F5\u5B50\u6811\uFF08\u8FDE\u540C\u90A3\u4E2A 10005\uFF09\u4E00\u8D77\u88AB\u8BBE\u7F6E\u5F39\u7A97(10002)\u76D6\u6B7B\uFF1B
         4) \u7ED3\u679C\uFF1A\u7AD6\u5C4F\u70B9\u5B89\u88C5\u5B8C\u5168\u770B\u4E0D\u5230\u6D6E\u5C42\uFF08\u8BBE\u7F6E\u5F39\u7A97\u7684\u906E\u7F69\u5728 elementFromPoint \u4E0A\u547D\u4E2D\uFF09\uFF1B
            \u6A2A\u5C4F\uFF08\u5BBD\u5EA6 > 767 \u65F6\u672C\u63D2\u4EF6\u6837\u5F0F\u4E0D\u751F\u6548\uFF0C\u8BBE\u7F6E\u5F39\u7A97\u56DE\u843D\u6210\u5BBF\u4E3B\u7684 1000\uFF09\u6D6E\u5C42\u867D\u51FA\u73B0\uFF0C
            \u5374\u4E0E\u9875\u9762\u5185\u5BB9\u4E92\u76F8\u7A7F\u900F\u3001\u663E\u793A\u4E0D\u5B8C\u6574\u3002

       \u9009\u62E9\u5668\u523B\u610F\u4E0D\u786C\u7F16\u7801\u4EFB\u4F55\u7B2C\u4E09\u65B9\u7C7B\u540D/\u54C8\u5E0C\uFF0C\u53EA\u8BA4\u6A21\u6001\u6839\u7684\u4E24\u4E2A**\u7ED3\u6784\u7279\u5F81**\uFF1A
       \u300Cbody \u7684\u76F4\u63A5\u5B50\u7EA7\u300D+\u300C\u81EA\u5E26\u906E\u7F69\u5B50\u5143\u7D20\uFF08\u6216\u6709 role=dialog \u5B50\u5143\u7D20\uFF09\u300D\u3002
       \u5B9E\u6D4B\u5728\u6253\u5F00\u8BBE\u7F6E\u524D/\u540E/\u70B9\u5B89\u88C5\u540E\u4E09\u4E2A\u9636\u6BB5\uFF0C\u672C\u9875\u9762\u4E0A\u8BE5\u9009\u62E9\u5668**\u53EA\u547D\u4E2D\u5E02\u573A\u90A3\u4E00\u4E2A\u6D6E\u5C42**\uFF0C
       \u65E0\u8BEF\u4F24\uFF1B\u672C\u63D2\u4EF6\u81EA\u5DF1\u7684 #dsh-remote-workspace-modal \u6709 ID \u89C4\u5219(100000)\uFF0C\u4F18\u5148\u7EA7\u66F4\u9AD8\uFF0C
       \u4E0D\u53D7\u5F71\u54CD\u3002\u4EC5\u5728\u8BBE\u7F6E\u5F39\u7A97\u6253\u5F00\u65F6\u751F\u6548\uFF08body:has(...)\uFF09\uFF0C\u628A\u5F71\u54CD\u9762\u538B\u5230\u6700\u5C0F\u3002

       \u3010\u5DF2\u77E5\u8FB9\u754C\u3011\u5224\u636E\u53EA\u770B\u7ED3\u6784\uFF0C\u65E0\u6CD5\u533A\u5206\u300C\u771F\u6A21\u6001\u300D\u4E0E\u300C\u6070\u597D\u957F\u6210\u8FD9\u6837\u3001\u4E14\u4E0D\u53EF\u5173\u95ED\u7684\u5168\u5C4F
       \u906E\u7F69\u300D\u3002\u82E5\u67D0\u4E2A\u63D2\u4EF6\u5F80 <body> \u4E0B\u6302\u4E00\u4E2A\u5E26 mask \u5B50\u5143\u7D20\u7684\u5168\u5C4F\u5C42\uFF0C\u5B83\u4E5F\u4F1A\u88AB\u62AC\u5230\u8BBE\u7F6E
       \u5F39\u7A97\u4E4B\u4E0A\u5E76\u76D6\u4F4F\u8BBE\u7F6E\u9875\u3002\u8FD9\u662F\u300C\u6A21\u6001\u5C31\u8BE5\u76D6\u5728\u8BBE\u7F6E\u5F39\u7A97\u4E4B\u4E0A\u300D\u7684\u65E2\u5B9A\u53D6\u820D\uFF1A\u5B81\u53EF\u8BA9\u771F\u6A21\u6001
       \u53EF\u89C1\uFF0C\u4E5F\u4E0D\u63A5\u53D7"\u5F39\u4E86\u5374\u70B9\u4E0D\u5230"\u3002\u72EC\u7ACB\u9A8C\u6536\u5DF2\u5B9E\u6D4B\u8BE5\u6784\u9020\u4F1A\u547D\u4E2D\uFF1B\u82E5\u5C06\u6765\u771F\u8E29\u5230\uFF0C
       \u5E94\u6539\u4E3A\u6309\u300C\u8BE5\u6D6E\u5C42\u662F\u5426\u53EF\u5173\u95ED\u300D\u8FDB\u4E00\u6B65\u6536\u7A84\uFF0C\u800C\u4E0D\u662F\u56DE\u9000\u8FD9\u6761\u89C4\u5219\u3002 */
    /* \u26A0\uFE0F \u5FC5\u987B\u6392\u9664\u8BBE\u7F6E\u5F39\u7A97\u81EA\u8EAB\uFF1ADSH 0.1.7 \u8D77\u8BBE\u7F6E\u5F39\u7A97\u7684 overlay \u53D8\u6210\u4E86 <body> \u7684\u76F4\u63A5\u5B50\u7EA7
       \uFF080.1.5 \u91CC\u5B83\u5D4C\u5728 #root \u5185\u90E8\uFF1B0.2.0 \u4F9D\u65E7\u5982\u6B64\uFF0C\u53EA\u662F\u54C8\u5E0C\u4ECE VOzbGW_ \u6362\u6210 wCInkW_\uFF0C
       \u6545\u8FD9\u91CC\u7528 __F_SETTINGS__ \u5360\u4F4D\u7B26\u800C\u975E\u786C\u7F16\u7801\uFF09\uFF0C\u5B83\u540C\u6837\u6EE1\u8DB3\u300Cbody \u5B50\u7EA7 + \u542B role=dialog
       \u5B50\u5143\u7D20\u300D\uFF0C\u4F1A\u88AB\u672C\u6761\u4E00\u5E76\u62AC\u5230 10050 \u2014\u2014 \u4E8E\u662F\u4E0E\u7B2C\u4E09\u65B9\u6A21\u6001\u6839\u540C\u5C42\u3001\u9000\u5316\u6210\u6309 DOM \u987A\u5E8F\u51B3\u80DC\uFF0C
       \u521A\u4FEE\u597D\u7684\u300C\u5B89\u88C5\u786E\u8BA4\u6846\u88AB\u76D6\u4F4F\u300D\u5C31\u53EF\u80FD\u590D\u53D1\u3002:not(...) \u628A\u5B83\u6392\u9664\uFF0C\u8BA9\u8BBE\u7F6E\u5F39\u7A97\u7EE7\u7EED\u7531
       \u5B83\u81EA\u5DF1\u7684 10002 \u89C4\u5219\u5B9A\u4F4D\uFF0C\u672C\u6761\u53EA\u62AC**\u5176\u5B83**\u9876\u5C42\u6A21\u6001\u3002 */
    body:has(div[class*="__F_SETTINGS__overlay"]) > div:has(> div[class*="mask"], > div[role="dialog"]):not([class*="__F_SETTINGS__overlay"]) {
      z-index: 10050 !important;
    }

    /* \u540C\u4E0A\u573A\u666F\u7684\u7B2C\u4E8C\u4E2A\u72EC\u7ACB\u95EE\u9898\uFF1A\u7B2C\u4E09\u65B9\u6A21\u6001\u5BF9\u8BDD\u6846\u300C\u6BD4\u89C6\u53E3\u8FD8\u9AD8\u300D\u3002
       \u63D2\u4EF6\u5E02\u573A\u7684\u5B89\u88C5\u786E\u8BA4\u6846\u662F\u56FA\u5B9A 584px \u9AD8 + overflow-y:hidden\uFF0C\u5728\u77EE\u89C6\u53E3\uFF08\u6A2A\u5C4F\u624B\u673A
       320\u2013430px \u9AD8\uFF0C\u4EE5\u53CA 320\xD7480 \u8FD9\u7C7B\u5C0F\u5C4F\uFF09\u91CC\u88AB\u5C45\u4E2D\u6491\u5F00 \u2192 \u4E0A\u4E0B\u540C\u65F6\u88AB\u5207\u6389\uFF0C\u5E95\u90E8
       \u300CCancel / Confirm install\u300D\u843D\u5230\u89C6\u53E3\u4E4B\u5916\uFF0C\u7528\u6237\u70B9\u4E0D\u5230\u3001\u6D41\u7A0B\u8D70\u4E0D\u4E0B\u53BB
       \uFF08\u5B9E\u6D4B 667\xD7375 \u65F6\u5BF9\u8BDD\u6846 rect y=-116 h=608\u3001\u6309\u94AE y=432\uFF1B844\xD7390 \u540C\u6837\uFF09\u3002

       \u4FEE\u6CD5\u662F\u8BA9\u6A21\u6001\u5BF9\u8BDD\u6846\u4E0D\u8D85\u8FC7\u89C6\u53E3\u5E76\u5141\u8BB8\u5185\u90E8\u6EDA\u52A8\u3002\u8FD9\u6761\u662F**\u81EA\u9650\u6027**\u7684\uFF1A
       max-height \u53EA\u5728\u300C\u89C6\u53E3\u6BD4\u5BF9\u8BDD\u6846\u77EE\u300D\u65F6\u624D\u8D77\u4F5C\u7528 \u2014\u2014 375\xD7667 / 390\xD7844 \u7B49\u6B63\u5E38\u7AD6\u5C4F\u4E0B
       100dvh-16px(=651/828) > 584\uFF0C\u58F0\u660E\u4E0D\u4EA7\u751F\u4EFB\u4F55\u89C6\u89C9\u53D8\u5316\u3002
       vh \u4E0E dvh \u5404\u5199\u4E00\u904D\uFF1A\u4E0D\u652F\u6301 dvh \u7684\u73AF\u5883\u9000\u56DE vh\uFF1B\u4E24\u6761\u90FD\u5931\u6548\u4E5F\u53EA\u662F\u4FDD\u6301\u539F\u6837\u3002 */
    body:has(div[class*="__F_SETTINGS__overlay"]) > div:has(> div[role="dialog"]) > div[role="dialog"] {
      /* \u7559 32px \u800C\u4E0D\u662F 16px\uFF1A\u8BE5\u5BF9\u8BDD\u6846\u662F content-box + 24px \u7EB5\u5411\u5185\u8FB9\u8DDD\uFF0C
         \u6309\u5185\u5BB9\u76D2\u7B97\u7684 max-height \u4F1A\u518D\u591A\u51FA\u5185\u8FB9\u8DDD\u7684\u8FB9\u6846\u76D2\u9AD8\u5EA6\uFF0C16px \u65F6\u4ECD\u6EA2\u51FA 4px\u3002 */
      max-height: calc(100vh - 32px) !important;
      max-height: calc(100dvh - 32px) !important;
      overflow-y: auto !important;
    }

    /* \u65AD\u70B9\u4E0E\u5BBF\u4E3B\u5224\u636E\u5BF9\u9F50\uFF1A\u5BBF\u4E3B\u7528 viewportWidth < 768 \u51B3\u5B9A\u53F3\u4FA7\u680F\u81EA\u52A8\u5168\u5C4F
       \uFF08dsh-client-ui-sidebar-right/lib/client.js\uFF09\uFF0C\u6545\u79FB\u52A8\u7AEF\u6837\u5F0F\u53D6 <=767px\uFF0C
       768px \u8D77\u5F7B\u5E95\u4EA4\u8FD8\u684C\u9762\u5E03\u5C40\uFF0C\u907F\u514D"\u6865\u6E32\u67D3\u9876\u680F\u3001\u5BBF\u4E3B\u5374\u672A\u5168\u5C4F"\u7684\u9519\u4F4D\u3002 */
    @media (max-width: 767px) {
      /* 1. \u4E3B\u6846\u67B6\u4E3A Header \u817E\u51FA\u9876\u90E8\u7A7A\u95F4\u3002

         \u9009\u62E9\u5668\u5FC5\u987B\u9650\u5B9A\u5728\u5E03\u5C40\u5916\u58F3\uFF08dsh-client-ui-layout \u7684 AppFrame\uFF0C\u5373
         [data-slot="root"] \u7684\u76F4\u63A5\u5B50\u5143\u7D20\uFF09\u3002\u5BBF\u4E3B\u7684 CSS-module \u54C8\u5E0C\u53EA\u4FDD\u8BC1\u540C\u6587\u4EF6
         \u5185\u552F\u4E00\uFF0C*="_frame" \u662F\u8DE8\u5305\u901A\u914D\uFF1A\u804A\u5929\u8BB0\u5F55\u5BB9\u5668\uFF08dsh-client-ui-chat \u7684
         .EvIC1a_frame\uFF0C\u540C\u6837\u4EE5 _frame \u7ED3\u5C3E\uFF09\u4E5F\u4F1A\u88AB\u547D\u4E2D\u3002\u4E00\u65E6\u547D\u4E2D\uFF0C\u5B83\u88AB\u5F3A\u52A0
         height:100dvh + overflow:hidden\uFF0C\u5728\u624B\u673A\u4E0A\u88AB\u94B3\u5230\u89C6\u53E3\u9AD8\u5EA6\u5E76\u88C1\u6389\u6EA2\u51FA\u5185\u5BB9\uFF1A
         \u5916\u5C42 [data-conversation-scroll] \u5DF2\u6EDA\u5230\u5E95\u3001\u5185\u90E8\u5374\u8FD8\u6709\u6570\u5343 px \u8BFB\u4E0D\u5230\uFF0C
         \u8868\u73B0\u4E3A\u300C\u770B\u4E0D\u5230\u6700\u65B0\u6D88\u606F\u300D\u3002\u5B98\u65B9\u7ED9\u8BE5\u5BB9\u5668\u7684\u89C4\u5219\u662F flex:none;height:auto
         \uFF08\u8BA9\u8BB0\u5F55\u968F\u5185\u5BB9\u81EA\u7136\u589E\u9AD8\u3001\u7531\u5916\u5C42\u7EDF\u4E00\u6EDA\u52A8\uFF09\uFF0C\u4E0E\u8FD9\u91CC\u51B2\u7A81\uFF0C\u6545\u5FC5\u987B\u6392\u9664\u3002 */
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

      /* \u5BBF\u4E3B 0.1.7 \u7684 frame \u662F grid \u4E09\u5217\u5E03\u5C40\uFF08sidebar | center | rightbar\uFF09\uFF0CJS \u6309\u72B6\u6001\u6CE8\u5165
         grid-template-columns\uFF1B\u63D2\u4EF6\u628A\u5DE6\u4FA7\u680F\u62BD\u5C49\u5316\u540E sidebarCol \u53D8\u6210 fixed\uFF08\u8131\u79BB grid \u6D41\uFF09\uFF0C
         \u82E5\u4E0D\u663E\u5F0F\u6307\u5B9A\u5217\u4F4D\uFF0CcenterCol \u4F1A\u88AB\u81EA\u52A8\u6392\u8FDB\u7B2C 1 \u5217\uFF0856px \u8F68\u9053\uFF09\u3001rightbarCol \u584C\u9677\u5230
         \u89C6\u53E3\u5E95\u90E8 \u2192 \u53F3\u4FA7\u680F\u70B9\u5F00\u540E\u9762\u677F\u88AB\u5B9A\u4F4D\u5230\u89C6\u53E3\u5916\uFF08\u7528\u6237\u770B\u5230\u7684\u300C\u6309\u94AE\u6D88\u5931\u3001\u53F3\u4FA7\u680F\u6CA1\u51FA\u6765\u300D\uFF09\u3002
         \u8FD9\u91CC\u663E\u5F0F\u5F52\u4F4D\uFF1Asidebar \u62BD\u5C49\u4E0D\u5360\u5217\uFF08\u7B2C 1 \u5217 0px\uFF09\u3001center \u5360\u6EE1\uFF08\u7B2C 2 \u5217 1fr\uFF09\u3001
         rightbar \u4FDD\u7559\u5BBF\u4E3B\u53F3\u4FA7\u680F\u5217\uFF08\u7B2C 3 \u5217 0px \u6298\u53E0\uFF0C\u5168\u5C4F\u9762\u677F fixed \u76F8\u5BF9\u89C6\u53E3\u3001\u4E0D\u4F9D\u8D56\u6B64\u5217\uFF09\u3002 */
      div[class*="_centerCol"] { grid-column: 2 !important; }
      div[class*="_rightbarCol"] { grid-column: 3 !important; }
      div[class*="_overlayLayer"] { grid-column: 1 / -1 !important; }

      /* 1.1 fixed \u5168\u5C4F\u9762\u677F\u5355\u72EC\u8BA9\u4F4D\uFF1Aposition:fixed \u7684\u5305\u542B\u5757\u662F viewport\uFF08CSS 2.1 \xA710.1\uFF09\uFF0C
         \u4E0D\u8DDF\u968F\u4E0A\u9762 frame \u7684 padding-top\uFF0C\u56E0\u6B64\u9876\u90E8 52px \u4F1A\u843D\u8FDB\u9876\u680F\u8986\u76D6\u533A\uFF08#41\uFF09\u3002
         \u5B98\u65B9\u53F3\u4FA7\u680F\u5728 <768px \u81EA\u52A8\u5168\u5C4F\uFF0C\u8FD9\u91CC\u6309 data \u5C5E\u6027\u76F4\u63A5\u4F4D\u79FB\u5BB9\u5668\u672C\u8EAB\uFF0C\u4E0D\u4F9D\u8D56\u5BBF\u4E3B
         CSS-module \u54C8\u5E0C\u7C7B\u540D\u3002
         \u5BBF\u4E3B\u7248\u672C\u5DEE\u5F02\uFF080.1.5 vs 0.1.7\uFF09\uFF1A0.1.5 \u7684\u9762\u677F\u81EA\u8EAB\u5C31\u662F position:fixed; inset:0
         \uFF08\u76F8\u5BF9\u89C6\u53E3\uFF09\uFF0Ctop \u8BA9\u4F4D\u76F4\u63A5\u751F\u6548\uFF1B0.1.7 \u628A\u9762\u677F\u6539\u6210 position:absolute \u76F8\u5BF9
         rightbarCol \u5217\u5B9A\u4F4D\uFF0C\u4E14\u5BBF\u4E3B\u5DF2\u628A\u5B83\u653E\u5728\u5185\u5BB9\u533A\u8D77\u70B9\u2014\u2014\u82E5\u63D2\u4EF6\u4ECD\u53EA\u6539 top\uFF0C\u4F1A\u5728\u5BBF\u4E3B
         \u5B9A\u4F4D\u4E4B\u4E0A\u518D\u53E0\u52A0 52px\uFF08\u9762\u677F\u88AB\u63A8\u5230\u89C6\u53E3\u5916\uFF0C\u8868\u73B0\u4E3A\u300C\u70B9\u5F00\u53F3\u4FA7\u680F\u6309\u94AE\u6D88\u5931\u3001\u9762\u677F\u4E0D
         \u51FA\u6765\u300D\uFF09\u3002\u4FEE\u6CD5\uFF1A\u628A\u9762\u677F\u7EDF\u4E00\u5F3A\u5236\u4E3A fixed \u76F8\u5BF9\u89C6\u53E3 + top:52px \u8BA9\u4F4D\uFF0C\u4E24\u7248\u5BBF\u4E3B
         \u884C\u4E3A\u4E00\u81F4\u3002 */
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

      /* 2. \u9876\u90E8\u539F\u751F\u5BFC\u822A\u6761\uFF1A100% \u8FD8\u539F DeepSeek App (\u5DE6\u4FA7\u53CC\u6A2A\u7EBF\uFF0C\u53F3\u4FA7(+)\uFF0C\u4E2D\u95F4\u7559\u767D\uFF0C\u65E0\u591A\u4F59\u8BBE\u7F6E\u6309\u94AE) */
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

      /* \u5DE6\u4FA7\u53CC\u6A2A\u7EBF\u6309\u94AE (DeepSeek App \u539F\u751F\u56FE\u6807) */
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

      /* \u53F3\u4FA7 (+) \u65B0\u5EFA\u4F1A\u8BDD\u6309\u94AE (DeepSeek App \u539F\u751F\u56FE\u6807) */
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

      /* \u4E2D\u95F4\u52A8\u6001\u4F1A\u8BDD\u6807\u9898 (\u5355\u884C\u5C45\u4E2D\u6253\u70B9\u622A\u65AD\uFF0C100% \u8FD8\u539F\u539F\u751F App \u5BFC\u822A\u4F53\u9A8C) */
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

      /* 3. \u4E2D\u95F4\u4E3B\u5185\u5BB9\u533A\u4E0E\u8F93\u5165\u6846 */
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

      /* 3.0 \u5DE5\u4F5C\u533A Workbench / \u4EFB\u52A1\u7BA1\u7406 / \u591A Tab \u680F\u79FB\u52A8\u7AEF\u81EA\u9002\u5E94\u9002\u914D\u3002
         \u6CE8\uFF1A__F_WB__(nArs4W) \u4E0E __F_TOGGLE__(W-zNGW) \u8FD9\u4E24\u65CF\u53EA\u5728 0.1.x \u91C7\u5230\u8FC7\uFF1B
         0.2.0 \u7684 app.asar \u7C7B\u540D\u6620\u5C04\u91CC\u5DF2\u4E0D\u5B58\u5728 tabBar/tabList/tabClose/tabBarPlus/toggleCluster
         \u8FD9\u4E9B\u672C\u5730\u540D\uFF08\u53F3\u4FA7\u680F Tab \u6539\u540D\u4E3A dsh-client-ui-sidebar-right \u7684 OUqwTW_tabTitle\uFF09\uFF0C
         \u56E0\u6B64\u8FD9\u51E0\u6761\u5728\u684C\u9762\u7248\u4E0A\u4E0D\u547D\u4E2D\u3002\u7559\u7740\u4E0D\u6539\u52A8\u65E7\u5BBF\u4E3B\u884C\u4E3A\uFF0C\u6536\u655B\u9700\u53E6\u91C7\u951A\u70B9\uFF08\u89C1 host-families.js\uFF09\u3002 */
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

      /* Tab \u680F\uFF1A\u6A2A\u5411\u6ED1\u52A8\u624B\u52BF + \u5E72\u51C0\u7684\u5E95\u90E8\u8FB9\u6846\uFF0C\u675C\u7EDD\u4E0E\u9876\u90E8\u79FB\u52A8\u7AEF Header \u91CD\u53E0 */
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

      /* \u5355\u4E2A Tab \u80F6\u56CA\u5316\uFF0C\u6587\u5B57\u8D85\u957F\u81EA\u52A8\u6253\u70B9\uFF0C\u9632\u6B62 Tab \u4E92\u76F8\u6324\u538B */
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

      /* \u79FB\u52A8\u7AEF\u9762\u677F\u53F3\u4E0A\u89D2\u201C\u8FD4\u56DE\u5BF9\u8BDD / \u2715 \u6536\u8D77\u201D\u6309\u94AE\uFF1A\u5E38\u9A7B\u53F3\u4FA7\uFF0C\u9192\u76EE\u4E14\u6613\u89E6\u8FBE */
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

      /* 1.1.1 \u5BBF\u4E3B\u6D6E\u5C42\uFF08\u667A\u80FD\u4F53\u56E2\u961F / \u5B50\u667A\u80FD\u4F53\u4E0B\u62C9\uFF09\uFF1A\u79FB\u52A8\u7AEF\u7EDF\u4E00\u9000\u51FA\u901A\u9053\u3002
         \u2014\u2014 \u5BBF\u4E3B\u8FD9\u4E24\u5904\u6D6E\u5C42\u90FD\u662F**\u684C\u9762\u8BED\u4E49\u7684 popover**\uFF0C\u81EA\u8EAB\u6CA1\u6709\u4EFB\u4F55\u5173\u95ED\u63A7\u4EF6\uFF1A\u684C\u9762\u9760\u9F20\u6807\u79FB\u51FA\u3001
         \u70B9\u6D6E\u5C42\u5916\u7A7A\u767D\u6216 Esc \u6536\u8D77\uFF08\u56E2\u961F\u6D6E\u5C42\u662F dsh-client-ui-primitives \u7684
         useDismissOnOutsidePointer + keydown Escape\uFF1B\u5B50\u667A\u80FD\u4F53\u4E0B\u62C9\u662F\u81EA\u5E26\u7684 closeOutside +
         React onKeyDown\uFF09\u3002\u624B\u673A\u4E0A\u6CA1\u6709 hover\uFF0C\u800C"\u70B9\u5916\u9762"\u8FD9\u6761\u552F\u4E00\u9000\u8DEF\u672A\u5FC5\u591F\u5F97\u7740\uFF1A
           \xB7 \u56E2\u961F\u6D6E\u5C42\uFF1A\u4E0A\u9650 680px \u5DF2\u63A5\u8FD1\u6574\u5C4F\uFF0C\u5B9E\u6D4B 360\xD7803 \u5360 y=91.5..771.5\uFF0C\u4E0A\u4E0B\u53EA\u5269 92/32px\uFF1B
           \xB7 \u5B50\u667A\u80FD\u4F53\u4E0B\u62C9\uFF1A\u5BBF\u4E3B\u81EA\u7559 140px\uFF0C\u4F46\u77EE\u5C4F + \u591A\u5B50\u667A\u80FD\u4F53\u65F6\u540C\u6837\u7D27\u5F20
             \uFF08\u5B9E\u6D4B 360\xD7560 + 12 \u4E2A\u5B50\u667A\u80FD\u4F53 = 328\xD7420 \u4E8E y=91.5..511.5\uFF0C\u4E0B\u65B9\u53EA\u5269 49px\uFF09\u3002
         \u8FD9\u4E24\u6BB5\u7A7A\u767D\u5728\u771F\u673A\u4E0A\u6B63\u597D\u843D\u5728\u6D4F\u89C8\u5668\u5730\u5740\u680F/\u5E95\u90E8\u5BFC\u822A\u6761\u8986\u76D6\u533A\uFF0C\u5DE6\u53F3 16px \u53C8\u8981\u8DDF\u7CFB\u7EDF
         \u8FD4\u56DE\u624B\u52BF\u62A2 \u2014\u2014 \u7528\u6237"\u70B9\u4E0D\u5230\u7A7A\u767D"\uFF0C\u9000\u4E0D\u51FA\u6765\u3002\u8FD9\u91CC\u7EDF\u4E00\u505A\u4E24\u4EF6\u4E8B\uFF1A
         (1) \u6536\u7D27\u9AD8\u5EA6\u4E0A\u9650\uFF1A\u6309**\u52A8\u6001\u89C6\u53E3**\u518D\u7559\u5B89\u5168\u8FB9\uFF08vh \u884C\u662F\u4E0D\u652F\u6301 dvh \u7684\u515C\u5E95\uFF0C\u53EA\u5728\u89C6\u53E3
             \u771F\u7684\u66F4\u77EE\u65F6\u751F\u6548\uFF0C\u6B63\u5E38\u7AD6\u5C4F\u65E0\u89C6\u89C9\u53D8\u5316\uFF09\uFF0C\u4FDD\u8BC1\u6D6E\u5C42\u4E0D\u4F38\u5230\u6D4F\u89C8\u5668 UI \u5E95\u4E0B\u3002
             \u5916\u5C42 max(160px, \u2026) \u662F**\u4E0B\u9650\u4FDD\u62A4**\uFF1A\u6570\u5B66\u51FD\u6570\u5728"\u89C6\u53E3\u6BD4\u4FDD\u7559\u91CF\u8FD8\u77EE"\u65F6\u4F1A\u628A\u7ED3\u679C\u94B3\u5230
             \u22640\uFF0C\u800C !important \u4F1A\u8D62\u8FC7\u5BBF\u4E3B\u81EA\u5DF1\u7684\u515C\u5E95 \u2192 \u6D6E\u5C42\u88AB\u538B\u6210 0 \u9AD8\u3001\u8FDE\u6309\u94AE\u4E00\u8D77\u4E0D\u53EF\u89C1
             \uFF08\u72EC\u7ACB\u9A8C\u6536\u5B9E\u6D4B\uFF1A80px \u89C6\u53E3\u4E0B\u8BA1\u7B97\u503C\u5C31\u662F 0px\uFF09\u3002\u771F\u673A\u4E0A\u89C6\u53E3 <256px \u4E0D\u53EF\u8FBE\uFF0C\u8FD9\u91CC
             \u7EAF\u5C5E\u5065\u58EE\u6027\u4FDD\u62A4\uFF1A\u5B81\u53EF\u7565\u9AD8\u4E8E\u89C6\u53E3\uFF0C\u4E5F\u4E0D\u8981"\u6574\u5757\u6D88\u5931"\uFF1B
         (2) \u4E3A JS \u6CE8\u5165\u7684\u6536\u8D77\u6309\u94AE\uFF08.dsh-mobile-popover-close-btn\uFF0C\u89C1 client/index.js\uFF09
             \u9884\u7559\u9876\u90E8 44px \u64CD\u4F5C\u5E26\uFF0C\u6309\u94AE\u9489\u5728\u53F3\u4E0A\u89D2\uFF0C\u5728\u771F\u673A\u53EF\u7528\u89C6\u53E3\u5185\uFF08\u5B9E\u6D4B\u89C6\u53E3\u9AD8 \u2265176px \u65F6
             \u6D6E\u5C42\u9876\u8FB9\u4ECD\u4E3A\u6B63\u3001\u6309\u94AE\u5B8C\u6574\u53EF\u89C1\u4E14\u53EF\u547D\u4E2D\uFF1B\u771F\u673A\u7AD6/\u6A2A\u5C4F\u90FD\u8FDC\u9AD8\u4E8E\u6B64\uFF09\u59CB\u7EC8\u843D\u5728\u6D6E\u5C42
             \u53EF\u89C1\u533A\uFF1B\u89C6\u53E3\u77EE\u5230\u7EA6 176px \u4EE5\u4E0B\u65F6\u5BBF\u4E3B\u4F1A\u628A\u6D6E\u5C42\u9876\u8FB9\u63A8\u5230\u8D1F\u503C\u3001\u6309\u94AE\u968F\u4E4B\u51FA\u5C4F\uFF0C
             \u5C5E\u4E0D\u53EF\u8FBE\u573A\u666F\uFF0C\u4E0D\u5728\u672C\u89C4\u5219\u7684\u627F\u8BFA\u8303\u56F4\u5185\u3002 */
      [data-team-panel].dsh-bridge-team-panel {
        padding-top: 44px !important;
        max-height: max(160px, min(680px, calc(100vh - 96px))) !important;
        max-height: max(160px, min(680px, calc(100dvh - 96px))) !important;
      }
      /* \u5B50\u667A\u80FD\u4F53\u4E0B\u62C9\uFF1A\u5BBF\u4E3B\u81EA\u5DF1\u5DF2\u6309 min(560px, 100vh - 140px) \u9884\u7559 140px\uFF0C\u8FD9\u91CC\u53EA\u628A vh \u6362\u6210
         \u52A8\u6001\u89C6\u53E3 \u2014\u2014 \u5426\u5219\u624B\u673A\u5730\u5740\u680F/\u5E95\u90E8\u5BFC\u822A\u6761\u5403\u6389\u7684\u90A3\u6BB5\u4F1A\u88AB\u7B97\u8FDB\u53EF\u7528\u9AD8\u5EA6\u3002 */
      body > div[class*="_menu"].dsh-bridge-subagent-menu {
        padding-top: 44px !important;
        max-height: max(160px, min(560px, calc(100vh - 140px))) !important;
        max-height: max(160px, min(560px, calc(100dvh - 140px))) !important;
      }
      .dsh-mobile-popover-close-btn {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        z-index: 2 !important;
        box-sizing: border-box !important;
        height: 28px !important;
        min-width: 28px !important;
        padding: 0 10px !important;
        border-radius: 14px !important;
        border: 1px solid var(--dsw-alias-border-l2, rgba(127, 127, 127, 0.35)) !important;
        background: var(--dsw-alias-bg-layer-2, rgba(127, 127, 127, 0.16)) !important;
        color: var(--dsw-alias-label-primary, inherit) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        line-height: 1 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        flex: 0 0 auto !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        -webkit-tap-highlight-color: transparent !important;
        transition: transform 0.1s, opacity 0.15s !important;
      }
      .dsh-mobile-popover-close-btn:active {
        transform: scale(0.95) !important;
        opacity: 0.85 !important;
      }

      /* 3.1 \u4F1A\u8BDD\u5BF9\u8BDD\u5934\u90E8\u9876\u680F\uFF1A\u79FB\u52A8\u7AEF\u9632\u6324\u538B\u4E0E\u7A7A\u95F4\u91CA\u653E\u4F18\u5316\uFF08\u4E25\u683C\u6392\u9664 .dsh-mobile-app-header\uFF09 */
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

      /* \u79FB\u52A8\u7AEF\u5C06\u539F\u6709\u5D4C\u5165\u5728\u5185\u5BB9\u533A\u7684\u957F\u9762\u5305\u5C51\u6807\u9898\u9690\u85CF\uFF08\u5DF2\u7EDF\u4E00\u63D0\u5347\u81F3\u9876\u90E8\u5BFC\u822A\u680F\u6B63\u4E2D\uFF09\uFF0C\u5F7B\u5E95\u91CA\u653E\u7B2C\u4E8C\u884C\u7A7A\u95F4 */
      nav[class*="__F_CONV__crumbs"],
      nav[class*="crumbs"],
      div[class*="__F_CONV__crumbs"],
      div[class*="crumbs"],
      [class*="__F_CONV__crumbs"] {
        display: none !important;
      }

      /* \u5B50\u4EE3\u7406/\u667A\u80FD\u4F53\u6A21\u5F0F\u80F6\u56CA (Actions)\uFF1A\u7D27\u51D1\u5706\u89D2\u80F6\u56CA */
      div[class*="__F_CONV__headerActions"],
      div[class*="headerActions"] {
        flex: 0 0 auto !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        margin-left: 0 !important;
      }

      /* Agent \u9884\u8BBE\u80F6\u56CA\uFF1A\u672C\u5730\u540D\u5386\u4EE3\u4E0D\u4E00 \u2014\u2014 0.1.x \u4E0E 0.2.0 \u5B9E\u6D4B\u90FD\u662F _seat
         \uFF08cubgiG_seat / _oGoKq_seat\uFF09\uFF0C\u63D2\u4EF6\u65E9\u671F\u91C7\u5230\u7684 trigger \u4E24\u4EE3\u90FD\u4E0D\u5B58\u5728\uFF0C\u6545\u4E24\u4E2A\u90FD\u6536\u3002 */
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

      /* Session Log \u5BFC\u51FA\u4E0B\u8F7D\u6309\u94AE (Utilities)\uFF1A\u5728\u79FB\u52A8\u7AEF\u6781\u7B80\u4E3A 28px \u5706\u5F62\u7EAF\u56FE\u6807\u6309\u94AE\uFF0C\u9690\u85CF\u957F\u6587\u672C\uFF0C\u6781\u5927\u91CA\u653E\u9876\u90E8\u7A7A\u95F4\u3002
         \u88F8\u672C\u5730\u540D sessionLogButton \u515C\u5E95\u662F\u7248\u672C\u65E0\u5173\u7684\uFF080.1.x \u4E3A nL4_yW_sessionLogButton\uFF09\uFF1B
         0.2.0 \u7684 app.asar \u91CC\u8BE5\u672C\u5730\u540D\u5DF2\u4E0D\u5B58\u5728\uFF08\u8BE5\u6309\u94AE\u88AB\u79FB\u9664/\u6539\u540D\uFF09\uFF0C\u6545\u684C\u9762\u7248\u4E0D\u9002\u7528\u3002 */
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

      /* \u5B50\u4EE3\u7406\u5C55\u5F00\u83DC\u5355\u5728\u79FB\u52A8\u7AEF\u53F3\u5BF9\u9F50\u4E0E\u5BBD\u5EA6\u81EA\u9002\u5E94\u3002
         \u6CE8\uFF1Amenu \u8FD9\u4E2A\u672C\u5730\u540D\u5728 0.1.x(cubgiG) \u4E0E 0.2.0(_oGoKq) \u7684 Agent \u9884\u8BBE\u65CF\u91CC\u90FD\u4E0D\u5B58\u5728
         \uFF08\u5B9E\u6D4B\uFF09\uFF0C\u672C\u89C4\u5219\u5728\u8FD9\u4E24\u4E2A\u5BBF\u4E3B\u4E0A\u4E0D\u547D\u4E2D\uFF1B\u4FDD\u7559\u662F\u4E3A\u4E86\u4E0D\u6539\u52A8\u65E7\u884C\u4E3A\uFF0C\u7B49\u91C7\u5230\u771F\u5B9E\u951A\u70B9\u518D\u6536\u655B\u3002 */
      div[class*="__F_PRESET__menu"] {
        max-width: calc(100vw - 32px) !important;
        left: auto !important;
        right: 0 !important;
      }

      /* \u8F93\u5165\u6846\u5E95\u5EA7\uFF1ADeepSeek App \u5C45\u4E2D\u53CA\u5E95\u90E8\u56FA\u5B9A */
      div[class*="__F_CONV__scrollBody"] {
        padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
      }

      /* \u2500\u2500 \u79FB\u52A8\u7AEF\u8F93\u5165\u6846\u6298\u53E0\u6A21\u5F0F\uFF08body.dsh-composer-collapsed\uFF09\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
         \u6298\u53E0\u540E\u9690\u85CF\u5438\u5E95\u8F93\u5165\u533A\uFF0C\u8BA9\u6D88\u606F viewArea \u81EA\u52A8\u4F38\u5C55\u5230\u5168\u9AD8\uFF0C\u6700\u5927\u5316\u9605\u8BFB\u533A\u3002
         \u5165\u53E3\uFF1A\u804A\u5929\u5934\u90E8\u5DE5\u5177\u680F\uFF08Session \u4E0B\u8F7D\u94AE\u65C1\uFF09\u7684\u6298\u53E0\u6309\u94AE\uFF0C\u6216\u6298\u53E0\u6001\u5E95\u90E8\u7EC6\u8F93\u5165\u6761\u70B9\u5B83\u5524\u56DE\u3002
         \u72B6\u6001\u6301\u4E45\u5316\u5230 localStorage\u3002 */
      body.dsh-composer-collapsed div[class*="__F_CONV__composerSeat"] {
        display: none !important;
      }
      body.dsh-composer-collapsed div[class*="__F_CONV__viewArea"] {
        flex: 1 1 auto !important;
        height: auto !important;
        min-height: 0 !important;
      }
      /* \u6298\u53E0\u65F6\u6EDA\u52A8\u533A\u5E95\u90E8\u5BF9\u9F50 safe-area\uFF0C\u907F\u514D\u5185\u5BB9\u88AB iPhone \u5E95\u90E8\u6A2A\u6761\u906E\u6321 */
      body.dsh-composer-collapsed div[class*="__F_CONV__scrollBody"] {
        padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
      }

      /* \u6298\u53E0\u8F93\u5165\u6846\u6309\u94AE\uFF1A\u6CE8\u5165\u5728\u804A\u5929\u5934\u90E8\u5DE5\u5177\u680F\uFF08Session \u4E0B\u8F7D\u94AE\u65C1\uFF09\uFF0C
         \u4E0E DSH sessionLogButton \u540C\u89C4\u683C\uFF0828px \u5706\u5F62\u56FE\u6807\u94AE\uFF09\uFF0C\u89C6\u89C9\u4E0E\u539F\u751F\u4E00\u81F4 */
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

      /* \u6298\u53E0\u6001\u5E95\u90E8\u7EC6\u8F93\u5165\u6761\uFF1A\u70B9\u51FB\u5524\u8D77\u8F93\u5165\u6846\uFF08\u4F4D\u4E8E\u539F\u8F93\u5165\u533A\u4F4D\u7F6E\uFF0Csticky \u5E95\u90E8\uFF09 */
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

      /* \u8F93\u5165\u5361\u7247\uFF1ADeepSeek App \u5706\u89D2\u5927\u80F6\u56CA\u9020\u578B */
      div[class*="__F_COMPOSER__card"] {
        border-radius: 26px !important;
        padding: 14px 16px 12px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgba(0, 0, 0, 0.07) !important;
        background: var(--dsw-alias-bg-layer-2, #f4f4f7) !important;
      }

      /* \u8F93\u5165\u6846\u5E95\u90E8\u5DE5\u5177\u680F\uFF1A\u5F39\u6027\u81EA\u9002\u5E94\uFF0C\u5F7B\u5E95\u675C\u7EDD\u6743\u9650\u9009\u62E9\u5668(Full access)\u4E0E\u6A21\u578B\u9009\u62E9\u5668\u91CD\u53E0\u78B0\u649E */
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

      /* 4. \u539F\u751F\u4FA7\u8FB9\u680F\u62BD\u5C49\u5316 (Drawer) */
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

      /* \u62BD\u5C49\u5185\u90E8\uFF1A\u5F3A\u5236 100% \u5BBD\u5EA6\uFF0C\u65E0\u8BBA\u5185\u90E8\u72B6\u6001\u5982\u4F55\u5747\u6B63\u5E38\u5C55\u5F00\u5E76\u5C55\u793A DSH \u81EA\u5E26\u7684\u9876\u90E8\u6536\u8D77\u4FA7\u8FB9\u680F\u56FE\u6807 */
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

      /* \u8BBE\u7F6E\u5F39\u7A97\u6253\u5F00\u65F6\u89E3\u9664\u62BD\u5C49\u9690\u85CF\u9650\u5236 */
      div[class*="_sidebarCol"]:has(div[class*="__F_SETTINGS__overlay"]) {
        transform: none !important;
        width: 100vw !important;
        max-width: 100vw !important;
        background: transparent !important;
        box-shadow: none !important;
        pointer-events: none !important;
      }

      /* 5. \u534A\u900F\u660E\u80CC\u666F\u906E\u7F69 */
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

      /* 6. \u8BBE\u7F6E\u4E2D\u5FC3\u5168\u81EA\u9002\u5E94\u9002\u914D */
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
      /* 6.1 481\u2013767px\uFF1A\u4FDD\u7559\u5DE6\u4FA7\u56FE\u6807\u8F68\u9053\u3002
         78px \u8F68\u9053\u628A "Agent presets"/"Plugin Market" \u6324\u5230\u4E24\u4FA7\u53EA\u5269 ~5px\u3001\u6807\u7B7E\u88AB\u538B\u5230
         10.5px \u4E14 word-break:break-all \u4F1A\u4ECE\u8BCD\u4E2D\u95F4\u65AD\u5B57\uFF0C\u6545\u653E\u5BBD\u5230 88px / 11.5px\uFF0C
         \u5E76\u6539\u7528 overflow-wrap \u515C\u5E95\uFF08\u6B63\u5E38\u5355\u8BCD\u4E0D\u518D\u88AB\u62C6\uFF09\u3002 */
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
        /* flex:none\uFF1A\u5355\u5143\u683C\u4E0D\u5F97\u88AB\u538B\u7F29\uFF0C\u5426\u5219\u77EE\u89C6\u53E3\u4E0B\u672B\u9879\u4F1A\u8D34\u7740\u8F68\u9053\u4E0B\u6CBF\u88AB\u5207\u6389 */
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

      /* \u77EE\u89C6\u53E3\uFF08\u6A2A\u5C4F\u624B\u673A\uFF09\uFF1A\u538B\u7F29\u8F68\u9053\u5355\u5143\u683C\uFF0C\u4FDD\u8BC1 6 \u4E2A\u5206\u7C7B\u5168\u90E8\u843D\u5728\u9762\u677F\u5185\uFF0C
         \u800C\u4E0D\u662F\u9760 nav \u81EA\u8EAB\u7684 overflow-y \u6EDA\u52A8\u628A\u672B\u9879\u85CF\u8D77\u6765\uFF08\u5F53\u524D\u65E0\u4EFB\u4F55\u53EF\u6EDA\u52A8\u63D0\u793A\uFF09\u3002 */
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
      /* overflow-x \u5FC5\u987B\u662F auto \u800C\u4E0D\u662F hidden\uFF1A\u5BBF\u4E3B\u539F\u6837\u5F0F\u53EA\u5199\u4E86 overflow-y:auto\uFF0C
         \u6309 CSS Overflow \u89C4\u8303 overflow-x \u4F1A\u8BA1\u7B97\u4E3A auto\uFF08\u53EF\u6A2A\u6ED1\uFF09\u3002\u6B64\u524D\u63D2\u4EF6\u5F3A\u5236
         hidden\uFF0C\u628A\u300C\u53EF\u6EDA\u52A8\u300D\u964D\u7EA7\u6210\u300C\u9759\u9ED8\u88C1\u5207\u300D\u2014\u2014\u6EA2\u51FA\u5185\u5BB9\u65E2\u770B\u4E0D\u5230\u4E5F\u6ED1\u4E0D\u51FA\u6765
         \uFF08\u5B9E\u6D4B 375px \u4E0B\u88C1\u6389 42px\uFF0CPlugin Market \u7684 Installed/Advanced \u4E24\u4E2A Tab
         \u76F4\u63A5\u4E0D\u53EF\u8FBE\uFF09\u3002\u8FD9\u91CC\u6062\u590D\u5BBF\u4E3B\u9ED8\u8BA4\uFF0C\u4FDD\u8BC1\u4EFB\u4F55\u7B2C\u4E09\u65B9\u8BBE\u7F6E\u8282\u7684\u5185\u5BB9\u81F3\u5C11\u53EF\u8FBE\u3002 */
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

      /* \u8BBE\u7F6E\u4E2D\u5FC3\u9009\u9879\u884C\u624B\u673A\u81EA\u9002\u5E94\uFF08\u5782\u76F4\u6D41\u5F0F\uFF0C\u9632\u6587\u5B57\u5355\u5B57\u6298\u884C\uFF09 */
      div[class*="__F_SETTINGS__options"] div[class*="_row"] {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 8px !important;
        width: 100% !important;
        /* min-width:0\uFF1A\u8BA9 flex \u5B50\u9879\u53EF\u4EE5\u771F\u6B63\u6536\u7F29\uFF0C\u800C\u4E0D\u662F\u628A\u7236\u5BB9\u5668\u9876\u5BBD\u540E\u6EA2\u51FA */
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

      /* 7. \u4EE3\u7801\u5757\u3001\u8868\u683C\u4E0E\u5FBD\u6807\u81EA\u9002\u5E94 */
      pre, code, pre > code, table {
        max-width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        font-size: 12.5px !important;
      }

      /* \u72B6\u6001\u5FBD\u6807\u4E0E\u836F\u4E38\u6309\u94AE\u6C38\u4E0D\u6298\u5B57 */
      span[style*="border-radius: 999"],
      span[style*="border-radius:999"] {
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        min-width: max-content !important;
      }

      /* \u4E8C\u7EF4\u7801\u4E0E\u56FE\u7247\u79FB\u52A8\u7AEF\u5F39\u6027\u7F29\u653E */
      img[alt="QR"], img[src^="data:image"] {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* 8. \u786E\u4FDD\u6240\u6709 Popover \u5F39\u51FA\u83DC\u5355\u3001\u64CD\u4F5C\u6C14\u6CE1\u3001\u4E0B\u62C9\u6846\u4F4D\u4E8E\u62BD\u5C49\u4E4B\u4E0A\u4E14\u652F\u6301\u89E6\u63A7\u4EA4\u4E92 */
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

      /* 9. \u79FB\u52A8\u7AEF\u4FA7\u8FB9\u680F\uFF1A\u4F1A\u8BDD\u4E0E\u5DE5\u4F5C\u533A\u4E09\u70B9\u64CD\u4F5C\u6309\u94AE\u59CB\u7EC8\u6E05\u6670\u53EF\u89C1\u4E14\u6613\u4E8E\u70B9\u51FB */
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

      /* \u5168\u5C40 overlayLayer \u7EDD\u4E0D\u88AB\u67D3\u9ED1 */
      div[class*="overlayLayer"],
      div[class*="__F_COMPOSER__overlayAnchor"] {
        background: transparent !important;
        pointer-events: none !important;
      }
      div[class*="overlayLayer"] > * {
        pointer-events: auto !important;
      }
    }

    /* 6.2 <=480px \u624B\u673A\u7AD6\u5C4F\uFF1A\u8BBE\u7F6E\u4E2D\u5FC3\u6539\u4E3A\u300C\u4E24\u7EA7\u94BB\u53D6\u300D\u3002
       \u4FA7\u8FB9\u8F68\u9053\u5728 375px \u5C4F\u4E0A\u8981\u5403\u6389 88px\uFF0821% \u5BBD\u5EA6\uFF09\uFF0C\u5185\u5BB9\u5217\u53EA\u5269 277px\uFF0C\u7B2C\u4E09\u65B9\u8BBE\u7F6E\u8282
       \uFF08Plugin Market \u7684 Tab \u6761\u9700 470px\uFF09\u5FC5\u7136\u6EA2\u51FA\u3002\u6539\u4E3A\uFF1A\u5206\u7C7B\u5217\u8868\u9875 \u2194 \u5185\u5BB9\u8BE6\u60C5\u9875\uFF0C
       \u5185\u5BB9\u72EC\u5360\u6574\u5BBD\uFF08375px \u4E0B\u7531 277px \u63D0\u5347\u5230 355px\uFF0C+28%\uFF09\uFF0C\u6807\u7B7E\u56DE\u5230 15px\u3001\u89E6\u63A7\u884C 52px\u3002

       \u3010\u6574\u5757\u7531 html[data-dshbr-drilldown="ready"] \u95E8\u63A7\u3011
       \u672C\u5757\u9ED8\u8BA4\u628A\u5185\u5BB9\u533A\uFF08options\uFF09\u9690\u85CF\u3001\u53EA\u663E\u793A\u5206\u7C7B\u5217\u8868\uFF1B\u80FD\u4E0D\u80FD\u4ECE\u5217\u8868\u8D70\u8FDB\u5185\u5BB9\uFF0C\u5B8C\u5168
       \u53D6\u51B3\u4E8E client/index.js \u7684\u70B9\u51FB\u76D1\u542C\u5668\u3002\u6240\u4EE5\u672C\u5757\u4E0D\u80FD\u4EE5\u300CJS \u4E00\u5B9A\u5728\u300D\u4E3A\u65E0\u6761\u4EF6\u524D\u63D0\uFF1A
       \u5F00\u5173\u6CA1\u6253\u5F00\u65F6\u672C\u5757\u6574\u4F53\u60F0\u6027\uFF0C<=480px \u9000\u56DE 767 \u5757\u7684 88px \u56FE\u6807\u8F68\u9053\uFF08\u7A84\uFF0C\u4F46\u5206\u7C7B\u4E0E
       \u5185\u5BB9\u90FD\u5B8C\u6574\u53EF\u8FBE\uFF09\uFF0C\u4E0D\u4F1A\u51FA\u73B0\u300C\u5185\u5BB9\u88AB\u85CF\u4E86\u3001\u53C8\u6CA1\u4EBA\u80FD\u628A\u7528\u6237\u5E26\u8FDB\u53BB\u300D\u7684\u6B7B\u5217\u8868\u3002

       \u5F00\u5173\u4F55\u65F6\u6253\u5F00\uFF08client/index.js \u7684 setupSettingsDrilldown\uFF09\uFF1A
         - \u8BE5\u51FD\u6570\u662F apply() \u7684\u7B2C\u4E00\u6761\u8BED\u53E5\uFF0C\u65E9\u4E8E\u6CE8\u5165\u672C CSS \u7684 injectMobileStyles()\uFF1B
         - \u53EA\u6709 document.addEventListener('click', \u2026) \u6210\u529F\u8FD4\u56DE\u540E\u624D\u6253\u4E0A ready\u3002
       \u56E0\u6B64\u300C\u672C CSS \u5DF2\u751F\u6548\u3001\u800C\u70B9\u51FB\u76D1\u542C\u5668\u6CA1\u88C5\u4E0A\u300D\u5728\u53EF\u6267\u884C\u8DEF\u5F84\u4E0A\u4E0D\u53EF\u8FBE\uFF1B\u5373\u4F7F\u5C06\u6765\u6709\u4EBA\u628A
       \u8BE5\u8C03\u7528\u632A\u5230\u4F1A\u629B\u5F02\u5E38\u7684\u521D\u59CB\u5316\u4E4B\u540E\uFF0C\u5F00\u5173\u672A\u5F00\u4E5F\u53EA\u662F\u9000\u56DE\u8F68\u9053\u5E03\u5C40\u3002

       \u660E\u786E\u672A\u8986\u76D6\uFF1A\u65E0\u6CD5\u5728\u811A\u672C\u5185\u63A2\u6D4B\u300CaddEventListener \u88AB\u73AF\u5883\u9759\u9ED8\u4E22\u5F03\u300D\u8FD9\u7C7B\u5F02\u5E38 \u2014\u2014
       \u8981\u505A\u8FD9\u79CD\u81EA\u68C0\u5C31\u5FC5\u987B\u5728 document \u4E0A\u6D3E\u53D1\u5408\u6210 click\uFF0C\u800C\u5BBF\u4E3B\u4E0E\u7B2C\u4E09\u65B9\u63D2\u4EF6\u5408\u8BA1\u6709 6 \u4E2A
       document \u7EA7 click \u76D1\u542C\uFF08\u53E6\u6709\u591A\u7EC4 mousedown/pointerdown\uFF09\u4F1A\u88AB\u8BEF\u89E6\u53D1\uFF0C\u5F97\u4E0D\u507F\u5931\u3002
       \u63D2\u4EF6 JS \u5B8C\u5168\u4E0D\u6267\u884C\u65F6\u672C CSS \u4E5F\u4E0D\u4F1A\u6CE8\u5165\uFF0C\u540C\u6837\u4E0D\u4F1A\u85CF\u5185\u5BB9\u3002

       \u5F00\u5173\u653E\u5728 <html> \u800C\u975E panel\uFF1A\u76D1\u542C\u5668\u5FC5\u987B\u5728\u5F39\u7A97\u51FA\u73B0\u4E4B\u524D\u5C31\u88C5\u597D\uFF0C\u90A3\u65F6 panel \u8FD8\u4E0D\u5B58\u5728\u3002

       panel \u4E0A\u7684 data-dshbr-settings-view \u53EA\u8868\u8FBE\u300C\u5217\u8868\u9875 / \u8BE6\u60C5\u9875\u300D\uFF1A
         - \u65E0\u8BE5\u5C5E\u6027\uFF08\u542B\u5F00\u5173\u521A\u6253\u5F00\u7684\u9996\u5E27\uFF09\u2192 \u5206\u7C7B\u5217\u8868\u9875
         - "detail"                        \u2192 \u5185\u5BB9\u8BE6\u60C5\u9875 */
    @media (max-width: 480px) {
      /* \u9762\u677F\u7531 767 \u5757\u7684\u6A2A\u5411\u8F68\u9053\u5E03\u5C40\uFF08row\uFF09\u6539\u4E3A\u7EB5\u5411\uFF1A\u5217\u8868\u9875/\u8BE6\u60C5\u9875\u90FD\u662F\u4E0A\u4E0B\u7ED3\u6784\u3002
         \u6F0F\u6389\u8FD9\u4E00\u6761\u4F1A\u8BA9 nav \u4E0E content \u5E76\u6392\u62A2\u5BBD\u5EA6\uFF0C\u5206\u7C7B\u5217\u8868\u88AB\u538B\u6210 0 \u5BBD\uFF08\u5B9E\u6D4B options
         \u53EA\u5269 24px\uFF09\uFF0C\u662F\u672C\u65B9\u6848\u6700\u5BB9\u6613\u6F0F\u7684\u5173\u952E\u4E00\u6B65\u3002 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"] {
        flex-direction: column !important;
        /* \u2715 \u8981\u7EDD\u5BF9\u5B9A\u4F4D\u5230\u9762\u677F\u53F3\u4E0A\u89D2\uFF0C\u5FC5\u987B\u6709\u5B9A\u4F4D\u7956\u5148 */
        position: relative !important;
      }

      /* \u5173\u95ED\u6309\u94AE\u9489\u5728\u9762\u677F\u53F3\u4E0A\u89D2\uFF0C\u4E0E\u6807\u9898/\u8FD4\u56DE\u884C\u540C\u5904\u7B2C\u4E00\u884C \u2014\u2014 \u8FD9\u662F\u5F39\u7A97\u7684\u5E38\u89C4\u7EA6\u5B9A\u3002
         \u4E4B\u6240\u4EE5\u8981\u7EDD\u5BF9\u5B9A\u4F4D\uFF1A\u5BBF\u4E3B DOM \u91CC \u2715 \u5C5E\u4E8E content>header\uFF0C\u800C\u6807\u9898\u5C5E\u4E8E nav\uFF0C\u4E8C\u8005\u662F
         \u4E24\u68F5\u5B50\u6811\u3002\u6B64\u524D\u9760 order:-1 \u628A content \u63D0\u5230 nav \u4E4B\u524D\uFF0C\u7ED3\u679C \u2715 \u843D\u5728\u6807\u9898\u4E0A\u9762\u4E00\u884C\uFF1B
         \u8BE6\u60C5\u9875\u53CD\u8FC7\u6765\uFF0C\u2715 \u843D\u5230\u8FD4\u56DE\u884C\u4E0B\u9762\u4E00\u884C\u3002\u7EDD\u5BF9\u5B9A\u4F4D\u662F\u552F\u4E00\u80FD\u5728\u4E0D\u6CE8\u5165 DOM \u7684\u524D\u63D0\u4E0B
         \u628A\u4E24\u8005\u62C9\u56DE\u540C\u4E00\u884C\u7684\u529E\u6CD5\u3002 */
      html[data-dshbr-drilldown="ready"] button[class*="__F_SETTINGS__close"] {
        position: absolute !important;
        /* 40\xD740 \u89E6\u63A7\u533A\uFF08\u5BBF\u4E3B\u539F\u4E3A 28px\uFF09\uFF1A\u914D top/right 4px \u540E\u4E2D\u5FC3\u843D\u5728 y=24\uFF0C
           \u4E0E\u6807\u9898\u6587\u5B57\u4E2D\u5FC3\uFF08\u7EA6 23\uFF09\u57FA\u672C\u91CD\u5408\uFF1B\u53F3\u4FA7 4+40=44px \u7684\u5360\u4F4D\u4ECD\u5728\u6807\u9898 52px \u7559\u767D\u4E4B\u5185\u3002 */
        top: 4px !important;
        right: 4px !important;
        width: 40px !important;
        height: 40px !important;
        z-index: 5 !important;
      }

      /* \u5206\u7C7B\u5217\u8868\u9875\uFF1A\u5185\u5BB9\u533A\u53EA\u5269 header\uFF08\u5BBF\u4E3B/\u7B2C\u4E09\u65B9 action \u69FD\uFF09\uFF0C\u4E0B\u6C89\u4E3A\u5E95\u90E8\u52A8\u4F5C\u680F\u3002
         \u4E0D\u518D\u7528 order:-1 \u2014\u2014 \u6807\u9898\u56DE\u5230 DOM \u987A\u5E8F\u7684\u7B2C\u4E00\u884C\uFF0C\u987A\u5E26\u8BA9\u7126\u70B9\u987A\u5E8F\u4E0E\u89C6\u89C9\u987A\u5E8F\u4E00\u81F4\u3002 */
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

      /* \u8BE6\u60C5\u9875\uFF1A\u6298\u53E0\u5BFC\u822A\u4E3A\u300C\u2039 \u6807\u9898\u300D\u4E00\u884C\uFF0C\u5145\u5F53\u8FD4\u56DE\u5165\u53E3 */
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
      /* \u8BE6\u60C5\u9875\u4E5F\u628A\u52A8\u4F5C\u680F\u6C89\u5230\u5E95\u90E8\uFF0C\u4E0E\u5217\u8868\u9875\u4FDD\u6301\u4E00\u81F4\u3002
         \u7528 flex order \u4EA4\u6362 header/options \u7684\u89C6\u89C9\u4F4D\u7F6E\uFF1Aoptions \u4ECD\u662F\u90A3\u4E2A overflow:auto
         \u7684\u6EDA\u52A8\u5BB9\u5668\uFF0C\u6EDA\u52A8\u8BED\u4E49\u4E0D\u53D8\uFF08\u4E0D\u7528 column-reverse\uFF0C\u907F\u514D\u6EDA\u52A8\u539F\u70B9\u7FFB\u8F6C\uFF09\u3002 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] div[class*="__F_SETTINGS__header"] {
        order: 2 !important;
        border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb) !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__panel"][data-dshbr-settings-view="detail"] div[class*="__F_SETTINGS__options"] {
        order: 1 !important;
      }

      /* \u8F68\u9053\u5728\u7A84\u5C4F\u6539\u6210\u6574\u5BBD\u5217\u8868\u5BB9\u5668 */
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
        /* \u4E0D\u53EF\u6298\u884C\u7684\u8D85\u957F token\uFF08\u65E0\u7A7A\u683C\u957F\u4E32\uFF09\u4F1A\u6574\u5757\u6EA2\u51FA\u3001\u628A\u6587\u5B57\u9876\u5230 \u2715 \u4E0B\u9762\u3002
           \u72EC\u7ACB\u9A8C\u6536\u5B9E\u6D4B 81 \u5B57\u7B26\u65E0\u7A7A\u683C\u6807\u9898\u65F6\u6587\u5B57\u53F3\u7AEF 823px\u3001\u4E0E \u2715 \u4EA4\u53E0 707px\xB2\u3002
           overflow-wrap: anywhere \u8BA9\u8FD9\u79CD token \u4E5F\u80FD\u65AD\u884C \u2014\u2014 \u7559\u767D\u53EA\u7BA1\u76D2\u5185\uFF0C\u7BA1\u4E0D\u4F4F\u6EA2\u51FA\u3002 */
        overflow-wrap: anywhere !important;
        /* \u53F3\u4FA7 52px \u7ED9\u7EDD\u5BF9\u5B9A\u4F4D\u7684 \u2715 \u8BA9\u4F4D\uFF08\u7D27\u90BB\u89C4\u5219\u91CC\u7684\u58F0\u660E\u4F1A\u88AB\u540E\u7F6E\u540C\u540D\u89C4\u5219\u8986\u76D6\uFF0C
           \u6240\u4EE5\u7559\u767D\u5FC5\u987B\u5199\u5728\u8FD9\u4E00\u6761\u4E0A\uFF0C\u4E0D\u80FD\u53EA\u5199\u5728\u524D\u9762\u90A3\u6761\uFF09 */
        padding: 0 52px 4px 4px !important;
      }
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__navList"] {
        flex-direction: column !important;
        gap: 2px !important;
        width: 100% !important;
        min-width: 0 !important;
      }

      /* \u5217\u8868\u884C\uFF1A\u56FE\u6807\u5DE6\u3001\u6587\u5B57\u53F3\u3001\u884C\u5C3E \u203A \u6307\u793A */
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

      /* \u8BE6\u60C5\u9875\u8FD4\u56DE\u884C\uFF1A\u2039 \u7BAD\u5934 + \u6807\u9898 */
      /* \u8BE6\u60C5\u9875\u8FD4\u56DE\u884C\uFF1A\u2039 \u7BAD\u5934 + \u6807\u9898\u3002\u53F3\u4FA7\u540C\u6837\u8981\u7559 52px \u7ED9 \u2715 \u2014\u2014
         \u672C\u6761\u6BD4\u57FA\u7C7B\u591A\u4E00\u4E2A\u5C5E\u6027\u9009\u62E9\u5668\u3001\u7279\u5F02\u6027\u66F4\u9AD8\uFF0C\u4F1A**\u6574\u4F53\u8986\u76D6**\u57FA\u7C7B\u7684 padding\uFF0C
         \u6240\u4EE5\u7559\u767D\u5FC5\u987B\u5728\u8FD9\u91CC\u518D\u5199\u4E00\u904D\uFF08\u6F0F\u5199\u65F6\u57FA\u7C7B\u7684 52px \u4F1A\u88AB\u8FD9\u6761\u7684 4px \u9876\u6389\uFF0C
         \u957F\u6807\u9898\u4F1A\u94BB\u5230 \u2715 \u4E0B\u9762\uFF1B\u72EC\u7ACB\u9A8C\u6536\u5B9E\u6D4B\u6CE8\u5165 61 \u5B57\u7B26\u6807\u9898\u540E\u4EA4\u53E0 608/707 px\xB2\uFF09\u3002 */
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

      /* content/header \u5FC5\u987B\u662F static \u2014\u2014 \u2715 \u662F\u7EDD\u5BF9\u5B9A\u4F4D\u7684\uFF0C\u5B83\u7684\u5305\u542B\u5757\u53D6\u51B3\u4E8E\u6700\u8FD1\u7684**\u5B9A\u4F4D\u7956\u5148**\u3002
         \u672C\u6765\u8FD9\u4E2A\u7956\u5148\u5C31\u662F panel\uFF08\u5BBF\u4E3B\u81EA\u5E26 position:relative\uFF09\uFF1B\u4F46\u4E00\u65E6 content \u6216 header \u88AB
         \u4EFB\u4F55\u6765\u6E90\uFF08\u672C\u5757\u3001\u5BBF\u4E3B\u5176\u5B83\u89C4\u5219\u3001\u7B2C\u4E09\u65B9\u63D2\u4EF6\uFF09\u8BBE\u6210 relative/absolute\uFF0C\u5305\u542B\u5757\u5C31\u4F1A\u4E0B\u79FB\uFF0C
         \u2715 \u4F1A\u4ECE\u9762\u677F\u53F3\u4E0A\u89D2\u8DD1\u5230\u5185\u5BB9\u533A\u91CC\u53BB\u3002\u72EC\u7ACB\u9A8C\u6536\u5B9E\u6D4B\uFF1A\u7ED9 content \u52A0 position:relative \u540E
         \u2715 \u7684 relTop \u7531 9 \u53D8\u6210 579\u3001\u5E76\u4E0E\u5E95\u90E8\u52A8\u4F5C\u680F\u91CD\u53E0 837 px\xB2\u3002 */
      html[data-dshbr-drilldown="ready"] div[class*="__F_SETTINGS__content"] {
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        flex: 1 1 auto !important;
      }
      /* header \u4E0D\u518D\u5F53\u9876\u680F\u7528\uFF1A\u5B83\u73B0\u5728\u53EA\u627F\u8F7D action \u69FD\uFF0C\u9AD8\u5EA6\u968F\u5185\u5BB9\uFF08\u53EF\u80FD\u662F\u5BBF\u4E3B\u7684\u4E00\u4E2A
         \u6309\u94AE\uFF0C\u4E5F\u53EF\u80FD\u662F\u591A\u4E2A\u63D2\u4EF6\u6CE8\u5165\u7684\u591A\u884C\u6309\u94AE\uFF09\uFF0C\u9760 flex \u81EA\u7136\u6491\u5F00\uFF0C\u4E0D\u8BBE\u56FA\u5B9A\u9AD8\u5EA6\u3002 */
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

    /* \u8FDC\u7A0B\u5DE5\u4F5C\u533A\u9009\u62E9\u5F39\u7A97\u79FB\u52A8\u7AEF/\u684C\u9762\u7AEF\u81EA\u9002\u5E94\u6837\u5F0F */
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

    /* \u6DF1\u8272\u6A21\u5F0F\u9002\u914D\u5DF2\u8FC1\u79FB\u5230 client/theme-tokens.js \u5E76\u6539\u4E3A**\u65E0\u6761\u4EF6\u6CE8\u5165**\uFF1A
       \u539F\u6765\u8FD9\u4E24\u5757\u5728\u8FD9\u91CC\uFF0C\u800C injectMobileStyles() \u4F1A\u5728 __TAURI__ / __DSH_DESKTOP__ /
       \u5916\u90E8\u54CD\u5E94\u5F0F\u63D2\u4EF6\u5B58\u5728\u65F6\u76F4\u63A5 return\uFF0C\u5BFC\u81F4\u684C\u9762\u7AEF Shell \u4E0B\u6DF1\u8272\u8865\u4E01\u4ECE\u672A\u751F\u6548\u3002
       \u8FD9\u91CC\u4E0D\u518D\u91CD\u590D\u5B9A\u4E49\uFF0C\u907F\u514D\u4E24\u5904\u7248\u672C\u6F02\u79FB\u3002 */

    @media (min-width: 768px) {
      .dsh-mobile-app-header,
      .dsh-mobile-backdrop,
      .dsh-mobile-panel-close-btn {
        display: none !important;
      }
    }
`;

// client/theme-tokens.js
var THEME_TOKENS_CSS = `
  /* \u6DF1\u8272\uFF1A\u544A\u8B66\u9762 / \u8FB9\u6846 / info \u4E0E danger \u8865\u8272\uFF08DSH \u672A\u5B9A\u4E49\uFF0C\u9760 fallback \u4F1A\u6C38\u8FDC\u62FF\u5230\u6D45\u8272\uFF09 */
  body[data-ds-dark-theme] {
    --dsw-alias-state-info-bg: rgba(65, 118, 230, 0.12);
    --dsw-alias-state-info-border: rgba(65, 118, 230, 0.25);
    --dsw-alias-state-success-bg: rgba(34, 197, 94, 0.12);
    --dsw-alias-state-success-border: rgba(34, 197, 94, 0.25);
    --dsw-alias-state-warn-bg: rgba(245, 158, 11, 0.12);
    --dsw-alias-state-warn-border: rgba(245, 158, 11, 0.25);
    --dsw-alias-state-error-bg: rgba(239, 68, 68, 0.12);
    --dsw-alias-state-error-border: rgba(239, 68, 68, 0.25);
    --dsw-alias-state-info-primary: #60a5fa;
    --dsw-alias-state-danger-bg: rgba(239, 68, 68, 0.12);
    --dsw-alias-state-danger-primary: #f87171;
    --dsw-alias-border-secondary: #3c3c3d;
  }

  /* \u6DF1\u8272\u6A21\u5F0F\uFF1A\u76F4\u63A5\u8986\u76D6\u5F39\u7A97\u5185\u6240\u6709\u4F7F\u7528 #fff/#ffffff fallback \u7684\u5185\u8054\u80CC\u666F\uFF0C
     \u786E\u4FDD\u5373\u4F7F CSS \u53D8\u91CF\u672A\u6B63\u786E\u7EE7\u627F\uFF0C\u5F39\u7A97\u4E5F\u4E0D\u4F1A\u663E\u793A\u767D\u8272\u80CC\u666F */
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
`;

// client/host-families.js
var ABSENT_FAMILY = "__dshbr_absent_family";
var FAMILY_TOKEN_RE = /__F_([A-Z][A-Z0-9_]*)__/g;
var norm = (v) => typeof v === "string" ? v.trim() : "";
function classListOf(el) {
  if (!el || !el.classList) return [];
  try {
    return [...el.classList];
  } catch {
    return [];
  }
}
function familyFromClasses(classes, local) {
  const name2 = norm(local);
  if (!name2 || !Array.isArray(classes)) return null;
  const suffix = `_${name2}`;
  for (const token of classes) {
    if (typeof token !== "string") continue;
    if (token.length <= suffix.length) continue;
    if (!token.endsWith(suffix)) continue;
    return token.slice(0, token.length - suffix.length);
  }
  return null;
}
function buildClassIndex(doc) {
  let nodes;
  try {
    nodes = doc?.querySelectorAll?.("[class]");
  } catch {
    return null;
  }
  if (!nodes || !nodes.length) return null;
  const index = /* @__PURE__ */ new Map();
  for (const el of nodes) {
    for (const token of classListOf(el)) {
      const cut = token.lastIndexOf("_");
      if (cut <= 0) continue;
      const family = token.slice(0, cut);
      const local = token.slice(cut + 1);
      let locals = index.get(family);
      if (!locals) {
        locals = /* @__PURE__ */ new Set();
        index.set(family, locals);
      }
      locals.add(local);
    }
  }
  return index.size ? index : null;
}
function familyHits(doc, family, locals, index) {
  if (!family || !locals || !locals.length) return false;
  if (index) {
    const present = index.get(family);
    return !!present && locals.some((local) => present.has(local));
  }
  for (const local of locals) {
    try {
      if (doc.querySelector(`[class*="${family}_${local}"]`)) return true;
    } catch {
      return false;
    }
  }
  return false;
}
function familyPresent(doc, family, index) {
  if (!family) return false;
  if (index) return index.has(family);
  try {
    return !!doc.querySelector(`[class*="${family}_"]`);
  } catch {
    return false;
  }
}
var aria = (re) => (doc) => {
  const nodes = doc.querySelectorAll?.("[aria-label]") ?? [];
  for (const el of nodes) if (re.test(el.getAttribute("aria-label") || "")) return el;
  return null;
};
var settingsPanel = (doc) => {
  const panels = doc.querySelectorAll?.('div[role="dialog"]') ?? [];
  for (const p of panels) {
    try {
      if (p.querySelector(":scope > nav")) return p;
    } catch {
    }
  }
  return null;
};
var closestClass = (el, local) => {
  let cur = el;
  while (cur && cur !== el.ownerDocument?.body) {
    if (familyFromClasses(classListOf(cur), local)) return cur;
    cur = cur.parentElement;
  }
  return null;
};
var composerCard = (doc) => {
  const direct = doc.querySelector?.('[data-composer-card="true"]');
  if (direct) return direct;
  const input = doc.querySelector?.('[data-composer-input="true"]') || doc.querySelector?.('div[role="textbox"], textarea');
  return input ? closestClass(input, "card") || input : null;
};
var FAMILY_SLOTS = {
  // 设置中心弹窗（手机端样式失效的主战场）
  SETTINGS: {
    critical: true,
    locals: ["overlay", "panel", "nav", "navList", "navCell", "navLabel", "navTitle", "options", "content", "close", "header"],
    known: ["wCInkW", "VOzbGW"],
    anchors: [{ local: "panel", find: settingsPanel }]
  },
  // 对话区：头部标题行、面包屑、滚动体、输入座
  CONV: {
    locals: ["header", "titleRow", "headerActions", "headerUtilities", "crumbs", "scrollBody", "viewArea", "composerSeat"],
    known: ["Dc7zOa", "wSkVaW"],
    anchors: [{ local: "header", find: (doc) => doc.querySelector?.('div[class*="_centerCol"] header') || null }]
  },
  // 输入卡片（卡片本体 / 底部工具行 / 模式区 / 尾随区）
  COMPOSER: {
    locals: ["card", "row", "tools", "modes", "trailing", "overlayAnchor"],
    known: ["RlGAzG", "uV2eYG"],
    anchors: [{ local: "card", find: composerCard }]
  },
  // 左侧边栏（抽屉化的对象）
  SIDEBAR: {
    locals: ["root", "logoRow", "toggle", "collapsed", "newSession", "regionArea"],
    known: ["_2H3hWW", "hHd-Xa"],
    anchors: [{
      local: "root",
      find: (doc) => {
        const btn = aria(/新建会话|New session/)(doc);
        return btn ? closestClass(btn, "root") : null;
      }
    }]
  },
  // 工作区列表轨道（搜索/视图选项/列表区）
  WS: {
    locals: ["root", "searchButton", "listArea", "rail"],
    known: ["_9lTDKa", "qDHVXG"],
    anchors: [{ local: "searchButton", find: aria(/搜索会话|Search sessions/) }]
  },
  // 模型选择器
  MODEL: {
    locals: ["root", "trigger", "triggerLabel"],
    known: ["wq12jW", "_7KE1Ra"],
    anchors: [{ local: "trigger", find: aria(/选择模型|Select model|模型/) }]
  },
  // 访问模式选择器
  ACCESS: {
    locals: ["trigger"],
    known: ["dlU_AG", "Sh0Q9G"],
    anchors: [{ local: "trigger", find: aria(/访问模式|Access mode/) }]
  },
  // Agent 预设胶囊（本地名历代不一：seat / trigger 都收）
  PRESET: {
    locals: ["seat", "trigger", "menu"],
    known: ["_oGoKq", "cubgiG", "h8S2Va"],
    anchors: [{ local: "seat", find: aria(/Agent 预设|Agent preset/) }]
  },
  // 会话日志导出按钮
  LOG: {
    locals: ["sessionLogButton"],
    known: ["nL4_yW"],
    anchors: [{ local: "sessionLogButton", find: aria(/Session Log|会话日志|导出|Export/i) }]
  },
  // Workbench 面板 / Tab 栏（0.2.0 起改为 dockkit，本地名未采全，故只保留基线 + 无锚点）
  WB: {
    locals: ["panel", "tabBar", "tabList", "tab", "tabActive", "tabTitle", "tabClose", "tabBarPlus"],
    known: ["nArs4W"],
    anchors: []
  },
  // 折叠簇容器（本地名 `toggleCluster` 历代不变，但族哈希只在 0.1.x 采到过）
  TOGGLE: {
    locals: ["toggleCluster"],
    known: ["W-zNGW"],
    anchors: [{ local: "toggleCluster", find: (doc) => doc.querySelector?.('div[class*="toggleCluster"]') || null }]
  }
};
function criticalSettingsHit(doc, family) {
  const probes = [
    `div[class*="${family}_panel"]`,
    `nav[class*="${family}_nav"]`,
    `div[class*="${family}_options"]`,
    `div[class*="${family}_overlay"]`
  ];
  for (const sel of probes) {
    try {
      if (doc.querySelector(sel)) return true;
    } catch {
      return false;
    }
  }
  return false;
}
function resolveHostFamilies(doc = globalThis.document, slots = FAMILY_SLOTS) {
  const families = {};
  const sources = {};
  const missing = [];
  const unverified = [];
  const index = buildClassIndex(doc);
  for (const [slot, spec] of Object.entries(slots || {})) {
    let family = null;
    let source = null;
    for (const anchor of spec.anchors ?? []) {
      let el;
      try {
        el = anchor.find(doc);
      } catch {
        el = null;
      }
      const found = familyFromClasses(classListOf(el), anchor.local);
      if (found) {
        family = found;
        source = "detected";
        break;
      }
    }
    if (!family) {
      for (const cand of spec.known ?? []) {
        if (familyHits(doc, cand, spec.locals, index)) {
          family = cand;
          source = "known";
          break;
        }
      }
    }
    if (!family) {
      for (const cand of spec.known ?? []) {
        if (familyPresent(doc, cand, index)) {
          family = cand;
          source = "known-weak";
          break;
        }
      }
    }
    if (!family) {
      const cand = norm((spec.known ?? [])[0]);
      if (cand) {
        family = cand;
        source = "assumed";
        unverified.push(slot);
      } else {
        family = ABSENT_FAMILY;
        source = "absent";
        missing.push(slot);
      }
    }
    families[slot] = family;
    sources[slot] = source;
  }
  const mounted = (() => {
    try {
      return !!settingsPanel(doc);
    } catch {
      return false;
    }
  })();
  const settingsOk = families.SETTINGS && families.SETTINGS !== ABSENT_FAMILY && (!mounted || criticalSettingsHit(doc, families.SETTINGS));
  const degraded = !settingsOk;
  const compat = degraded ? "degraded" : unverified.length || missing.length ? "partial" : "ok";
  return { families, sources, missing, unverified, degraded, compat, settingsMounted: mounted };
}
function renderMobileStyles(template, families = {}) {
  return String(template ?? "").replace(FAMILY_TOKEN_RE, (_all, slot) => {
    const fam = norm(families[slot]);
    return `${fam || ABSENT_FAMILY}_`;
  });
}
function familiesSignature(families = {}) {
  return Object.keys(families).sort().map((k) => `${k}=${families[k]}`).join("|");
}
function watchHostFamilies(onChange, opts = {}) {
  const doc = opts.doc ?? globalThis.document;
  const slots = opts.slots ?? FAMILY_SLOTS;
  const debounceMs = opts.debounceMs ?? 120;
  if (!doc || typeof doc.addEventListener !== "function" || typeof MutationObserver === "undefined") {
    return () => {
    };
  }
  let timer = null;
  const run = () => {
    timer = null;
    onChange(resolveHostFamilies(doc, slots));
  };
  const observer = new MutationObserver(() => {
    if (timer) return;
    timer = setTimeout(run, debounceMs);
  });
  observer.observe(doc.documentElement ?? doc.body, { childList: true, subtree: true });
  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
    observer.disconnect();
  };
}

// client/panel-locales.mjs
var panelEn = {
  "\u8FD0\u884C\u4E2D": "Running",
  "\u672A\u542F\u52A8": "Not started",
  "\u5DF2\u8FDE\u63A5": "Connected",
  "\u4E0B\u8F7D\u4E2D\u2026": "Downloading\u2026",
  "\u8FDE\u63A5\u4E2D\u2026": "Connecting\u2026",
  "\u81EA\u52A8\u91CD\u8FDE\u4E2D\u2026": "Reconnecting\u2026",
  "\u6682\u505C\u4E2D": "Paused",
  "\u5F02\u5E38": "Error",
  "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u914D\u7F6E": "Click to open Security settings",
  "\u{1F6E1}\uFE0F \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u751F\u6548 \xB7 \u626B\u7801\u8BBE\u5907\u514D\u5BC6": "\u{1F6E1}\uFE0F Access protection is on \xB7 QR devices skip the password",
  "\u8BBE\u7F6E \u2794": "Settings \u2794",
  "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u5F00\u542F\u8BBF\u95EE\u4FDD\u62A4": "Click to enable access protection in \u201CSecurity\u201D",
  "\u26A0\uFE0F \u5F53\u524D\u672A\u5F00\u542F\u8BBF\u95EE\u8BA4\u8BC1\uFF0C\u5EFA\u8BAE\u5728\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u5F00\u542F\u5BC6\u7801\u6216\u626B\u7801\u4FDD\u62A4\u3002": "\u26A0\uFE0F Access protection is off. Enable a password or QR protection under \u201CSecurity\u201D.",
  "\u53BB\u5F00\u542F \u2794": "Enable \u2794",
  "\u2713 \u5DF2\u590D\u5236": "\u2713 Copied",
  "\u590D\u5236\u94FE\u63A5": "Copy link",
  "\u9690\u85CF\u4E8C\u7EF4\u7801": "Hide QR code",
  "\u663E\u793A\u4E8C\u7EF4\u7801": "Show QR code",
  "\u8BF7\u5728\u79C1\u5BC6\u73AF\u5883\u4E0B\u4F7F\u7528": "Use in a private environment",
  "\u{1F4F1} \u63D0\u793A\uFF1A\u624B\u673A\u6D4F\u89C8\u5668\u626B\u7801\u6253\u5F00\u540E\uFF0C\u5728\u83DC\u5355\u70B9\u51FB\u300C\u6DFB\u52A0\u5230\u4E3B\u5C4F\u5E55\u300D\u5373\u53EF\u4F5C\u4E3A\u72EC\u7ACB\u5168\u5C4F App \u8FD0\u884C\u3002": "\u{1F4F1} Tip: after scanning with your phone, tap \u201CAdd to Home Screen\u201D in the browser menu to run it as a standalone full-screen app.",
  "\u5173\u95ED\u96A7\u9053\u5E76\u91CD\u65B0\u5F00\u542F\uFF0C\u53EF\u83B7\u5F97\u65B0\u7684 URL": "Stop and restart the tunnel to get a new URL",
  "\u{1F504} \u91CD\u7F6E\u94FE\u63A5": "\u{1F504} Reset link",
  "\u{1F6DC} \u5C40\u57DF\u7F51\u7F51\u5361 / IP \u9009\u62E9": "\u{1F6DC} LAN adapter / IP selection",
  "\u5207\u6362\u4E2D\u2026": "Switching\u2026",
  "\u68C0\u6D4B\u5230\u4E3B\u673A\u5B58\u5728\u591A\u5F20\u7F51\u5361\uFF08\u5982\u7269\u7406 Wi-Fi\u3001\u4EE5\u592A\u7F51\u3001WSL \u6216\u865A\u62DF\u673A\uFF09\u3002\u82E5\u9ED8\u8BA4 IP \u65E0\u6CD5\u88AB\u79FB\u52A8\u7AEF\u8BBF\u95EE\uFF0C\u53EF\u624B\u52A8\u5207\u6362\uFF1A": "Multiple network adapters detected (e.g. Wi-Fi, Ethernet, WSL or a VM). If the default IP is unreachable from your phone, switch manually:",
  "${address} \xB7 ${name} [\u865A\u62DF/WSL]": "${address} \xB7 ${name} [virtual/WSL]",
  "\u67E5\u770B\u81EA\u5EFA\u96A7\u9053\u670D\u52A1\u5668\u642D\u5EFA\u6559\u7A0B": "View the self-hosted tunnel server guide",
  "\u516C\u7F51\u8BBF\u95EE\u5165\u53E3": "Public access entry",
  "\u5C1A\u672A\u914D\u7F6E\u4EFB\u4F55\u516C\u7F51\u96A7\u9053\uFF0C\u53EF\u5728\u4E0B\u65B9\u5F00\u542F Cloudflare \u96A7\u9053\u6216\u914D\u7F6E\u81EA\u5EFA\u96A7\u9053": "No public tunnel configured yet \u2014 enable the Cloudflare tunnel below or set up a self-hosted tunnel.",
  "\u590D\u5236": "Copy",
  "\u505C\u6B62\u91CD\u8FDE": "Stop reconnecting",
  "\u5173\u95ED": "Close",
  "\u5173\u95ED\u5E76\u91CD\u65B0\u5F00\u542F\uFF0C\u66F4\u6362\u4E34\u65F6\u5730\u5740": "Stop and restart to get a new temporary address",
  "\u8BF7\u5148\u5728\u300C\u96A7\u9053\u914D\u7F6E\u300D\u4E2D\u4FDD\u5B58\u670D\u52A1\u5668\u914D\u7F6E": "Save the server configuration under \u201CTunnel configuration\u201D first",
  "\u5F00\u542F\u516C\u7F51\u96A7\u9053": "Enable public tunnel",
  "\u8BF7\u5728\u79C1\u5BC6\u73AF\u5883\u4E0B\u626B\u7801\u4F7F\u7528": "Scan in a private environment",
  "DSH \u542F\u52A8\u65F6\u81EA\u52A8\u6062\u590D\u8BE5\u96A7\u9053\u7684\u8FD0\u884C\u72B6\u6001": "Restore this tunnel automatically when DSH starts",
  "\u968F DSH \u542F\u52A8\u81EA\u52A8\u5F00\u542F": "Start automatically with DSH",
  "\u96A7\u9053\u914D\u7F6E": "Tunnel configuration",
  "Token \xB7 \u56FA\u5B9A\u57DF\u540D \xB7 \u81EA\u5EFA\u670D\u52A1\u5668 \xB7 \u5916\u90E8\u767B\u8BB0": "Token \xB7 fixed domain \xB7 self-hosted server \xB7 external registration",
  "\u6536\u8D77 \u25B4": "Collapse \u25B4",
  "\u5C55\u5F00 \u25BE": "Expand \u25BE",
  "\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25": "Failed to save configuration",
  "\u96A7\u9053\u670D\u52A1\u5668\u914D\u7F6E": "Tunnel server configuration",
  "WebSocket \u5730\u5740\uFF0C\u4F8B\u5982 wss://tunnel.example.com/connect": "WebSocket URL, e.g. wss://tunnel.example.com/connect",
  "\u96A7\u9053\u670D\u52A1\u7AEF\u8FDE\u63A5\u4EE4\u724C\uFF08Tunnel Access Token\uFF09": "Tunnel server access token",
  "\u{1F4A1} \u7528\u4E8E\u4E0E\u60A8\u7684 VPS \u96A7\u9053\u670D\u52A1\u7AEF\u5EFA\u7ACB\u53CD\u5411\u901A\u9053\uFF08\u4E0E Web \u7F51\u9875\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u4E92\u76F8\u72EC\u7ACB\uFF09\u3002": "\u{1F4A1} Used to open a reverse channel to your VPS tunnel server (independent of the visitor access password).",
  "\u4FDD\u5B58\u4E2D\u2026": "Saving\u2026",
  "\u2713 \u5DF2\u4FDD\u5B58": "\u2713 Saved",
  "\u4FDD\u5B58\u914D\u7F6E": "Save configuration",
  "\u8BF7\u5148\u4FDD\u5B58\u670D\u52A1\u5668\u914D\u7F6E": "Save the server configuration first",
  "\u5F00\u542F": "Enable",
  "\u2705 \u6570\u636E\u9762\u6B63\u5E38\uFF08\u6BCF 60s \u63A2\u6D4B\u516C\u7F51\u5165\u53E3${ip}\uFF09": "\u2705 Data plane healthy (public entry probed every 60s${ip})",
  "\u26A0\uFE0F \u6570\u636E\u9762\u95F4\u6B47\u5931\u8D25\uFF08\u8FDE\u7EED ${count} \u6B21\uFF09\uFF1A${reason}": "\u26A0\uFE0F Data plane failing intermittently (${count} in a row): ${reason}",
  "\u539F\u56E0\u672A\u77E5": "Unknown cause",
  "\u274C \u6570\u636E\u9762\u4E0D\u53EF\u8FBE\uFF08\u8FDE\u7EED ${count} \u6B21\uFF09\uFF1A${reason}": "\u274C Data plane unreachable (${count} in a row): ${reason}",
  "\u6570\u636E\u9762\u63A2\u6D4B\uFF1A${reason}": "Data plane probe: ${reason}",
  "\u26A0\uFE0F \u68C0\u6D4B\u5230\u53E6\u4E00\u4E2A cloudflared\uFF08PID ${pid}\uFF0C\u51ED\u636E\u6765\u6E90 --${via}\uFF09\u6B63\u5728\u4F7F\u7528\u76F8\u540C\u7684 tunnel token\uFF1A\u96A7\u9053\u72B6\u6001\u53EF\u80FD\u53EA\u53CD\u6620\u4E00\u534A\uFF0C\u8BF7\u505C\u7528\u5176\u4E2D\u4E00\u4FA7": "\u26A0\uFE0F Another cloudflared (PID ${pid}, credentials via --${via}) is using the same tunnel token: the status may only reflect half the picture \u2014 stop one of them.",
  "\u7CFB\u7EDF\u5B89\u88C5\uFF08\u4E0D\u53C2\u4E0E\u7248\u672C\u9489\u6B7B\uFF09": "System installation (version not pinned)",
  "\u63D2\u4EF6\u5185\u7F6E": "Bundled with the plugin",
  "\u5916\u90E8\u6307\u5B9A": "Externally specified",
  "\u7248\u672C\u672A\u77E5": "Version unknown",
  "\u7F51\u7EDC\u534F\u8BAE": "Network protocol",
  "\u9ED8\u8BA4\uFF08auto\uFF09": "Default (auto)",
  "\u5F3A\u5236 QUIC": "Force QUIC",
  "\u5F3A\u5236 HTTP/2": "Force HTTP/2",
  "\u8FB9\u7F18 IP": "Edge IP",
  "\u9ED8\u8BA4\uFF084\uFF09": "Default (4)",
  "\u81EA\u52A8\uFF08auto\uFF09": "Auto",
  "\u8FB9\u7F18\u533A\u57DF": "Edge region",
  "\u5168\u7403\uFF08\u9ED8\u8BA4\uFF09": "Global (default)",
  "\u7F8E\u56FD\uFF08us\uFF09": "United States (us)",
  "\u2713 \u56FA\u5B9A\u57DF\u540D\u914D\u7F6E\u5DF2\u4FDD\u5B58": "\u2713 Fixed-domain configuration saved",
  "\u4FDD\u5B58\u5931\u8D25": "Save failed",
  "\u2699\uFE0F \u9AD8\u7EA7\u914D\u7F6E\uFF1A\u56FA\u5B9A\u57DF\u540D (Cloudflare Token) ": "\u2699\uFE0F Advanced: fixed domain (Cloudflare Token) ",
  "\u25CF \u5DF2\u914D\u7F6E\u56FA\u5B9A\u57DF\u540D": "\u25CF Fixed domain configured",
  "\u25B4 \u6298\u53E0": "\u25B4 Collapse",
  "\u25BE \u5C55\u5F00": "\u25BE Expand",
  "\u5728 Cloudflare Zero Trust \u63A7\u5236\u53F0\u521B\u5EFA Tunnel \u5373\u53EF\u83B7\u53D6\u4E13\u5C5E Token \u5E76\u7ED1\u5B9A\u81EA\u5DF1\u7684\u57DF\u540D\uFF08\u5982 dsh.yourname.com\uFF09\uFF0C\u6BCF\u6B21\u91CD\u542F URL \u6C38\u4E0D\u53D8\u66F4\u3002\u4E0D\u586B\u5219\u4F7F\u7528\u9ED8\u8BA4\u514D\u767B\u5F55\u4E34\u65F6\u968F\u673A\u57DF\u540D\u3002": "Create a Tunnel in the Cloudflare Zero Trust dashboard to get a dedicated Token and bind your own domain (e.g. dsh.yourname.com); the URL then stays the same across restarts. Leave empty to use the default random temporary domain without login.",
  "\u{1F4D6} \u67E5\u770B\u300CCloudflare \u56FA\u5B9A\u57DF\u540D\u300D\u7533\u8BF7\u4E0E\u914D\u7F6E\u6559\u7A0B": "\u{1F4D6} Read the \u201CCloudflare fixed domain\u201D setup guide",
  "\u81EA\u5B9A\u4E49\u56FA\u5B9A\u57DF\u540D (\u4F8B\u5982: dsh.yourdomain.com)": "Custom fixed domain (e.g. dsh.yourdomain.com)",
  "Tunnel Token (\u4F8B\u5982: eyJhIjoi...)": "Tunnel Token (e.g. eyJhIjoi...)",
  "\u7F51\u7EDC\u53C2\u6570\u53D6\u503C\u6765\u81EA Cloudflare \u5B98\u65B9\u767D\u540D\u5355\uFF1B\u6539\u52A8\u9700\u91CD\u65B0\u5F00\u542F\u96A7\u9053\uFF08\u5173\u95ED\u2192\u5F00\u542F\uFF09\u540E\u751F\u6548\uFF0C\u5F53\u524D\u4E8C\u8FDB\u5236\u4E0D\u652F\u6301\u7684\u53C2\u6570\u4F1A\u81EA\u52A8\u8DF3\u8FC7\u5E76\u5728\u65E5\u5FD7\u544A\u8B66\u3002": "Network parameters come from Cloudflare's official whitelist; changes take effect after restarting the tunnel (stop \u2192 start). Parameters unsupported by the current binary are skipped with a log warning.",
  "\u4FDD\u5B58\u56FA\u5B9A\u57DF\u540D\u914D\u7F6E": "Save fixed-domain configuration",
  "\u6E05\u9664": "Clear",
  "\u2713 \u5916\u90E8\u96A7\u9053\u5730\u5740\u5DF2\u767B\u8BB0": "\u2713 External tunnel address registered",
  "\u2713 \u5DF2\u6E05\u9664\u767B\u8BB0": "\u2713 Registration cleared",
  "\u5916\u90E8\u5DF2\u90E8\u7F72\u96A7\u9053": "Externally deployed tunnel",
  "\u5DF2\u5728 Docker / \u670D\u52A1\u5668\u4E0A\u81EA\u884C\u90E8\u7F72\u96A7\u9053\uFF08\u5982 cloudflared\uFF09\u65F6\uFF0C\u767B\u8BB0\u516C\u7F51\u5730\u5740\u5373\u53EF\u5728\u9762\u677F\u5C55\u793A\u5165\u53E3\u4E0E\u4E8C\u7EF4\u7801\uFF1B\u63D2\u4EF6\u4E0D\u4F1A\u91CD\u590D\u4E0B\u8F7D\u6216\u7BA1\u7406\u8BE5\u96A7\u9053\u3002": "If you already run a tunnel yourself (e.g. cloudflared in Docker or on a server), register its public URL to show the entry and QR code here; the plugin will not download or manage it.",
  "https://tunnel.yourdomain.com \u6216 trycloudflare \u5730\u5740": "https://tunnel.yourdomain.com or a trycloudflare address",
  "\u4FDD\u5B58": "Save",
  "\u300C\u4EC5\u5BC6\u7801 / PIN \u7801\u767B\u5F55\u300D\u6A21\u5F0F\u5FC5\u987B\u5148\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\u624D\u80FD\u5F00\u542F\u5B89\u5168\u9632\u62A4\u3002\n\n\u8BF7\u5148\u5728\u4E0B\u65B9\u300C\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 / PIN \u7801\u300D\u8F93\u5165\u5BC6\u7801\u5E76\u70B9\u51FB\u300C\u4FDD\u5B58\u8BBF\u95EE\u5BC6\u7801\u300D\uFF0C\u7136\u540E\u518D\u5F00\u542F\u3002": "\u201CPassword / PIN only\u201D mode needs an access password before protection can be enabled.\n\nSet one below under \u201CExternal visitor access password / PIN\u201D, click \u201CSave access password\u201D, then enable it.",
  "\u8BF7\u5148\u8BBE\u7F6E\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\uFF0C\u518D\u5F00\u542F\u5B89\u5168\u9632\u62A4": "Set a visitor access password before enabling protection",
  '\u26A0\uFE0F \u60A8\u5C1A\u672A\u8BBE\u7F6E\u4EFB\u4F55\u8BBF\u95EE\u5BC6\u7801\u6216\u7BA1\u7406\u5BC6\u7801\u3002\n\n\u5F00\u542F\u5B89\u5168\u9632\u62A4\u540E\uFF0C\u4EFB\u4F55\u77E5\u9053\u5C40\u57DF\u7F51 IP / \u96A7\u9053\u5730\u5740\u7684\u8BBF\u5BA2\u4ECD\u53EF\u76F4\u63A5\u8FDB\u5165\uFF08\u5F53\u524D\u76F8\u5F53\u4E8E"\u514D\u5BC6\u5F00\u653E"\u72B6\u6001\uFF09\u3002\n\n\u662F\u5426\u4ECD\u8981\u5F00\u542F\uFF1F\u5EFA\u8BAE\u5148\u5173\u95ED\uFF0C\u5728\u4E0B\u65B9\u300C\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u300D\u5904\u8BBE\u7F6E\u5BC6\u7801\u540E\u518D\u5F00\u542F\u3002': "\u26A0\uFE0F You have not set any access or admin password yet.\n\nWith protection enabled, anyone who knows the LAN IP / tunnel address can still get in (currently equivalent to \u201Copen, no password\u201D).\n\nEnable anyway? It is better to set a password below under \u201CExternal visitor access password\u201D first.",
  "\u66F4\u65B0\u5931\u8D25": "Update failed",
  "\u2713 \u5B89\u5168\u9632\u62A4\u5DF2\u5F00\u542F\uFF08\u6CE8\u610F\uFF1A\u5C1A\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u8BBF\u5BA2\u4ECD\u53EF\u514D\u5BC6\u8FDB\u5165\uFF0C\u8BF7\u7ACB\u5373\u5728\u4E0B\u65B9\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\uFF09": "\u2713 Protection enabled (note: no password set yet \u2014 visitors can still enter without one; set an access password below now)",
  "\u2713 \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u5F00\u542F\uFF08\u73B0\u6709\u767B\u5F55\u6001\u5DF2\u5237\u65B0\uFF09": "\u2713 Access protection enabled (existing sessions refreshed)",
  "\u2713 \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u5173\u95ED\uFF08\u8BBF\u95EE\u514D\u5BC6\uFF0C\u7BA1\u7406\u4FDD\u62A4\u4E0D\u53D7\u5F71\u54CD\uFF09": "\u2713 Access protection disabled (access is password-free; admin protection is unaffected)",
  "\u2713 \u7BA1\u7406\u4FDD\u62A4\u5DF2\u5F00\u542F\uFF08\u4FEE\u6539\u914D\u7F6E\u9700\u7BA1\u7406\u5BC6\u7801\uFF09": "\u2713 Admin protection enabled (configuration changes require the admin password)",
  "\u2713 \u7BA1\u7406\u4FDD\u62A4\u5DF2\u5173\u95ED\uFF08\u4FEE\u6539\u914D\u7F6E\u514D\u5BC6\uFF0C\u8BF7\u8C28\u614E\uFF09": "\u2713 Admin protection disabled (configuration changes need no password \u2014 be careful)",
  "\u300C\u4EC5\u5BC6\u7801 / PIN \u7801\u767B\u5F55\u300D\u9700\u8981\u5148\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\u3002\n\n\u8BF7\u5728\u4E0B\u65B9\u300C\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 / PIN \u7801\u300D\u5904\u8F93\u5165\u5BC6\u7801\u5E76\u70B9\u51FB\u300C\u4FDD\u5B58\u8BBF\u95EE\u5BC6\u7801\u300D\uFF0C\u7136\u540E\u518D\u5207\u6362\u5230\u6B64\u6A21\u5F0F\u6216\u5F00\u542F\u5B89\u5168\u9632\u62A4\u3002": "\u201CPassword / PIN only\u201D needs an access password first.\n\nSet one below under \u201CExternal visitor access password / PIN\u201D, click \u201CSave access password\u201D, then switch to this mode or enable protection.",
  "\u8BF7\u5148\u5728\u4E0B\u65B9\u8BBE\u7F6E\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\uFF0C\u518D\u5207\u6362\u4E3A\u300C\u4EC5\u5BC6\u7801\u767B\u5F55\u300D\u6A21\u5F0F": "Set a visitor access password below before switching to \u201CPassword only\u201D",
  "\u2713 \u5916\u90E8\u9A8C\u8BC1\u6A21\u5F0F\u5DF2\u5207\u6362\uFF0C\u5DF2\u5237\u65B0\u5168\u57DF\u767B\u5F55\u6001": "\u2713 Verification mode switched; all sessions refreshed",
  "\u2713 \u9632\u62A4\u751F\u6548\u8303\u56F4\u5DF2\u66F4\u65B0": "\u2713 Protection scope updated",
  "\u2713 \u8FDC\u7A0B\u7BA1\u7406\u9632\u7BE1\u6539\u7B56\u7565\u5DF2\u66F4\u65B0": "\u2713 Remote management policy updated",
  "\u2713 \u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u539F\u6709\u7684\u5386\u53F2\u8BBF\u5BA2\u4F1A\u8BDD\u5DF2\u5168\u90E8\u5B89\u5168\u5237\u65B0\u3002": "\u2713 Visitor access password saved. All previous visitor sessions were refreshed.",
  "\u2713 \u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u8FDC\u7A0B\u7BA1\u7406\u89E3\u9501\u72B6\u6001\u5DF2\u91CD\u7F6E\u751F\u6548\u3002": "\u2713 Admin password saved. The remote-management unlock state was reset.",
  "\u91CD\u7F6E\u540E\uFF0C\u4E4B\u524D\u5305\u542B\u65E7 Token \u7684\u4E8C\u7EF4\u7801\u548C\u5206\u4EAB\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\u3002\u662F\u5426\u786E\u8BA4\u91CD\u7F6E\uFF1F": "Resetting invalidates every previously shared QR code and link containing the old Token. Reset now?",
  "\u91CD\u7F6E\u5931\u8D25": "Reset failed",
  "\u2713 \u5B89\u5168 Token \u5DF2\u91CD\u7F6E\uFF0C\u4E8C\u7EF4\u7801\u4E0E\u4E13\u5C5E\u94FE\u63A5\u5DF2\u5237\u65B0": "\u2713 Security Token reset; QR code and share link refreshed",
  "\u5168\u90E8\u901A\u9053 (\u5C40\u57DF\u7F51+\u516C\u7F51)": "All channels (LAN + public)",
  "\u4EC5\u516C\u7F51\u96A7\u9053": "Public tunnel only",
  "\u4EC5\u5C40\u57DF\u7F51": "LAN only",
  "\u626B\u7801\u514D\u5BC6 + \u5BC6\u7801": "QR (no password) + password",
  "\u4EC5\u5BC6\u7801\u767B\u5F55": "Password only",
  "\u4EC5\u5B89\u5168 Token": "Security Token only",
  "\u9700\u5BC6\u7801\u89E3\u9501": "Password unlock required",
  "\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406": "This computer only",
  "\u5BBD\u677E\u6A21\u5F0F": "Relaxed",
  "\u{1F510} \u5168\u5C40\u8BBF\u95EE\u5B89\u5168\u9632\u62A4\u4F53\u7CFB": "\u{1F510} Global access protection",
  "\u96C6\u6210\u5916\u90E8\u8BBF\u95EE\u95E8\u7981\u62E6\u622A\u4E0E\u7BA1\u7406\u540E\u53F0\u9632\u7BE1\u6539\u63A7\u5236\uFF0C\u53CC\u91CD\u5B88\u62A4\u8FDC\u7A0B\u4F1A\u8BDD\u4E0E\u7F51\u7EDC\u914D\u7F6E\u5B89\u5168": "External access gating plus admin anti-tamper control, guarding both remote sessions and network configuration",
  "\u2713 \u5DF2\u542F\u7528\u5B89\u5168\u9632\u62A4": "\u2713 Protection enabled",
  "\u672A\u5F00\u542F\u5B89\u5168\u9632\u62A4": "Protection disabled",
  "\u{1F310} \u4FDD\u62A4\u8303\u56F4: ": "\u{1F310} Scope: ",
  "\u{1F511} \u5916\u90E8\u9A8C\u8BC1: ": "\u{1F511} External verification: ",
  "\u{1F512} \u540E\u53F0\u9632\u7BE1\u6539: ": "\u{1F512} Admin anti-tamper: ",
  "\u5C1A\u672A\u8BBE\u7F6E\u4EFB\u4F55\u8BBF\u95EE\u5BC6\u7801\u6216\u7BA1\u7406\u5BC6\u7801": "No access or admin password set yet",
  " \u2014\u2014 \u6B64\u65F6\u201C\u8BBF\u95EE\u8BA4\u8BC1\u5DF2\u5F00\u542F\u201D\u4F46\u4EFB\u4F55\u77E5\u9053\u5C40\u57DF\u7F51 IP / \u96A7\u9053\u5730\u5740\u7684\u4EBA\u90FD\u80FD\u76F4\u63A5\u8FDB\u5165\uFF08\u96A7\u9053\u5165\u53E3\u81EA\u8EAB\u4E0D\u8BBE\u9632\uFF0C\u8BE6\u89C1\u4E0B\u65B9\u5B89\u5168\u987B\u77E5\uFF09\u3002": " \u2014 access protection is on, but anyone who knows the LAN IP / tunnel address can still enter (the tunnel entry itself is unprotected; see the security notes below).",
  "\u5EFA\u8BAE\u7ACB\u5373\u5728\u4E0B\u65B9\u8BBE\u7F6E": "Set it below now:",
  "\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801": "visitor access password",
  "\u6216": "or",
  "\u7BA1\u7406\u5BC6\u7801": "admin password",
  "\u540E\u518D\u5BF9\u5916\u5F00\u653E\u3002": "before exposing it publicly.",
  "\u{1F6E1}\uFE0F \u7B2C\u4E00\u9053\u9632\u7EBF\uFF1A\u5916\u90E8\u8BBF\u95EE\u95E8\u7981\uFF08\u63A7\u5236\u8C01\u80FD\u4F7F\u7528 AI\uFF09": "\u{1F6E1}\uFE0F First line: external access gate (who may use the AI)",
  "\u63A7\u5236\u5916\u90E8\u8BBE\u5907\u901A\u8FC7\u5C40\u57DF\u7F51 IP \u6216\u516C\u7F51\u96A7\u9053\uFF08Cloudflare/\u81EA\u5EFA\u96A7\u9053\uFF09\u8FDB\u5165 DSH \u804A\u5929\u754C\u9762\u65F6\u7684\u8EAB\u4EFD\u9A8C\u8BC1\u65B9\u5F0F": "How external devices authenticate when reaching the DSH chat UI over the LAN IP or a public tunnel (Cloudflare / self-hosted)",
  "\u9A8C\u8BC1\u6A21\u5F0F\u9009\u62E9": "Verification mode",
  "\u{1F7E2} \u626B\u7801\u514D\u5BC6 + \u5BC6\u7801\u8BA4\u8BC1 (\u63A8\u8350)": "\u{1F7E2} QR (no password) + password (recommended)",
  "\u4E8C\u7EF4\u7801\u81EA\u5E26\u4E13\u5C5E Token \u626B\u7801\u79D2\u8FDB\uFF1B\u76F4\u63A5\u8F93 IP/\u516C\u7F51\u57DF\u540D\u9700\u8F93\u5BC6\u7801": "QR codes carry a dedicated Token for instant access; typing the IP/public domain requires the password",
  "\u{1F511} \u4EC5\u5BC6\u7801 / PIN \u7801\u767B\u5F55": "\u{1F511} Password / PIN only",
  "\u6240\u6709\u5916\u90E8\u8BBF\u95EE\u5FC5\u987B\u624B\u52A8\u8F93\u5165\u8BBF\u95EE\u5BC6\u7801\u65B9\u53EF\u8FDB\u5165": "All external access requires the access password",
  "\u{1F3AB} \u4EC5\u5B89\u5168 Token \u514D\u5BC6": "\u{1F3AB} Security Token only (no password)",
  "\u4EC5\u6301\u6709\u5E26\u5B89\u5168 Token \u7684\u4E8C\u7EF4\u7801\u6216\u4E13\u5C5E\u5206\u4EAB\u94FE\u63A5\u65B9\u53EF\u8FDB\u5165": "Only QR codes or share links carrying the Security Token can get in",
  "\u9632\u62A4\u751F\u6548\u901A\u9053": "Protected channels",
  "\u5168\u90E8\u901A\u9053\u9632\u62A4 (\u63A8\u8350)": "All channels (recommended)",
  "\u5C40\u57DF\u7F51 IP \u76F4\u8FDE\u4E0E\u516C\u7F51\u96A7\u9053\u5168\u90E8\u53D7\u5B89\u5168\u4FDD\u62A4": "Both direct LAN IP access and the public tunnel are protected",
  "\u4EC5\u516C\u7F51\u96A7\u9053\u5F00\u542F\u9632\u62A4": "Public tunnel only",
  "\u5C40\u57DF\u7F51\u5185\u8BBE\u5907\u76F4\u63A5\u514D\u5BC6\u76F4\u8FDE\uFF0C\u516C\u7F51\u96A7\u9053\u5F3A\u5236\u9A8C\u8BC1": "LAN devices connect without a password; the public tunnel always verifies",
  "\u4EC5\u5C40\u57DF\u7F51\u5F00\u542F\u9632\u62A4": "LAN only",
  "\u4EC5\u5C40\u57DF\u7F51\u76F4\u8FDE\u9700\u9A8C\u8BC1\uFF0C\u516C\u7F51\u96A7\u9053\u4E0D\u5F00\u542F": "Direct LAN access is verified; the public tunnel is not protected",
  "\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 ${status}": "External visitor access password ${status}",
  "(\u2713 \u5DF2\u8BBE\u7F6E\u8BBF\u5BA2\u5BC6\u7801)": "(\u2713 visitor password set)",
  "(\u26A0\uFE0F \u5C1A\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u76F4\u63A5\u8F93\u5165 IP \u5C06\u514D\u5BC6)": "(\u26A0\uFE0F no password yet \u2014 typing the IP grants access without one)",
  "\u8F93\u5165\u65B0\u5BC6\u7801\u4EE5\u4FEE\u6539\uFF08\u7559\u7A7A\u4FDD\u5B58\u53EF\u6E05\u9664\u8BBF\u5BA2\u5BC6\u7801\uFF09": "Enter a new password to change it (save empty to clear the visitor password)",
  "\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 / PIN \u7801": "Set external visitor access password / PIN",
  "\u9690\u85CF": "Hide",
  "\u663E\u793A": "Show",
  "\u2713 \u5DF2\u6210\u529F\u4FDD\u5B58\uFF01": "\u2713 Saved successfully!",
  "\u4FDD\u5B58\u8BBF\u95EE\u5BC6\u7801": "Save access password",
  "\u{1F4A1} \u5F53\u5916\u90E8\u670B\u53CB\u6216\u540C\u4E8B\u672A\u901A\u8FC7\u4E8C\u7EF4\u7801\u626B\u7801\uFF0C\u800C\u662F\u76F4\u63A5\u8F93\u5165 IP \u6216\u516C\u7F51\u57DF\u540D\u8BBF\u95EE\u65F6\uFF0C\u9700\u8F93\u5165\u6B64\u5BC6\u7801\u767B\u5F55\u3002": "\u{1F4A1} Friends or colleagues who type the IP or public domain instead of scanning the QR code must enter this password to sign in.",
  "\u514D\u5BC6\u626B\u7801 Token (\u4E13\u5C5E\u8BBF\u95EE\u51ED\u636E)": "Password-free QR Token (dedicated credential)",
  "\u672A\u751F\u6210": "Not generated",
  "\u91CD\u65B0\u751F\u6210 Token\uFF0C\u4F7F\u4E4B\u524D\u5206\u4EAB\u7684\u65E7\u4E8C\u7EF4\u7801\u548C\u94FE\u63A5\u7ACB\u5373\u5931\u6548": "Regenerate the Token to invalidate previously shared QR codes and links",
  "\u{1F504} \u91CD\u7F6E\u5B89\u5168 Token": "\u{1F504} Reset Security Token",
  "\u{1F4A1} \u63A7\u5236\u53F0\u751F\u6210\u7684\u5C40\u57DF\u7F51\u4E0E\u516C\u7F51\u4E8C\u7EF4\u7801\u5DF2\u81EA\u52A8\u5D4C\u5165\u6B64 Token\uFF0C\u624B\u673A\u626B\u7801\u5373\u53EF\u514D\u5BC6\u8FDB\u5165\u804A\u5929\u754C\u9762\uFF08\u4F46\u4E0D\u8D4B\u4E88\u540E\u53F0\u7BA1\u7406\u8BBE\u7F6E\u6743\u9650\uFF09\u3002": "\u{1F4A1} The LAN and public QR codes generated here already embed this Token, so a phone scans straight into the chat without a password (admin settings are not granted).",
  "\u{1F512} \u7B2C\u4E8C\u9053\u9632\u7EBF\uFF1A\u7BA1\u7406\u540E\u53F0\u9632\u7BE1\u6539\uFF08\u63A7\u5236\u8C01\u80FD\u4FEE\u6539\u672C\u63D2\u4EF6\u6240\u6709\u8BBE\u7F6E\uFF09": "\u{1F512} Second line: admin anti-tamper (who may change this plugin's settings)",
  "\u9501\u5B9A\u6574\u4E2A\u63D2\u4EF6\u8BBE\u7F6E\u540E\u53F0\uFF08\u5305\u542B\u5C40\u57DF\u7F51\u3001\u516C\u7F51\u96A7\u9053\u3001IM \u673A\u5668\u4EBA\u5BC6\u94A5\u4E0E\u5B89\u5168\u8BBE\u7F6E\uFF09\uFF0C\u9632\u6B62\u4ED6\u4EBA\u968F\u610F\u7BE1\u6539\u914D\u7F6E": "Locks the whole settings console (LAN, public tunnel, IM bot secrets and security settings) against tampering",
  "\u{1F6E1}\uFE0F \u7BA1\u7406\u4FDD\u62A4\u5DF2\u5F00\u542F\uFF08\u4FEE\u6539\u914D\u7F6E\u9700\u7BA1\u7406\u5BC6\u7801\uFF09": "\u{1F6E1}\uFE0F Admin protection is on (changes require the admin password)",
  "\u26A0\uFE0F \u7BA1\u7406\u4FDD\u62A4\u5DF2\u5173\u95ED\uFF08\u4FEE\u6539\u914D\u7F6E\u514D\u5BC6\uFF09": "\u26A0\uFE0F Admin protection is off (changes need no password)",
  "\u5173\u95ED\u7BA1\u7406\u4FDD\u62A4": "Disable admin protection",
  "\u5F00\u542F\u7BA1\u7406\u4FDD\u62A4": "Enable admin protection",
  "\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5458\u5BC6\u7801 ${status}": "Set a dedicated admin password ${status}",
  "(\u2713 \u5DF2\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801)": "(\u2713 dedicated admin password set)",
  "(\u672A\u5355\u72EC\u8BBE\u7F6E\uFF0C\u9ED8\u8BA4\u4F7F\u7528\u4E0A\u8FF0\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801)": "(not set \u2014 the visitor access password above is used)",
  "\u8F93\u5165\u65B0\u5BC6\u7801\u4EE5\u4FEE\u6539\uFF08\u7559\u7A7A\u4FDD\u5B58\u53EF\u6E05\u9664\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801\uFF09": "Enter a new password to change it (save empty to clear the dedicated admin password)",
  "\u8BBE\u7F6E\u540E\u53F0\u7BA1\u7406\u89E3\u9501\u5BC6\u7801\uFF08\u5EFA\u8BAE\u4E0E\u8BBF\u5BA2\u5BC6\u7801\u4E0D\u540C\uFF09": "Set the admin unlock password (different from the visitor password is recommended)",
  "\u4FDD\u5B58\u7BA1\u7406\u5BC6\u7801": "Save admin password",
  "\u{1F511} \u6838\u5FC3\u4F5C\u7528\uFF1A\u7528\u4E8E\u8FDC\u7A0B\u8BBE\u5907\u8FDB\u5165\u8BBE\u7F6E\u540E\u53F0\u65F6\u7684\u89E3\u9501\u9A8C\u8BC1\u3002\u8BBE\u7F6E\u540E\uFF0C\u5373\u4FBF\u628A\u8BBF\u95EE\u5BC6\u7801\u544A\u77E5\u4ED6\u4EBA\uFF0C\u4ED6\u4EBA\u4E5F\u65E0\u6CD5\u8FDB\u5165\u8BBE\u7F6E\u540E\u53F0\u6539\u914D\u7F6E\u3002": "\u{1F511} Used to unlock the admin console from remote devices. Once set, sharing the access password no longer lets others change settings here.",
  "\u8FDC\u7A0B\u8BBE\u5907\u7BA1\u7406\u6743\u9650\u7B56\u7565": "Remote device management policy",
  "\u{1F512} \u9700\u5BC6\u7801\u89E3\u9501 (\u63A8\u8350)": "\u{1F512} Password unlock (recommended)",
  "\u8FDC\u7A0B\u624B\u673A/\u5916\u7F51\u6253\u5F00\u672C\u63D2\u4EF6\u8BBE\u7F6E\u65F6\u9ED8\u8BA4\u5168\u5C40\u9501\u5B9A\uFF0C\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\u540E\u65B9\u53EF\u4F7F\u7528": "Remote phones/internet sessions start locked; unlock with the admin password to use the console",
  "\u{1F6AB} \u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406 (\u6700\u4E25\u683C)": "\u{1F6AB} This computer only (strictest)",
  "\u8FDC\u7A0B\u8BBE\u5907\u5F7B\u5E95\u9501\u5B9A\u6574\u4E2A\u8BBE\u7F6E\u540E\u53F0\uFF0C\u4EC5\u5141\u8BB8\u5728 127.0.0.1 \u7535\u8111\u672C\u673A\u4E0A\u64CD\u4F5C": "Remote devices are fully locked out; only 127.0.0.1 on this computer may manage",
  "\u{1F513} \u5BBD\u677E\u6A21\u5F0F": "\u{1F513} Relaxed",
  "\u4EFB\u4F55\u5DF2\u901A\u8FC7\u7B2C\u4E00\u9053\u9632\u7EBF\u767B\u5F55\u7684\u8BBE\u5907\u5747\u53EF\u76F4\u63A5\u4FEE\u6539\u6240\u6709\u914D\u7F6E": "Any device that passed the first line may change all settings",
  "\u6DFB\u52A0\u767D\u540D\u5355\u5931\u8D25": "Failed to add to allowlist",
  "\u52A0\u8F7D\u4E2D\u2026": "Loading\u2026",
  "\u91CD\u8FDE\u4E2D\u2026": "Reconnecting\u2026",
  "\u6682\u505C\uFF08\u4F1A\u8BDD\u8FC7\u671F\uFF09": "Paused (session expired)",
  "\u9519\u8BEF": "Error",
  "\u672A\u8FDE\u63A5": "Disconnected",
  "\u63A8\u8350": "Recommended",
  "\u{1F4D6} \u5FAE\u4FE1\u4F7F\u7528\u8BF4\u660E": "\u{1F4D6} WeChat guide",
  "\u{1F4D6} QQ \u4F7F\u7528\u8BF4\u660E": "\u{1F4D6} QQ guide",
  "\u{1F310} QQ \u5F00\u653E\u5E73\u53F0": "\u{1F310} QQ Open Platform",
  "\u{1F4D6} \u98DE\u4E66\u4F7F\u7528\u8BF4\u660E": "\u{1F4D6} Lark / Feishu guide",
  "\u{1F310} \u98DE\u4E66\u5F00\u653E\u5E73\u53F0": "\u{1F310} Lark / Feishu Open Platform",
  "\u{1F4D6} Telegram \u4F7F\u7528\u8BF4\u660E": "\u{1F4D6} Telegram guide",
  "\u{1F310} @BotFather \u7533\u8BF7 Bot": "\u{1F310} Create a bot via @BotFather",
  "\u6536\u8D77\u547D\u4EE4": "Hide commands",
  "\u547D\u4EE4\u5217\u8868": "Command list",
  "/new <\u63D0\u793A\u8BCD> \u2014 \u65B0\u5EFA\u4F1A\u8BDD\u5E76\u5F00\u59CB\uFF08\u5F53\u524D\u5DE5\u4F5C\u533A\uFF09": "/new <prompt> \u2014 start a new session (current workspace)",
  "/new <\u63D0\u793A\u8BCD> @N \u2014 \u5728\u6307\u5B9A\u5DE5\u4F5C\u533A\u65B0\u5EFA\u4F1A\u8BDD": "/new <prompt> @N \u2014 start a session in workspace N",
  "/sessions\uFF08\u6216 /list\uFF09\u2014 \u5217\u51FA\u4F1A\u8BDD\uFF08\u6309\u5DE5\u4F5C\u533A\u5206\u7EC4\uFF0C\u5E26\u6807\u9898\uFF09": "/sessions (or /list) \u2014 list sessions (grouped by workspace, with titles)",
  "/use N\uFF08\u6216 /resume N\uFF09\u2014 \u5207\u6362\u5230\u4F1A\u8BDD N": "/use N (or /resume N) \u2014 switch to session N",
  "/workspaces \u2014 \u5217\u51FA\u6240\u6709\u53EF\u7528\u5DE5\u4F5C\u533A": "/workspaces \u2014 list all available workspaces",
  "/end \u2014 \u7ED3\u675F\u5F53\u524D\u4F1A\u8BDD\uFF08\u56DE\u5230\u65E0\u6D3B\u52A8\u4F1A\u8BDD\u72B6\u6001\uFF09": "/end \u2014 end the current session (back to no active session)",
  "/stop \u2014 \u505C\u6B62\u5F53\u524D\u4EFB\u52A1": "/stop \u2014 stop the current task",
  "/status \u2014 \u67E5\u770B Agent \u72B6\u6001\u4E0E\u4F1A\u8BDD\u6458\u8981": "/status \u2014 show agent status and session summary",
  "/yes \u6216 /no\uFF08\u6216 1/2\uFF09\u2014 \u56DE\u5E94\u6743\u9650\u5BA1\u6279\u8BF7\u6C42": "/yes or /no (or 1/2) \u2014 answer an approval request",
  "/help \u2014 \u663E\u793A\u5B8C\u6574\u547D\u4EE4\u5E2E\u52A9": "/help \u2014 show full command help",
  "\u8FDE\u63A5\u72B6\u6001": "Connection status",
  "\u767B\u5F55\u8D26\u53F7": "Signed-in account",
  "\u6D3B\u52A8\u4F1A\u8BDD": "Active session",
  "\u767D\u540D\u5355 (\u5DF2\u6388\u6743 ${count} \u4E2A\u8D26\u53F7/\u7FA4):": "Allowlist (${count} authorized):",
  "\u79FB\u51FA\u767D\u540D\u5355": "Remove from allowlist",
  "(\u7A7A \u2014 \u626B\u7801\u540E\u9996\u4E2A\u53D1\u6D88\u606F\u7684\u5FAE\u4FE1\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)": "(empty \u2014 the first WeChat user to message the bot is added automatically)",
  "(\u7A7A \u2014 \u9996\u4E2A\u53D1\u6D88\u606F\u7684\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)": "(empty \u2014 the first user to message the bot is added automatically)",
  "\u6DFB\u52A0\u5141\u8BB8\u7684\u5FAE\u4FE1 ID\uFF08\u5982 xxx@im.wechat\uFF09\uFF0C\u6309 Enter \u6DFB\u52A0": "Add an allowed WeChat ID (e.g. xxx@im.wechat), press Enter",
  "\u6DFB\u52A0\u5141\u8BB8\u7684\u7528\u6237/\u7FA4 ID\uFF0C\u6309 Enter \u6DFB\u52A0": "Add an allowed user/group ID, press Enter",
  "\u6DFB\u52A0": "Add",
  "\u4F7F\u7528\u5DF2\u4FDD\u5B58\u7684\u51ED\u8BC1\u76F4\u63A5\u6062\u590D\u8FDE\u63A5\uFF0C\u65E0\u9700\u91CD\u65B0\u626B\u7801": "Reconnect with the saved credentials \u2014 no need to scan again",
  "\u9996\u6B21\u4F7F\u7528\u9700\u626B\u7801\u7ED1\u5B9A": "First-time use requires scanning to bind",
  "\u91CD\u65B0\u8FDE\u63A5": "Reconnect",
  "\u8FDE\u63A5": "Connect",
  '\u505C\u6B62\u63A5\u6536\u6D88\u606F\uFF1B\u51ED\u8BC1\u4FDD\u7559\uFF0C\u53EF\u968F\u65F6"\u91CD\u65B0\u8FDE\u63A5"\u6062\u590D': "Stop receiving messages; credentials are kept \u2014 use \u201CReconnect\u201D anytime",
  "\u65AD\u5F00": "Disconnect",
  "\u786E\u8BA4\u89E3\u7ED1\uFF1F\u8FD9\u5C06\u6E05\u9664\u4FDD\u5B58\u7684\u51ED\u8BC1\u3002": "Unbind? This clears the saved credentials.",
  "\u6E05\u9664\u767B\u5F55\u51ED\u8BC1\uFF0C\u4E0B\u6B21\u9700\u91CD\u65B0\u914D\u7F6E": "Clear the login credentials; reconfigure next time",
  "\u89E3\u7ED1\u8D26\u53F7": "Unbind account",
  "\u5F00\u542F\u540E\uFF0C\u767D\u540D\u5355\u4E4B\u5916\u7684\u65B0\u7FA4\u9996\u6B21 @\u673A\u5668\u4EBA \u5373\u81EA\u52A8\u6388\u6743\u5165\u767D\u540D\u5355\uFF1B\u5173\u95ED\uFF08\u9ED8\u8BA4\uFF09\u65F6\u65B0\u7FA4\u5FC5\u987B\u5148\u5728\u6B64\u624B\u52A8\u6DFB\u52A0": "When on, a new group is auto-authorized the first time it @mentions the bot; when off (default) you must add it here first",
  "\u7FA4\u804A\u81EA\u52A8\u6388\u6743\uFF08\u65B0\u7FA4\u9996\u6B21 @\u673A\u5668\u4EBA \u81EA\u52A8\u52A0\u5165\u767D\u540D\u5355\uFF0C\u9ED8\u8BA4\u5173\u95ED\uFF09": "Group auto-authorization (first @mention joins the allowlist; default off)",
  '\u5F00\u542F\u540E\uFF0C\u6BCF\u8F6E\u7ED3\u675F\u4F1A\u628A"\u6539\u4E86\u54EA\u4E9B\u6587\u4EF6\uFF08+\u589E/-\u5220\uFF09"\u64AD\u62A5\u5230\u5F53\u524D\u4F1A\u8BDD\uFF1B/diff \u53EF\u5BFC\u51FA .patch \u8865\u4E01': "When on, each turn ends with a summary of changed files (+added/-removed); /diff exports a .patch",
  "\u672C\u8F6E\u6539\u52A8\u6458\u8981\uFF08\u6BCF\u8F6E\u64AD\u62A5\u6539\u52A8\u6587\u4EF6\u6E05\u5355\uFF0C\u9ED8\u8BA4\u5F00\u542F\uFF09": "Turn change summary (broadcast changed files each turn; default on)",
  "\u5F00\u542F\u540E\uFF0CAgent \u6267\u884C\u4EFB\u52A1\u671F\u95F4\u53D1\u6D88\u606F\u4F1A\u63D2\u8BDD\u6CE8\u5165\u5230\u5F53\u524D\u8F6E\u6B21\u7684\u4E0B\u4E00\u6B65\uFF08\u4E0D\u6253\u65AD\u6B63\u5728\u8FD0\u884C\u7684\u5DE5\u5177\u8C03\u7528\uFF09\uFF1B\u5173\u95ED\u540E\u6392\u961F\u7B49\u5F85\u5F53\u524D\u4EFB\u52A1\u5B8C\u6210\u540E\u5904\u7406": "When on, messages sent while the Agent is working are injected at its next step (running tool calls are not interrupted); when off, messages wait until the current turn finishes",
  "\u5F00\u542F\u540E\u5355\u804A\u56DE\u590D\u4EE5\u6D41\u5F0F\u6D88\u606F\u9010\u6BB5\u8F93\u51FA\uFF08\u540C\u4E00\u6761\u6D88\u606F\u539F\u5730\u53D8\u957F\uFF09\uFF1B\u5173\u95ED\u540E\u7B49\u4E00\u8F6E\u7ED3\u675F\u518D\u4E00\u6B21\u6027\u53D1\u9001\u3002\u7FA4\u804A\u5E73\u53F0\u4E0D\u652F\u6301\u6D41\u5F0F\uFF0C\u59CB\u7EC8\u4E00\u6B21\u6027\u53D1\u9001\u3002": "When on, DM replies stream progressively (the same message grows in place); when off, the whole reply is sent once the turn ends. Group chats do not support streaming and are always sent at once.",
  "\u5355\u804A\u6D41\u5F0F\u8F93\u51FA\uFF08\u9010\u6BB5\u663E\u793A\uFF0C\u9ED8\u8BA4\u5F00\u542F\uFF1B\u7FA4\u804A\u4E0D\u652F\u6301\uFF09": "Streaming replies in DMs (progressive display, on by default; groups not supported)",
  "\u5B9E\u65F6\u63D2\u8BDD\u6A21\u5F0F\uFF08Agent \u5FD9\u788C\u65F6\u53D1\u6D88\u606F\u53EF\u5728\u4E0B\u4E00\u6B65\u751F\u6548\uFF0C\u9ED8\u8BA4\u5173\u95ED\uFF09": "Realtime steering (messages reach a busy Agent at its next step; default off)",
  "\u5F00\u542F\u540E Agent \u5E72\u6D3B\u65F6\u5361\u7247\u9876\u90E8\u4F1A\u5B9E\u65F6\u663E\u793A\u5F53\u524D\u52A8\u4F5C\uFF08\u5982\u300C\u6B63\u5728\u8FD0\u884C\u547D\u4EE4\u300D\uFF09\uFF1B\u5173\u95ED\u540E\u4E0D\u518D\u663E\u793A": "When on, the card header shows the agent's current action live (e.g. \u201CRunning command\u201D); when off it is hidden",
  "\u5B9E\u65F6\u6D3B\u52A8\u72B6\u6001\uFF08\u5361\u7247\u9876\u90E8\u663E\u793A\u300C\u6B63\u5728\u8FD0\u884C\u547D\u4EE4\u300D\u7B49\uFF0C\u9ED8\u8BA4\u5173\u95ED\uFF09": "Live activity status (shows \u201CRunning command\u201D etc. atop the card; default off)",
  "\u6536\u8D77\u9AD8\u7EA7\u8BBE\u7F6E": "Hide advanced settings",
  "\u2699\uFE0F \u9AD8\u7EA7\u8BBE\u7F6E": "\u2699\uFE0F Advanced settings",
  "\u4EE5\u4E0B\u8BBE\u7F6E\u6309\u5E73\u53F0\u4FDD\u5B58\uFF0C\u53EA\u5F71\u54CD\u8BE5\u5E73\u53F0\u901A\u8FC7 Bot \u65B0\u5EFA\u7684\u4F1A\u8BDD\uFF08\u7559\u7A7A = \u4F7F\u7528 DSH \u9ED8\u8BA4\u503C\uFF09\u3002": "These settings are saved per platform and only affect sessions created through that bot (empty = DSH defaults).",
  "Agent \u9884\u8BBE \u2014 \u51B3\u5B9A\u8FDC\u7A0B\u4F1A\u8BDD\u53EF\u7528\u7684\u5DE5\u5177\u4E0E\u6280\u80FD\uFF0C\u7559\u7A7A\u7528 DSH \u9ED8\u8BA4\u9884\u8BBE": "Agent preset \u2014 which tools and skills remote sessions may use; empty = DSH default preset",
  "\u7559\u7A7A = DSH \u9ED8\u8BA4\uFF08${name}\uFF09": "Empty = DSH default (${name})",
  "\u7559\u7A7A = DSH \u9ED8\u8BA4\u9884\u8BBE": "Empty = DSH default preset",
  "\u6B63\u5728\u8BFB\u53D6\u672C\u673A\u53EF\u7528\u9884\u8BBE\u2026": "Reading available presets\u2026",
  "\u672C\u673A\u53EF\u7528\uFF1A${list}": "Available: ${list}",
  "\uFF08\u65E0\uFF09": "(none)",
  "\u5F53\u524D DSH \u7248\u672C\u672A\u63D0\u4F9B\u9884\u8BBE\u5217\u8868\uFF0C\u8BF7\u624B\u52A8\u586B\u5199\u9884\u8BBE\u540D": "This DSH version exposes no preset list \u2014 type the preset name manually",
  "\u5DE5\u4F5C\u533A\u76EE\u5F55 \u2014 \u8BE5\u5E73\u53F0 /new \u65B0\u5EFA\u4F1A\u8BDD\u7684\u9ED8\u8BA4\u76EE\u5F55\uFF0C\u7559\u7A7A\u7528\u9996\u4E2A\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A": "Workspace directory \u2014 default cwd for /new sessions on this platform; empty = first registered workspace",
  "\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u4F8B\u5982 /home/me/project \u6216 D:\\project": "Absolute path, e.g. /home/me/project or D:\\project",
  "\u6A21\u578B\u63D0\u4F9B\u65B9\uFF08\u53EF\u9009\uFF09": "Model provider (optional)",
  "\u7559\u7A7A = DSH \u9ED8\u8BA4": "Empty = DSH default",
  "\u6A21\u578B\uFF08\u53EF\u9009\uFF09": "Model (optional)",
  "\u8FDB\u5EA6\u6458\u8981\u95F4\u9694\uFF08\u79D2\uFF09": "Progress digest interval (seconds)",
  "\u5BA1\u6279\u8D85\u65F6\uFF08\u79D2\uFF09": "Approval timeout (seconds)",
  "\u5355\u6761\u6D88\u606F\u4E0A\u9650\uFF08\u5B57\u7B26\uFF09": "Max message size (characters)",
  "\u5206\u5757\u53D1\u9001\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09": "Chunk send interval (ms)",
  "\u4FDD\u5B58\u9AD8\u7EA7\u8BBE\u7F6E": "Save advanced settings",
  "\u6062\u590D\u63A8\u8350\u8282\u594F\u53C2\u6570": "Restore recommended pacing",
  "\u{1F4F1} \u624B\u673A ${name} \u626B\u7801\u76F4\u8FBE\u5BF9\u8BDD": "\u{1F4F1} Scan to chat with the bot on ${name}",
  "\u7528 ${name} \u626B\u63CF\u5DE6\u4FA7\u4E8C\u7EF4\u7801\uFF0C\u7ACB\u5373\u6253\u5F00\u4E0E Bot \u5BF9\u8BDD\uFF1B\u53D1\u9001\u9996\u6761\u6D88\u606F\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002": "Scan the QR code with ${name} to open the chat; sending the first message authorizes you automatically.",
  "\u5728 ${name} \u5BA2\u6237\u7AEF\u6253\u5F00 \u2197": "Open in ${name} \u2197",
  "\u5DF2\u626B\u7801\uFF0C\u8BF7\u5728\u624B\u673A\u4E0A\u786E\u8BA4\u2026": "Scanned \u2014 confirm on your phone\u2026",
  "\u8BF7\u4F7F\u7528\u5FAE\u4FE1\u626B\u7801\u767B\u5F55\uFF08ClawBot\uFF09": "Scan with WeChat to sign in (ClawBot)",
  "\u8BF7\u7528\u98DE\u4E66\u626B\u7801\u521B\u5EFA\u5E94\u7528\uFF08\u4E8C\u7EF4\u7801 10 \u5206\u949F\u5185\u6709\u6548\uFF09": "Scan with Lark / Feishu to create the app (QR valid for 10 minutes)",
  "\u8BF7\u626B\u7801\u767B\u5F55": "Scan to sign in",
  "\u4F5C\u5E9F\u5F53\u524D\u4E8C\u7EF4\u7801\u5E76\u91CD\u65B0\u751F\u6210\uFF08\u65E7\u7801\u7ACB\u5373\u5931\u6548\uFF09": "Invalidate the current QR code and generate a new one (the old one stops working)",
  "\u751F\u6210\u4E2D\u2026": "Generating\u2026",
  "\u{1F504} \u91CD\u65B0\u751F\u6210\u4E8C\u7EF4\u7801": "\u{1F504} Regenerate QR code",
  "\u626B\u4E0D\u51FA\u6765\u6216\u5DF2\u8FC7\u671F\u65F6\u53EF\u70B9\u6B64\u6362\u65B0\u7801": "Tap here for a fresh code if scanning fails or it expired",
  "\u{1F4F1} \u4E00\u952E\u521B\u5EFA\u98DE\u4E66\u5E94\u7528\uFF08\u63A8\u8350\uFF09": "\u{1F4F1} One-tap Lark / Feishu app creation (recommended)",
  "\u70B9\u51FB\u540E\u7528\u98DE\u4E66\u626B\u7801\uFF1A\u81EA\u52A8\u521B\u5EFA\u673A\u5668\u4EBA\u5E94\u7528\u5E76\u9884\u7F6E\u6240\u9700\u6743\u9650\u3001\u4E8B\u4EF6\u8BA2\u9605\u4E0E\u5361\u7247\u56DE\u8C03\uFF0C\u65E0\u9700\u8FDB\u5F00\u53D1\u8005\u540E\u53F0\u624B\u5DE5\u914D\u7F6E\u3002": "Click and scan with Lark / Feishu: the bot app is created with the required permissions, event subscriptions and card callbacks preconfigured \u2014 no manual developer-console setup.",
  "\u4F7F\u7528\u98DE\u4E66\u626B\u7801\u521B\u5EFA\u5E94\u7528\u5E76\u81EA\u52A8\u586B\u5165\u51ED\u8BC1": "Create the app by scanning with Lark / Feishu and fill in the credentials automatically",
  "\u5904\u7406\u4E2D\u2026": "Working\u2026",
  "\u626B\u7801\u4E00\u952E\u521B\u5EFA\u5E94\u7528": "Scan to create the app",
  "\u5DF2\u6709\u5E94\u7528\uFF1F\u5728\u4E0B\u65B9\u624B\u52A8\u586B\u5165 App ID \u4E0E App Secret\uFF0C\u6216 ": "Already have an app? Enter the App ID and App Secret below, or ",
  "\u524D\u5F80\u98DE\u4E66\u5F00\u653E\u5E73\u53F0": "open the Lark / Feishu Open Platform",
  " \u521B\u5EFA\u540E\u586B\u5165\u3002": " and paste them here.",
  "Bot Token \u2014 Telegram @BotFather \u4E0B\u53D1\u7684\u673A\u5668\u4EBA Token": "Bot Token \u2014 the token issued by Telegram @BotFather",
  "\u8BF7\u8F93\u5165 Telegram Bot Token (\u5982 123456789:ABCdef...)": "Enter the Telegram Bot Token (e.g. 123456789:ABCdef...)",
  "\u9690\u85CF\u5BC6\u94A5": "Hide secret",
  "\u663E\u793A\u660E\u6587": "Show secret",
  "\u{1F648} \u9690\u85CF": "\u{1F648} Hide",
  "\u{1F441}\uFE0F \u663E\u793A": "\u{1F441}\uFE0F Show",
  "\u7F51\u7EDC\u4EE3\u7406 (\u53EF\u9009) \u2014 \u652F\u6301\u56FD\u5185 HTTP / HTTPS \u4EE3\u7406": "Network proxy (optional) \u2014 HTTP / HTTPS proxy",
  "\u53EF\u9009\uFF0C\u4F8B\u5982 http://127.0.0.1:7890\uFF08\u4E3A\u7A7A\u5219\u76F4\u8FDE\u6216\u8BFB\u53D6\u73AF\u5883\u53D8\u91CF\uFF09": "Optional, e.g. http://127.0.0.1:7890 (empty = direct or environment variables)",
  "AppID \u2014 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u5E94\u7528 ID": "AppID \u2014 QQ Open Platform bot app ID",
  "App ID \u2014 \u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u81EA\u5EFA\u5E94\u7528 ID (cli_xxx)": "App ID \u2014 Lark / Feishu Open Platform app ID (cli_xxx)",
  "\u8BF7\u8F93\u5165 AppID": "Enter the AppID",
  "\u8BF7\u8F93\u5165 App ID (\u5982 cli_a1b2c3d4...)": "Enter the App ID (e.g. cli_a1b2c3d4...)",
  "AppSecret \u2014 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u5BC6\u94A5": "AppSecret \u2014 QQ Open Platform bot secret",
  "App Secret \u2014 \u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u5E94\u7528\u5BC6\u94A5": "App Secret \u2014 Lark / Feishu Open Platform app secret",
  "\u8BF7\u8F93\u5165 AppSecret\uFF08\u626B\u7801\u7ED1\u5B9A\u65F6\u81EA\u52A8\u586B\u5165\uFF09": "Enter the AppSecret (auto-filled after QR binding)",
  "\u8BF7\u8F93\u5165 App Secret": "Enter the App Secret",
  "\u{1F4D6} QQ \u673A\u5668\u4EBA\u5F00\u53D1\u6587\u6863": "\u{1F4D6} QQ bot developer docs",
  "\u{1F4F1} \u626B\u7801\u7ED1\u5B9A QQ \u673A\u5668\u4EBA\uFF08\u63A8\u8350\uFF09": "\u{1F4F1} Scan to bind a QQ bot (recommended)",
  "\u626B\u7801\u7ED1\u5B9A\u673A\u5668\u4EBA": "Scan to bind bot",
  "\u5DF2\u521B\u5EFA\u8FC7\u673A\u5668\u4EBA\uFF1F": "Already created a bot?",
  "\u5728\u4E0B\u65B9\u624B\u52A8\u586B\u5165 AppID \u4E0E AppSecret\uFF0C\u6216 ": "Enter the AppID and AppSecret below, or ",
  "\u524D\u5F80 QQ \u5F00\u653E\u5E73\u53F0": "Go to the QQ Open Platform",
  "\u70B9\u51FB\u540E\u7528\u624B\u673A QQ \u626B\u7801\uFF1A\u7531 QQ \u5F00\u653E\u5E73\u53F0\u5B98\u65B9\u63A5\u53E3\u76F4\u63A5\u56DE\u4F20\u673A\u5668\u4EBA\u7684 AppID \u4E0E AppSecret\uFF0C\u65E0\u9700\u624B\u5DE5\u590D\u5236\u7C98\u8D34\u3002": "Click and scan with mobile QQ: the official QQ Open Platform API returns the bot AppID and AppSecret directly \u2014 no manual copy-paste needed.",
  "\u4F7F\u7528\u624B\u673A QQ \u626B\u7801\u7ED1\u5B9A\u673A\u5668\u4EBA\u5E76\u81EA\u52A8\u586B\u5165\u51ED\u8BC1": "Scan with mobile QQ to bind a bot and auto-fill credentials",
  "\u{1F4D6} \u524D\u5F80\u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u521B\u5EFA\u4F01\u4E1A\u81EA\u5EFA\u5E94\u7528": "\u{1F4D6} Create an app on the Lark / Feishu Open Platform",
  "\u4FDD\u5B58\u5E76\u8FDE\u63A5": "Save and connect",
  "\u8FDE\u63A5\u5931\u8D25": "Connection failed",
  "\u626B\u7801\u767B\u5F55": "Scan to sign in",
  "\u767B\u5F55\u5931\u8D25": "Sign-in failed",
  "\u8BF4\u660E: \u626B\u7801\u6210\u529F\u540E\uFF0C\u5411\u8BE5\u5FAE\u4FE1 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u5FAE\u4FE1\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002\u4F7F\u7528\u4E13\u7528\u5FAE\u4FE1\u53F7\uFF0C\u907F\u514D\u5F71\u54CD\u4E3B\u53F7\u3002": "Note: after scanning, the first message you send to this WeChat bot authorizes you automatically. Only allowlisted WeChat users can drive the agent; other messages are ignored. Use a dedicated WeChat account to avoid affecting your main one.",
  "\u8BF4\u660E: \u63A8\u8350\u7528\u624B\u673A QQ \u626B\u7801\u4E00\u952E\u7ED1\u5B9A\u673A\u5668\u4EBA\uFF1B\u4E5F\u53EF\u624B\u52A8\u586B\u5165 AppID \u4E0E AppSecret \u540E\u4FDD\u5B58\u5373\u81EA\u52A8\u8FDE\u63A5\uFF08\u5E95\u5C42\u8D70\u817E\u8BAF\u5B98\u65B9 QQ \u673A\u5668\u4EBA SDK\uFF09\u3002\u7528\u6237\u5411 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684 QQ \u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002": "Note: scan with mobile QQ to bind a bot in one step, or enter the AppID and AppSecret manually and save to connect (powered by the official Tencent QQ Bot SDK). The first message a user sends to the bot authorizes them. Only allowlisted QQ users can drive the agent; other messages are ignored.",
  "\u8BF7\u7528\u624B\u673A QQ \u626B\u7801\u7ED1\u5B9A\u673A\u5668\u4EBA\uFF08\u4E8C\u7EF4\u7801\u8FC7\u671F\u4F1A\u81EA\u52A8\u5237\u65B0\uFF09": "Scan with mobile QQ to bind a bot (the QR code refreshes automatically when it expires)",
  "\u8BF4\u660E: \u767B\u5F55\u6210\u529F\u540E\uFF0C\u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002": "Note: after signing in, the first message you send authorizes you automatically. Only allowlisted users can drive the agent; other messages are ignored.",
  "${days}\u5929 ${hrs}\u5C0F\u65F6 ${mins}\u5206": "${days}d ${hrs}h ${mins}m",
  "${hrs}\u5C0F\u65F6 ${mins}\u5206": "${hrs}h ${mins}m",
  "${mins}\u5206\u949F": ["${mins} minute", "${mins} minutes"],
  "\u{1F4CA} \u5BBF\u4E3B\u7CFB\u7EDF\u4E0E\u8FD0\u884C\u770B\u677F": "\u{1F4CA} Host system & runtime dashboard",
  "CPU \u6838\u5FC3\u4E0E\u578B\u53F7": "CPU cores & model",
  "${cores} \u6838\u5FC3 (${model})": ["${cores} core (${model})", "${cores} cores (${model})"],
  "DSH \u8FD0\u884C\u65F6\u95F4 (Uptime)": "DSH uptime",
  "Node \u8FDB\u7A0B\u5806\u5185\u5B58": "Node process heap",
  "\u7CFB\u7EDF\u5185\u5B58\u5360\u7528: ${used} GB / ${total} GB": "System memory: ${used} GB / ${total} GB",
  "\u8BCA\u65AD\u8BF7\u6C42\u5F02\u5E38": "Diagnostic request failed",
  "\u{1F50D} \u7F51\u7EDC\u8FDE\u901A\u6027\u4E00\u952E\u8BCA\u65AD": "\u{1F50D} One-click network diagnostics",
  "\u4E00\u952E\u68C0\u6D4B\u672C\u5730\u53CD\u5411\u4EE3\u7406\u7AEF\u53E3\u3001\u5C40\u57DF\u7F51 IPv4\u3001Cloudflare Anycast \u5EF6\u8FDF\u4EE5\u53CA\u56FD\u5185 npmmirror \u955C\u50CF\u6E90\u8FDE\u901A\u6027\u3002": "Checks the local reverse-proxy port, LAN IPv4, Cloudflare Anycast latency and npmmirror connectivity.",
  "\u6B63\u5728\u63A2\u6D4B\u8FDE\u901A\u6027\u2026": "Probing connectivity\u2026",
  "\u{1F504} \u91CD\u65B0\u8BCA\u65AD\u7F51\u7EDC": "\u{1F504} Run diagnostics again",
  "\u{1F50D} \u5F00\u59CB\u4E00\u952E\u8BCA\u65AD": "\u{1F50D} Run diagnostics",
  "\u2713 \u6240\u6709\u7F51\u7EDC\u63A2\u6D4B\u9879\u6B63\u5E38": "\u2713 All network checks passed",
  "\u25B2 \u68C0\u6D4B\u5230\u90E8\u5206\u5EF6\u8FDF\u8F83\u9AD8\u6216\u5F02\u5E38": "\u25B2 Some checks show high latency or errors",
  "\u6B63\u5728\u6267\u884C\u7F51\u7EDC\u7AEF\u53E3\u4E0E\u4E91\u7AEF\u8282\u70B9\u8FDE\u901A\u6027\u63A2\u6D4B\u2026": "Probing local ports and cloud endpoints\u2026",
  "\u2713 \u5907\u4EFD\u6587\u4EF6\u5DF2\u6210\u529F\u5BFC\u51FA\u5E76\u4E0B\u8F7D\u5230\u672C\u5730\uFF01": "\u2713 Backup exported and downloaded!",
  "\u5BFC\u51FA\u5907\u4EFD\u5931\u8D25": "Export failed",
  "\u5BFC\u51FA\u5F02\u5E38": "Export error",
  "\u2713 \u914D\u7F6E\u5DF2\u6210\u529F\u5BFC\u5165\u5E76\u5237\u65B0\u751F\u6548\uFF01": "\u2713 Configuration imported and applied!",
  "\u5BFC\u5165\u914D\u7F6E\u5931\u8D25": "Import failed",
  "\u5BFC\u5165\u89E3\u6790\u5931\u8D25: ${reason}": "Failed to parse the import: ${reason}",
  "\u{1F5C4}\uFE0F \u5168\u5C40\u914D\u7F6E\u5907\u4EFD\u4E0E\u6062\u590D": "\u{1F5C4}\uFE0F Global configuration backup & restore",
  "\u652F\u6301\u4E00\u952E\u5BFC\u51FA\u6216\u5BFC\u5165\u6062\u590D\u672C\u63D2\u4EF6\u6240\u6709\u914D\u7F6E\uFF08\u5305\u542B\u5404 IM \u5E73\u53F0\u51ED\u8BC1\u3001\u6388\u6743\u767D\u540D\u5355\u3001\u516C\u7F51\u96A7\u9053\u4E0E\u5B89\u5168\u8BA4\u8BC1\u89C4\u5219\uFF09\u3002": "Export or restore the plugin's full configuration in one click (IM credentials, allowlists, public tunnel and access-protection rules).",
  "\u6B63\u5728\u5BFC\u51FA\u2026": "Exporting\u2026",
  "\u{1F4E5} \u5BFC\u51FA\u914D\u7F6E\u5907\u4EFD (.json)": "\u{1F4E5} Export backup (.json)",
  "\u6B63\u5728\u5BFC\u5165\u2026": "Importing\u2026",
  "\u{1F4E4} \u5BFC\u5165\u914D\u7F6E\u6062\u590D": "\u{1F4E4} Import configuration",
  "\u2022 \u8FDB\u884C\u4E2D\u7684\u4F1A\u8BDD ${count} \u4E2A\uFF1A": "\u2022 Running sessions: ${count}",
  "${count} \u6B21\u5DE5\u5177\u8C03\u7528": ["${count} tool call", "${count} tool calls"],
  "\uFF08\u6700\u8FD1\uFF1A${tool}\uFF09": " (most recent: ${tool})",
  "\u601D\u8003\u4E2D": "Thinking",
  "    - ${title}\uFF08\u7B2C ${turn} \u8F6E\uFF0C${detail}\uFF09": "    - ${title} (turn ${turn}, ${detail})",
  "    \u2026\u7B49\u5171 ${count} \u4E2A": "    \u2026and ${count} more",
  "\u2022 \u8FDB\u884C\u4E2D\u7684\u5B50\u4EE3\u7406/agent \u4EFB\u52A1 ${count} \u4E2A\uFF1A": "\u2022 Running subagent tasks: ${count}",
  "\u2022 \u5F85\u5BA1\u6279\u8BF7\u6C42 ${count} \u4E2A\uFF1A": "\u2022 Pending approvals: ${count}",
  "\u26A0\uFE0F \u68C0\u6D4B\u5230\u6709\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\uFF0C\u91CD\u542F\u4F1A\u4E2D\u65AD\u5B83\u4EEC\uFF1A\n\n${list}\n\n\u4E2D\u65AD\u540E\u53EF\u80FD\u9700\u8981\u91CD\u65B0\u53D1\u8D77\u3002\u786E\u5B9A\u8981\u7EE7\u7EED\u91CD\u542F\u5417\uFF1F": "\u26A0\uFE0F Tasks are still running; restarting will interrupt them:\n\n${list}\n\nThey may need to be restarted afterwards. Continue?",
  "\u6B63\u5728\u5411 DSH \u670D\u52A1\u53D1\u9001\u91CD\u542F\u6307\u4EE4\u2026": "Sending the restart command to DSH\u2026",
  "DSH \u670D\u52A1\u6B63\u5728\u91CD\u542F\u4E2D\uFF0C\u6B63\u5728\u81EA\u52A8\u91CD\u65B0\u8FDE\u63A5\u2026": "DSH is restarting \u2014 reconnecting automatically\u2026",
  "\u{1F389} \u91CD\u542F\u6210\u529F\uFF01\u5DF2\u91CD\u65B0\u5EFA\u7ACB\u8FDE\u63A5\uFF0C\u6B63\u5728\u5237\u65B0\u9875\u9762\u2026": "\u{1F389} Restart succeeded \u2014 connection restored, refreshing\u2026",
  "\u91CD\u8FDE\u7B49\u5F85\u8D85\u65F6\uFF0C\u8BF7\u624B\u52A8\u5237\u65B0\u9875\u9762\u3002": "Reconnect timed out; please refresh the page manually.",
  "\u5F53\u524D\u6709\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\uFF0C\u91CD\u542F\u4F1A\u4E2D\u65AD\u5B83\u4EEC\u3002\u786E\u5B9A\u7EE7\u7EED\u5417\uFF1F": "Tasks are still running; restarting will interrupt them. Continue?",
  "\u672A\u77E5\u539F\u56E0": "Unknown cause",
  "\u{1F504} DSH \u670D\u52A1\u5E73\u6ED1\u91CD\u542F": "\u{1F504} Graceful DSH restart",
  "\u4F18\u96C5\u9000\u51FA\u5E76\u91CD\u65B0\u62C9\u8D77\u5F53\u524D DSH \u8FDB\u7A0B\u4E0E\u6240\u6709\u63D2\u4EF6\u670D\u52A1\uFF0C\u524D\u7AEF\u5C06\u5728\u51E0\u79D2\u540E\u81EA\u52A8\u63A2\u6D4B\u91CD\u8FDE\u5E76\u5237\u65B0\u9875\u9762\u3002": "Gracefully exits and restarts the DSH process and all plugin services; the front end reconnects automatically within seconds and refreshes the page.",
  "\u{1F504} \u7ACB\u5373\u91CD\u542F DSH \u670D\u52A1": "\u{1F504} Restart DSH now",
  "\u6B63\u5728\u8C03\u5EA6\u2026": "Scheduling\u2026",
  "\u{1F4F1} \u79FB\u52A8\u7AEF\u9875\u9762\u6539\u5199\u5C42": "\u{1F4F1} Mobile page-rewrite layer",
  "\u63A7\u5236\u624B\u673A\u7AEF\u9876\u680F\u3001\u5168\u5C40\u79FB\u52A8\u6837\u5F0F\u3001\u8F93\u5165\u6846\u6298\u53E0\u7B49\u9875\u9762\u6539\u5199\u3002\u5173\u95ED\u540E\u4EC5\u4FDD\u7559\u8FDC\u7A0B\u8BBF\u95EE/\u96A7\u9053/\u673A\u5668\u4EBA\u529F\u80FD\uFF0C\u5237\u65B0\u9875\u9762\u751F\u6548\u3002": "Controls the mobile top bar, global mobile styling and input collapse. When off, only remote access / tunnel / bot features remain; refresh to apply.",
  "\u5F53\u524D\u5BBF\u4E3B\u5DF2\u5168\u5C40\u5173\u95ED\u6B64\u5C42\uFF08mobileUi:false\uFF09\uFF0C\u6B64\u5904\u4E0D\u53EF\u5F00\u542F\u3002": "The host has disabled this layer globally (mobileUi:false); it cannot be enabled here.",
  "\u5173\u95ED\u9875\u9762\u6539\u5199": "Disable page rewrite",
  "\u5F00\u542F\u9875\u9762\u6539\u5199": "Enable page rewrite",
  "\u5BBF\u4E3B\u5DF2\u5173\u95ED": "Disabled by host",
  "\u5F53\u524D\uFF1A${state}": "Current: ${state}",
  "\u4FDD\u5B58\u5931\u8D25\uFF1A${reason}": "Save failed: ${reason}",
  "\u{1F5C2}\uFE0F \u8FDC\u7A0B\u5DE5\u4F5C\u533A\u7BA1\u7406 (\u76EE\u5F55\u6D4F\u89C8\u5668)": "\u{1F5C2}\uFE0F Remote workspace management (directory browser)",
  "\u5728\u79FB\u52A8\u7AEF\u6216\u8FDC\u7A0B\u8BBE\u5907\u4E0A\u53EF\u89C6\u70B9\u9009\u7535\u8111\u4E0A\u7684\u6587\u4EF6\u5939\u6216\u76F4\u63A5\u8F93\u5165\u8DEF\u5F84\u6DFB\u52A0\u81F3 DSH\u3002": "Pick folders on the computer visually from a phone or remote device, or type a path, and add it to DSH.",
  "+ \u8FDC\u7A0B\u6DFB\u52A0\u5DE5\u4F5C\u533A": "+ Add remote workspace",
  "\u6B63\u5728\u8BFB\u53D6\u5DE5\u4F5C\u533A\u5217\u8868\u2026": "Reading the workspace list\u2026",
  "\u6682\u65E0\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A\uFF0C\u70B9\u51FB\u53F3\u4E0A\u89D2\u300C+ \u8FDC\u7A0B\u6DFB\u52A0\u5DE5\u4F5C\u533A\u300D\u5373\u53EF\u6D4F\u89C8\u6DFB\u52A0\u3002": "No workspaces registered yet \u2014 use \u201C+ Add remote workspace\u201D above to browse and add one.",
  "\u6B63\u5728\u8C03\u5EA6 DSH \u670D\u52A1\u91CD\u542F\u2026": "Scheduling the DSH restart\u2026",
  "\u{1F389} \u91CD\u542F\u6210\u529F\uFF01\u5DF2\u81EA\u52A8\u52A0\u8F7D\u6700\u65B0\u7248\u672C\u3002\u6B63\u5728\u5237\u65B0\u9875\u9762\u2026": "\u{1F389} Restart succeeded \u2014 the latest version is loaded. Refreshing\u2026",
  "\u5DF2\u6210\u529F\u5347\u7EA7\u5230 v${version}\uFF01": "Upgraded to v${version}!",
  "\u5347\u7EA7\u5931\u8D25": "Upgrade failed",
  "\u5347\u7EA7\u8BF7\u6C42\u5931\u8D25": "Upgrade request failed",
  "DSH \u5DF2\u6210\u529F\u5347\u7EA7\u5230 v${version}\uFF01": "DSH upgraded to v${version}!",
  "\u66F4\u65B0\u65E5\u5FD7": "Changelog",
  "\u53CD\u9988 Issue": "Report an issue",
  "\u7248\u672C\u68C0\u67E5\u4E2D\u2026": "Checking versions\u2026",
  "\xB7 \u5DF2\u662F\u6700\u65B0": "\xB7 Up to date",
  "(\u7F51\u7EDC\u8D85\u65F6)": "(network timeout)",
  "\u53D1\u73B0 DSH \u65B0\u7248\u672C v${version}": "DSH v${version} is available",
  "\u91CD\u65B0\u68C0\u67E5 npm \u7EBF\u4E0A\u7248\u672C": "Re-check the npm version",
  "\u68C0\u67E5\u4E2D\u2026": "Checking\u2026",
  "\u68C0\u67E5\u66F4\u65B0": "Check for updates",
  "\u53D1\u73B0\u65B0\u7248\u672C v${latest}\uFF08\u5F53\u524D v${current}\uFF09": "v${latest} is available (current v${current})",
  "\u6B63\u5728\u81EA\u52A8\u5347\u7EA7\u2026": "Upgrading automatically\u2026",
  "\u2713 \u5347\u7EA7\u5B8C\u6210": "\u2713 Upgrade complete",
  "\u4E00\u952E\u5347\u7EA7\u5230 v${version}": "Upgrade to v${version}",
  "\u2728 \u66F4\u65B0\u4EAE\u70B9\uFF1A": "\u2728 Highlights:",
  "\u5DF2\u6210\u529F\u5347\u7EA7\u5230 v${version}\uFF01\u9700\u8981\u91CD\u542F DSH \u670D\u52A1\u4F7F\u65B0\u7248\u672C\u751F\u6548": "Upgraded to v${version}! Restart the DSH service for it to take effect",
  "\u7A0D\u540E\u624B\u52A8\u91CD\u542F": "Restart manually later",
  "\u6B63\u5728\u5904\u7406\u2026": "Working\u2026",
  "\u25B4 \u6298\u53E0\u624B\u52A8\u547D\u4EE4\u884C": "\u25B4 Hide manual commands",
  "\u25BE \u67E5\u770B\u624B\u52A8\u5347\u7EA7\u547D\u4EE4 (\u5982\u9700)": "\u25BE Show manual upgrade commands (if needed)",
  "DSH \u6709\u65B0\u7248\u672C v${latest}\uFF08\u5F53\u524D v${current}\uFF09": "DSH v${latest} is available (current v${current})",
  "\u6B63\u5728\u5347\u7EA7 DSH\u2026": "Upgrading DSH\u2026",
  "\u2713 DSH \u5347\u7EA7\u5B8C\u6210": "\u2713 DSH upgrade complete",
  "\u4E00\u952E\u5347\u7EA7 DSH \u5230 v${version}": "Upgrade DSH to v${version}",
  "\u67E5\u770B\u5B98\u65B9\u5347\u7EA7\u65B9\u5F0F \u2197": "See the official upgrade instructions \u2197",
  "\u5347\u7EA7 DSH \u547D\u4EE4\u884C\u5DE5\u5177\u540E\u9700\u91CD\u542F DSH \u670D\u52A1\u751F\u6548\u3002": "Restart the DSH service after upgrading the CLI for it to take effect.",
  "\u5F53\u524D DSH \u975E npm \u5168\u5C40\u5B89\u88C5\uFF0C\u65E0\u6CD5\u4E00\u952E\u81EA\u52A8\u5347\u7EA7\uFF0C\u8BF7\u6309\u5B98\u65B9\u6E20\u9053\u624B\u52A8\u66F4\u65B0\u3002": "This DSH is not a global npm install, so one-click upgrade is unavailable \u2014 update manually through the official channel.",
  "\u5C40\u57DF\u7F51": "LAN",
  "\u516C\u7F51\u96A7\u9053": "Public tunnel",
  "IM \u673A\u5668\u4EBA": "IM bots",
  "\u5B89\u5168\u8BA4\u8BC1": "Security",
  "\u8FD0\u7EF4\u76D1\u63A7": "Operations",
  "\u8BBF\u95EE\u4F1A\u8BDD\u5DF2\u5931\u6548\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u91CD\u65B0\u767B\u5F55": "Your access session expired; refresh the page and sign in again",
  "listPlatforms \u67E5\u8BE2\u5931\u8D25": "Failed to load the platform list",
  "\u5C40\u57DF\u7F51\u8BBF\u95EE": "LAN access",
  "\u540C\u4E00 Wi-Fi \u4E0B\u7684\u8BBE\u5907\u53EF\u76F4\u63A5\u626B\u7801\u8BBF\u95EE": "Devices on the same Wi-Fi can scan and connect directly",
  "\u56FA\u5B9A\u57DF\u540D\u6A21\u5F0F": "Fixed-domain mode",
  "\u514D\u767B\u5F55\u4E34\u65F6\u57DF\u540D": "Temporary domain (no login)",
  "\u81EA\u5EFA\u96A7\u9053": "Self-hosted tunnel",
  "VPS \u81EA\u5EFA \xB7 \u56FA\u5B9A\u5730\u5740": "Self-hosted on a VPS \xB7 fixed address",
  "Cloudflare \u96A7\u9053": "Cloudflare tunnel",
  "\u81EA\u884C\u90E8\u7F72\u767B\u8BB0": "Register an existing deployment",
  "\u53E6\u6709 ${count} \u4E2A\u96A7\u9053\u5165\u53E3\u5728\u8FD0\u884C\uFF0C\u53EF\u5728\u4E0B\u65B9\u300C\u96A7\u9053\u914D\u7F6E\u300D\u4E2D\u67E5\u770B\u4E0E\u7BA1\u7406": ["${count} more tunnel entry is running \u2014 see \u201CTunnel configuration\u201D below", "${count} more tunnel entries are running \u2014 see \u201CTunnel configuration\u201D below"],
  "\u56FA\u5B9A\u57DF\u540D\u6A21\u5F0F\uFF08Token \u8FD0\u884C \xB7 \u91CD\u542F URL \u4FDD\u6301\u4E0D\u53D8\uFF09": "Fixed-domain mode (Token-based \xB7 URL survives restarts)",
  "\u4E00\u952E\u83B7\u53D6\u516C\u7F51\u5730\u5740\uFF08\u514D\u767B\u5F55\u4E34\u65F6\u968F\u673A\u57DF\u540D\uFF09": "Get a public URL in one click (random temporary domain, no login)",
  "\u8FDE\u63A5\u81EA\u5DF1\u90E8\u7F72\u7684\u96A7\u9053\u670D\u52A1\u5668\uFF0C\u83B7\u5F97\u56FA\u5B9A\u57DF\u540D": "Connect to your own tunnel server for a fixed domain",
  "\u98DE\u4E66": "Lark / Feishu",
  "\u626B\u7801\u4E00\u952E\u521B\u5EFA \xB7 \u659C\u6760\u6307\u4EE4 \xB7 \u6587\u6863\u8BC4\u8BBA": "One-tap QR setup \xB7 slash commands \xB7 doc comments",
  "\u5FAE\u4FE1": "WeChat",
  "ClawBot \u626B\u7801\u76F4\u8FDE \xB7 \u65E0\u9700\u516C\u7F51": "ClawBot QR direct connect \xB7 no public server needed",
  "\u626B\u7801\u4E00\u952E\u7ED1\u5B9A \xB7 \u5B98\u65B9 SDK \xB7 \u79C1\u804A/\u7FA4\u804A/\u6309\u94AE": "One-tap QR binding \xB7 official SDK \xB7 DMs, groups and buttons",
  "\u5B98\u65B9 Bot API": "Official Bot API",
  "\u5E73\u53F0\u6E05\u5355\u52A0\u8F7D\u5931\u8D25\uFF1A${reason}": "Failed to load the platform list: ${reason}",
  "\u91CD\u8BD5": "Retry",
  "\u6570\u636E\u7F3A\u5931": "Missing data",
  // 同平台多账号（issue #78）
  "\u672A\u6DFB\u52A0\u8D26\u53F7": "No accounts",
  "${count} \u4E2A\u8D26\u53F7": ["${count} account", "${count} accounts"],
  "\u8D26\u53F7\u5217\u8868\uFF08${count} \u4E2A\uFF09": "Accounts (${count})",
  "\u8D26\u53F7 ${index}/${total}": "Account ${index}/${total}",
  "\uFF0B \u6DFB\u52A0\u8D26\u53F7": "+ Add account",
  "\u6DFB\u52A0\u4E2D\u2026": "Adding\u2026",
  "\u6DFB\u52A0\u8D26\u53F7\u5931\u8D25": "Failed to add the account",
  "\u6DFB\u52A0\u4E00\u4E2A\u65B0\u8D26\u53F7\uFF08\u540C\u4E00\u5E73\u53F0\u53EF\u63A5\u5165\u591A\u4E2A\u8D26\u53F7\uFF09": "Add another account (a platform can host multiple accounts)",
  "\u8FD8\u6CA1\u6709\u6DFB\u52A0\u300C${name}\u300D\u8D26\u53F7": "No ${name} account added yet",
  "\u6DFB\u52A0\u8D26\u53F7\u540E\u53EF\u586B\u5199\u8BE5\u8D26\u53F7\u7684\u51ED\u8BC1\u5E76\u72EC\u7ACB\u8FDE\u63A5\uFF1B\u540C\u4E00\u5E73\u53F0\u652F\u6301\u540C\u65F6\u63A5\u5165\u591A\u4E2A\u8D26\u53F7\uFF0C\u51ED\u8BC1\u3001\u767D\u540D\u5355\u4E0E\u4F1A\u8BDD\u5F52\u5C5E\u4E92\u4E0D\u5F71\u54CD\u3002": "After adding an account, fill in its credentials to connect it independently. A platform can host multiple accounts with separate credentials, allowlists and session bindings.",
  "\u6BCF\u4E2A\u5E73\u53F0\u6700\u591A ${limit} \u4E2A\u8D26\u53F7": "Up to ${limit} accounts per platform",
  "\u5DF2\u8FBE\u5355\u5E73\u53F0\u8D26\u53F7\u4E0A\u9650\uFF08\u6700\u591A ${limit} \u4E2A\uFF09": "Account limit reached for this platform (max ${limit})",
  "\u5907\u6CE8\u540D\uFF08\u53EF\u9009\uFF0C\u7528\u4E8E\u533A\u5206\u540C\u5E73\u53F0\u591A\u4E2A\u8D26\u53F7\uFF09": "Note name (optional, tells same-platform accounts apart)",
  "\u79FB\u9664\u8D26\u53F7": "Remove account",
  "\u79FB\u9664\u8D26\u53F7\u5931\u8D25": "Failed to remove the account",
  "\u505C\u6B62\u8BE5\u8D26\u53F7\u5E76\u5220\u9664\u5176\u914D\u7F6E\u4E0E\u4F1A\u8BDD\u5F52\u5C5E\uFF08\u4E0D\u4F1A\u5220\u9664 DSH \u4F1A\u8BDD\u672C\u8EAB\uFF09": "Stop this account and delete its configuration and session binding (the DSH session itself is not deleted)",
  "\u786E\u8BA4\u79FB\u9664\u8D26\u53F7\u300C${name}\u300D\uFF1F\u5C06\u505C\u6B62\u8BE5\u8D26\u53F7\u5E76\u5220\u9664\u5176\u914D\u7F6E\u4E0E\u4F1A\u8BDD\u5F52\u5C5E\uFF1BDSH \u4F1A\u8BDD\u672C\u8EAB\u4E0D\u4F1A\u88AB\u5220\u9664\u3002": "Remove the account \u201C${name}\u201D? This stops it and deletes its configuration and session binding; the DSH session itself is not deleted.",
  "\u672A\u914D\u7F6E\u51ED\u8BC1 \u2014 \u8BF7\u5148\u5B8C\u6210\u4E0B\u65B9\u914D\u7F6E\u3002": "No credentials configured \u2014 complete the setup below first.",
  "\u8BBF\u95EE\u5BC6\u7801": "access password",
  "\u8BF7\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\u7BA1\u7406\u6743\u9650\u3002": "Enter the admin password to unlock management.",
  "\u5F53\u524D\u672A\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801\uFF0C\u8F93\u5165\u60A8\u7684\u8BBF\u95EE\u5BC6\u7801\u5373\u53EF\u89E3\u9501\u3002": "No dedicated admin password is set; enter your access password to unlock.",
  "\u7BA1\u7406\u63A7\u5236\u53F0\u5DF2\u9501\u5B9A\uFF08\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\uFF09": "Admin console locked (this computer only)",
  "\u5F53\u524D\u8BBE\u5907\u901A\u8FC7\u8FDC\u7A0B\u5C40\u57DF\u7F51\u6216\u516C\u7F51\u63A5\u5165\u3002\u5DF2\u5F00\u542F\u300C\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\u300D\u6700\u9AD8\u5B89\u5168\u7B56\u7565\uFF0C\u8FDC\u7A0B\u8BBE\u5907\u7981\u6B62\u67E5\u770B\u4E0E\u4FEE\u6539\u4EFB\u4F55\u7F51\u7EDC\u4E0E\u673A\u5668\u4EBA\u914D\u7F6E\u3002\u5982\u9700\u7BA1\u7406\u8BF7\u5728\u7535\u8111\u672C\u673A\uFF08127.0.0.1\uFF09\u4E0A\u64CD\u4F5C\u3002": "This device is connected over the LAN or the public internet. The strictest policy \u201CThis computer only\u201D is on: remote devices may not view or change any network or bot settings. Manage from the computer itself (127.0.0.1).",
  "\u2753 \u8FDC\u7A0B\u5982\u4F55\u6551\u6025\u89E3\u9664\u9501\u5B9A\uFF1F": "\u2753 How do I unlock in an emergency?",
  "\u{1F6DF} \u6551\u6025\u89E3\u9664\u9501\u5B9A\u6307\u5F15\uFF1A": "\u{1F6DF} Emergency unlock guide:",
  "\u7535\u8111\u672C\u673A\u76F4\u8FDE\u4FEE\u6539": "On the computer itself",
  "\uFF1A\u76F4\u63A5\u5728\u8FD0\u884C\u672C\u7A0B\u5E8F\u7684\u7535\u8111\u672C\u673A\u6253\u5F00\u672C\u63A7\u5236\u53F0\uFF08127.0.0.1 \u4EAB\u6709\u7269\u7406\u514D\u9501\u7279\u6743\uFF09\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u7B56\u7565\u6216\u6E05\u9664\u5BC6\u7801\u3002": ": open this console on the machine running DSH (127.0.0.1 is exempt from locking) to change the policy or clear the password at any time.",
  "\u670D\u52A1\u5668 / \u65E0\u5934\u73AF\u5883": "Server / headless environment",
  "\uFF1A\u6551\u6025\u91CD\u7F6E\u6B65\u9AA4\u53C2\u89C1 GitHub README \u7684\u300C\u4E09\u91CD\u5BB9\u707E\u4FDD\u547D\u4F53\u7CFB\u300D\u7AE0\u8282\u3002": ": see the emergency-reset steps in the \u201CTriple Disaster Recovery (Never Locked Out)\u201D section of the English README.",
  "\u7BA1\u7406\u63A7\u5236\u53F0\u5DF2\u9501\u5B9A": "Admin console locked",
  "\u{1F511} \u4F7F\u7528\u7BA1\u7406\u5BC6\u7801\u89E3\u9501": "\u{1F511} Unlock with the admin password",
  "\u{1F510} \u4F7F\u7528\u8BBF\u95EE\u5BC6\u7801\u89E3\u9501": "\u{1F510} Unlock with the access password",
  "\u5F53\u524D\u8BBE\u5907\u4E3A\u8FDC\u7A0B\u8BBF\u95EE\u3002\u4E3A\u4FDD\u62A4\u60A8\u7684\u7F51\u7EDC\u4E0E\u5E73\u53F0\u914D\u7F6E\u5B89\u5168\uFF0C${hint}": "This is a remote device. To protect your network and platform configuration, ${hint}",
  "\u8F93\u5165${kind}": "Enter the ${kind}",
  "\u9A8C\u8BC1\u4E2D\u2026": "Verifying\u2026",
  "\u89E3\u9501\u7BA1\u7406\u6743\u9650": "Unlock management",
  "\u2753 \u5FD8\u8BB0${kind}\uFF1F": "\u2753 Forgot the ${kind}?",
  "\u{1F6DF} \u627E\u56DE\u4E0E\u91CD\u7F6E${kind}\u6307\u5F15\uFF1A": "\u{1F6DF} Recover or reset your ${kind}:",
  "\uFF1A\u76F4\u63A5\u5728\u8FD0\u884C\u672C\u7A0B\u5E8F\u7684\u7535\u8111\u672C\u673A\u6253\u5F00\u672C\u63A7\u5236\u53F0\uFF08127.0.0.1 \u4EAB\u6709\u7269\u7406\u514D\u9501\u7279\u6743\uFF09\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u6216\u6E05\u9664\u5BC6\u7801\u3002": ": open this console on the machine running DSH (127.0.0.1 is exempt from locking) to change or clear the password at any time.",
  "\u{1F511} \u7ACB\u5373\u8F93\u5165${kind}\u89E3\u9501": "\u{1F511} Enter the ${kind} to unlock",
  "\u{1F513} \u7BA1\u7406\u5458\u6743\u9650\u5DF2\u89E3\u9501\uFF08\u5F53\u524D\u4E34\u65F6\u4F1A\u8BDD\u6709\u6548\uFF09": "\u{1F513} Admin access unlocked (valid for this temporary session)",
  "\u{1F512} \u91CD\u65B0\u9501\u5B9A\u540E\u53F0": "\u{1F512} Lock the console again",
  "\u{1F512} \u540E\u53F0\u7BA1\u7406\u6743\u9650\u672A\u89E3\u9501\uFF08\u4FEE\u6539\u654F\u611F\u914D\u7F6E\u9700\u5148\u89E3\u9501\uFF09": "\u{1F512} Admin access is locked (unlock before changing sensitive settings)",
  "\u26A0\uFE0F \u5C1A\u672A\u8BBE\u7F6E\u4EFB\u4F55\u8BBF\u95EE\u5BC6\u7801 / \u7BA1\u7406\u5BC6\u7801\uFF0C\u8FDC\u7A0B\u8BBF\u5BA2\u53EF\u514D\u5BC6\u8FDB\u5165\uFF01": "\u26A0\uFE0F No access or admin password is set \u2014 remote visitors can enter without one!",
  "\u{1F511} \u89E3\u9501\u7BA1\u7406\u6743\u9650": "\u{1F511} Unlock management",
  "\u{1F510} \u7ACB\u5373\u8BBE\u7F6E\u5BC6\u7801": "\u{1F510} Set a password now",
  "\u{1F512} \u89E3\u9501\u540E\u53F0\u7BA1\u7406\u6743\u9650": "\u{1F512} Unlock admin access",
  "\u5F53\u524D\u64CD\u4F5C\u9700\u8981\u540E\u53F0\u7BA1\u7406\u5458\u6743\u9650\u3002\u4E3A\u4FDD\u62A4\u60A8\u7684\u7F51\u7EDC\u914D\u7F6E\u4E0E\u673A\u5668\u4EBA\u5E73\u53F0\u5B89\u5168\uFF0C\u8BF7\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\uFF1A": "This action requires admin access. To protect your network configuration and bot platforms, enter the admin password to unlock:",
  "\u5F53\u524D\u64CD\u4F5C\u9700\u8981\u540E\u53F0\u7BA1\u7406\u6743\u9650\u3002\u672A\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801\uFF0C\u8F93\u5165\u60A8\u7684\u8BBF\u95EE\u5BC6\u7801\u5373\u53EF\u89E3\u9501\uFF1A": "This action requires admin access. No dedicated admin password is set; enter your access password to unlock:",
  "\u53D6\u6D88": "Cancel",
  "\u7ACB\u5373\u89E3\u9501": "Unlock now",
  "\u{1F4A1} \u63D0\u793A\uFF1A\u82E5\u672A\u5355\u72EC\u914D\u7F6E\u7BA1\u7406\u5BC6\u7801\uFF0C\u8BF7\u8F93\u5165\u521D\u6B21\u8BBE\u7F6E\u7684\u8BBF\u95EE\u5BC6\u7801\uFF1B\u7535\u8111\u672C\u673A\uFF08127.0.0.1\uFF09\u8BBF\u95EE\u4EAB\u6709\u514D\u5BC6\u7BA1\u7406\u7279\u6743\u3002": "\u{1F4A1} Tip: if no dedicated admin password is set, enter the access password you configured first; access from 127.0.0.1 on this computer needs no unlock.",
  "\u9009\u62E9\u7535\u8111\u5DE5\u4F5C\u533A": "Choose a workspace on your computer",
  "\u70B9\u51FB\u8FDB\u5165\u6587\u4EF6\u5939\uFF0C\u6216\u70B9\u51FB\u300C+ \u9009\u4E3A\u5DE5\u4F5C\u533A\u300D\u76F4\u63A5\u6DFB\u52A0\u5E76\u5207\u6362": "Open a folder, or tap \u201C+ Use as workspace\u201D to add and switch directly",
  "\u{1F512} \u6B64\u64CD\u4F5C\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650": "\u{1F512} Admin access required",
  "\u8FDC\u7A0B\u8BBF\u95EE\u65F6\u6D4F\u89C8/\u6DFB\u52A0\u5DE5\u4F5C\u533A\u9700\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\uFF08\u4E0E\u8BBF\u95EE\u5BC6\u7801\u4E0D\u540C\uFF09\u3002": "Browsing or adding workspaces remotely requires the admin password (different from the access password).",
  "\u8BF7\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801": "Enter the admin password",
  "\u89E3\u9501\u4E2D\u2026": "Unlocking\u2026",
  "\u89E3\u9501": "Unlock",
  "\u8FD4\u56DE\u4E0A\u4E00\u7EA7": "Go up one level",
  "\u2B06\uFE0F \u4E0A\u7EA7": "\u2B06\uFE0F Up",
  "\u5237\u65B0\u76EE\u5F55": "Refresh directory",
  "\u5F53\u524D\u76EE\u5F55:": "Current directory:",
  "\u6B63\u5728\u6DFB\u52A0\u5E76\u5207\u6362\u2026": "Adding and switching\u2026",
  "\u{1F449} \u8BBE\u4E3A\u5F53\u524D\u5DE5\u4F5C\u533A\u5E76\u8FDB\u5165": "\u{1F449} Use as workspace and enter",
  "\u8FC7\u6EE4\u5B50\u6587\u4EF6\u5939\u2026": "Filter subfolders\u2026",
  "${count} \u4E2A\u6587\u4EF6\u5939": ["${count} folder", "${count} folders"],
  "\u6B63\u5728\u8BFB\u53D6\u76EE\u5F55\u5185\u5BB9\u2026": "Reading directory\u2026",
  "\u672A\u627E\u5230\u5339\u914D\u7684\u5B50\u6587\u4EF6\u5939": "No matching subfolders",
  "\u5F53\u524D\u6587\u4EF6\u5939\u4E0B\u6CA1\u6709\u66F4\u591A\u5B50\u6587\u4EF6\u5939": "No more subfolders here",
  "\uFF08\u76F4\u63A5\u70B9\u51FB\u4E0A\u65B9\u84DD\u8272\u6309\u94AE\u5373\u53EF\u8FDB\u5165\u5F53\u524D\u76EE\u5F55\uFF09": "(tap the blue button above to enter the current directory)",
  "\u76F4\u63A5\u6DFB\u52A0\u6B64\u5B50\u6587\u4EF6\u5939\u4E3A\u5DE5\u4F5C\u533A\u5E76\u8FDB\u5165": "Add this subfolder as a workspace and enter",
  "+ \u9009\u4E3A\u5DE5\u4F5C\u533A": "+ Use as workspace",
  "\u25BC \u6536\u8D77\u7EDD\u5BF9\u8DEF\u5F84\u624B\u52A8\u8F93\u5165": "\u25BC Hide manual path input",
  "\u25B6 \u624B\u52A8\u7C98\u8D34/\u8F93\u5165\u7EDD\u5BF9\u8DEF\u5F84": "\u25B6 Paste / type an absolute path",
  "\u8F93\u5165\u7535\u8111\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u4F8B\u5982 C:\\Projects\\my-app": "Enter an absolute path on your computer, e.g. C:\\Projects\\my-app",
  "\u524D\u5F80": "Go",
  "\u6DFB\u52A0\u5E76\u8FDB\u5165": "Add and enter",
  "\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A (${count} \u4E2A\uFF0C\u70B9\u51FB\u76F4\u63A5\u5207\u6362)\uFF1A": "Registered workspaces (${count}, tap to switch):",
  "\u8FDB\u5165 \u2794": "Enter \u2794",
  "\u{1F4A1} \u70B9\u51FB\u6587\u4EF6\u5939\u53EF\u9010\u7EA7\u8FDB\u5165": "\u{1F4A1} Tap folders to drill down",
  "\u89E3\u9501\u5931\u8D25": "Unlock failed",
  "\u6B63\u5728\u5207\u6362\u5DE5\u4F5C\u533A\u2026": "Switching workspace\u2026",
  "\u2713 \u5DF2\u5207\u6362\u81F3\u5DE5\u4F5C\u533A\uFF01": "\u2713 Switched to the workspace!",
  "\u8BFB\u53D6\u76EE\u5F55\u5931\u8D25": "Failed to read the directory",
  "\u5F53\u524D\u7B56\u7565\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\uFF0C\u8FDC\u7A0B\u65E0\u6CD5\u89E3\u9501": "The current policy is \u201Cthis computer only\u201D; remote unlock is unavailable",
  "\u8BF7\u8F93\u5165\u6216\u9009\u62E9\u5DE5\u4F5C\u533A\u8DEF\u5F84": "Enter or choose a workspace path",
  "\u2713 \u5DE5\u4F5C\u533A\u300C${name}\u300D\u5DF2\u9009\u5B9A\uFF0C\u6B63\u5728\u5207\u6362\u2026": "\u2713 Workspace \u201C${name}\u201D selected, switching\u2026",
  "\u6DFB\u52A0\u5DE5\u4F5C\u533A\u5931\u8D25": "Failed to add the workspace",
  "\u6DFB\u52A0\u5DE5\u4F5C\u533A\u5F02\u5E38": "Workspace add error",
  "\u8FDC\u7A0B\u8BBF\u95EE": "Remote access",
  "\u7BA1\u7406\u5458\u5BC6\u7801\u9519\u8BEF": "Incorrect admin password",
  "\u89E3\u9501\u8BF7\u6C42\u5931\u8D25": "Unlock request failed",
  "IPv4\uFF084\uFF09": "IPv4 (4)",
  "IPv6\uFF086\uFF09": "IPv6 (6)",
  "${label}\uFF1A${reason}": "${label}: ${reason}",
  "cloudflared\uFF1A${path}\uFF08${version} \xB7 ${source}\uFF09": "cloudflared: ${path} (${version} \xB7 ${source})",
  "\u26A1 \u81EA\u52A8\u63A8\u8350 (${ip} \xB7 ${label})": "\u26A1 Auto (recommended: ${ip} \xB7 ${label})",
  "\u5F00\u542F\u516C\u7F51\u96A7\u9053\u524D\uFF0C\u8BF7\u5148\u5728\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u4E2D\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801": "Before enabling the public tunnel, set an access password under \u201CSecurity\u201D",
  "\u53BB\u8BBE\u7F6E \u2794": "Set up \u2794",
  "\u672C\u673A\u8BBF\u95EE\u672A\u80FD\u81EA\u52A8\u83B7\u53D6\u7BA1\u7406\u4EE4\u724C\uFF08\u53EF\u80FD\u662F\u684C\u9762\u7A97\u53E3/\u81EA\u5B9A\u4E49\u534F\u8BAE\u7684\u8DE8\u6E90\u9650\u5236\uFF09\u3002\u8BF7\u6539\u7528\u7535\u8111\u6D4F\u89C8\u5668\u6253\u5F00 ${url} \u8FDB\u884C\u7BA1\u7406\u7C7B\u64CD\u4F5C\u3002": "This local page could not obtain the admin token automatically (possibly a cross-origin restriction of the desktop window or a custom protocol). Open ${url} in your computer's browser to perform admin operations.",
  "\u6253\u5F00\u63A7\u5236\u53F0 \u2197": "Open console \u2197",
  "\u77E5\u9053\u4E86": "Got it"
};
var serverEn = {
  "App ID \u4E0E App Secret \u672A\u914D\u7F6E": "App ID and App Secret are not configured",
  "\u8BF7\u586B\u5199\u5B8C\u6574\u7684 App ID \u548C App Secret\uFF0C\u6216\u4F7F\u7528\u626B\u7801\u4E00\u952E\u521B\u5EFA\u5E94\u7528": "Enter a complete App ID and App Secret, or use one-tap QR app creation",
  "Telegram Bot Token \u672A\u914D\u7F6E": "Telegram Bot Token is not configured",
  "\u8BF7\u586B\u5199\u5B8C\u6574\u7684 Telegram Bot Token": "Enter a complete Telegram Bot Token",
  "\u8BF7\u586B\u5199 QQ \u673A\u5668\u4EBA AppID \u4E0E AppSecret\uFF0C\u6216\u4F7F\u7528\u626B\u7801\u4E00\u952E\u7ED1\u5B9A": "Enter the QQ bot AppID and AppSecret, or use scan-to-bind",
  "\u4E8C\u7EF4\u7801\u5DF2\u8FC7\u671F\uFF0C\u6B63\u5728\u5237\u65B0\u2026": "QR code expired, refreshing\u2026",
  "\u64CD\u4F5C\u5DF2\u88AB\u62E6\u622A\uFF1A\u5F53\u524D\u7B56\u7565\u4E3A\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406": "Blocked: the current policy allows this computer only",
  "\u8BE5\u64CD\u4F5C\u6D89\u53CA\u654F\u611F\u914D\u7F6E\uFF1A\u8BF7\u5148\u5728\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u4E2D\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\u6216\u7BA1\u7406\u5BC6\u7801\u540E\u518D\u6267\u884C": "This action touches sensitive configuration: set an access or admin password under \u201CSecurity\u201D first",
  "\u64CD\u4F5C\u5DF2\u88AB\u62E6\u622A\uFF1A\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650\uFF0C\u8BF7\u5148\u5728\u63A7\u5236\u53F0\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501": "Blocked: admin access required \u2014 enter the admin password to unlock first",
  "AuthManager \u672A\u521D\u59CB\u5316": "AuthManager is not initialized",
  "\u4EC5\u5BC6\u7801\u6A21\u5F0F\u9700\u8981\u5148\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\uFF1A\u8BF7\u5148\u5728\u4E0B\u65B9\u300C\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u300D\u5904\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u518D\u5F00\u542F\u5B89\u5168\u9632\u62A4": "Password-only mode needs an access password: set one under \u201CExternal visitor access password\u201D below, then enable protection",
  "\u4EC5\u5BC6\u7801\u6A21\u5F0F\u9700\u8981\u5148\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\uFF1A\u8BF7\u5148\u5728\u4E0B\u65B9\u300C\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u300D\u5904\u8BBE\u7F6E\u5BC6\u7801\u540E\u518D\u5207\u6362": "Password-only mode needs an access password: set one under \u201CExternal visitor access password\u201D below, then switch modes",
  "UI \u914D\u7F6E\u6301\u4E45\u5316\u4E0D\u53EF\u7528": "UI configuration persistence is unavailable",
  "pageTweaks \u5FC5\u987B\u4E3A\u5E03\u5C14\u503C": "pageTweaks must be a boolean",
  "\u5F53\u524D\u6709\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\uFF0C\u91CD\u542F\u4F1A\u6253\u65AD\u5B83\u4EEC": "Tasks are still running; restarting will interrupt them",
  "\u5907\u4EFD\u5BFC\u51FA\u670D\u52A1\u4E0D\u53EF\u7528": "Backup export service is unavailable",
  "\u5907\u4EFD\u5BFC\u5165\u670D\u52A1\u4E0D\u53EF\u7528": "Backup import service is unavailable",
  "PlatformManager \u672A\u521D\u59CB\u5316\uFF0CIM \u5E73\u53F0\u6E05\u5355\u4E0D\u53EF\u7528": "PlatformManager is not initialized; the IM platform list is unavailable",
  "PlatformManager \u672A\u521D\u59CB\u5316": "PlatformManager is not initialized",
  "\u7F3A\u5C11 platformId \u53C2\u6570": "Missing platformId parameter",
  // 同平台多账号（issue #78）：服务端 add/remove 账号错误
  "\u5355\u4E2A\u5E73\u53F0\u6700\u591A\u6DFB\u52A0 10 \u4E2A\u8D26\u53F7": "Up to 10 accounts per platform",
  "\u7F3A\u5C11 instanceId \u53C2\u6570": "Missing instanceId parameter",
  "\u7F3A\u5C11 instanceId/platformId \u53C2\u6570": "Missing instanceId/platformId parameter",
  "\u591A\u8D26\u53F7\u80FD\u529B\u672A\u63A5\u7EBF": "Multi-account capability is not wired up",
  "\u96A7\u9053\u670D\u52A1\u5730\u5740\u5FC5\u987B\u662F ws:// \u6216 wss://\uFF08\u4E5F\u63A5\u53D7 http/https\uFF09": "The tunnel server URL must be ws:// or wss:// (http/https is also accepted)",
  "\u8BF7\u8F93\u5165\u5408\u6CD5\u7684\u516C\u7F51\u96A7\u9053\u5730\u5740\uFF08https://...\uFF09": "Enter a valid public tunnel URL (https://...)",
  "\u81EA\u5EFA\u96A7\u9053\u5DF2\u5728\u8FD0\u884C": "The self-hosted tunnel is already running",
  "\u7F3A\u5C11\u914D\u7F6E\uFF1A\u8BF7\u5728\u63A7\u5236\u53F0\u914D\u7F6E customTunnel.serverUrl \u548C customTunnel.accessToken": "Missing configuration: set customTunnel.serverUrl and customTunnel.accessToken in the console",
  "Cloudflare \u96A7\u9053\u5DF2\u5728\u8FD0\u884C": "The Cloudflare tunnel is already running",
  "\u6B63\u5728\u521D\u59CB\u5316...": "Initializing\u2026",
  "\u6B63\u5728\u81EA\u52A8\u91CD\u8FDE...": "Reconnecting automatically\u2026",
  "\u6B63\u5728\u8FDE\u63A5 Cloudflare...": "Connecting to Cloudflare\u2026",
  "\u6B63\u5728\u4E0B\u8F7D cloudflared (~30MB)...": "Downloading cloudflared (~30 MB)\u2026",
  "\u4E34\u65F6\u96A7\u9053\u5DF2\u5EFA\u7ACB": "Temporary tunnel established",
  "\u56FA\u5B9A\u96A7\u9053\u5DF2\u5EFA\u7ACB": "Fixed tunnel established",
  "\u96A7\u9053\u5DF2\u6CE8\u518C\uFF0C\u7B49\u5F85\u5C31\u7EEA...": "Tunnel registered, waiting to become ready\u2026",
  "\u96A7\u9053\u5DF2\u5EFA\u7ACB": "Tunnel established",
  "\u96A7\u9053\u672A\u8FD0\u884C\u6216\u5C1A\u672A\u5C31\u7EEA": "The tunnel is not running or not ready yet",
  "\u5DF2\u53D6\u6D88": "Cancelled",
  "\u5BA2\u6237\u7AEF\u5728\u7EBF\u8FD0\u884C\u4E2D (WebSocket \u901A\u9053\u5DF2\u5EFA\u7ACB)": "Client online (WebSocket channel established)",
  "\u5BA2\u6237\u7AEF\u5728\u7EBF\u8FD0\u884C\u4E2D": "Client online",
  "\u5F85\u8FDE\u63A5/\u5C31\u7EEA": "Waiting to connect / ready",
  "\u672A\u914D\u7F6E\u81EA\u5EFA\u670D\u52A1\u5668\uFF08\u82E5\u5DF2\u90E8\u7F72\u81EA\u5EFA\u96A7\u9053\u53EF\u5728\u300C\u516C\u7F51\u96A7\u9053\u300D\u4E2D\u914D\u7F6E\uFF09": "No self-hosted server configured (configure it under \u201CPublic tunnel\u201D if it is already deployed)",
  "\u65E0\u6548\u7684\u5907\u4EFD\u6570\u636E\u7ED3\u6784\uFF1A\u7F3A\u5C11 config \u8282\u70B9": "Invalid backup data: the config node is missing",
  "\u4E0B\u8F7D\u8D85\u65F6\uFF085\u5206\u949F\uFF09": "Download timed out (5 minutes)",
  "\u91CD\u5B9A\u5411\u6B21\u6570\u8FC7\u591A": "Too many redirects",
  "\u672A\u77E5\u9519\u8BEF": "Unknown error",
  "\u672A\u77E5": "Unknown",
  "\u505C\u6B62 cloudflared...": "Stopping cloudflared\u2026",
  "\u5C40\u57DF\u7F51 IP \u5206\u914D\u4E0E\u53EF\u7528\u6027": "LAN IP allocation & availability",
  "Cloudflare Anycast \u8FB9\u7F18\u7F51\u7EDC": "Cloudflare Anycast edge network",
  "\u56FD\u5185 npm \u9AD8\u901F\u955C\u50CF\u6E90 (npmmirror)": "npmmirror (fast npm mirror)",
  "\u81EA\u5EFA\u96A7\u9053\u90E8\u7F72\u670D\u52A1\u5668": "Self-hosted tunnel server",
  "\u4EE3\u7406\u672A\u542F\u52A8": "Proxy is not running",
  "\u672A\u68C0\u6D4B\u5230\u6D3B\u8DC3\u5C40\u57DF\u7F51 IPv4 \u5730\u5740 (\u53EF\u80FD\u672A\u8FDE\u63A5 Wi-Fi/\u4EE5\u592A\u7F51)": "No active LAN IPv4 address detected (Wi-Fi/Ethernet may be disconnected)",
  "\u5B89\u5168\u62E6\u622A\uFF1A\u7981\u6B62\u8BBF\u95EE UNC \u7F51\u7EDC\u5171\u4EAB\u8DEF\u5F84": "Blocked: UNC network share paths are not allowed",
  "\u626B\u7801\u521B\u5EFA\u5E94\u7528\u672A\u8FD4\u56DE\u5B8C\u6574\u51ED\u636E": "Scan-to-create did not return complete credentials",
  "\u98DE\u4E66\u901A\u9053\u672A\u542F\u52A8\uFF1A\u8BF7\u5148\u914D\u7F6E\u5E94\u7528\u51ED\u8BC1\u5E76\u8FDE\u63A5": "Lark / Feishu channel is not running: configure the app credentials and connect first",
  "\u7F3A\u5C11\u6587\u4EF6\u8DEF\u5F84": "Missing file path",
  "\u8BC4\u8BBA\u4F1A\u8BDD\u4E0D\u652F\u6301\u53D1\u9001\u6587\u4EF6": "Sending files is not supported in comment sessions",
  "\u5F53\u524D\u8FD0\u884C\u5728 DSH \u684C\u9762\u7248\u5185\uFF0C\u5BBF\u4E3B\u7531\u5E94\u7528\u7EDF\u4E00\u7BA1\u7406\uFF0C\u63D2\u4EF6\u4E0D\u80FD\u81EA\u884C\u91CD\u542F\u3002\u8BF7\u7528\u684C\u9762\u5E94\u7528\u83DC\u5355\u7684\u91CD\u542F/\u9000\u51FA\u91CD\u8FDB\uFF08\u6709\u5173\u95ED\u786E\u8BA4\u4FDD\u62A4\u6B63\u5728\u8DD1\u7684\u4EFB\u52A1\uFF09\uFF0C\u4E0D\u8981\u7528\u9762\u677F\u91CD\u542F\u3002": "DSH Desktop manages the host itself, so the plugin cannot restart it. Use the desktop app menu to restart or quit and reopen (it asks for confirmation when tasks are running) instead of the panel restart.",
  '\u684C\u9762\u7248 DSH \u7531\u5E94\u7528\u5185\u66F4\u65B0\u7EDF\u4E00\u7BA1\u7406\uFF08\u4E00\u952E\u5347\u7EA7\u4EC5\u652F\u6301 npm \u5168\u5C40\u5B89\u88C5\u7684 CLI \u7248\uFF09\uFF1B\u8BF7\u7528\u684C\u9762\u5E94\u7528\u83DC\u5355\u7684"\u68C0\u67E5\u66F4\u65B0"\u5347\u7EA7\uFF0C\u52FF\u7528 npm \u6539\u52A8\u5E94\u7528\u5305\u5185\u6587\u4EF6': "DSH Desktop updates itself from within the app (one-click upgrade only supports the globally npm-installed CLI); use \u201CCheck for updates\u201D in the desktop app menu and do not modify files inside the app package with npm",
  "dsh \u975E\u6807\u51C6 npm \u5168\u5C40\u5B89\u88C5\uFF08Electron/\u6253\u5305/\u6E90\u7801/pnpm \u7B49\uFF09\uFF0C\u65E0\u6CD5\u81EA\u52A8\u5347\u7EA7\uFF1B\u8BF7\u6309\u5B98\u65B9\u6E20\u9053\u624B\u52A8\u66F4\u65B0": "dsh is not a standard global npm install (Electron/packaged/source/pnpm, etc.), so automatic upgrade is unavailable \u2014 update manually via the official channel",
  "\u7F3A\u5C11\u5DE5\u4F5C\u533A\u76EE\u5F55\u8DEF\u5F84": "Missing workspace directory path",
  "\u8DEF\u5F84\u5B89\u5168\u6821\u9A8C\u672A\u901A\u8FC7": "Path failed the security check",
  "\u767B\u5F55\u542F\u52A8\u5931\u8D25": "Failed to start sign-in",
  "\u5347\u7EA7\u547D\u4EE4\u6267\u884C\u5931\u8D25": "Upgrade command failed",
  "\u672A\u627E\u5230 dsh \u547D\u4EE4\uFF08\u53EF\u80FD\u901A\u8FC7\u6E90\u7801/\u6253\u5305\u65B9\u5F0F\u8FD0\u884C\uFF0C\u975E npm \u5168\u5C40\u5B89\u88C5\uFF09": "dsh command not found (it may be installed from source or packaged rather than as a global npm package)",
  "\u5F53\u524D DSH \u4E3A\u975E npm \u5168\u5C40\u5B89\u88C5\uFF0C\u65E0\u6CD5\u81EA\u52A8\u5347\u7EA7\uFF1B\u8BF7\u6309\u5B98\u65B9\u6E20\u9053\u624B\u52A8\u66F4\u65B0": "This DSH is not a global npm install, so automatic upgrade is unavailable \u2014 update manually via the official channel",
  "\u96A7\u9053\u672A\u8FD0\u884C": "Tunnel is not running",
  "\u672A\u547D\u540D\u4F1A\u8BDD": "Untitled session",
  "\u5F85\u5BA1\u6279\u8BF7\u6C42": "Pending approval",
  "\u{1F3E0} \u7528\u6237\u4E3B\u76EE\u5F55": "\u{1F3E0} Home",
  "\u{1F4BB} \u684C\u9762": "\u{1F4BB} Desktop",
  "\u{1F4C1} \u6587\u6863": "\u{1F4C1} Documents",
  "\u{1F4E5} \u4E0B\u8F7D": "\u{1F4E5} Downloads",
  "\u6839\u76EE\u5F55 /": "Root /",
  "C: \u76D8": "C: drive",
  "\u5C1D\u8BD5\u6B21\u6570\u8FC7\u591A\uFF0C\u8BF7 60 \u79D2\u540E\u518D\u8BD5": "Too many attempts, please try again in 60 seconds",
  "\u5C1D\u8BD5\u6B21\u6570\u8FC7\u591A\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5": "Too many attempts, please try again later",
  "\u5F53\u524D\u5DF2\u914D\u7F6E\u4E3A\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\u8BBE\u7F6E": "Management is currently restricted to this computer",
  "\u8BF7\u68C0\u67E5 Token \u4E0E\u53C2\u6570": "check the Token and parameters",
  "\u5DF2\u914D\u7F6E Token": "Token configured",
  "\u767B\u5F55\u5931\u8D25\u6216\u8D85\u65F6": "Sign-in failed or timed out",
  "\u63A2\u6D4B dsh \u5B89\u88C5\u5F62\u6001\u5931\u8D25\uFF0C\u8BF7\u6309\u5B98\u65B9\u6E20\u9053\u624B\u52A8\u66F4\u65B0": "Failed to detect how dsh is installed; update manually via the official channel",
  "systemctl \u6267\u884C\u8D85\u65F6\uFF085s\uFF09": "systemctl timed out (5s)",
  "\u4F60\u5DF2\u62D2\u7EDD\u6388\u6743\uFF0C\u53EF\u91CD\u65B0\u53D1\u8D77\u626B\u7801\u521B\u5EFA": "You declined the authorization; you can start the QR sign-in again",
  "\u4E8C\u7EF4\u7801\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u53D1\u8D77\u626B\u7801\u521B\u5EFA": "The QR code expired; start the QR sign-in again"
};
var serverPatterns = [
  [/^(.+)（(access_denied|expired_token)）$/, "$1t ($2)"],
  // 同平台多账号（issue #78）：账号展示名 / 查重 / 类型 / 移除错误（$1t 会再走一遍词典，
  // 让「飞书 2」这类 displayName 整体英文化）
  [/^(飞书|微信|QQ|Telegram) (\d+)$/, "$1t $2"],
  [/^同一应用不能重复添加：该凭证已被「(.*)」使用$/, "This app cannot be added twice: its credentials are already used by \u201C$1t\u201D"],
  [/^不支持的平台类型: \(空\)$/, "Unsupported platform type: (empty)"],
  [/^不支持的平台类型: (.*)$/, "Unsupported platform type: $1"],
  [/^账号不存在: (.*)$/, "Account not found: $1"],
  [/^systemctl 退出码 (.*)$/, "systemctl exit code $1"],
  [/^cloudflared 进程意外退出 \(code=(.*?)(, .*)?\)$/, "cloudflared exited unexpectedly (code=$1$2)"],
  [/^cloudflared 退出，code=(.*) signal=(.*)$/, "cloudflared exited (code=$1, signal=$2)"],
  [/^配置错误（(.*)）$/, "Configuration error ($1t)"],
  [/^(.*)（已自动重试 (\d+) 次仍失败，请检查网络\/Token，或点击「关闭」停止）$/, "$1t (retried $2 times without success \u2014 check your network/Token, or click \u201CClose\u201D to stop)"],
  [/^(.*)，(.*) 后自动重连（第 (\d+)\/(\d+) 次）$/, "$1t, reconnecting automatically after $2 (attempt $3/$4)"],
  [/^(.*)，(.*) 后继续自动重连（已重试 (\d+) 次；隧道长时间无法建立，请检查网络与 Token）$/, "$1t, continuing to reconnect automatically after $2 (retried $3 times; the tunnel has been down for a while \u2014 check your network and Token)"],
  [/^(.*)；⚠️ 运行时健康探活未启用（未识别到 cloudflared metrics 地址），连接器若静默假死将无法自动发现$/, "$1t; \u26A0\uFE0F runtime health probing is disabled (no cloudflared metrics address found) \u2014 a silently hung connector will not be detected automatically"],
  [/^健康探活连续 (\d+) 次失败：连接器已无健康边缘连接，正在观察能否自行恢复（(\d+)\/(\d+)）$/, "Health probe failed $1 times in a row: the connector has no healthy edge connection \u2014 watching whether it recovers ($2/$3)"],
  [/^健康探活连续 (\d+) 次失败：连接器已无健康边缘连接，正在自动重连…$/, "Health probe failed $1 times in a row: the connector has no healthy edge connection \u2014 reconnecting\u2026"],
  [/^固定隧道已建立 \((.*)\)$/, "Fixed tunnel established ($1)"],
  [/^临时隧道已建立 \((.*)\)$/, "Temporary tunnel established ($1)"],
  [/^服务器连通良好 \(延迟 (\d+)ms · 状态: (.*)\)$/, "Server reachable (latency $1 ms \xB7 status: $2t)"],
  [/^连接畅通 \(延迟 (\d+)ms\)$/, "Connection OK (latency $1 ms)"],
  [/^连接异常: (.*) \(临时公网隧道可能受阻\)$/, "Connection error: $1t (the temporary public tunnel may be blocked)"],
  [/^连接超时或异常: (.*)$/, "Connection timed out or failed: $1t"],
  [/^连接超时 \((\d+(?:\.\d+)?)s\)$/, "Connection timed out ($1s)"],
  [/^无法连通自建服务器: (.*)$/, "Cannot reach the self-hosted server: $1t"],
  [/^本地反向代理端口 \((\d+)\)$/, "Local reverse-proxy port ($1)"],
  [/^正常运行中 \(代理目标端口: (\d+)\)$/, "Running (proxy target port: $1)"],
  [/^检测到有效局域网 IPv4: (.*)$/, "Valid LAN IPv4 detected: $1"],
  [/^自建隧道部署服务器 \((.*)\)$/, "Self-hosted tunnel server ($1)"],
  [/^指定路径不是文件夹: (.*)$/, "Not a folder: $1"],
  [/^无法访问指定路径 \((.*)\)$/, "Cannot access the path ($1t)"],
  [/^读取文件夹失败: (.*)$/, "Failed to read the folder: $1t"],
  [/^安全拦截：禁止访问系统敏感目录 \((.*)\)$/, "Blocked: access to a sensitive system directory is not allowed ($1)"],
  [/^安全拦截：禁止访问系统关键目录 \((.*)\)$/, "Blocked: access to a critical system directory is not allowed ($1)"],
  [/^安全拦截：禁止访问敏感配置目录「(.*)」$/, "Blocked: access to a sensitive configuration directory \u201C$1\u201D is not allowed"],
  [/^安全拦截：符号链接指向系统敏感目录 \((.*)\)$/, "Blocked: symlink points to a sensitive system directory ($1)"],
  [/^安全拦截：符号链接指向系统关键目录 \((.*)\)$/, "Blocked: symlink points to a critical system directory ($1)"],
  [/^安全拦截：符号链接指向敏感配置目录「(.*)」$/, "Blocked: symlink points to a sensitive configuration directory \u201C$1\u201D"],
  [/^非法的版本号格式: (.*)$/, "Invalid version format: $1"],
  [/^重启失败：(.*)$/, "Restart failed: $1t"],
  [/^systemctl (.*) 失败：(.*)。DSH 仍在运行；请手动执行「(.*)」或检查单元。$/, "systemctl $1 failed: $2t. DSH is still running; run \u201C$3\u201D manually or check the unit."],
  [/^npm 安装成功但 dsh 命令实际版本仍为 (.*)（预期 (.*)）。可能安装到了错误位置，请手动执行 `(.*)` 并重启 DSH。$/, "npm install succeeded but the dsh command still reports $1 (expected $2). It may have installed to the wrong location \u2014 run `$3` manually and restart DSH."],
  [/^请求过于频繁，请等待 (\d+) 秒后再试$/, "Too many requests; retry in $1 s"],
  [/^添加工作区请求过于频繁，请等待 (\d+) 秒后再试$/, "Too many workspace requests; retry in $1 s"],
  [/^平台未注册: (.*)$/, "Platform not registered: $1"],
  [/^不支持的平台: (.*)$/, "Unsupported platform: $1"],
  [/^下载 cloudflared: (.*)$/, "Downloading cloudflared: $1"],
  [/^数据面探测超时 (.*)$/, "Data plane probe timed out $1"],
  [/^公网地址格式非法: (.*)$/, "Invalid public URL: $1"],
  [/^([A-Za-z]): 盘$/, "$1: drive"],
  [/^(.*) \(Wi-Fi 无线网卡\)$/, "$1t (Wi-Fi adapter)"],
  [/^(.*) \(有线网卡\)$/, "$1t (wired adapter)"],
  [/^(.*) \(虚拟网卡 \/ WSL \/ 虚拟机\)$/, "$1t (virtual adapter / WSL / VM)"],
  [/^cloudflared 启动失败: (.*)$/, "cloudflared failed to start: $1t"],
  [/^cloudflared 自动重连失败: (.*)$/, "cloudflared automatic reconnect failed: $1t"]
];

// client/locales.mjs
var LOCALE_NAMESPACE = "@wenbin_wb/dsh-bridge";
var zh = {
  // 移动端顶栏
  "menu.open": "\u6253\u5F00\u83DC\u5355",
  "menu.newSession": "\u65B0\u5EFA\u4F1A\u8BDD",
  "title.fallback": "\u65B0\u4F1A\u8BDD",
  // 移动端输入区
  "composer.placeholder": "\u270D\uFE0F \u70B9\u51FB\u8F93\u5165\u6D88\u606F\u2026",
  "composer.expand": "\u5C55\u5F00\u8F93\u5165\u6846",
  "composer.collapse": "\u6536\u8D77\u8F93\u5165\u6846\uFF0C\u6700\u5927\u5316\u5BF9\u8BDD\u9605\u8BFB\u533A",
  "panel.backToChat": "\u8FD4\u56DE\u5BF9\u8BDD",
  // 宿主浮层（智能体团队 / 子智能体下拉）在移动端由本插件统一补收起按钮：动作文案，兼作 aria-label
  "popover.collapse": "\u6536\u8D77",
  // 移动端设置面板 / 抽屉（dsh-bridge 自绘部分）
  "workspace.choose": "\u9009\u62E9\u7535\u8111\u5DE5\u4F5C\u533A",
  "workspace.reading": "\u6B63\u5728\u8BFB\u53D6\u76EE\u5F55\u5185\u5BB9\u2026",
  "workspace.currentDir": "\u5F53\u524D\u76EE\u5F55:",
  "workspace.registeredHint": "\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A (${count} \u4E2A\uFF0C\u70B9\u51FB\u76F4\u63A5\u5207\u6362)\uFF1A",
  "workspace.enterHint": "\u70B9\u51FB\u8FDB\u5165\u6587\u4EF6\u5939\uFF0C\u6216\u70B9\u51FB\u300C+ \u9009\u4E3A\u5DE5\u4F5C\u533A\u300D\u76F4\u63A5\u6DFB\u52A0\u5E76\u5207\u6362",
  "workspace.unlockHint": "\u8FDC\u7A0B\u8BBF\u95EE\u65F6\u6D4F\u89C8/\u6DFB\u52A0\u5DE5\u4F5C\u533A\u9700\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\uFF08\u4E0E\u8BBF\u95EE\u5BC6\u7801\u4E0D\u540C\uFF09\u3002",
  "workspace.chooseFolder": "\u9009\u62E9\u5DE5\u4F5C\u533A",
  "workspace.addFolder": "\u6DFB\u52A0",
  "workspace.refresh": "\u5237\u65B0\u76EE\u5F55",
  "workspace.back": "\u8FD4\u56DE\u4E0A\u4E00\u7EA7",
  "workspace.filter": "\u8FC7\u6EE4\u5B50\u6587\u4EF6\u5939\u2026",
  "workspace.more": "\u8FD8\u6709\u66F4\u591A",
  "workspace.addSubfolder": "\u76F4\u63A5\u6DFB\u52A0\u6B64\u5B50\u6587\u4EF6\u5939\u4E3A\u5DE5\u4F5C\u533A\u5E76\u8FDB\u5165",
  "workspace.onlyAdmin": "\u4EC5\u9650\u672C\u673A\u7BA1\u7406",
  "workspace.isCurrent": "\u5F53\u524D\u4E3B\u5165\u53E3",
  "workspace.isFallback": "\u4E3B\u5165\u53E3",
  // 远程访问面板
  "access.copyLink": "\u590D\u5236\u94FE\u63A5",
  "access.copied": "\u2713 \u5DF2\u590D\u5236",
  "access.hideQr": "\u9690\u85CF\u4E8C\u7EF4\u7801",
  "access.showQr": "\u663E\u793A\u4E8C\u7EF4\u7801",
  "access.privateEnv": "\u8BF7\u5728\u79C1\u5BC6\u73AF\u5883\u4E0B\u4F7F\u7528",
  "access.switching": "\u5207\u6362\u4E2D\u2026",
  "access.publicEntry": "\u516C\u7F51\u8BBF\u95EE\u5165\u53E3",
  "access.copy": "\u590D\u5236",
  "access.stopReconnect": "\u505C\u6B62\u91CD\u8FDE",
  "access.close": "\u5173\u95ED",
  "access.connecting": "\u8FDE\u63A5\u4E2D\u2026",
  "access.downloading": "\u4E0B\u8F7D\u4E2D\u2026",
  "access.enable": "\u5F00\u542F\u516C\u7F51\u96A7\u9053",
  "access.scanHint": "\u8BF7\u5728\u79C1\u5BC6\u73AF\u5883\u4E0B\u626B\u7801\u4F7F\u7528",
  "access.autoStart": "\u968F DSH \u542F\u52A8\u81EA\u52A8\u5F00\u542F",
  "access.tunnelConfig": "\u96A7\u9053\u914D\u7F6E",
  "access.expand": "\u5C55\u5F00 \u25BE",
  "access.collapse": "\u6536\u8D77 \u25B4",
  "access.saveError": "\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25",
  "access.serverConfig": "\u96A7\u9053\u670D\u52A1\u5668\u914D\u7F6E",
  "access.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "access.saved": "\u2713 \u5DF2\u4FDD\u5B58",
  "access.saveConfig": "\u4FDD\u5B58\u914D\u7F6E",
  "access.clear": "\u6E05\u9664",
  "access.externalTunnel": "\u5916\u90E8\u5DF2\u90E8\u7F72\u96A7\u9053",
  "access.saveFixed": "\u4FDD\u5B58\u56FA\u5B9A\u57DF\u540D\u914D\u7F6E",
  "access.updateFailed": "\u66F4\u65B0\u5931\u8D25",
  "access.securityHint": "\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801",
  "access.goSetup": "\u53BB\u5F00\u542F \u2794",
  "access.gotoSettings": "\u8BBE\u7F6E \u2794",
  "access.tutorial": "\u67E5\u770B\u81EA\u5EFA\u96A7\u9053\u670D\u52A1\u5668\u642D\u5EFA\u6559\u7A0B"
};
var en = {
  "menu.open": "Open menu",
  "menu.newSession": "New session",
  "title.fallback": "New Session",
  "composer.placeholder": "\u270D\uFE0F Tap to type a message\u2026",
  "composer.expand": "Expand input",
  "composer.collapse": "Collapse input to maximize chat view",
  "panel.backToChat": "Back to chat",
  // Host popovers (Agent Team / subagent dropdown) get a collapse control from this plugin on mobile
  "popover.collapse": "Collapse",
  "workspace.choose": "Choose a workspace",
  "workspace.reading": "Reading directory\u2026",
  "workspace.currentDir": "Current directory:",
  "workspace.registeredHint": "Registered workspaces (${count}, click to switch):",
  "workspace.enterHint": "Enter a folder, or tap \u201C+ Select as workspace\u201D to add & switch",
  "workspace.unlockHint": "Browsing/adding workspaces remotely requires the admin password to unlock (different from the access password).",
  "workspace.chooseFolder": "Choose workspace",
  "workspace.addFolder": "Add",
  "workspace.refresh": "Refresh",
  "workspace.back": "Back",
  "workspace.filter": "Filter subfolders\u2026",
  "workspace.more": "More",
  "workspace.addSubfolder": "Add this subfolder as a workspace and enter",
  "workspace.onlyAdmin": "Local admin only",
  "workspace.isCurrent": "Current entry",
  "workspace.isFallback": "Main entry",
  "access.copyLink": "Copy link",
  "access.copied": "\u2713 Copied",
  "access.hideQr": "Hide QR",
  "access.showQr": "Show QR",
  "access.privateEnv": "Use in a private environment",
  "access.switching": "Switching\u2026",
  "access.publicEntry": "Public access entry",
  "access.copy": "Copy",
  "access.stopReconnect": "Stop reconnecting",
  "access.close": "Close",
  "access.connecting": "Connecting\u2026",
  "access.downloading": "Downloading\u2026",
  "access.enable": "Enable public tunnel",
  "access.scanHint": "Scan in a private environment",
  "access.autoStart": "Start automatically with DSH",
  "access.tunnelConfig": "Tunnel configuration",
  "access.expand": "Expand \u25BE",
  "access.collapse": "Collapse \u25B4",
  "access.saveError": "Failed to save configuration",
  "access.serverConfig": "Tunnel server configuration",
  "access.saving": "Saving\u2026",
  "access.saved": "\u2713 Saved",
  "access.saveConfig": "Save configuration",
  "access.clear": "Clear",
  "access.externalTunnel": "External tunnel",
  "access.saveFixed": "Save fixed-domain configuration",
  "access.updateFailed": "Update failed",
  "access.securityHint": "Set an external visitor access password",
  "access.goSetup": "Set up \u2794",
  "access.gotoSettings": "Settings \u2794",
  "access.tutorial": "View the self-hosted tunnel server tutorial"
};
function createTranslator(ctx) {
  const readLang = () => {
    try {
      const root = typeof document !== "undefined" ? document.documentElement : null;
      return (root && typeof root.getAttribute === "function" ? root.getAttribute("lang") : "") || "";
    } catch {
      return "";
    }
  };
  const active = () => readLang().toLowerCase().startsWith("zh") ? "zh" : "en";
  const own = (dict, key) => typeof key === "string" && Object.hasOwn(dict, key) ? dict[key] : void 0;
  const lookup = (key, lang, vars, depth = 0) => {
    if (typeof key !== "string") return void 0;
    if (depth > 8) return void 0;
    const semantic = lang === "zh" ? own(zh, key) : own(en, key) ?? own(zh, key);
    if (semantic !== void 0) return semantic;
    if (lang === "zh") return void 0;
    const panel = own(panelEn, key);
    if (panel !== void 0) {
      if (Array.isArray(panel)) return vars && vars.count === 1 ? panel[0] : panel[1];
      return panel;
    }
    const server = own(serverEn, key);
    if (server !== void 0) return server;
    for (const [pattern, english] of serverPatterns) {
      const matched = pattern.exec(key);
      if (!matched) continue;
      return english.replace(/\$(\d)(t?)/g, (_, group, translate) => {
        const captured = matched[Number(group)] ?? "";
        return translate ? lookup(captured, "en", void 0, depth + 1) ?? captured : captured;
      });
    }
    return void 0;
  };
  const t2 = (key, vars) => {
    let text = lookup(key, active(), vars);
    if (text === void 0) text = key;
    if (vars && text) {
      for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`\${${k}}`, String(v));
    }
    return text;
  };
  try {
    const locale = ctx && (typeof ctx.get === "function" ? ctx.get("locale") : ctx.locale);
    if (locale && typeof locale.register === "function") {
      locale.register(LOCALE_NAMESPACE, { zh, en });
    }
  } catch {
  }
  return { t: t2, active };
}
var globalTranslator = createTranslator(null);
var t = (key, vars) => globalTranslator.t(key, vars);

// client/unlock-manager.js
var SESSION_KEY = "dsh_admin_token";
var _token = "";
var _pendingOps = [];
var _onUnlocked = null;
function _readStorage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_KEY) : "";
  } catch {
    return "";
  }
}
function _writeStorage(t2) {
  try {
    if (typeof window === "undefined") return;
    if (t2) window.sessionStorage.setItem(SESSION_KEY, t2);
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
  }
}
function getAdminToken() {
  if (_token) return _token;
  const saved = _readStorage();
  if (saved) {
    _token = saved;
    return saved;
  }
  return "";
}
function setAdminToken(t2) {
  _token = t2 || "";
  _writeStorage(_token);
}
function clearAdminToken() {
  setAdminToken("");
}
async function fetchLoopbackTokenOnce(force = true) {
  if (typeof window === "undefined") return null;
  if (!force) {
    const existing = getAdminToken();
    if (existing) return existing;
  }
  const candidates = [
    "/__dsh_bridge__/loopback-token",
    "http://127.0.0.1:3082/__dsh_bridge__/loopback-token",
    "http://localhost:3082/__dsh_bridge__/loopback-token"
  ];
  for (const url of [...new Set(candidates)]) {
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && data.adminToken) {
          setAdminToken(data.adminToken);
          return data.adminToken;
        }
      }
    } catch {
    }
  }
  return null;
}
function queuePendingOperation(retry) {
  _pendingOps.push(retry);
}
async function replayPending() {
  if (_pendingOps.length === 0) return;
  const ops = _pendingOps;
  _pendingOps = [];
  for (const retry of ops) {
    try {
      await retry();
    } catch {
    }
  }
}
function onUnlocked(cb) {
  if (!_onUnlocked) _onUnlocked = [];
  _onUnlocked.push(cb);
  return () => {
    _onUnlocked = _onUnlocked.filter((f) => f !== cb);
  };
}
function _emitUnlocked() {
  if (_onUnlocked) {
    for (const cb of _onUnlocked) {
      try {
        cb();
      } catch {
      }
    }
  }
}
async function unlockAdmin(rpcCall, password) {
  try {
    const res = await rpcCall("authAdminUnlock", { password });
    if (res?.ok) {
      const token = res.value?.adminToken || "";
      setAdminToken(token);
      _emitUnlocked();
      await replayPending();
      return { ok: true };
    }
    return { ok: false, error: res?.error?.message || t("\u7BA1\u7406\u5458\u5BC6\u7801\u9519\u8BEF") };
  } catch (err) {
    const msg = String(err?.message || err || "");
    if (msg.includes("401") || msg.includes("transport failure") || msg.includes("unauthorized")) {
      if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        try {
          window.sessionStorage.setItem("dsh_access_expired_reloaded", "1");
        } catch {
        }
        window.location.reload();
      }
    }
    return { ok: false, error: err?.message || t("\u89E3\u9501\u8BF7\u6C42\u5931\u8D25") };
  }
}

// client/picker-yield.js
var OFFICIAL_WORKSPACE_SEAT = "uiWorkspace";
function hasOfficialDirectoryPicker(ctx) {
  try {
    if (typeof ctx?.get !== "function") return false;
    const seat = ctx.get(OFFICIAL_WORKSPACE_SEAT);
    return typeof seat?.pickDirectory === "function";
  } catch {
    return false;
  }
}
function shouldYieldToOfficialPicker(facts) {
  return Boolean(facts?.local) && Boolean(facts?.officialPicker);
}

// client/mobile-yield.js
var FEATURES = {
  MOBILE_HEADER: "mobileHeader",
  MOBILE_STYLES: "mobileStyles",
  COMPOSER_COLLAPSE: "composerCollapse",
  // 总开关：覆盖全部页面改写动作（含设置钻取/导航图标/iOS 键盘适配等残留项，见 #56）
  PAGE_TWEAKS: "pageTweaks"
};
var runtimeFeatureOverrides = {};
function setRuntimeFeatureOverrides(overrides) {
  if (overrides && typeof overrides === "object") {
    runtimeFeatureOverrides = { ...runtimeFeatureOverrides, ...overrides };
  }
}
function getRuntimeFeatureOverrides() {
  return { ...runtimeFeatureOverrides };
}
function detectMobileShellOrResponsivePlugin() {
  if (typeof window === "undefined") return false;
  if (window.__DSH_MOBILE_SHELL__ || window.__TAURI__ || window.__DSH_DESKTOP__) {
    return true;
  }
  if (window.__DSH_CLIENT_UI_RESPONSIVE__) {
    return true;
  }
  if (typeof window.__DSH_MOBILE_LAYER__ === "string" && window.__DSH_MOBILE_LAYER__) {
    return true;
  }
  if (typeof document !== "undefined") {
    if (document.querySelector("[data-dsh-responsive-mobile]") || document.querySelector("[data-dsh-mobile-shell]") || document.querySelector("[data-dsh-mobile-layer]") || document.querySelector("[data-dsh-mobile-ui]")) {
      return true;
    }
  }
  return false;
}
function isFeatureEnabled(featureName, defaultDetector) {
  if (typeof window === "undefined") {
    return typeof defaultDetector === "function" ? defaultDetector() : true;
  }
  try {
    if (window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const tweaksVal = params.get("dsh_bridge_tweaks") ?? params.get("dsh_mobile_tweaks");
      if (tweaksVal === "0" || tweaksVal === "false" || tweaksVal === "off") {
        return false;
      }
      if (tweaksVal === "1" || tweaksVal === "true" || tweaksVal === "on") {
        return true;
      }
      const kebabName = featureName.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      const specificVal = params.get(`dsh_${kebabName}`) ?? params.get(`dsh_${featureName}`);
      if (specificVal === "0" || specificVal === "false" || specificVal === "off") {
        return false;
      }
      if (specificVal === "1" || specificVal === "true" || specificVal === "on") {
        return true;
      }
    }
  } catch {
  }
  try {
    const hostConfig = window.__DSH_BRIDGE_CONFIG__;
    if (hostConfig && typeof hostConfig === "object") {
      if (hostConfig.disablePageTweaks === true || hostConfig.disableMobileTweaks === true || hostConfig.mobileUi === false) {
        return false;
      }
      if (hostConfig.mobileUi === true) {
        return true;
      }
      if (typeof hostConfig[featureName] === "boolean") {
        return hostConfig[featureName];
      }
    }
  } catch {
  }
  if (typeof runtimeFeatureOverrides[featureName] === "boolean") {
    return runtimeFeatureOverrides[featureName];
  }
  try {
    if (window.localStorage) {
      const stored = window.localStorage.getItem(`dsh_bridge:feature:${featureName}`);
      if (stored === "0" || stored === "false") return false;
      if (stored === "1" || stored === "true") return true;
    }
  } catch {
  }
  if (typeof defaultDetector === "function") {
    return defaultDetector();
  }
  return true;
}
function shouldYieldMobileHeader() {
  return !isFeatureEnabled(FEATURES.MOBILE_HEADER, () => {
    return !detectMobileShellOrResponsivePlugin();
  });
}
function shouldYieldMobileStyles() {
  return !isFeatureEnabled(FEATURES.MOBILE_STYLES, () => {
    return !detectMobileShellOrResponsivePlugin();
  });
}
function shouldYieldAllPageTweaks() {
  return !isFeatureEnabled(FEATURES.PAGE_TWEAKS, () => true);
}
function shouldYieldComposerCollapse() {
  return !isFeatureEnabled(FEATURES.COMPOSER_COLLAPSE, () => {
    return !detectMobileShellOrResponsivePlugin();
  });
}

// client/settings-nav-icon.js
var SETTINGS_NAV_MARKER = "data-dsh-bridge-settings-nav";
var REMOTE_NAV_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='10' height='16' x='3' y='4' rx='2'/><path d='M7 16h2'/><path d='M17 8a4 4 0 0 1 0 8'/><path d='M20 5a8 8 0 0 1 0 14'/></svg>`;
function getNavIconCss(customSvg = REMOTE_NAV_SVG) {
  const maskUrl = `data:image/svg+xml,${encodeURIComponent(customSvg)}`;
  return `
[${SETTINGS_NAV_MARKER}] > svg:first-child {
  display: none !important;
}
[${SETTINGS_NAV_MARKER}]::before {
  content: '';
  flex: none;
  width: 16px;
  height: 16px;
  background-color: currentColor;
  -webkit-mask: url("${maskUrl}") center / contain no-repeat;
  mask: url("${maskUrl}") center / contain no-repeat;
}
`;
}
function registerSettingsNavIcon(resolveLabel = () => t("\u8FDC\u7A0B\u8BBF\u95EE"), resolveFamilies = null) {
  if (typeof document === "undefined") return () => {
  };
  const styleId = "dsh-bridge-settings-nav-icon-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.dataset.plugin = "@wenbin_wb/dsh-bridge";
    style.dataset.pluginCss = "@wenbin_wb/dsh-bridge/settings-nav-icon";
    style.textContent = getNavIconCss();
    document.head.appendChild(style);
  }
  let disposed = false;
  const sync = () => {
    if (disposed) return;
    const currentLabel = typeof resolveLabel === "function" ? resolveLabel().trim() : t("\u8FDC\u7A0B\u8BBF\u95EE");
    const families = typeof resolveFamilies === "function" ? resolveFamilies() || {} : {};
    const settingsFamily = families.SETTINGS;
    const selector = settingsFamily && settingsFamily !== ABSENT_FAMILY ? `[role="dialog"] nav button, div[class*="${settingsFamily}_nav"] button` : '[role="dialog"] nav button';
    const buttons = document.querySelectorAll(selector);
    for (const button of buttons) {
      const text = button.textContent?.trim() || "";
      if (currentLabel.length > 0 && (text === currentLabel || text.includes(currentLabel))) {
        button.setAttribute(SETTINGS_NAV_MARKER, "");
      } else if (button.hasAttribute(SETTINGS_NAV_MARKER)) {
        button.removeAttribute(SETTINGS_NAV_MARKER);
      }
    }
  };
  sync();
  let observer = null;
  if (typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  return () => {
    disposed = true;
    if (observer) observer.disconnect();
    document.querySelectorAll(`[${SETTINGS_NAV_MARKER}]`).forEach((el) => el.removeAttribute(SETTINGS_NAV_MARKER));
    const styleEl = document.getElementById(styleId);
    if (styleEl) styleEl.remove();
  };
}

// client/tunnel-guard.js
function hasAnyPassword(auth) {
  return Boolean(auth?.hasPassword || auth?.hasAdminPassword);
}
function needsTunnelPassword(auth) {
  if (!auth || typeof auth !== "object") return false;
  if (auth.adminPolicy === "local_only") return false;
  if (auth.adminProtection === false) return false;
  if (auth.adminPolicy === "open") return false;
  return !hasAnyPassword(auth);
}

// lib/bridge-rpc-constants.js
var BRIDGE_RPC_CHANNEL = "/dsh-bridge";
var BRIDGE_ENDPOINTS = {
  getStatus: "getStatus",
  startCustomTunnel: "startCustomTunnel",
  stopCustomTunnel: "stopCustomTunnel",
  startCloudflared: "startCloudflared",
  stopCloudflared: "stopCloudflared",
  resetCloudflared: "resetCloudflared",
  saveCloudflaredConfig: "saveCloudflaredConfig",
  setTunnelAutoStart: "setTunnelAutoStart",
  saveCustomTunnelConfig: "saveCustomTunnelConfig",
  saveExternalTunnel: "saveExternalTunnel",
  setLanIp: "setLanIp",
  checkVersion: "checkVersion",
  upgradePlugin: "upgradePlugin",
  upgradeDsh: "upgradeDsh",
  restartDsh: "restartDsh",
  exportBackup: "exportBackup",
  importBackup: "importBackup",
  diagnoseNetwork: "diagnoseNetwork",
  getSystemMetrics: "getSystemMetrics",
  // 远程工作区管理与目录浏览
  listRemoteDirectories: "listRemoteDirectories",
  addRemoteWorkspace: "addRemoteWorkspace",
  listWorkspaces: "listWorkspaces",
  // 访问安全认证（密码保护 / 扫码免密 Token）
  authGetStatus: "authGetStatus",
  authUpdateConfig: "authUpdateConfig",
  authRegenerateToken: "authRegenerateToken",
  authAdminUnlock: "authAdminUnlock",
  authAdminLock: "authAdminLock",
  // 首次启用引导：用户确认已了解后置位，避免重复打扰
  dismissFirstRunGuide: "dismissFirstRunGuide",
  // 页面改写层用户偏好（设置面板可见开关，issue #55 讨论衍生）
  uiGetFlags: "uiGetFlags",
  uiUpdateConfig: "uiUpdateConfig",
  // 平台管理器（多 IM 平台统一接口）
  listPlatforms: "listPlatforms",
  platformLogin: "platformLogin",
  platformSetAllowFrom: "platformSetAllowFrom",
  platformSetConfig: "platformSetConfig",
  platformStop: "platformStop",
  platformStart: "platformStart",
  platformUnbind: "platformUnbind",
  // issue #78：同平台多账号运行时增删（高危，需管理员鉴权）
  platformAddAccount: "platformAddAccount",
  platformRemoveAccount: "platformRemoveAccount",
  // 本机可用的 DSH agent preset（设置页下拉用；老版本 DSH 返回 available:false）
  listAgentPresets: "listAgentPresets",
  // 微信 Bot（v1.x 向后兼容别名，deprecated）
  wechatGetStatus: "wechatGetStatus",
  wechatLogin: "wechatLogin",
  wechatSetAllowFrom: "wechatSetAllowFrom",
  wechatSetConfig: "wechatSetConfig",
  wechatStop: "wechatStop",
  wechatStart: "wechatStart",
  wechatUnbind: "wechatUnbind"
};

// client/resource-url-compat.js
function installResourceUrlCompat(win = typeof window === "undefined" ? void 0 : window) {
  if (!win || typeof win.URL !== "function") return "no-url";
  const NativeURL = win.URL;
  let probe;
  try {
    probe = new NativeURL("dsh-resource://file/__dsh_probe__/x");
  } catch {
    return "probe-throw";
  }
  if (probe.hostname === "file") return "not-needed";
  const hostOf = (raw) => {
    const m = /^dsh-resource:\/\/([^/?#]*)/i.exec(String(raw || ""));
    return m && m[1] ? m[1].toLowerCase() : "";
  };
  function CompatURL(...args) {
    const url = new NativeURL(...args);
    try {
      if (String(url.protocol) === "dsh-resource:" && !url.hostname) {
        const proto = NativeURL.prototype;
        const hostnameDesc = Object.getOwnPropertyDescriptor(proto, "hostname");
        const hostDesc = Object.getOwnPropertyDescriptor(proto, "host");
        const hostOfUrl = (u) => {
          let native;
          try {
            native = hostnameDesc && hostnameDesc.get ? hostnameDesc.get.call(u) : u.hostname || "";
          } catch {
            native = "";
          }
          if (native) return native;
          let href;
          try {
            href = String(u.href);
          } catch {
            href = "";
          }
          return hostOf(href);
        };
        if (hostOfUrl(url)) {
          Object.defineProperty(url, "hostname", {
            configurable: true,
            enumerable: hostnameDesc ? hostnameDesc.enumerable : true,
            get: () => hostOfUrl(url),
            set: (v) => {
              if (hostnameDesc && hostnameDesc.set) hostnameDesc.set.call(url, v);
            }
          });
          if (hostDesc) {
            Object.defineProperty(url, "host", {
              configurable: true,
              enumerable: hostDesc.enumerable,
              get: () => hostOfUrl(url),
              set: (v) => {
                if (hostDesc.set) hostDesc.set.call(url, v);
              }
            });
          }
        }
      }
    } catch {
    }
    return url;
  }
  CompatURL.prototype = NativeURL.prototype;
  for (const key of Object.getOwnPropertyNames(NativeURL)) {
    if (key === "length" || key === "name" || key === "prototype") continue;
    try {
      CompatURL[key] = NativeURL[key];
    } catch {
    }
  }
  win.URL = CompatURL;
  return "installed";
}

// client/index.js
if (typeof window !== "undefined") {
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function() {
      if (typeof window.crypto.getRandomValues === "function") {
        return ("10000000-1000-4000-8000" + -1e11).replace(/[018]/g, function(c) {
          return (c ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
        });
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === "x" ? r : r & 3 | 8;
        return v.toString(16);
      });
    };
  }
}
var RESOURCE_URL_COMPAT = installResourceUrlCompat();
if (typeof window !== "undefined") window.__dshResourceUrlCompat = RESOURCE_URL_COMPAT;
var MOBILE_MAX_WIDTH = 767;
var SETTINGS_DRILLDOWN_MAX_WIDTH = 480;
var DRILLDOWN_GATE_ATTR = "data-dshbr-drilldown";
var DRILLDOWN_GATE_READY = "ready";
var DRILLDOWN_GATE_FLAG = "dshBrDrilldownGate";
var SETTINGS_VIEW_ATTR = "data-dshbr-settings-view";
var SETTINGS_VIEW_DETAIL = "detail";
function isLocalEnvironment() {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname || "";
  const proto = window.location.protocol || "";
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "" || proto === "file:" || proto === "vscode-webview:" || proto === "app:" || // 官方 Desktop（0.2.0-rc.2）页面来源为 dsh-app://app/；与 BridgePanel 的
  // isLocalhost 判定保持一致，否则同一页面在两处本机判定上会得到相反结论。
  proto === "dsh-app:" && host === "app" || typeof window.__DSH_ELECTRON__ !== "undefined" || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.includes("Electron");
}
var ACCESS_EXPIRED_FLAG = "dsh_access_expired_reloaded";
function isAccessSessionFailure(err) {
  const msg = String(err?.message || err || "");
  return msg.includes("401") || msg.includes("transport failure") || msg.includes("unauthorized");
}
function reloadToLoginPage() {
  try {
    if (sessionStorage.getItem(ACCESS_EXPIRED_FLAG)) {
      sessionStorage.removeItem(ACCESS_EXPIRED_FLAG);
      return false;
    }
    sessionStorage.setItem(ACCESS_EXPIRED_FLAG, "1");
  } catch {
  }
  window.location.reload();
  return true;
}
function clearAccessExpiredFlag() {
  try {
    sessionStorage.removeItem(ACCESS_EXPIRED_FLAG);
  } catch {
  }
}
var GITHUB_URL = "https://github.com/wenbin-wb/dsh-bridge";
var RELEASES_URL = "https://github.com/wenbin-wb/dsh-bridge/releases";
var ISSUES_URL = "https://github.com/wenbin-wb/dsh-bridge/issues/new";
var TUNNEL_DOCS_URL = "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/custom-tunnel.md";
var CLOUDFLARE_TUTORIAL_URL = "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/cloudflare-fixed-domain.md";
var TUNNEL_PASSWORD_TEXT = "\u5F00\u542F\u516C\u7F51\u96A7\u9053\u524D\uFF0C\u8BF7\u5148\u5728\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u4E2D\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801";
var localeT = (key) => key;
var TRANSLATABLE_PROPS = ["title", "placeholder", "aria-label", "alt"];
function translateChild(child) {
  if (typeof child === "string") return child ? localeT(child) : child;
  if (Array.isArray(child)) return child.map(translateChild);
  return child;
}
function translateProps(props) {
  if (!props || typeof props !== "object") return props;
  let next = props;
  for (const key of TRANSLATABLE_PROPS) {
    const value = props[key];
    if (typeof value !== "string" || !value) continue;
    if (next === props) next = { ...props };
    next[key] = localeT(value);
  }
  return next;
}
function h(type, props, ...children) {
  return React.createElement(type, translateProps(props), ...children.map(translateChild));
}
function upgradeCommands(latest) {
  const spec = `@wenbin_wb/dsh-bridge@${latest}`;
  return [
    { id: "dsh", cmd: `dsh plugin --profile web add ${spec}` },
    { id: "npx", cmd: `npx --yes @deepseek-ai/dsh plugin --profile web add ${spec}` }
  ];
}
var name = "dsh-bridge";
var inject = ["slots", "connection", "workspaces", "sessions"];
function semverGt(a, b) {
  const parse = (v) => {
    const [main = "", pre = ""] = String(v).split("-");
    const [maj = 0, min = 0, pat = 0] = main.split(".").map(Number);
    return { maj, min, pat, pre };
  };
  const av = parse(a), bv = parse(b);
  if (av.maj !== bv.maj) return av.maj > bv.maj;
  if (av.min !== bv.min) return av.min > bv.min;
  if (av.pat !== bv.pat) return av.pat > bv.pat;
  if (!av.pre && bv.pre) return true;
  if (av.pre && !bv.pre) return false;
  return av.pre > bv.pre;
}
var s = {
  card: { background: "var(--dsw-alias-bg-layer-2,#f9fafb)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 12, padding: "16px 18px", marginBottom: 16, boxSizing: "border-box" },
  block: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 12, paddingTop: 12 },
  muted: { color: "var(--dsw-alias-label-tertiary,#8b93a1)", fontSize: 12, lineHeight: 1.5 },
  label: { color: "var(--dsw-alias-label-primary,currentColor)", fontSize: 13, fontWeight: 500 },
  code: { fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, wordBreak: "break-all", color: "var(--dsw-alias-label-primary,currentColor)" },
  btnPri: { font: "inherit", cursor: "pointer", border: "none", background: "var(--dsw-alias-brand-primary,#4f6ef7)", color: "var(--dsw-alias-label-primary-foreground,#fff)", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 },
  btnGhost: { font: "inherit", cursor: "pointer", border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-2,#f9fafb)", color: "var(--dsw-alias-label-primary,currentColor)", height: 32, padding: "0 14px", borderRadius: 999, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" },
  btnLink: { font: "inherit", cursor: "pointer", border: "none", background: "none", color: "var(--dsw-alias-brand-primary,#4f6ef7)", fontSize: 12, padding: 0, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" },
  // 实心警示按钮：背景与前景必须成对指定。s.btnPri 的前景令牌是配"品牌色"的，浅色主题下
  // 为白色，直接套在琥珀底上只有 3.19:1（不达 AA）；改用琥珀配色的 amber-500 / amber-900，
  // 两套主题下都是 7.2:1（琥珀调色板在明暗主题取值相同）。
  btnWarn: { background: "var(--dsw-alias-state-warn-primary,#f59e0b)", color: "var(--dsw-static-amber-900,#27241f)" },
  qr: { width: 200, height: 200, maxWidth: "100%", borderRadius: 10, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", margin: "8px 0", display: "block", background: "#ffffff", padding: 6, boxSizing: "border-box" },
  tag: { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, minWidth: "max-content", lineHeight: 1.4 },
  input: { width: "100%", font: "inherit", fontSize: 13, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-2,#f9fafb)", color: "var(--dsw-alias-label-primary,currentColor)", outline: "none", boxSizing: "border-box" },
  warn: { background: "var(--dsw-alias-state-warn-bg,#fffbeb)", border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-label-primary, #0f1115)", lineHeight: 1.6 },
  err: { background: "var(--dsw-alias-state-error-bg,#fef2f2)", border: "1px solid var(--dsw-alias-state-error-border,#fecaca)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-label-primary, #0f1115)", lineHeight: 1.6 },
  tip: { background: "var(--dsw-alias-bg-layer-2,#f9fafb)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.6 }
};
var Icons = {
  wechat: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    h("path", { d: "M8.5 2C4.36 2 1 4.91 1 8.5c0 2.01 1.05 3.81 2.69 4.97l-.69 2.06 2.45-1.22c.94.43 1.98.69 3.05.69.21 0 .42-.01.62-.03-.23-.62-.37-1.28-.37-1.97 0-3.59 3.36-6.5 7.5-6.5.21 0 .41.01.62.03C15.87 4.54 12.44 2 8.5 2zM6 6.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm5 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zm7.5 3.5c-3.59 0-6.5 2.46-6.5 5.5 0 1.66.86 3.14 2.21 4.1l-.56 1.69 2.01-1c.78.36 1.64.57 2.54.57 3.59 0 6.5-2.46 6.5-5.5s-2.91-5.5-6.5-5.5zm-2 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" })
  ),
  qq: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    h("path", { d: "M12 2C7.58 2 4 5.37 4 9.53c0 1.95.78 3.73 2.07 5.07-.37 1.15-.99 2.19-1.8 3.08-.18.2-.04.52.23.52 2.22 0 3.99-1.07 4.9-1.86.8.25 1.66.39 2.6.39 4.42 0 8-3.37 8-7.53S16.42 2 12 2zm-3 8a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm6 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" })
  ),
  feishu: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    h("path", { d: "M12 2.5L3.5 11.2l6.8 1.8 2.2 6.5 1.8-4.7 5.2-1.4L12 2.5zm-.8 11.1l-4.1-1.1 6.5-6.6-4.2 8.3 1.8-.6z" })
  ),
  telegram: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 18, height: 18, fill: "currentColor", ...props },
    h("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" })
  ),
  lan: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    h("path", { d: "M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.29 19.3a1 1 0 0 0 1.41 1.41l1.7-1.7C9.02 19.64 10.46 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" })
  ),
  tunnel: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    h("path", { d: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z" })
  ),
  security: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    h("path", { d: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" })
  ),
  bot: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "currentColor", ...props },
    h("path", { d: "M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" })
  ),
  github: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 13, height: 13, fill: "currentColor", ...props },
    h("path", { d: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" })
  ),
  refresh: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h("path", { d: "M23 4v6h-6M1 20v-6h6" }),
    h("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
  ),
  check: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 12, height: 12, fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h("polyline", { points: "20 6 9 17 4 12" })
  ),
  ops: (props) => h(
    "svg",
    { viewBox: "0 0 24 24", width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", ...props },
    h("circle", { cx: 12, cy: 12, r: 3 }),
    h("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })
  )
};
function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback((text) => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) done();
    }
  }, []);
  return [copied, copy];
}
function StatusTag({ running, status }) {
  let bg = "var(--dsw-alias-bg-layer-2,#f3f4f6)";
  let color = "var(--dsw-alias-label-secondary,#6b7280)";
  let text = running ? "\u8FD0\u884C\u4E2D" : "\u672A\u542F\u52A8";
  if (status === "connected") {
    bg = "var(--dsw-alias-state-success-bg,#ecfdf5)";
    color = "var(--dsw-alias-label-primary, #0f1115)";
    text = "\u5DF2\u8FDE\u63A5";
  } else if (status === "starting" || status === "connecting" || status === "downloading") {
    bg = "var(--dsw-alias-state-info-bg,#eff6ff)";
    color = "var(--dsw-alias-label-primary, #0f1115)";
    text = status === "downloading" ? "\u4E0B\u8F7D\u4E2D\u2026" : "\u8FDE\u63A5\u4E2D\u2026";
  } else if (status === "reconnecting") {
    bg = "var(--dsw-alias-state-warn-bg,#fffbeb)";
    color = "var(--dsw-alias-label-primary, #0f1115)";
    text = "\u81EA\u52A8\u91CD\u8FDE\u4E2D\u2026";
  } else if (status === "paused") {
    bg = "var(--dsw-alias-state-warn-bg,#fffbeb)";
    color = "var(--dsw-alias-label-primary, #0f1115)";
    text = "\u6682\u505C\u4E2D";
  } else if (status === "error") {
    bg = "var(--dsw-alias-state-error-bg,#fef2f2)";
    color = "var(--dsw-alias-label-primary, #0f1115)";
    text = "\u5F02\u5E38";
  } else if (running) {
    bg = "var(--dsw-alias-state-success-bg,#ecfdf5)";
    color = "var(--dsw-alias-label-primary, #0f1115)";
    text = "\u8FD0\u884C\u4E2D";
  }
  return h("span", {
    style: { ...s.tag, background: bg, color }
  }, text);
}
function QrBlock({ url, qr, onReset, auth, onNavigateSecurity }) {
  const [copied, setCopied] = React.useState(false);
  const [showQr, setShowQr] = React.useState(true);
  const copy = React.useCallback(() => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      }).catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      }
    }
  }, [url]);
  const toggleQr = React.useCallback(() => setShowQr((v) => !v), []);
  return h(
    "div",
    { style: { marginTop: 10 } },
    auth?.enabled ? h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "6px 10px",
          background: "var(--dsw-alias-state-success-bg,#ecfdf5)",
          border: "1px solid var(--dsw-alias-state-success-primary,#10b981)",
          borderRadius: 8,
          fontSize: 12,
          color: "var(--dsw-alias-label-primary, #0f1115)",
          marginBottom: 8,
          fontWeight: 500,
          flexWrap: "wrap",
          cursor: onNavigateSecurity ? "pointer" : "default"
        },
        onClick: onNavigateSecurity,
        title: onNavigateSecurity ? "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u914D\u7F6E" : void 0
      },
      h("span", { style: { display: "inline-flex", alignItems: "center", gap: 4 } }, "\u{1F6E1}\uFE0F \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u751F\u6548 \xB7 \u626B\u7801\u8BBE\u5907\u514D\u5BC6"),
      onNavigateSecurity && h("span", { style: { textDecoration: "underline", fontSize: 11, fontWeight: 600 } }, "\u8BBE\u7F6E \u2794")
    ) : h(
      "div",
      {
        style: { ...s.warn, cursor: onNavigateSecurity ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
        onClick: onNavigateSecurity,
        title: onNavigateSecurity ? "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u5F00\u542F\u8BBF\u95EE\u4FDD\u62A4" : void 0
      },
      h("span", null, "\u26A0\uFE0F \u5F53\u524D\u672A\u5F00\u542F\u8BBF\u95EE\u8BA4\u8BC1\uFF0C\u5EFA\u8BAE\u5728\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u5F00\u542F\u5BC6\u7801\u6216\u626B\u7801\u4FDD\u62A4\u3002"),
      onNavigateSecurity && h("span", { style: { fontWeight: 600, textDecoration: "underline", fontSize: 12, color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, "\u53BB\u5F00\u542F \u2794")
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8, marginTop: 8 } },
      h(
        "div",
        { style: { padding: "6px 10px", background: "var(--dsw-alias-bg-layer-1,#ffffff)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 8 } },
        h("code", { style: { ...s.code, display: "block", wordBreak: "break-all", fontSize: 12, lineHeight: 1.5 } }, url)
      ),
      h(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center" } },
        h("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12, flex: "1 1 auto", justifyContent: "center" },
          onClick: copy
        }, copied ? "\u2713 \u5DF2\u590D\u5236" : "\u590D\u5236\u94FE\u63A5"),
        h("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12, flex: "1 1 auto", justifyContent: "center" },
          onClick: toggleQr
        }, showQr ? "\u9690\u85CF\u4E8C\u7EF4\u7801" : "\u663E\u793A\u4E8C\u7EF4\u7801")
      )
    ),
    showQr && qr && h(
      "div",
      { style: { marginTop: 10 } },
      h("img", { src: qr, alt: "QR", style: s.qr }),
      h("div", { style: { ...s.muted, marginTop: 4 } }, "\u8BF7\u5728\u79C1\u5BC6\u73AF\u5883\u4E0B\u4F7F\u7528"),
      h(
        "div",
        { style: { ...s.muted, marginTop: 4, fontSize: 11, color: "var(--dsw-alias-brand-primary, #4f6ef7)" } },
        "\u{1F4F1} \u63D0\u793A\uFF1A\u624B\u673A\u6D4F\u89C8\u5668\u626B\u7801\u6253\u5F00\u540E\uFF0C\u5728\u83DC\u5355\u70B9\u51FB\u300C\u6DFB\u52A0\u5230\u4E3B\u5C4F\u5E55\u300D\u5373\u53EF\u4F5C\u4E3A\u72EC\u7ACB\u5168\u5C4F App \u8FD0\u884C\u3002"
      )
    ),
    onReset && h(
      "div",
      { style: { marginTop: 8 } },
      h("button", {
        style: { ...s.btnGhost, fontSize: 12, height: 28 },
        onClick: onReset,
        title: "\u5173\u95ED\u96A7\u9053\u5E76\u91CD\u65B0\u5F00\u542F\uFF0C\u53EF\u83B7\u5F97\u65B0\u7684 URL"
      }, "\u{1F504} \u91CD\u7F6E\u94FE\u63A5")
    )
  );
}
var LanNetworkSelector = React.memo(function LanNetworkSelector2({ lan, onSelectIp }) {
  const interfaces = lan?.interfaces || [];
  const selectedIp = lan?.selectedIp || "";
  const currentIp = lan?.ip || "";
  const [switching, setSwitching] = React.useState(false);
  if (!interfaces || interfaces.length <= 1) return null;
  const handleChange = async (e) => {
    const val = e.target.value;
    setSwitching(true);
    try {
      await onSelectIp(val || null);
    } finally {
      setSwitching(false);
    }
  };
  return h(
    "div",
    {
      style: {
        ...s.block,
        background: "var(--dsw-alias-bg-layer-2, rgba(243, 244, 246, 0.6))",
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid var(--dsw-alias-border-l2, #e5e7eb)",
        marginTop: 8,
        marginBottom: 6
      }
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 500,
          color: "var(--dsw-alias-label-primary, currentColor)"
        }
      },
      h(
        "span",
        { style: { display: "inline-flex", alignItems: "center", gap: 5 } },
        "\u{1F6DC} \u5C40\u57DF\u7F51\u7F51\u5361 / IP \u9009\u62E9"
      ),
      switching && h("span", {
        style: { fontSize: 11, color: "var(--dsw-alias-brand-primary, #4f6ef7)" }
      }, "\u5207\u6362\u4E2D\u2026")
    ),
    h(
      "div",
      { style: { ...s.muted, fontSize: 11, marginBottom: 6 } },
      "\u68C0\u6D4B\u5230\u4E3B\u673A\u5B58\u5728\u591A\u5F20\u7F51\u5361\uFF08\u5982\u7269\u7406 Wi-Fi\u3001\u4EE5\u592A\u7F51\u3001WSL \u6216\u865A\u62DF\u673A\uFF09\u3002\u82E5\u9ED8\u8BA4 IP \u65E0\u6CD5\u88AB\u79FB\u52A8\u7AEF\u8BBF\u95EE\uFF0C\u53EF\u624B\u52A8\u5207\u6362\uFF1A"
    ),
    h(
      "select",
      {
        style: {
          ...s.input,
          height: 32,
          fontSize: 12,
          padding: "0 8px",
          background: "var(--dsw-alias-bg-layer-1, #ffffff)",
          cursor: "pointer"
        },
        value: selectedIp,
        onChange: handleChange,
        disabled: switching
      },
      h("option", { value: "" }, localeT("\u26A1 \u81EA\u52A8\u63A8\u8350 (${ip} \xB7 ${label})", {
        ip: interfaces[0]?.address || currentIp,
        label: interfaces[0]?.label || interfaces[0]?.name || ""
      })),
      interfaces.map((iface) => h("option", {
        key: `${iface.name}-${iface.address}`,
        value: iface.address
      }, iface.isVirtual ? localeT("${address} \xB7 ${name} [\u865A\u62DF/WSL]", { address: iface.address, name: localeT(iface.label || iface.name) }) : localeT("${address} \xB7 ${name}", { address: iface.address, name: localeT(iface.label || iface.name) })))
    )
  );
});
var CustomTunnelGuide = React.memo(function CustomTunnelGuide2() {
  return h(
    "div",
    { style: s.block },
    h("a", {
      href: TUNNEL_DOCS_URL,
      target: "_blank",
      rel: "noreferrer",
      style: { ...s.btnGhost, fontSize: 12, height: 28, display: "inline-flex" }
    }, "\u67E5\u770B\u81EA\u5EFA\u96A7\u9053\u670D\u52A1\u5668\u642D\u5EFA\u6559\u7A0B")
  );
});
var TunnelPasswordNotice = React.memo(function TunnelPasswordNotice2({ onNavigateSecurity, compact = false }) {
  return h(
    "div",
    {
      style: {
        ...s.warn,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 6,
        marginTop: compact ? 8 : 0,
        marginBottom: compact ? 0 : 10,
        cursor: onNavigateSecurity ? "pointer" : "default"
      },
      onClick: onNavigateSecurity,
      // 可键盘操作（与 QrBlock 的提示同款交互，但补上 a11y：焦点 + Enter/Space）
      role: onNavigateSecurity ? "button" : void 0,
      tabIndex: onNavigateSecurity ? 0 : void 0,
      onKeyDown: onNavigateSecurity ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigateSecurity();
        }
      } : void 0,
      title: onNavigateSecurity ? "\u70B9\u51FB\u524D\u5F80\u300C\u5B89\u5168\u8BA4\u8BC1\u300D\u914D\u7F6E" : void 0
    },
    h("span", { style: { flex: "1 1 auto" } }, localeT(TUNNEL_PASSWORD_TEXT)),
    onNavigateSecurity && h("span", {
      style: { fontWeight: 600, textDecoration: "underline", fontSize: 12, color: "var(--dsw-alias-brand-primary,#4f6ef7)", flexShrink: 0 }
    }, localeT("\u53BB\u8BBE\u7F6E \u2794"))
  );
});
var TunnelEntryCard = React.memo(function TunnelEntryCard2({
  entry,
  onCopy,
  copied,
  autoStart,
  onToggleAutoStart,
  onStart,
  onStop,
  onReset
}) {
  const [showQr, setShowQr] = React.useState(false);
  const hasUrl = Boolean(entry && entry.url);
  const active = Boolean(entry && entry.running);
  return h(
    "div",
    {
      style: {
        ...s.card,
        borderColor: active ? "var(--dsw-alias-state-success-border,#a7f3d0)" : void 0,
        background: active ? "linear-gradient(180deg, var(--dsw-alias-bg-layer-2,#f9fafb), var(--dsw-alias-bg-layer-1,#ffffff))" : void 0
      }
    },
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      h(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8 } },
          h("span", { style: { fontSize: 16 } }, "\u{1F310}"),
          h("div", { style: s.label }, "\u516C\u7F51\u8BBF\u95EE\u5165\u53E3")
        ),
        h(
          "div",
          { style: { ...s.muted, marginTop: 4 } },
          entry ? `${localeT(entry.title)} \xB7 ${localeT(entry.desc)}` : "\u5C1A\u672A\u914D\u7F6E\u4EFB\u4F55\u516C\u7F51\u96A7\u9053\uFF0C\u53EF\u5728\u4E0B\u65B9\u5F00\u542F Cloudflare \u96A7\u9053\u6216\u914D\u7F6E\u81EA\u5EFA\u96A7\u9053"
        )
      ),
      h(StatusTag, {
        running: active,
        status: entry && entry.phase && entry.phase !== "ready" ? entry.phase : void 0
      })
    ),
    h(
      "div",
      { style: { ...s.block, display: "flex", flexDirection: "column", gap: 10 } },
      // 有地址：大号 URL + 复制
      hasUrl && h(
        "div",
        {
          style: {
            padding: "10px 12px",
            background: "var(--dsw-alias-bg-layer-1,#ffffff)",
            border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            gap: 10
          }
        },
        h("code", {
          style: { ...s.code, flex: "1 1 auto", fontSize: 13.5, wordBreak: "break-all", lineHeight: 1.5 }
        }, entry.url),
        h("button", {
          style: { ...s.btnGhost, flexShrink: 0, height: 28, padding: "0 12px", fontSize: 12 },
          onClick: () => onCopy && onCopy(entry.url)
        }, copied ? "\u2713 \u5DF2\u590D\u5236" : "\u590D\u5236")
      ),
      // 状态细节（重连/错误/连接中）——无 URL 时格外重要，让用户知道隧道在自愈而非消失
      entry && entry.stateDetail && h("div", {
        style: {
          fontSize: 12,
          lineHeight: 1.5,
          color: entry.phase === "error" || entry.phase === "reconnecting" ? "var(--dsw-alias-label-primary, #0f1115)" : "var(--dsw-alias-label-secondary,#6b7280)"
        }
      }, entry.stateDetail),
      // 操作行：running → 关闭/停止重连（+ 重置）；!running → 开启
      active && onStop && h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        h("button", {
          style: s.btnGhost,
          onClick: onStop
        }, entry && entry.phase === "reconnecting" ? "\u505C\u6B62\u91CD\u8FDE" : "\u5173\u95ED"),
        onReset && h("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12 },
          onClick: onReset,
          title: "\u5173\u95ED\u5E76\u91CD\u65B0\u5F00\u542F\uFF0C\u66F4\u6362\u4E34\u65F6\u5730\u5740"
        }, "\u{1F504} \u91CD\u7F6E\u94FE\u63A5")
      ),
      // running 但无 onStop 的入口（如外部登记）：只给重置/二维码辅助，无开关
      active && !onStop && onReset && h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        h("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12 },
          onClick: onReset,
          title: "\u5173\u95ED\u5E76\u91CD\u65B0\u5F00\u542F\uFF0C\u66F4\u6362\u4E34\u65F6\u5730\u5740"
        }, "\u{1F504} \u91CD\u7F6E\u94FE\u63A5")
      ),
      // 未运行：引导开启（连接中/下载中禁用）
      !active && onStart && h("button", {
        style: {
          ...s.btnPri,
          alignSelf: "flex-start",
          opacity: entry && entry.configured === false ? 0.4 : 1,
          background: entry && entry.phase === "connecting" ? "#2563eb" : void 0,
          color: entry && entry.phase === "connecting" ? "#ffffff" : "var(--dsw-alias-label-primary-foreground, #fff)"
        },
        onClick: onStart,
        disabled: Boolean(entry && entry.configured === false || entry && (entry.phase === "connecting" || entry.phase === "downloading")),
        title: entry && entry.configured === false ? "\u8BF7\u5148\u5728\u300C\u96A7\u9053\u914D\u7F6E\u300D\u4E2D\u4FDD\u5B58\u670D\u52A1\u5668\u914D\u7F6E" : ""
      }, entry && entry.phase === "connecting" ? "\u8FDE\u63A5\u4E2D\u2026" : entry && entry.phase === "downloading" ? "\u4E0B\u8F7D\u4E2D\u2026" : "\u5F00\u542F\u516C\u7F51\u96A7\u9053"),
      // 二维码辅助按钮：有地址未运行时也可查看（外部登记等）
      hasUrl && entry.qr && h(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        h("button", {
          style: { ...s.btnGhost, height: 28, padding: "0 12px", fontSize: 12 },
          onClick: () => setShowQr((v) => !v)
        }, showQr ? "\u9690\u85CF\u4E8C\u7EF4\u7801" : "\u663E\u793A\u4E8C\u7EF4\u7801")
      ),
      showQr && hasUrl && entry.qr && h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 } },
        h("img", { src: entry.qr, alt: "QR", style: { ...s.qr, margin: 0 } }),
        h("div", { style: { ...s.muted, fontSize: 11 } }, "\u8BF7\u5728\u79C1\u5BC6\u73AF\u5883\u4E0B\u626B\u7801\u4F7F\u7528")
      )
    ),
    onToggleAutoStart && h(
      "label",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
          fontSize: 12,
          color: "var(--dsw-alias-label-secondary,#6b7280)",
          cursor: "pointer",
          userSelect: "none"
        },
        title: "DSH \u542F\u52A8\u65F6\u81EA\u52A8\u6062\u590D\u8BE5\u96A7\u9053\u7684\u8FD0\u884C\u72B6\u6001"
      },
      h("input", {
        type: "checkbox",
        checked: Boolean(autoStart),
        onChange: (e) => onToggleAutoStart(e.target.checked)
      }),
      h("span", null, "\u968F DSH \u542F\u52A8\u81EA\u52A8\u5F00\u542F")
    )
  );
});
var TunnelConfigGroup = React.memo(function TunnelConfigGroup2({ children }) {
  const [open, setOpen] = React.useState(false);
  return h(
    "div",
    { style: s.card },
    h(
      "div",
      {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none", gap: 8 },
        onClick: () => setOpen((v) => !v)
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        h("span", { style: { fontSize: 14 } }, "\u2699\uFE0F"),
        h("div", { style: s.label }, "\u96A7\u9053\u914D\u7F6E"),
        h("span", { style: { ...s.muted, fontSize: 11 } }, "Token \xB7 \u56FA\u5B9A\u57DF\u540D \xB7 \u81EA\u5EFA\u670D\u52A1\u5668 \xB7 \u5916\u90E8\u767B\u8BB0")
      ),
      h("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary,#9ca3af)", flexShrink: 0 } }, open ? "\u6536\u8D77 \u25B4" : "\u5C55\u5F00 \u25BE")
    ),
    open && h("div", { style: { marginTop: 4 } }, children)
  );
});
var CustomTunnelConfigForm = React.memo(function CustomTunnelConfigForm2({ serverUrl: initUrl, accessToken: initToken, onSave }) {
  const [serverUrl, setServerUrl] = React.useState(initUrl ?? "");
  const [accessToken, setAccessToken] = React.useState(initToken ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (!syncedRef.current && (initUrl || initToken)) {
      setServerUrl(initUrl ?? "");
      setAccessToken(initToken ?? "");
      syncedRef.current = true;
    }
  }, [initUrl, initToken]);
  const dirty = serverUrl !== (initUrl ?? "") || accessToken !== (initToken ?? "");
  const [saveErr, setSaveErr] = React.useState(null);
  const handleSave = React.useCallback(async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveErr(null);
    try {
      await onSave(serverUrl, accessToken);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setSaveErr(e.message || "\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25");
    } finally {
      setSaving(false);
    }
  }, [onSave, serverUrl, accessToken]);
  const handleUrlChange = React.useCallback((e) => {
    setServerUrl(e.target.value);
    setSaveSuccess(false);
    setSaveErr(null);
  }, []);
  const handleTokenChange = React.useCallback((e) => {
    setAccessToken(e.target.value);
    setSaveSuccess(false);
    setSaveErr(null);
  }, []);
  return h(
    "div",
    { style: s.block },
    h("div", { style: { ...s.muted, marginBottom: 8 } }, "\u96A7\u9053\u670D\u52A1\u5668\u914D\u7F6E"),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8 } },
      h("input", {
        style: s.input,
        placeholder: "WebSocket \u5730\u5740\uFF0C\u4F8B\u5982 wss://tunnel.example.com/connect",
        value: serverUrl,
        onChange: handleUrlChange,
        onKeyDown: (e) => {
          if (e.key === "Enter" && dirty && !saving) handleSave();
        },
        disabled: saving
      }),
      h("input", {
        style: s.input,
        type: "password",
        placeholder: "\u96A7\u9053\u670D\u52A1\u7AEF\u8FDE\u63A5\u4EE4\u724C\uFF08Tunnel Access Token\uFF09",
        value: accessToken,
        onChange: handleTokenChange,
        onKeyDown: (e) => {
          if (e.key === "Enter" && dirty && !saving) handleSave();
        },
        disabled: saving
      }),
      saveErr && h("div", { style: s.err }, `\u274C ${localeT(saveErr)}`),
      h(
        "div",
        { style: { ...s.muted, fontSize: 11 } },
        "\u{1F4A1} \u7528\u4E8E\u4E0E\u60A8\u7684 VPS \u96A7\u9053\u670D\u52A1\u7AEF\u5EFA\u7ACB\u53CD\u5411\u901A\u9053\uFF08\u4E0E Web \u7F51\u9875\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u4E92\u76F8\u72EC\u7ACB\uFF09\u3002"
      ),
      h("button", {
        style: {
          ...s.btnPri,
          alignSelf: "flex-start",
          opacity: !dirty || saving ? saveSuccess ? 1 : 0.5 : 1,
          background: saveSuccess ? "#047857" : void 0,
          // 成功态底色是写死的绿，前景必须一并写死：label-primary-foreground 在暗色主题
          // 下是深色，配中绿底只有 3.3:1。#047857 + 白 = 5.48:1，两主题一致。
          color: saveSuccess ? "#ffffff" : "var(--dsw-alias-label-primary-foreground, #fff)"
        },
        disabled: !dirty && !saveSuccess || saving,
        onClick: handleSave
      }, saving ? "\u4FDD\u5B58\u4E2D\u2026" : saveSuccess ? "\u2713 \u5DF2\u4FDD\u5B58" : "\u4FDD\u5B58\u914D\u7F6E")
    )
  );
});
var TunnelCard = React.memo(function TunnelCard2({
  title,
  desc,
  data,
  autoStart,
  onToggleAutoStart,
  onStart,
  onStop,
  onReset,
  auth,
  onNavigateSecurity,
  children
}) {
  const { running, configured, url, qr, state } = data ?? {};
  const phase = state?.phase ?? "idle";
  return h(
    "div",
    { style: s.card },
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      h(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        h("div", { style: s.label }, title),
        h("div", { style: { ...s.muted, marginTop: 2 } }, desc)
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 } },
        h(StatusTag, { running, status: phase === "ready" ? void 0 : phase }),
        onToggleAutoStart && h(
          "label",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--dsw-alias-label-secondary,#6b7280)",
              cursor: "pointer",
              userSelect: "none"
            },
            title: "DSH \u542F\u52A8\u65F6\u81EA\u52A8\u6062\u590D\u8BE5\u96A7\u9053\u7684\u8FD0\u884C\u72B6\u6001"
          },
          h("input", {
            type: "checkbox",
            checked: Boolean(autoStart),
            onChange: (e) => onToggleAutoStart(e.target.checked)
          }),
          "\u968F DSH \u542F\u52A8\u81EA\u52A8\u5F00\u542F"
        )
      )
    ),
    children,
    phase !== "idle" && phase !== "ready" && h("div", {
      style: {
        ...s.block,
        fontSize: 12,
        color: phase === "error" || phase === "reconnecting" ? "var(--dsw-alias-label-primary, #0f1115)" : "var(--dsw-alias-label-secondary,#6b7280)"
      }
    }, state?.detail ?? phase),
    url && h(QrBlock, { url, qr, onReset, auth, onNavigateSecurity }),
    (onStart || onStop) && h(
      "div",
      {
        style: { ...s.block, display: "flex", gap: 8, flexWrap: "wrap" }
      },
      !running && onStart && needsTunnelPassword(auth) && h(TunnelPasswordNotice, { onNavigateSecurity, compact: true }),
      !running && onStart && h("button", {
        style: { ...s.btnPri, opacity: configured === false ? 0.4 : 1 },
        onClick: onStart,
        disabled: configured === false || phase === "connecting" || phase === "downloading",
        title: configured === false ? "\u8BF7\u5148\u4FDD\u5B58\u670D\u52A1\u5668\u914D\u7F6E" : ""
      }, phase === "connecting" ? "\u8FDE\u63A5\u4E2D\u2026" : phase === "downloading" ? "\u4E0B\u8F7D\u4E2D\u2026" : "\u5F00\u542F"),
      running && onStop && h("button", {
        style: s.btnGhost,
        onClick: onStop
      }, phase === "reconnecting" ? "\u505C\u6B62\u91CD\u8FDE" : "\u5173\u95ED")
    )
  );
});
var CloudflareDiagnostics = React.memo(function CloudflareDiagnostics2({ dataPlane, binary, foreignRunner }) {
  const lines = [];
  if (dataPlane) {
    const n = dataPlane.consecutiveFailures || 0;
    if (dataPlane.state === "ok") {
      lines.push(localeT("\u2705 \u6570\u636E\u9762\u6B63\u5E38\uFF08\u6BCF 60s \u63A2\u6D4B\u516C\u7F51\u5165\u53E3${ip}\uFF09", {
        ip: dataPlane.resolvedIp ? localeT(" \xB7 ${ip}", { ip: dataPlane.resolvedIp }) : ""
      }));
    } else if (dataPlane.state === "unstable") {
      lines.push(localeT("\u26A0\uFE0F \u6570\u636E\u9762\u95F4\u6B47\u5931\u8D25\uFF08\u8FDE\u7EED ${count} \u6B21\uFF09\uFF1A${reason}", { count: n, reason: localeT(dataPlane.lastError) || localeT("\u539F\u56E0\u672A\u77E5") }));
    } else if (dataPlane.state === "degraded") {
      lines.push(localeT("\u274C \u6570\u636E\u9762\u4E0D\u53EF\u8FBE\uFF08\u8FDE\u7EED ${count} \u6B21\uFF09\uFF1A${reason}", { count: n, reason: localeT(dataPlane.lastError) || localeT("\u539F\u56E0\u672A\u77E5") }));
    } else if (dataPlane.lastError) {
      lines.push(localeT("\u6570\u636E\u9762\u63A2\u6D4B\uFF1A${reason}", { reason: localeT(dataPlane.lastError) }));
    }
  }
  if (foreignRunner && foreignRunner.pid) {
    lines.push(localeT("\u26A0\uFE0F \u68C0\u6D4B\u5230\u53E6\u4E00\u4E2A cloudflared\uFF08PID ${pid}\uFF0C\u51ED\u636E\u6765\u6E90 --${via}\uFF09\u6B63\u5728\u4F7F\u7528\u76F8\u540C\u7684 tunnel token\uFF1A\u96A7\u9053\u72B6\u6001\u53EF\u80FD\u53EA\u53CD\u6620\u4E00\u534A\uFF0C\u8BF7\u505C\u7528\u5176\u4E2D\u4E00\u4FA7", {
      pid: foreignRunner.pid,
      via: foreignRunner.via
    }));
  }
  if (binary && binary.path) {
    const src = binary.source === "system" ? "\u7CFB\u7EDF\u5B89\u88C5\uFF08\u4E0D\u53C2\u4E0E\u7248\u672C\u9489\u6B7B\uFF09" : binary.source === "managed" ? "\u63D2\u4EF6\u5185\u7F6E" : "\u5916\u90E8\u6307\u5B9A";
    lines.push(localeT("cloudflared\uFF1A${path}\uFF08${version} \xB7 ${source}\uFF09", {
      path: binary.path,
      version: localeT(binary.version || "\u7248\u672C\u672A\u77E5"),
      source: localeT(src)
    }));
  }
  if (!lines.length) return null;
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 4, margin: "6px 0 10px" } },
    lines.map((t2, i) => h("div", {
      key: i,
      style: { ...s.muted, fontSize: 11, wordBreak: "break-all" }
    }, t2))
  );
});
var CLOUDFLARE_NETWORK_SELECTS = [
  { key: "protocol", label: "\u7F51\u7EDC\u534F\u8BAE", opts: [["", "\u9ED8\u8BA4\uFF08auto\uFF09"], ["quic", "\u5F3A\u5236 QUIC"], ["http2", "\u5F3A\u5236 HTTP/2"]] },
  { key: "edgeIpVersion", label: "\u8FB9\u7F18 IP", opts: [["", "\u9ED8\u8BA4\uFF084\uFF09"], ["4", "IPv4\uFF084\uFF09"], ["6", "IPv6\uFF086\uFF09"], ["auto", "\u81EA\u52A8\uFF08auto\uFF09"]] },
  { key: "region", label: "\u8FB9\u7F18\u533A\u57DF", opts: [["", "\u5168\u7403\uFF08\u9ED8\u8BA4\uFF09"], ["us", "\u7F8E\u56FD\uFF08us\uFF09"]] }
];
var CloudflareConfigForm = React.memo(function CloudflareConfigForm2({ token, hostname, network, onSave }) {
  const [open, setOpen] = React.useState(Boolean(token || hostname));
  const [tokenVal, setTokenVal] = React.useState(token || "");
  const [hostnameVal, setHostnameVal] = React.useState(hostname || "");
  const [netVals, setNetVals] = React.useState(() => ({
    protocol: network?.protocol || "",
    edgeIpVersion: network?.edgeIpVersion || "",
    region: network?.region || ""
  }));
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    setTokenVal(token || "");
    setHostnameVal(hostname || "");
    setNetVals({
      protocol: network?.protocol || "",
      edgeIpVersion: network?.edgeIpVersion || "",
      region: network?.region || ""
    });
  }, [token, hostname, network?.protocol, network?.edgeIpVersion, network?.region]);
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const patch = {};
      if (hostnameVal !== (hostname || "")) patch.hostname = hostnameVal;
      if (tokenVal !== (token || "")) patch.token = tokenVal;
      for (const { key } of CLOUDFLARE_NETWORK_SELECTS) {
        if ((netVals[key] || "") !== ((network || {})[key] || "")) patch[key] = netVals[key] || "";
      }
      if (Object.keys(patch).length > 0) await onSave(patch);
      setMsg({ ok: true, text: "\u2713 \u56FA\u5B9A\u57DF\u540D\u914D\u7F6E\u5DF2\u4FDD\u5B58" });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "\u4FDD\u5B58\u5931\u8D25" });
    } finally {
      setSaving(false);
    }
  };
  return h(
    "div",
    {
      style: {
        ...s.block,
        borderTop: "1px solid var(--dsw-alias-border-secondary, #e5e7eb)",
        paddingTop: 10,
        marginTop: 10
      }
    },
    h(
      "div",
      {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" },
        onClick: () => setOpen((v) => !v)
      },
      h(
        "div",
        { style: { fontSize: 12, fontWeight: 500, color: "var(--dsw-alias-brand-primary, #3b82f6)" } },
        "\u2699\uFE0F \u9AD8\u7EA7\u914D\u7F6E\uFF1A\u56FA\u5B9A\u57DF\u540D (Cloudflare Token) ",
        (token || hostname) && h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-primary, #0f1115)", fontWeight: 400 } }, "\u25CF \u5DF2\u914D\u7F6E\u56FA\u5B9A\u57DF\u540D")
      ),
      h("span", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #9ca3af)" } }, open ? "\u25B4 \u6298\u53E0" : "\u25BE \u5C55\u5F00")
    ),
    open && h(
      "form",
      { onSubmit: handleSave, style: { marginTop: 10 } },
      h(
        "div",
        { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary, #6b7280)", marginBottom: 8, lineHeight: 1.5 } },
        "\u5728 Cloudflare Zero Trust \u63A7\u5236\u53F0\u521B\u5EFA Tunnel \u5373\u53EF\u83B7\u53D6\u4E13\u5C5E Token \u5E76\u7ED1\u5B9A\u81EA\u5DF1\u7684\u57DF\u540D\uFF08\u5982 dsh.yourname.com\uFF09\uFF0C\u6BCF\u6B21\u91CD\u542F URL \u6C38\u4E0D\u53D8\u66F4\u3002\u4E0D\u586B\u5219\u4F7F\u7528\u9ED8\u8BA4\u514D\u767B\u5F55\u4E34\u65F6\u968F\u673A\u57DF\u540D\u3002"
      ),
      h("a", {
        href: CLOUDFLARE_TUTORIAL_URL,
        target: "_blank",
        rel: "noreferrer",
        style: { ...s.btnLink, marginBottom: 10 }
      }, "\u{1F4D6} \u67E5\u770B\u300CCloudflare \u56FA\u5B9A\u57DF\u540D\u300D\u7533\u8BF7\u4E0E\u914D\u7F6E\u6559\u7A0B"),
      h(
        "div",
        { style: { marginBottom: 8 } },
        h("input", {
          style: s.input,
          type: "text",
          placeholder: "\u81EA\u5B9A\u4E49\u56FA\u5B9A\u57DF\u540D (\u4F8B\u5982: dsh.yourdomain.com)",
          value: hostnameVal,
          onChange: (e) => setHostnameVal(e.target.value)
        })
      ),
      h(
        "div",
        { style: { marginBottom: 8 } },
        h("input", {
          style: s.input,
          type: "password",
          placeholder: "Tunnel Token (\u4F8B\u5982: eyJhIjoi...)",
          value: tokenVal,
          onChange: (e) => setTokenVal(e.target.value)
        })
      ),
      h(
        "div",
        {
          style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginBottom: 8 }
        },
        CLOUDFLARE_NETWORK_SELECTS.map(({ key, label, opts }) => h(
          "label",
          {
            key,
            style: { display: "flex", flexDirection: "column", gap: 3, fontSize: 11, color: "var(--dsw-alias-label-secondary, #6b7280)" }
          },
          label,
          h(
            "select",
            {
              style: {
                ...s.input,
                height: 28,
                fontSize: 12,
                padding: "0 6px",
                cursor: "pointer",
                background: "var(--dsw-alias-bg-layer-1, #ffffff)"
              },
              value: netVals[key] || "",
              onChange: (e) => setNetVals((v) => ({ ...v, [key]: e.target.value }))
            },
            opts.map(([val, text]) => h("option", { key: val, value: val }, text))
          )
        ))
      ),
      h(
        "div",
        { style: { ...s.muted, fontSize: 11, marginBottom: 8, lineHeight: 1.5 } },
        "\u7F51\u7EDC\u53C2\u6570\u53D6\u503C\u6765\u81EA Cloudflare \u5B98\u65B9\u767D\u540D\u5355\uFF1B\u6539\u52A8\u9700\u91CD\u65B0\u5F00\u542F\u96A7\u9053\uFF08\u5173\u95ED\u2192\u5F00\u542F\uFF09\u540E\u751F\u6548\uFF0C\u5F53\u524D\u4E8C\u8FDB\u5236\u4E0D\u652F\u6301\u7684\u53C2\u6570\u4F1A\u81EA\u52A8\u8DF3\u8FC7\u5E76\u5728\u65E5\u5FD7\u544A\u8B66\u3002"
      ),
      h(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
        h("button", {
          type: "submit",
          style: { ...s.btnPri, height: 28, fontSize: 12, padding: "0 12px" },
          disabled: saving
        }, saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u56FA\u5B9A\u57DF\u540D\u914D\u7F6E"),
        (tokenVal || hostnameVal) && h("button", {
          type: "button",
          style: { ...s.btnGhost, height: 28, fontSize: 12, padding: "0 10px" },
          onClick: () => {
            setTokenVal("");
            setHostnameVal("");
            onSave({ token: "", hostname: "" });
          }
        }, "\u6E05\u9664"),
        msg && h("span", {
          style: { fontSize: 12, color: "var(--dsw-alias-label-primary, #0f1115)" }
        }, msg.text)
      )
    )
  );
});
var ExternalTunnelCard = React.memo(function ExternalTunnelCard2({ ext, onSave }) {
  const [urlVal, setUrlVal] = React.useState(ext?.url ?? "");
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    setUrlVal(ext?.url ?? "");
  }, [ext?.url]);
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await onSave(urlVal.trim());
      setMsg({ ok: true, text: urlVal.trim() ? "\u2713 \u5916\u90E8\u96A7\u9053\u5730\u5740\u5DF2\u767B\u8BB0" : "\u2713 \u5DF2\u6E05\u9664\u767B\u8BB0" });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "\u4FDD\u5B58\u5931\u8D25" });
    } finally {
      setSaving(false);
    }
  };
  return h(
    "div",
    { style: s.card },
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      h(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        h("div", { style: s.label }, "\u5916\u90E8\u5DF2\u90E8\u7F72\u96A7\u9053"),
        h(
          "div",
          { style: { ...s.muted, marginTop: 2 } },
          "\u5DF2\u5728 Docker / \u670D\u52A1\u5668\u4E0A\u81EA\u884C\u90E8\u7F72\u96A7\u9053\uFF08\u5982 cloudflared\uFF09\u65F6\uFF0C\u767B\u8BB0\u516C\u7F51\u5730\u5740\u5373\u53EF\u5728\u9762\u677F\u5C55\u793A\u5165\u53E3\u4E0E\u4E8C\u7EF4\u7801\uFF1B\u63D2\u4EF6\u4E0D\u4F1A\u91CD\u590D\u4E0B\u8F7D\u6216\u7BA1\u7406\u8BE5\u96A7\u9053\u3002"
        )
      ),
      h(StatusTag, { running: Boolean(ext?.configured) })
    ),
    ext?.configured && h(QrBlock, { url: ext?.url, qr: ext?.qr }),
    h(
      "form",
      { onSubmit: handleSave, style: { marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
      h("input", {
        style: { ...s.input, flex: "1 1 220px", minWidth: 0 },
        type: "text",
        placeholder: "https://tunnel.yourdomain.com \u6216 trycloudflare \u5730\u5740",
        value: urlVal,
        onChange: (e) => setUrlVal(e.target.value)
      }),
      h("button", {
        type: "submit",
        style: { ...s.btnPri, height: 28, fontSize: 12, padding: "0 12px" },
        disabled: saving
      }, saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58"),
      ext?.configured && h("button", {
        type: "button",
        style: { ...s.btnGhost, height: 28, fontSize: 12, padding: "0 10px" },
        onClick: () => {
          setUrlVal("");
          onSave("");
        }
      }, "\u6E05\u9664"),
      msg && h("span", {
        style: { fontSize: 12, color: "var(--dsw-alias-label-primary, #0f1115)" }
      }, msg.text)
    )
  );
});
var AccessAuthCard = React.memo(function AccessAuthCard2({ auth, rpcCall, onUpdate }) {
  const [enabled, setEnabled] = React.useState(auth?.enabled ?? false);
  const [mode, setMode] = React.useState(auth?.mode ?? "token_and_password");
  const [scope, setScope] = React.useState(auth?.scope ?? "all");
  const [adminPolicy, setAdminPolicy] = React.useState(auth?.adminPolicy ?? "password_unlock");
  const [adminProtection, setAdminProtection] = React.useState(auth?.adminProtection ?? true);
  const [accessPassword, setAccessPassword] = React.useState("");
  const [showAccessPassword, setShowAccessPassword] = React.useState(false);
  const [savingAccess, setSavingAccess] = React.useState(false);
  const [saveAccessSuccess, setSaveAccessSuccess] = React.useState(false);
  const [msgAccess, setMsgAccess] = React.useState(null);
  const [adminPassword, setAdminPassword] = React.useState("");
  const [showAdminPassword, setShowAdminPassword] = React.useState(false);
  const [savingAdmin, setSavingAdmin] = React.useState(false);
  const [saveAdminSuccess, setSaveAdminSuccess] = React.useState(false);
  const [msgAdmin, setMsgAdmin] = React.useState(null);
  const [topMsg, setTopMsg] = React.useState(null);
  React.useEffect(() => {
    const off = onUnlocked(() => {
      setTopMsg(null);
      setMsgAccess(null);
      setMsgAdmin(null);
    });
    return off;
  }, []);
  React.useEffect(() => {
    if (auth) {
      setEnabled(auth.enabled ?? false);
      setMode(auth.mode ?? "token_and_password");
      setScope(auth.scope ?? "all");
      setAdminPolicy(auth.adminPolicy ?? "password_unlock");
      setAdminProtection(auth.adminProtection ?? true);
    }
  }, [auth]);
  const handleToggleEnabled = async () => {
    const prev = enabled;
    const next = !enabled;
    const noPasswordYet = !auth?.hasPassword && !auth?.hasAdminPassword;
    if (next && noPasswordYet && mode !== "token_only") {
      if (mode === "password_only") {
        window.alert(localeT("\u300C\u4EC5\u5BC6\u7801 / PIN \u7801\u767B\u5F55\u300D\u6A21\u5F0F\u5FC5\u987B\u5148\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\u624D\u80FD\u5F00\u542F\u5B89\u5168\u9632\u62A4\u3002\n\n\u8BF7\u5148\u5728\u4E0B\u65B9\u300C\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 / PIN \u7801\u300D\u8F93\u5165\u5BC6\u7801\u5E76\u70B9\u51FB\u300C\u4FDD\u5B58\u8BBF\u95EE\u5BC6\u7801\u300D\uFF0C\u7136\u540E\u518D\u5F00\u542F\u3002"));
        setTopMsg({ ok: false, text: "\u8BF7\u5148\u8BBE\u7F6E\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\uFF0C\u518D\u5F00\u542F\u5B89\u5168\u9632\u62A4" });
        return;
      }
      const go = window.confirm(
        localeT('\u26A0\uFE0F \u60A8\u5C1A\u672A\u8BBE\u7F6E\u4EFB\u4F55\u8BBF\u95EE\u5BC6\u7801\u6216\u7BA1\u7406\u5BC6\u7801\u3002\n\n\u5F00\u542F\u5B89\u5168\u9632\u62A4\u540E\uFF0C\u4EFB\u4F55\u77E5\u9053\u5C40\u57DF\u7F51 IP / \u96A7\u9053\u5730\u5740\u7684\u8BBF\u5BA2\u4ECD\u53EF\u76F4\u63A5\u8FDB\u5165\uFF08\u5F53\u524D\u76F8\u5F53\u4E8E"\u514D\u5BC6\u5F00\u653E"\u72B6\u6001\uFF09\u3002\n\n\u662F\u5426\u4ECD\u8981\u5F00\u542F\uFF1F\u5EFA\u8BAE\u5148\u5173\u95ED\uFF0C\u5728\u4E0B\u65B9\u300C\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u300D\u5904\u8BBE\u7F6E\u5BC6\u7801\u540E\u518D\u5F00\u542F\u3002')
      );
      if (!go) return;
    }
    setEnabled(next);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { enabled: next });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: next ? noPasswordYet ? "\u2713 \u5B89\u5168\u9632\u62A4\u5DF2\u5F00\u542F\uFF08\u6CE8\u610F\uFF1A\u5C1A\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u8BBF\u5BA2\u4ECD\u53EF\u514D\u5BC6\u8FDB\u5165\uFF0C\u8BF7\u7ACB\u5373\u5728\u4E0B\u65B9\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\uFF09" : "\u2713 \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u5F00\u542F\uFF08\u73B0\u6709\u767B\u5F55\u6001\u5DF2\u5237\u65B0\uFF09" : "\u2713 \u8BBF\u95EE\u5B89\u5168\u8BA4\u8BC1\u5DF2\u5173\u95ED\uFF08\u8BBF\u95EE\u514D\u5BC6\uFF0C\u7BA1\u7406\u4FDD\u62A4\u4E0D\u53D7\u5F71\u54CD\uFF09" });
      onUpdate?.();
    } catch (e) {
      setEnabled(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleToggleAdminProtection = async () => {
    const prev = adminProtection;
    const next = !adminProtection;
    setAdminProtection(next);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminProtection: next });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: next ? "\u2713 \u7BA1\u7406\u4FDD\u62A4\u5DF2\u5F00\u542F\uFF08\u4FEE\u6539\u914D\u7F6E\u9700\u7BA1\u7406\u5BC6\u7801\uFF09" : "\u2713 \u7BA1\u7406\u4FDD\u62A4\u5DF2\u5173\u95ED\uFF08\u4FEE\u6539\u914D\u7F6E\u514D\u5BC6\uFF0C\u8BF7\u8C28\u614E\uFF09" });
      onUpdate?.();
    } catch (e) {
      setAdminProtection(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleChangeMode = async (m) => {
    if (m === "password_only" && !auth?.hasPassword && !auth?.hasAdminPassword) {
      window.alert(localeT("\u300C\u4EC5\u5BC6\u7801 / PIN \u7801\u767B\u5F55\u300D\u9700\u8981\u5148\u8BBE\u7F6E\u8BBF\u95EE\u5BC6\u7801\u3002\n\n\u8BF7\u5728\u4E0B\u65B9\u300C\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 / PIN \u7801\u300D\u5904\u8F93\u5165\u5BC6\u7801\u5E76\u70B9\u51FB\u300C\u4FDD\u5B58\u8BBF\u95EE\u5BC6\u7801\u300D\uFF0C\u7136\u540E\u518D\u5207\u6362\u5230\u6B64\u6A21\u5F0F\u6216\u5F00\u542F\u5B89\u5168\u9632\u62A4\u3002"));
      setTopMsg({ ok: false, text: "\u8BF7\u5148\u5728\u4E0B\u65B9\u8BBE\u7F6E\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\uFF0C\u518D\u5207\u6362\u4E3A\u300C\u4EC5\u5BC6\u7801\u767B\u5F55\u300D\u6A21\u5F0F" });
      return;
    }
    const prev = mode;
    setMode(m);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { mode: m });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: "\u2713 \u5916\u90E8\u9A8C\u8BC1\u6A21\u5F0F\u5DF2\u5207\u6362\uFF0C\u5DF2\u5237\u65B0\u5168\u57DF\u767B\u5F55\u6001" });
      onUpdate?.();
    } catch (e) {
      setMode(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleChangeScope = async (sc) => {
    const prev = scope;
    setScope(sc);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { scope: sc });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: "\u2713 \u9632\u62A4\u751F\u6548\u8303\u56F4\u5DF2\u66F4\u65B0" });
      onUpdate?.();
    } catch (e) {
      setScope(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleChangeAdminPolicy = async (pol) => {
    const prev = adminPolicy;
    setAdminPolicy(pol);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminPolicy: pol });
      if (!res?.ok) throw new Error(res?.error?.message || "\u66F4\u65B0\u5931\u8D25");
      setTopMsg({ ok: true, text: "\u2713 \u8FDC\u7A0B\u7BA1\u7406\u9632\u7BE1\u6539\u7B56\u7565\u5DF2\u66F4\u65B0" });
      onUpdate?.();
    } catch (e) {
      setAdminPolicy(prev);
      setTopMsg({ ok: false, text: e.message || "\u66F4\u65B0\u5931\u8D25" });
    }
  };
  const handleSaveAccessPassword = async () => {
    setSavingAccess(true);
    setMsgAccess(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { password: accessPassword });
      if (res?.ok) {
        setSaveAccessSuccess(true);
        setMsgAccess({ ok: true, text: "\u2713 \u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u539F\u6709\u7684\u5386\u53F2\u8BBF\u5BA2\u4F1A\u8BDD\u5DF2\u5168\u90E8\u5B89\u5168\u5237\u65B0\u3002" });
        setAccessPassword("");
        setTimeout(() => setSaveAccessSuccess(false), 3500);
        onUpdate?.();
      } else {
        setMsgAccess({ ok: false, text: res?.error?.message || "\u4FDD\u5B58\u5931\u8D25" });
      }
    } catch (e) {
      setMsgAccess({ ok: false, text: e.message || "\u4FDD\u5B58\u5931\u8D25" });
    } finally {
      setSavingAccess(false);
    }
  };
  const handleSaveAdminPassword = async () => {
    setSavingAdmin(true);
    setMsgAdmin(null);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authUpdateConfig, { adminPassword });
      if (res?.ok) {
        setSaveAdminSuccess(true);
        setMsgAdmin({ ok: true, text: "\u2713 \u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u5DF2\u6210\u529F\u4FDD\u5B58\uFF01\u8FDC\u7A0B\u7BA1\u7406\u89E3\u9501\u72B6\u6001\u5DF2\u91CD\u7F6E\u751F\u6548\u3002" });
        setAdminPassword("");
        setTimeout(() => setSaveAdminSuccess(false), 3500);
        onUpdate?.();
      } else {
        setMsgAdmin({ ok: false, text: res?.error?.message || "\u4FDD\u5B58\u5931\u8D25" });
      }
    } catch (e) {
      setMsgAdmin({ ok: false, text: e.message || "\u4FDD\u5B58\u5931\u8D25" });
    } finally {
      setSavingAdmin(false);
    }
  };
  const handleRegenerateToken = async () => {
    if (!confirm(localeT("\u91CD\u7F6E\u540E\uFF0C\u4E4B\u524D\u5305\u542B\u65E7 Token \u7684\u4E8C\u7EF4\u7801\u548C\u5206\u4EAB\u94FE\u63A5\u5C06\u7ACB\u5373\u5931\u6548\u3002\u662F\u5426\u786E\u8BA4\u91CD\u7F6E\uFF1F"))) return;
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.authRegenerateToken, {});
      if (!res?.ok) throw new Error(res?.error?.message || "\u91CD\u7F6E\u5931\u8D25");
      setTopMsg({ ok: true, text: "\u2713 \u5B89\u5168 Token \u5DF2\u91CD\u7F6E\uFF0C\u4E8C\u7EF4\u7801\u4E0E\u4E13\u5C5E\u94FE\u63A5\u5DF2\u5237\u65B0" });
      onUpdate?.();
    } catch (e) {
      setTopMsg({ ok: false, text: e.message || "\u91CD\u7F6E\u5931\u8D25" });
    }
  };
  const scopeLabel = scope === "all" ? "\u5168\u90E8\u901A\u9053 (\u5C40\u57DF\u7F51+\u516C\u7F51)" : scope === "public_only" ? "\u4EC5\u516C\u7F51\u96A7\u9053" : "\u4EC5\u5C40\u57DF\u7F51";
  const modeLabel = mode === "token_and_password" ? "\u626B\u7801\u514D\u5BC6 + \u5BC6\u7801" : mode === "password_only" ? "\u4EC5\u5BC6\u7801\u767B\u5F55" : "\u4EC5\u5B89\u5168 Token";
  const adminLabel = adminPolicy === "password_unlock" ? "\u9700\u5BC6\u7801\u89E3\u9501" : adminPolicy === "local_only" ? "\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406" : "\u5BBD\u677E\u6A21\u5F0F";
  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 14 } },
    // ---- 顶部总控与状态概览卡片 ----
    h(
      "div",
      { style: s.card },
      h(
        "div",
        {
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }
        },
        h(
          "div",
          { style: { flex: "1 1 260px" } },
          h(
            "div",
            { style: { ...s.label, fontSize: 15, display: "flex", alignItems: "center", gap: 8 } },
            "\u{1F510} \u5168\u5C40\u8BBF\u95EE\u5B89\u5168\u9632\u62A4\u4F53\u7CFB"
          ),
          h(
            "div",
            { style: { ...s.muted, marginTop: 4 } },
            "\u96C6\u6210\u5916\u90E8\u8BBF\u95EE\u95E8\u7981\u62E6\u622A\u4E0E\u7BA1\u7406\u540E\u53F0\u9632\u7BE1\u6539\u63A7\u5236\uFF0C\u53CC\u91CD\u5B88\u62A4\u8FDC\u7A0B\u4F1A\u8BDD\u4E0E\u7F51\u7EDC\u914D\u7F6E\u5B89\u5168"
          )
        ),
        h("button", {
          style: { ...enabled ? s.btnPri : s.btnGhost, whiteSpace: "nowrap", flexShrink: 0 },
          onClick: handleToggleEnabled
        }, enabled ? "\u2713 \u5DF2\u542F\u7528\u5B89\u5168\u9632\u62A4" : "\u672A\u5F00\u542F\u5B89\u5168\u9632\u62A4")
      ),
      enabled && h(
        "div",
        {
          style: {
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 14,
            paddingTop: 12,
            borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)"
          }
        },
        h("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, "\u{1F310} \u4FDD\u62A4\u8303\u56F4: ", h("strong", { style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, scopeLabel)),
        h("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, "\u{1F511} \u5916\u90E8\u9A8C\u8BC1: ", h("strong", { style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)" } }, modeLabel)),
        h("div", {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 16,
            fontSize: 11,
            background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
            color: "var(--dsw-alias-label-secondary,#4b5563)"
          }
        }, "\u{1F512} \u540E\u53F0\u9632\u7BE1\u6539: ", h("strong", { style: { color: "var(--dsw-alias-label-primary, #0f1115)" } }, adminLabel))
      ),
      topMsg && h("div", {
        style: {
          marginTop: 12,
          padding: "8px 12px",
          borderRadius: 6,
          fontSize: 12,
          background: topMsg.ok ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-state-error-bg,#fef2f2)",
          color: "var(--dsw-alias-label-primary, #0f1115)"
        }
      }, topMsg.text),
      // 访问认证已开启但尚未设置任何密码/Token 保护：局域网/公网访客可免密进入，高危提示
      enabled && !auth?.hasPassword && !auth?.hasAdminPassword && h(
        "div",
        {
          style: {
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 6,
            fontSize: 12,
            background: "var(--dsw-alias-state-error-bg,#fef2f2)",
            border: "1px solid var(--dsw-alias-state-error-border,#fecaca)",
            color: "var(--dsw-alias-label-primary, #0f1115)",
            lineHeight: 1.6
          }
        },
        "\u26A0\uFE0F ",
        h("strong", null, "\u5C1A\u672A\u8BBE\u7F6E\u4EFB\u4F55\u8BBF\u95EE\u5BC6\u7801\u6216\u7BA1\u7406\u5BC6\u7801"),
        " \u2014\u2014 \u6B64\u65F6\u201C\u8BBF\u95EE\u8BA4\u8BC1\u5DF2\u5F00\u542F\u201D\u4F46\u4EFB\u4F55\u77E5\u9053\u5C40\u57DF\u7F51 IP / \u96A7\u9053\u5730\u5740\u7684\u4EBA\u90FD\u80FD\u76F4\u63A5\u8FDB\u5165\uFF08\u96A7\u9053\u5165\u53E3\u81EA\u8EAB\u4E0D\u8BBE\u9632\uFF0C\u8BE6\u89C1\u4E0B\u65B9\u5B89\u5168\u987B\u77E5\uFF09\u3002",
        "\u5EFA\u8BAE\u7ACB\u5373\u5728\u4E0B\u65B9\u8BBE\u7F6E",
        h("strong", null, "\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801"),
        "\u6216",
        h("strong", null, "\u7BA1\u7406\u5BC6\u7801"),
        "\u540E\u518D\u5BF9\u5916\u5F00\u653E\u3002"
      )
    ),
    h(
      React.Fragment,
      null,
      // =========================================================================
      // ---- 第一道防线：外部访问门禁（控制谁能进入 Web 界面使用 AI） ----
      // =========================================================================
      // 第一道防线卡片：已开启防护，或【尚未设置任何密码】时始终显示——
      // 未设密码时必须给出密码输入框，否则用户开启防护（尤其 password_only）后
      // 会因无密码被锁在登录墙外且找不到设密码入口（自我锁死，v2.10.5 修复）。
      (enabled || !auth?.hasPassword) && h(
        "div",
        { style: s.card },
        h(
          "div",
          { style: { marginBottom: 14 } },
          h(
            "div",
            { style: { ...s.label, fontSize: 14, display: "flex", alignItems: "center", gap: 6 } },
            "\u{1F6E1}\uFE0F \u7B2C\u4E00\u9053\u9632\u7EBF\uFF1A\u5916\u90E8\u8BBF\u95EE\u95E8\u7981\uFF08\u63A7\u5236\u8C01\u80FD\u4F7F\u7528 AI\uFF09"
          ),
          h(
            "div",
            { style: { ...s.muted, marginTop: 3 } },
            "\u63A7\u5236\u5916\u90E8\u8BBE\u5907\u901A\u8FC7\u5C40\u57DF\u7F51 IP \u6216\u516C\u7F51\u96A7\u9053\uFF08Cloudflare/\u81EA\u5EFA\u96A7\u9053\uFF09\u8FDB\u5165 DSH \u804A\u5929\u754C\u9762\u65F6\u7684\u8EAB\u4EFD\u9A8C\u8BC1\u65B9\u5F0F"
          )
        ),
        // 验证模式选择
        h(
          "div",
          { style: { marginBottom: 16 } },
          h("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, "\u9A8C\u8BC1\u6A21\u5F0F\u9009\u62E9"),
          h(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "token_and_password", title: "\u{1F7E2} \u626B\u7801\u514D\u5BC6 + \u5BC6\u7801\u8BA4\u8BC1 (\u63A8\u8350)", desc: "\u4E8C\u7EF4\u7801\u81EA\u5E26\u4E13\u5C5E Token \u626B\u7801\u79D2\u8FDB\uFF1B\u76F4\u63A5\u8F93 IP/\u516C\u7F51\u57DF\u540D\u9700\u8F93\u5BC6\u7801" },
              { id: "password_only", title: "\u{1F511} \u4EC5\u5BC6\u7801 / PIN \u7801\u767B\u5F55", desc: "\u6240\u6709\u5916\u90E8\u8BBF\u95EE\u5FC5\u987B\u624B\u52A8\u8F93\u5165\u8BBF\u95EE\u5BC6\u7801\u65B9\u53EF\u8FDB\u5165" },
              { id: "token_only", title: "\u{1F3AB} \u4EC5\u5B89\u5168 Token \u514D\u5BC6", desc: "\u4EC5\u6301\u6709\u5E26\u5B89\u5168 Token \u7684\u4E8C\u7EF4\u7801\u6216\u4E13\u5C5E\u5206\u4EAB\u94FE\u63A5\u65B9\u53EF\u8FDB\u5165" }
            ].map((opt) => {
              const isSel = mode === opt.id;
              return h(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeMode(opt.id),
                  style: {
                    flex: "1 1 200px",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg,#eff6ff)" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                h("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                h("div", { style: { ...s.muted, fontSize: 11, marginTop: 4 } }, opt.desc)
              );
            })
          )
        ),
        // 防护生效范围
        h(
          "div",
          { style: { marginBottom: 16 } },
          h("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, "\u9632\u62A4\u751F\u6548\u901A\u9053"),
          h(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "all", title: "\u5168\u90E8\u901A\u9053\u9632\u62A4 (\u63A8\u8350)", desc: "\u5C40\u57DF\u7F51 IP \u76F4\u8FDE\u4E0E\u516C\u7F51\u96A7\u9053\u5168\u90E8\u53D7\u5B89\u5168\u4FDD\u62A4" },
              { id: "public_only", title: "\u4EC5\u516C\u7F51\u96A7\u9053\u5F00\u542F\u9632\u62A4", desc: "\u5C40\u57DF\u7F51\u5185\u8BBE\u5907\u76F4\u63A5\u514D\u5BC6\u76F4\u8FDE\uFF0C\u516C\u7F51\u96A7\u9053\u5F3A\u5236\u9A8C\u8BC1" },
              { id: "lan_only", title: "\u4EC5\u5C40\u57DF\u7F51\u5F00\u542F\u9632\u62A4", desc: "\u4EC5\u5C40\u57DF\u7F51\u76F4\u8FDE\u9700\u9A8C\u8BC1\uFF0C\u516C\u7F51\u96A7\u9053\u4E0D\u5F00\u542F" }
            ].map((opt) => {
              const isSel = scope === opt.id;
              return h(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeScope(opt.id),
                  style: {
                    flex: "1 1 180px",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg,#eff6ff)" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                h("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                h("div", { style: { ...s.muted, fontSize: 11, marginTop: 3 } }, opt.desc)
              );
            })
          )
        ),
        // 访客访问密码输入框 (当非 token_only 时展示)
        mode !== "token_only" && h(
          "div",
          { style: { marginBottom: 16 } },
          h(
            "label",
            { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } },
            localeT("\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 ${status}", {
              status: auth?.hasPassword ? localeT("(\u2713 \u5DF2\u8BBE\u7F6E\u8BBF\u5BA2\u5BC6\u7801)") : localeT("(\u26A0\uFE0F \u5C1A\u672A\u8BBE\u7F6E\u5BC6\u7801\uFF0C\u76F4\u63A5\u8F93\u5165 IP \u5C06\u514D\u5BC6)")
            })
          ),
          h(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            h("input", {
              type: showAccessPassword ? "text" : "password",
              style: { ...s.input, flex: 1 },
              placeholder: auth?.hasPassword ? "\u8F93\u5165\u65B0\u5BC6\u7801\u4EE5\u4FEE\u6539\uFF08\u7559\u7A7A\u4FDD\u5B58\u53EF\u6E05\u9664\u8BBF\u5BA2\u5BC6\u7801\uFF09" : "\u8BBE\u7F6E\u5916\u90E8\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801 / PIN \u7801",
              value: accessPassword,
              onChange: (e) => setAccessPassword(e.target.value)
            }),
            h("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: () => setShowAccessPassword((v) => !v)
            }, showAccessPassword ? "\u9690\u85CF" : "\u663E\u793A"),
            h("button", {
              style: {
                ...s.btnPri,
                height: 32,
                fontSize: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: saveAccessSuccess ? "#047857" : "var(--dsw-alias-brand-primary, #4f6ef7)",
                // 纯色底必须配纯色前景：#059669 + 白 = 3.77:1（不达 AA），
                // 而继承的 label-primary-foreground 暗色是深色，配中绿底仅 3.3:1。
                color: saveAccessSuccess ? "#ffffff" : "var(--dsw-alias-label-primary-foreground, #fff)",
                // 前景色继承 s.btnPri 的 var(--dsw-alias-label-primary-foreground)：暗色主题下
                // 品牌色是近白（--dsw-static-neutral-bluish-50 = #f9fafb），硬编码白字会看不见。
                cursor: savingAccess ? "wait" : "pointer"
              },
              onClick: handleSaveAccessPassword,
              disabled: savingAccess
            }, savingAccess ? "\u4FDD\u5B58\u4E2D\u2026" : saveAccessSuccess ? "\u2713 \u5DF2\u6210\u529F\u4FDD\u5B58\uFF01" : "\u4FDD\u5B58\u8BBF\u95EE\u5BC6\u7801")
          ),
          h(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
            "\u{1F4A1} \u5F53\u5916\u90E8\u670B\u53CB\u6216\u540C\u4E8B\u672A\u901A\u8FC7\u4E8C\u7EF4\u7801\u626B\u7801\uFF0C\u800C\u662F\u76F4\u63A5\u8F93\u5165 IP \u6216\u516C\u7F51\u57DF\u540D\u8BBF\u95EE\u65F6\uFF0C\u9700\u8F93\u5165\u6B64\u5BC6\u7801\u767B\u5F55\u3002"
          ),
          msgAccess && h("div", {
            style: {
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              background: msgAccess.ok ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-state-error-bg,#fef2f2)",
              color: "var(--dsw-alias-label-primary, #0f1115)"
            }
          }, msgAccess.text)
        ),
        // 免密 Token 管理
        mode !== "password_only" && h(
          "div",
          { style: s.block },
          h("label", { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } }, "\u514D\u5BC6\u626B\u7801 Token (\u4E13\u5C5E\u8BBF\u95EE\u51ED\u636E)"),
          h(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            h(
              "code",
              { style: { ...s.code, flex: 1, padding: "6px 10px", background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)" } },
              auth?.secretToken ? `${auth.secretToken.slice(0, 10)}****************` : "\u672A\u751F\u6210"
            ),
            h("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: handleRegenerateToken,
              title: "\u91CD\u65B0\u751F\u6210 Token\uFF0C\u4F7F\u4E4B\u524D\u5206\u4EAB\u7684\u65E7\u4E8C\u7EF4\u7801\u548C\u94FE\u63A5\u7ACB\u5373\u5931\u6548"
            }, "\u{1F504} \u91CD\u7F6E\u5B89\u5168 Token")
          ),
          h(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
            "\u{1F4A1} \u63A7\u5236\u53F0\u751F\u6210\u7684\u5C40\u57DF\u7F51\u4E0E\u516C\u7F51\u4E8C\u7EF4\u7801\u5DF2\u81EA\u52A8\u5D4C\u5165\u6B64 Token\uFF0C\u624B\u673A\u626B\u7801\u5373\u53EF\u514D\u5BC6\u8FDB\u5165\u804A\u5929\u754C\u9762\uFF08\u4F46\u4E0D\u8D4B\u4E88\u540E\u53F0\u7BA1\u7406\u8BBE\u7F6E\u6743\u9650\uFF09\u3002"
          )
        )
      ),
      // =========================================================================
      // ---- 第二道防线：后台管理防篡改（控制谁能修改本插件所有设置） ----
      // =========================================================================
      h(
        "div",
        { style: s.card },
        h(
          "div",
          { style: { marginBottom: 14 } },
          h(
            "div",
            { style: { ...s.label, fontSize: 14, display: "flex", alignItems: "center", gap: 6 } },
            "\u{1F512} \u7B2C\u4E8C\u9053\u9632\u7EBF\uFF1A\u7BA1\u7406\u540E\u53F0\u9632\u7BE1\u6539\uFF08\u63A7\u5236\u8C01\u80FD\u4FEE\u6539\u672C\u63D2\u4EF6\u6240\u6709\u8BBE\u7F6E\uFF09"
          ),
          h(
            "div",
            { style: { ...s.muted, marginTop: 3 } },
            "\u9501\u5B9A\u6574\u4E2A\u63D2\u4EF6\u8BBE\u7F6E\u540E\u53F0\uFF08\u5305\u542B\u5C40\u57DF\u7F51\u3001\u516C\u7F51\u96A7\u9053\u3001IM \u673A\u5668\u4EBA\u5BC6\u94A5\u4E0E\u5B89\u5168\u8BBE\u7F6E\uFF09\uFF0C\u9632\u6B62\u4ED6\u4EBA\u968F\u610F\u7BE1\u6539\u914D\u7F6E"
          ),
          h(
            "div",
            {
              style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)" }
            },
            h(
              "div",
              { style: { fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)" } },
              adminProtection ? "\u{1F6E1}\uFE0F \u7BA1\u7406\u4FDD\u62A4\u5DF2\u5F00\u542F\uFF08\u4FEE\u6539\u914D\u7F6E\u9700\u7BA1\u7406\u5BC6\u7801\uFF09" : "\u26A0\uFE0F \u7BA1\u7406\u4FDD\u62A4\u5DF2\u5173\u95ED\uFF08\u4FEE\u6539\u914D\u7F6E\u514D\u5BC6\uFF09"
            ),
            h("button", {
              type: "button",
              style: { ...adminProtection ? s.btnGhost : s.btnPri, height: 28, fontSize: 12, padding: "0 12px" },
              onClick: handleToggleAdminProtection
            }, adminProtection ? "\u5173\u95ED\u7BA1\u7406\u4FDD\u62A4" : "\u5F00\u542F\u7BA1\u7406\u4FDD\u62A4")
          )
        ),
        // 管理员密码设置
        h(
          "div",
          { style: { marginBottom: 16 } },
          h(
            "label",
            { style: { ...s.label, display: "block", marginBottom: 6, fontSize: 12 } },
            localeT("\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5458\u5BC6\u7801 ${status}", {
              status: auth?.hasAdminPassword ? localeT("(\u2713 \u5DF2\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801)") : localeT("(\u672A\u5355\u72EC\u8BBE\u7F6E\uFF0C\u9ED8\u8BA4\u4F7F\u7528\u4E0A\u8FF0\u8BBF\u5BA2\u8BBF\u95EE\u5BC6\u7801)")
            })
          ),
          h(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            h("input", {
              type: showAdminPassword ? "text" : "password",
              style: { ...s.input, flex: 1 },
              placeholder: auth?.hasAdminPassword ? "\u8F93\u5165\u65B0\u5BC6\u7801\u4EE5\u4FEE\u6539\uFF08\u7559\u7A7A\u4FDD\u5B58\u53EF\u6E05\u9664\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801\uFF09" : "\u8BBE\u7F6E\u540E\u53F0\u7BA1\u7406\u89E3\u9501\u5BC6\u7801\uFF08\u5EFA\u8BAE\u4E0E\u8BBF\u5BA2\u5BC6\u7801\u4E0D\u540C\uFF09",
              value: adminPassword,
              onChange: (e) => setAdminPassword(e.target.value)
            }),
            h("button", {
              style: { ...s.btnGhost, height: 32, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 },
              onClick: () => setShowAdminPassword((v) => !v)
            }, showAdminPassword ? "\u9690\u85CF" : "\u663E\u793A"),
            h("button", {
              style: {
                ...s.btnPri,
                height: 32,
                fontSize: 12,
                whiteSpace: "nowrap",
                flexShrink: 0,
                background: saveAdminSuccess ? "#047857" : "var(--dsw-alias-brand-primary, #4f6ef7)",
                // 纯色底必须配纯色前景（同上：#059669 + 白 = 3.77:1，#047857 + 白 = 5.48:1）。
                color: saveAdminSuccess ? "#ffffff" : "var(--dsw-alias-label-primary-foreground, #fff)",
                // 同上：不得硬编码前景色，否则暗色主题下品牌色为近白时按钮文字不可见。
                cursor: savingAdmin ? "wait" : "pointer"
              },
              onClick: handleSaveAdminPassword,
              disabled: savingAdmin
            }, savingAdmin ? "\u4FDD\u5B58\u4E2D\u2026" : saveAdminSuccess ? "\u2713 \u5DF2\u6210\u529F\u4FDD\u5B58\uFF01" : "\u4FDD\u5B58\u7BA1\u7406\u5BC6\u7801")
          ),
          h(
            "div",
            { style: { ...s.muted, fontSize: 11, marginTop: 4, color: "var(--dsw-alias-brand-primary,#4f6ef7)" } },
            "\u{1F511} \u6838\u5FC3\u4F5C\u7528\uFF1A\u7528\u4E8E\u8FDC\u7A0B\u8BBE\u5907\u8FDB\u5165\u8BBE\u7F6E\u540E\u53F0\u65F6\u7684\u89E3\u9501\u9A8C\u8BC1\u3002\u8BBE\u7F6E\u540E\uFF0C\u5373\u4FBF\u628A\u8BBF\u95EE\u5BC6\u7801\u544A\u77E5\u4ED6\u4EBA\uFF0C\u4ED6\u4EBA\u4E5F\u65E0\u6CD5\u8FDB\u5165\u8BBE\u7F6E\u540E\u53F0\u6539\u914D\u7F6E\u3002"
          ),
          msgAdmin && h("div", {
            style: {
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              background: msgAdmin.ok ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-state-error-bg,#fef2f2)",
              color: "var(--dsw-alias-label-primary, #0f1115)"
            }
          }, msgAdmin.text)
        ),
        // 远程管理权限控制策略
        h(
          "div",
          { style: s.block },
          h("label", { style: { ...s.label, display: "block", marginBottom: 8, fontSize: 12 } }, "\u8FDC\u7A0B\u8BBE\u5907\u7BA1\u7406\u6743\u9650\u7B56\u7565"),
          h(
            "div",
            { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
            [
              { id: "password_unlock", title: "\u{1F512} \u9700\u5BC6\u7801\u89E3\u9501 (\u63A8\u8350)", desc: "\u8FDC\u7A0B\u624B\u673A/\u5916\u7F51\u6253\u5F00\u672C\u63D2\u4EF6\u8BBE\u7F6E\u65F6\u9ED8\u8BA4\u5168\u5C40\u9501\u5B9A\uFF0C\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\u540E\u65B9\u53EF\u4F7F\u7528" },
              { id: "local_only", title: "\u{1F6AB} \u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406 (\u6700\u4E25\u683C)", desc: "\u8FDC\u7A0B\u8BBE\u5907\u5F7B\u5E95\u9501\u5B9A\u6574\u4E2A\u8BBE\u7F6E\u540E\u53F0\uFF0C\u4EC5\u5141\u8BB8\u5728 127.0.0.1 \u7535\u8111\u672C\u673A\u4E0A\u64CD\u4F5C" },
              { id: "open", title: "\u{1F513} \u5BBD\u677E\u6A21\u5F0F", desc: "\u4EFB\u4F55\u5DF2\u901A\u8FC7\u7B2C\u4E00\u9053\u9632\u7EBF\u767B\u5F55\u7684\u8BBE\u5907\u5747\u53EF\u76F4\u63A5\u4FEE\u6539\u6240\u6709\u914D\u7F6E" }
            ].map((opt) => {
              const isSel = adminPolicy === opt.id;
              return h(
                "div",
                {
                  key: opt.id,
                  onClick: () => handleChangeAdminPolicy(opt.id),
                  style: {
                    flex: "1 1 180px",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                    background: isSel ? "var(--dsw-alias-state-info-bg,#eff6ff)" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }
                },
                h("div", { style: { fontSize: 13, fontWeight: isSel ? 600 : 500, color: isSel ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-primary,currentColor)" } }, opt.title),
                h("div", { style: { ...s.muted, fontSize: 11, marginTop: 4 } }, opt.desc)
              );
            })
          )
        )
      )
    )
  );
});
var PLATFORM_ACCOUNT_LIMIT = 10;
function platformAccountsOf(platforms, type) {
  const accounts = [];
  for (const [key, status] of Object.entries(platforms ?? {})) {
    if (!status || typeof status !== "object") continue;
    const keyType = String(status.instanceId ?? key).split(":")[0];
    const platformType = status.platformId ?? status.id ?? keyType;
    if (platformType !== type) continue;
    accounts.push({ instanceId: status.instanceId ?? key, status });
  }
  return accounts;
}
function accountDisplayName(status, platformLabel, index) {
  const displayName = typeof status?.displayName === "string" ? status.displayName.trim() : "";
  return displayName || `${platformLabel} ${index}`;
}
function isPlatformStatusActive(status) {
  return status === "connected" || status === "starting" || status === "reconnecting";
}
function formatReleaseNotes(notes) {
  if (typeof notes !== "string") return [];
  const text = notes.trim();
  if (!text) return [];
  const withoutVersion = text.replace(/^【\s*v?\d+(?:\.\d+)*\s*】\s*/i, "");
  const lines = [];
  for (const raw of withoutVersion.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.length > 80) {
      for (const part of line.split(/[；;]/)) {
        const sentence = part.trim().replace(/[。.]$/, "");
        if (sentence) lines.push(sentence);
      }
    } else {
      lines.push(line.replace(/^[•·\-*]\s+/, ""));
    }
  }
  return lines.map((line) => line.replace(/\*\*/g, "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 8).map((line) => line.length > 120 ? `${line.slice(0, 118)}\u2026` : line);
}
function PlatformCard({
  platformId,
  platformName,
  platformDesc,
  rpcCall,
  platformRecommended = false,
  // 多账号（issue #78）：instanceId 是服务端唯一键，卡片内所有平台 RPC 都用它定位账号；
  // displayName 用于卡片头部展示；accountIndex/accountCount 用于「账号 N/M」标记。
  instanceId,
  displayName = "",
  accountIndex = 1,
  accountCount = 1,
  highlight = false,
  onAccountRemoved,
  onAccountRenamed
}) {
  const [platform, setPlatform] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const savedAccountName = typeof platform?.config?.name === "string" ? platform.config.name : void 0;
  const [nameDraft, setNameDraft] = React.useState("");
  React.useEffect(() => {
    if (savedAccountName !== void 0) setNameDraft(savedAccountName);
  }, [savedAccountName, instanceId]);
  const cardRef = React.useRef(null);
  React.useEffect(() => {
    if (!highlight) return;
    const el = cardRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch {
      }
    }
  }, [highlight, platform?.instanceId]);
  const cardStyle = highlight ? {
    ...s.card,
    border: "1px solid var(--dsw-alias-brand-primary,#4f6ef7)",
    boxShadow: "0 0 0 1px var(--dsw-alias-brand-primary,#4f6ef7)"
  } : s.card;
  const [cfgDraft, setCfgDraft] = React.useState(null);
  React.useEffect(() => {
    if (platform?.config && !cfgDraft) {
      setCfgDraft({
        digestIntervalSec: String(platform.config.digestIntervalSec ?? 300),
        approvalTimeoutSec: String(platform.config.approvalTimeoutSec ?? 600),
        maxMessageChars: String((platform.config.maxMessageChars >= 500 ? platform.config.maxMessageChars : null) ?? (platformId === "telegram" ? 4096 : 2e3)),
        sendChunkDelayMs: String(platform.config.sendChunkDelayMs ?? 1500),
        groupAutoApprove: Boolean(platform.config.groupAutoApprove),
        changesDigest: platform.config.changesDigest !== false,
        steerMode: Boolean(platform.config.steerMode),
        // issue #77：少这一项时勾选框恒为未勾选（功能实际是开的），无法从 UI 看出真实状态
        showActivity: platform.config.showActivity === true,
        streamReply: platform.config.streamReply !== false,
        appId: platform.config.appId ?? "",
        // Secret 不由后端回传；空值表示沿用已保存密钥
        appSecret: "",
        domain: platform.config.domain ?? "feishu",
        botToken: "",
        proxy: platform.config.proxy ?? "",
        // 会话级配置：留空 = 使用 DSH 默认值
        agentPreset: platform.config.agentPreset ?? "",
        cwd: platform.config.cwd ?? "",
        agentProvider: platform.config.agentProvider ?? "",
        agentModel: platform.config.agentModel ?? ""
      });
    }
  }, [platform?.config, platformId]);
  const [presetOptions, setPresetOptions] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await rpcCall(BRIDGE_ENDPOINTS.listAgentPresets, {});
        if (!cancelled && r?.ok) setPresetOptions(r.value ?? { available: false, presets: [] });
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rpcCall]);
  const loadInFlightRef = React.useRef(false);
  const seqRef = React.useRef(0);
  const load = React.useCallback(async (quiet = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const currentSeq = ++seqRef.current;
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
      if (currentSeq !== seqRef.current) return;
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      const allPlatforms = r.value ?? {};
      setPlatform(allPlatforms[instanceId] ?? null);
      if (!quiet) setErr(null);
    } catch (e) {
      if (currentSeq === seqRef.current && !quiet) setErr(e.message);
    } finally {
      loadInFlightRef.current = false;
    }
  }, [rpcCall, instanceId]);
  React.useEffect(() => {
    load();
    const activeLogin = platform?.login && (platform.login.phase === "qr" || platform.login.phase === "scaned");
    const interval = activeLogin ? 1500 : 3e3;
    const t2 = setInterval(() => load(true), interval);
    return () => clearInterval(t2);
  }, [load, platform?.login?.phase]);
  const act = React.useCallback(async (endpoint, payload) => {
    setBusy(true);
    try {
      const r = await rpcCall(endpoint, { instanceId, ...payload });
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setPlatform(r.value);
      setErr(null);
      await load(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [rpcCall, load, instanceId]);
  const onLogin = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformLogin, {}), [act]);
  const onRegisterApp = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformLogin, { qrType: "register" }), [act]);
  const onBindQqBot = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformLogin, { qrType: "bind" }), [act]);
  const onRefreshQr = React.useCallback(
    () => act(BRIDGE_ENDPOINTS.platformLogin, { qrType: platformId === "qq" ? "bind" : "register", refresh: true }),
    [act, platformId]
  );
  const onStop = React.useCallback(() => act(BRIDGE_ENDPOINTS.platformStop, {}), [act]);
  const onReconnect = React.useCallback(() => {
    if (platform?.configured) return act(BRIDGE_ENDPOINTS.platformStart, {});
    return act(BRIDGE_ENDPOINTS.platformLogin, {});
  }, [act, platform?.configured]);
  const saveAccountName = React.useCallback(async () => {
    const next = nameDraft.trim();
    if (next === (savedAccountName ?? "").trim()) return;
    await act(BRIDGE_ENDPOINTS.platformSetConfig, { name: next });
    onAccountRenamed?.(instanceId);
  }, [act, nameDraft, savedAccountName, onAccountRenamed, instanceId]);
  const removeAccount = React.useCallback(async () => {
    if (busy) return;
    const label = displayName || platformName;
    if (!window.confirm(localeT("\u786E\u8BA4\u79FB\u9664\u8D26\u53F7\u300C${name}\u300D\uFF1F\u5C06\u505C\u6B62\u8BE5\u8D26\u53F7\u5E76\u5220\u9664\u5176\u914D\u7F6E\u4E0E\u4F1A\u8BDD\u5F52\u5C5E\uFF1BDSH \u4F1A\u8BDD\u672C\u8EAB\u4E0D\u4F1A\u88AB\u5220\u9664\u3002", { name: localeT(label) }))) return;
    setBusy(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.platformRemoveAccount, { instanceId });
      if (!r?.ok) throw new Error(r?.error?.message ?? "\u79FB\u9664\u8D26\u53F7\u5931\u8D25");
      setErr(null);
      onAccountRemoved?.(instanceId);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [busy, displayName, platformName, rpcCall, instanceId, onAccountRemoved]);
  const [newId, setNewId] = React.useState("");
  const addAllow = React.useCallback(async () => {
    const id = newId.trim();
    if (!id) return;
    const list = [...platform?.allowFrom ?? [], id];
    setBusy(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.platformSetAllowFrom, { instanceId, allowFrom: list });
      if (!r?.ok) throw new Error(r?.error?.message ?? "\u6DFB\u52A0\u767D\u540D\u5355\u5931\u8D25");
      setPlatform(r.value);
      setNewId("");
      setErr(null);
      await load(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [rpcCall, instanceId, newId, platform?.allowFrom, load]);
  const removeAllow = React.useCallback(async (id) => {
    const list = (platform?.allowFrom ?? []).filter((x) => x !== id);
    await act(BRIDGE_ENDPOINTS.platformSetAllowFrom, { allowFrom: list });
  }, [act, platform?.allowFrom]);
  const handleNewId = React.useCallback((e) => setNewId(e.target.value), []);
  const [showSecret, setShowSecret] = React.useState(false);
  const resetDefaults = React.useCallback(() => {
    setCfgDraft((d) => ({
      ...d,
      digestIntervalSec: "300",
      approvalTimeoutSec: "600",
      maxMessageChars: platformId === "telegram" ? "4096" : "2000",
      sendChunkDelayMs: "1500"
    }));
  }, [platformId]);
  const saveConfig = React.useCallback(async () => {
    if (!cfgDraft) return;
    const num = (v, fallback) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const payload = {
      digestIntervalSec: num(cfgDraft.digestIntervalSec, platform?.config?.digestIntervalSec ?? 300),
      approvalTimeoutSec: num(cfgDraft.approvalTimeoutSec, platform?.config?.approvalTimeoutSec ?? 600),
      maxMessageChars: num(cfgDraft.maxMessageChars, platform?.config?.maxMessageChars ?? 2e3),
      sendChunkDelayMs: num(cfgDraft.sendChunkDelayMs, platform?.config?.sendChunkDelayMs ?? 1500),
      // 会话级配置：空串表示清除该设置、回落 DSH 默认值
      agentPreset: (cfgDraft.agentPreset ?? "").trim(),
      cwd: (cfgDraft.cwd ?? "").trim(),
      agentProvider: (cfgDraft.agentProvider ?? "").trim(),
      agentModel: (cfgDraft.agentModel ?? "").trim()
    };
    if (platformId === "qq") {
      payload.appId = cfgDraft.appId.trim();
      payload.appSecret = cfgDraft.appSecret.trim();
    } else if (platformId === "feishu") {
      payload.appId = cfgDraft.appId.trim();
      payload.appSecret = cfgDraft.appSecret.trim();
      payload.domain = cfgDraft.domain || "feishu";
    } else if (platformId === "telegram") {
      payload.botToken = cfgDraft.botToken.trim();
      payload.proxy = cfgDraft.proxy.trim();
    }
    await act(BRIDGE_ENDPOINTS.platformSetConfig, payload);
  }, [act, cfgDraft, platformId]);
  const cfgDirty = cfgDraft && platform?.config && (Number(cfgDraft.digestIntervalSec) !== platform.config.digestIntervalSec || Number(cfgDraft.approvalTimeoutSec) !== platform.config.approvalTimeoutSec || Number(cfgDraft.maxMessageChars) !== platform.config.maxMessageChars || Number(cfgDraft.sendChunkDelayMs) !== platform.config.sendChunkDelayMs || (cfgDraft.agentPreset ?? "") !== (platform.config.agentPreset ?? "") || (cfgDraft.cwd ?? "") !== (platform.config.cwd ?? "") || (cfgDraft.agentProvider ?? "") !== (platform.config.agentProvider ?? "") || (cfgDraft.agentModel ?? "") !== (platform.config.agentModel ?? "") || platformId === "qq" && (cfgDraft.appId !== (platform.config.appId ?? "") || cfgDraft.appSecret !== (platform.config.appSecret ?? "")) || platformId === "feishu" && (cfgDraft.appId !== (platform.config.appId ?? "") || cfgDraft.appSecret !== (platform.config.appSecret ?? "")) || platformId === "telegram" && (cfgDraft.botToken !== "" || cfgDraft.proxy !== (platform.config.proxy ?? "")));
  if (!platform && !err) {
    return h(
      "div",
      { style: cardStyle, ref: cardRef },
      h("div", { style: s.label }, displayName || platformName),
      h("div", { style: { ...s.muted, marginTop: 6 } }, "\u52A0\u8F7D\u4E2D\u2026")
    );
  }
  const connected = isPlatformStatusActive(platform?.status);
  const login = platform?.login ?? {};
  const showQr = login.phase === "qr" || login.phase === "scaned";
  const statusLabel = platform?.status === "connected" ? "\u5DF2\u8FDE\u63A5" : platform?.status === "starting" ? "\u8FDE\u63A5\u4E2D\u2026" : platform?.status === "reconnecting" ? "\u91CD\u8FDE\u4E2D\u2026" : platform?.status === "paused" ? "\u6682\u505C\uFF08\u4F1A\u8BDD\u8FC7\u671F\uFF09" : platform?.status === "error" ? "\u9519\u8BEF" : "\u672A\u8FDE\u63A5";
  return h(
    "div",
    { style: cardStyle, ref: cardRef },
    // 卡片头部：account displayName（用户备注名或「平台名 + 序号」）+ 状态 + 移除账号
    h(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 } },
      h(
        "div",
        { style: { flex: "1 1 auto", minWidth: 0 } },
        h(
          "div",
          { style: { ...s.label, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" } },
          platformId === "wechat" && h(Icons.wechat, { style: { color: "#07C160", width: 20, height: 20 } }),
          platformId === "qq" && h(Icons.qq, { style: { color: "#12B7F5", width: 20, height: 20 } }),
          platformId === "feishu" && h(Icons.feishu, { style: { color: "#00D6B9", width: 20, height: 20 } }),
          platformId === "telegram" && h(Icons.telegram, { style: { color: "#24A1DE", width: 20, height: 20 } }),
          displayName || platformName,
          accountCount > 1 && h("span", {
            style: {
              fontSize: 10,
              lineHeight: "16px",
              padding: "0 6px",
              borderRadius: 8,
              border: "1px solid var(--dsw-alias-border-l2,#d1d5db)",
              color: "var(--dsw-alias-label-tertiary,#6b7280)",
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              fontWeight: 500,
              flexShrink: 0
            }
          }, localeT("\u8D26\u53F7 ${index}/${total}", { index: accountIndex, total: accountCount })),
          platformRecommended && accountIndex === 1 && h("span", {
            style: {
              fontSize: 10,
              lineHeight: "16px",
              padding: "0 6px",
              borderRadius: 8,
              border: "1px solid var(--dsw-alias-brand-primary,#4f6ef7)",
              color: "var(--dsw-alias-brand-primary,#4f6ef7)",
              background: "var(--dsw-alias-state-info-bg,#eff6ff)",
              fontWeight: 600,
              flexShrink: 0
            }
          }, "\u63A8\u8350")
        ),
        h("div", { style: { ...s.muted, marginTop: 2 } }, platformDesc)
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 } },
        h(StatusTag, { status: platform?.status, running: connected }),
        h("button", {
          style: {
            ...s.btnGhost,
            color: "var(--dsw-alias-label-primary, #0f1115)",
            borderColor: "var(--dsw-alias-state-error-primary,#dc2626)",
            height: 28,
            padding: "0 10px",
            fontSize: 12,
            opacity: busy ? 0.5 : 1
          },
          disabled: busy,
          onClick: removeAccount,
          title: localeT("\u505C\u6B62\u8BE5\u8D26\u53F7\u5E76\u5220\u9664\u5176\u914D\u7F6E\u4E0E\u4F1A\u8BDD\u5F52\u5C5E\uFF08\u4E0D\u4F1A\u5220\u9664 DSH \u4F1A\u8BDD\u672C\u8EAB\uFF09")
        }, "\u79FB\u9664\u8D26\u53F7")
      )
    ),
    // 账号备注名：失焦 / 回车保存（走 platformSetConfig 的 name 字段）。
    // 单账号时也展示（用于给账号起个可读名字），不引入额外点击步骤。
    h(
      "div",
      { style: { display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" } },
      h("input", {
        style: { ...s.input, flex: "1 1 220px", minWidth: 0 },
        placeholder: localeT("\u5907\u6CE8\u540D\uFF08\u53EF\u9009\uFF0C\u7528\u4E8E\u533A\u5206\u540C\u5E73\u53F0\u591A\u4E2A\u8D26\u53F7\uFF09"),
        value: nameDraft,
        onChange: (e) => setNameDraft(e.target.value),
        onBlur: () => {
          void saveAccountName();
        },
        onKeyDown: (e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        },
        disabled: busy
      })
    ),
    // 快捷入口：使用说明 / 开放平台 / 命令速查
    h(
      "div",
      { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" } },
      platformId === "wechat" && h("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/wechat-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} \u5FAE\u4FE1\u4F7F\u7528\u8BF4\u660E"),
      platformId === "qq" && h("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/qq-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} QQ \u4F7F\u7528\u8BF4\u660E"),
      platformId === "qq" && h("a", {
        href: "https://bot.q.qq.com/wiki/develop/api-v2/",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F310} QQ \u5F00\u653E\u5E73\u53F0"),
      platformId === "feishu" && h("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/feishu-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} \u98DE\u4E66\u4F7F\u7528\u8BF4\u660E"),
      platformId === "feishu" && h("a", {
        href: "https://open.feishu.cn/app",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F310} \u98DE\u4E66\u5F00\u653E\u5E73\u53F0"),
      platformId === "telegram" && h("a", {
        href: "https://github.com/wenbin-wb/dsh-bridge/blob/main/docs/telegram-usage.md",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F4D6} Telegram \u4F7F\u7528\u8BF4\u660E"),
      platformId === "telegram" && h("a", {
        href: "https://t.me/BotFather",
        target: "_blank",
        rel: "noopener noreferrer",
        style: s.btnGhost
      }, "\u{1F310} @BotFather \u7533\u8BF7 Bot"),
      h("button", {
        style: s.btnGhost,
        onClick: () => setShowHelp((v) => !v)
      }, showHelp ? "\u6536\u8D77\u547D\u4EE4" : "\u547D\u4EE4\u5217\u8868")
    ),
    // 命令速查
    showHelp && h(
      "div",
      { style: { ...s.block, fontSize: 12, lineHeight: 1.8, fontFamily: "monospace" } },
      h("div", null, "/new <\u63D0\u793A\u8BCD> \u2014 \u65B0\u5EFA\u4F1A\u8BDD\u5E76\u5F00\u59CB\uFF08\u5F53\u524D\u5DE5\u4F5C\u533A\uFF09"),
      h("div", null, "/new <\u63D0\u793A\u8BCD> @N \u2014 \u5728\u6307\u5B9A\u5DE5\u4F5C\u533A\u65B0\u5EFA\u4F1A\u8BDD"),
      h("div", null, "/sessions\uFF08\u6216 /list\uFF09\u2014 \u5217\u51FA\u4F1A\u8BDD\uFF08\u6309\u5DE5\u4F5C\u533A\u5206\u7EC4\uFF0C\u5E26\u6807\u9898\uFF09"),
      h("div", null, "/use N\uFF08\u6216 /resume N\uFF09\u2014 \u5207\u6362\u5230\u4F1A\u8BDD N"),
      h("div", null, "/workspaces \u2014 \u5217\u51FA\u6240\u6709\u53EF\u7528\u5DE5\u4F5C\u533A"),
      h("div", null, "/end \u2014 \u7ED3\u675F\u5F53\u524D\u4F1A\u8BDD\uFF08\u56DE\u5230\u65E0\u6D3B\u52A8\u4F1A\u8BDD\u72B6\u6001\uFF09"),
      h("div", null, "/stop \u2014 \u505C\u6B62\u5F53\u524D\u4EFB\u52A1"),
      h("div", null, "/status \u2014 \u67E5\u770B Agent \u72B6\u6001\u4E0E\u4F1A\u8BDD\u6458\u8981"),
      h("div", null, "/yes \u6216 /no\uFF08\u6216 1/2\uFF09\u2014 \u56DE\u5E94\u6743\u9650\u5BA1\u6279\u8BF7\u6C42"),
      h("div", null, "/help \u2014 \u663E\u793A\u5B8C\u6574\u547D\u4EE4\u5E2E\u52A9")
    ),
    err && h("div", { style: { ...s.warn, marginTop: 10 } }, err),
    // 已配置：结构化状态看板 + 白名单
    platform?.configured && h(
      "div",
      { style: s.block },
      // 结构化状态卡片看板
      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 8,
            marginBottom: 12
          }
        },
        h(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          h("div", { style: { ...s.muted, fontSize: 11 } }, "\u8FDE\u63A5\u72B6\u6001"),
          h(
            "div",
            { style: { ...s.label, fontSize: 13, marginTop: 2, display: "flex", alignItems: "center", gap: 6 } },
            h("span", {
              style: {
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "var(--dsw-alias-state-success-primary,#10b981)" : "var(--dsw-alias-label-tertiary,#9ca3af)"
              }
            }),
            statusLabel
          )
        ),
        platform.accountId && h(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          h("div", { style: { ...s.muted, fontSize: 11 } }, "\u767B\u5F55\u8D26\u53F7"),
          h("div", { style: { ...s.code, fontSize: 12, marginTop: 2, fontWeight: 500 } }, platform.accountId)
        ),
        platform.sessionId && h(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#fff)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 8,
              padding: "8px 12px"
            }
          },
          h("div", { style: { ...s.muted, fontSize: 11 } }, "\u6D3B\u52A8\u4F1A\u8BDD"),
          h("div", { style: { ...s.code, fontSize: 12, marginTop: 2 } }, platform.sessionId)
        )
      ),
      h(
        "div",
        { style: { ...s.muted, fontSize: 12, marginTop: 8, lineHeight: 1.6 } },
        localeT("\u767D\u540D\u5355 (\u5DF2\u6388\u6743 ${count} \u4E2A\u8D26\u53F7/\u7FA4):", { count: platform.allowFrom?.length || 0 })
      ),
      h(
        "div",
        { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 } },
        platform.allowFrom?.length ? platform.allowFrom.map(
          (id) => h(
            "span",
            { key: id, style: { ...s.tag, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", color: "var(--dsw-alias-label-primary,currentColor)", gap: 6 } },
            h("span", { style: { fontSize: 12, wordBreak: "break-all" } }, id),
            h("button", {
              style: { cursor: "pointer", border: "none", background: "none", color: "var(--dsw-alias-label-primary, #0f1115)", fontSize: 12, padding: 0 },
              onClick: () => removeAllow(id),
              title: "\u79FB\u51FA\u767D\u540D\u5355"
            }, "\xD7")
          )
        ) : h(
          "div",
          { style: { ...s.muted, fontSize: 12 } },
          platformId === "wechat" ? "(\u7A7A \u2014 \u626B\u7801\u540E\u9996\u4E2A\u53D1\u6D88\u606F\u7684\u5FAE\u4FE1\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)" : "(\u7A7A \u2014 \u9996\u4E2A\u53D1\u6D88\u606F\u7684\u7528\u6237\u5C06\u81EA\u52A8\u52A0\u5165)"
        )
      ),
      h(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 8, alignItems: "center" } },
        h("input", {
          style: { ...s.input, flex: 1 },
          placeholder: platformId === "wechat" ? "\u6DFB\u52A0\u5141\u8BB8\u7684\u5FAE\u4FE1 ID\uFF08\u5982 xxx@im.wechat\uFF09\uFF0C\u6309 Enter \u6DFB\u52A0" : "\u6DFB\u52A0\u5141\u8BB8\u7684\u7528\u6237/\u7FA4 ID\uFF0C\u6309 Enter \u6DFB\u52A0",
          value: newId,
          onChange: handleNewId,
          onKeyDown: (e) => {
            if (e.key === "Enter" && newId.trim() && !busy) addAllow();
          }
        }),
        h("button", {
          style: { ...s.btnGhost, whiteSpace: "nowrap", opacity: newId.trim() && !busy ? 1 : 0.5 },
          onClick: addAllow,
          disabled: busy || !newId.trim()
        }, "\u6DFB\u52A0")
      ),
      h(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" } },
        platform.status !== "connected" && platform.status !== "starting" && h("button", { style: s.btnPri, onClick: onReconnect, disabled: busy, title: platform?.configured ? "\u4F7F\u7528\u5DF2\u4FDD\u5B58\u7684\u51ED\u8BC1\u76F4\u63A5\u6062\u590D\u8FDE\u63A5\uFF0C\u65E0\u9700\u91CD\u65B0\u626B\u7801" : "\u9996\u6B21\u4F7F\u7528\u9700\u626B\u7801\u7ED1\u5B9A" }, platform?.configured ? "\u91CD\u65B0\u8FDE\u63A5" : "\u8FDE\u63A5"),
        (platform.status === "connected" || platform.status === "starting") && h("button", { style: s.btnGhost, onClick: onStop, disabled: busy, title: '\u505C\u6B62\u63A5\u6536\u6D88\u606F\uFF1B\u51ED\u8BC1\u4FDD\u7559\uFF0C\u53EF\u968F\u65F6"\u91CD\u65B0\u8FDE\u63A5"\u6062\u590D' }, "\u65AD\u5F00"),
        h("button", {
          style: { ...s.btnGhost, color: "var(--dsw-alias-label-primary, #0f1115)", borderColor: "var(--dsw-alias-state-error-primary,#dc2626)", opacity: busy ? 0.5 : 1 },
          disabled: busy,
          onClick: () => {
            if (window.confirm(localeT("\u786E\u8BA4\u89E3\u7ED1\uFF1F\u8FD9\u5C06\u6E05\u9664\u4FDD\u5B58\u7684\u51ED\u8BC1\u3002"))) act(BRIDGE_ENDPOINTS.platformUnbind, {});
          },
          title: "\u6E05\u9664\u767B\u5F55\u51ED\u8BC1\uFF0C\u4E0B\u6B21\u9700\u91CD\u65B0\u914D\u7F6E"
        }, "\u89E3\u7ED1\u8D26\u53F7")
      ),
      // 群聊自动授权开关（仅支持群聊的平台）：关闭时新群首次 @机器人 不会自动加白
      platformId !== "wechat" && h(
        "label",
        {
          style: { display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, cursor: "pointer", width: "fit-content", color: "var(--dsw-alias-label-secondary,#6b7280)" },
          title: "\u5F00\u542F\u540E\uFF0C\u767D\u540D\u5355\u4E4B\u5916\u7684\u65B0\u7FA4\u9996\u6B21 @\u673A\u5668\u4EBA \u5373\u81EA\u52A8\u6388\u6743\u5165\u767D\u540D\u5355\uFF1B\u5173\u95ED\uFF08\u9ED8\u8BA4\uFF09\u65F6\u65B0\u7FA4\u5FC5\u987B\u5148\u5728\u6B64\u624B\u52A8\u6DFB\u52A0"
        },
        h("input", {
          type: "checkbox",
          checked: Boolean(cfgDraft?.groupAutoApprove),
          disabled: busy,
          onChange: (e) => {
            const checked = e.target.checked;
            setCfgDraft((d) => ({ ...d ?? {}, groupAutoApprove: checked }));
            act(BRIDGE_ENDPOINTS.platformSetConfig, { groupAutoApprove: checked });
          }
        }),
        h("span", null, "\u7FA4\u804A\u81EA\u52A8\u6388\u6743\uFF08\u65B0\u7FA4\u9996\u6B21 @\u673A\u5668\u4EBA \u81EA\u52A8\u52A0\u5165\u767D\u540D\u5355\uFF0C\u9ED8\u8BA4\u5173\u95ED\uFF09")
      ),
      // 本轮改动摘要开关：默认开启（IM 侧也能看到"这轮改了哪些文件"）
      h(
        "label",
        {
          style: { display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, cursor: "pointer", width: "fit-content", color: "var(--dsw-alias-label-secondary,#6b7280)" },
          title: '\u5F00\u542F\u540E\uFF0C\u6BCF\u8F6E\u7ED3\u675F\u4F1A\u628A"\u6539\u4E86\u54EA\u4E9B\u6587\u4EF6\uFF08+\u589E/-\u5220\uFF09"\u64AD\u62A5\u5230\u5F53\u524D\u4F1A\u8BDD\uFF1B/diff \u53EF\u5BFC\u51FA .patch \u8865\u4E01'
        },
        h("input", {
          type: "checkbox",
          checked: cfgDraft?.changesDigest !== false,
          disabled: busy,
          onChange: (e) => {
            const checked = e.target.checked;
            setCfgDraft((d) => ({ ...d ?? {}, changesDigest: checked }));
            act(BRIDGE_ENDPOINTS.platformSetConfig, { changesDigest: checked });
          }
        }),
        h("span", null, "\u672C\u8F6E\u6539\u52A8\u6458\u8981\uFF08\u6BCF\u8F6E\u64AD\u62A5\u6539\u52A8\u6587\u4EF6\u6E05\u5355\uFF0C\u9ED8\u8BA4\u5F00\u542F\uFF09")
      ),
      // 实时插话开关：默认关闭（保持既有排队行为，开启后 Agent 忙碌时发消息可在下一步生效）
      // 语义注意：DSH 的 steer 是「下一步边界注入」，不会中止正在执行的步骤/工具调用；
      // 文案不得写成「打断」，否则长工具调用期间插话无效会被当成 bug（同 issue #77 的信任教训）。
      h(
        "label",
        {
          style: { display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, cursor: "pointer", width: "fit-content", color: "var(--dsw-alias-label-secondary,#6b7280)" },
          title: "\u5F00\u542F\u540E\uFF0CAgent \u6267\u884C\u4EFB\u52A1\u671F\u95F4\u53D1\u6D88\u606F\u4F1A\u63D2\u8BDD\u6CE8\u5165\u5230\u5F53\u524D\u8F6E\u6B21\u7684\u4E0B\u4E00\u6B65\uFF08\u4E0D\u6253\u65AD\u6B63\u5728\u8FD0\u884C\u7684\u5DE5\u5177\u8C03\u7528\uFF09\uFF1B\u5173\u95ED\u540E\u6392\u961F\u7B49\u5F85\u5F53\u524D\u4EFB\u52A1\u5B8C\u6210\u540E\u5904\u7406"
        },
        h("input", {
          type: "checkbox",
          checked: Boolean(cfgDraft?.steerMode),
          disabled: busy,
          onChange: (e) => {
            const checked = e.target.checked;
            setCfgDraft((d) => ({ ...d ?? {}, steerMode: checked }));
            act(BRIDGE_ENDPOINTS.platformSetConfig, { steerMode: checked });
          }
        }),
        h("span", null, "\u5B9E\u65F6\u63D2\u8BDD\u6A21\u5F0F\uFF08Agent \u5FD9\u788C\u65F6\u53D1\u6D88\u606F\u53EF\u5728\u4E0B\u4E00\u6B65\u751F\u6548\uFF0C\u9ED8\u8BA4\u5173\u95ED\uFF09")
      ),
      // 单聊流式输出开关：仅 QQ 支持（平台只对 C2C 开放 stream_messages；群聊始终为普通 Markdown）。
      // 默认开启：回复逐字在同一条消息里长出来；关闭后整轮结束后一次性发送。
      platformId === "qq" && h(
        "label",
        {
          style: { display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, cursor: "pointer", width: "fit-content", color: "var(--dsw-alias-label-secondary,#6b7280)" },
          title: "\u5F00\u542F\u540E\u5355\u804A\u56DE\u590D\u4EE5\u6D41\u5F0F\u6D88\u606F\u9010\u6BB5\u8F93\u51FA\uFF08\u540C\u4E00\u6761\u6D88\u606F\u539F\u5730\u53D8\u957F\uFF09\uFF1B\u5173\u95ED\u540E\u7B49\u4E00\u8F6E\u7ED3\u675F\u518D\u4E00\u6B21\u6027\u53D1\u9001\u3002\u7FA4\u804A\u5E73\u53F0\u4E0D\u652F\u6301\u6D41\u5F0F\uFF0C\u59CB\u7EC8\u4E00\u6B21\u6027\u53D1\u9001\u3002"
        },
        h("input", {
          type: "checkbox",
          checked: cfgDraft?.streamReply !== false,
          disabled: busy,
          onChange: (e) => {
            const checked = e.target.checked;
            setCfgDraft((d) => ({ ...d ?? {}, streamReply: checked }));
            act(BRIDGE_ENDPOINTS.platformSetConfig, { streamReply: checked });
          }
        }),
        h("span", null, "\u5355\u804A\u6D41\u5F0F\u8F93\u51FA\uFF08\u9010\u6BB5\u663E\u793A\uFF0C\u9ED8\u8BA4\u5F00\u542F\uFF1B\u7FA4\u804A\u4E0D\u652F\u6301\uFF09")
      ),
      // 实时活动状态开关：仅"卡片可原地更新"的平台支持（飞书 / Telegram）。
      // 用户反馈（2026-10-17）希望"能自己关掉、不要这个状态"，故提供显式开关。
      (platformId === "feishu" || platformId === "telegram") && h(
        "label",
        {
          style: { display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, cursor: "pointer", width: "fit-content", color: "var(--dsw-alias-label-secondary,#6b7280)" },
          title: "\u5F00\u542F\u540E Agent \u5E72\u6D3B\u65F6\u5361\u7247\u9876\u90E8\u4F1A\u5B9E\u65F6\u663E\u793A\u5F53\u524D\u52A8\u4F5C\uFF08\u5982\u300C\u6B63\u5728\u8FD0\u884C\u547D\u4EE4\u300D\uFF09\uFF1B\u5173\u95ED\u540E\u4E0D\u518D\u663E\u793A"
        },
        h("input", {
          type: "checkbox",
          checked: cfgDraft?.showActivity === true,
          disabled: busy,
          onChange: (e) => {
            const checked = e.target.checked;
            setCfgDraft((d) => ({ ...d ?? {}, showActivity: checked }));
            act(BRIDGE_ENDPOINTS.platformSetConfig, { showActivity: checked });
          }
        }),
        h("span", null, "\u5B9E\u65F6\u6D3B\u52A8\u72B6\u6001\uFF08\u5361\u7247\u9876\u90E8\u663E\u793A\u300C\u6B63\u5728\u8FD0\u884C\u547D\u4EE4\u300D\u7B49\uFF0C\u9ED8\u8BA4\u5173\u95ED\uFF09")
      ),
      // 高级设置：会话级配置（工作区 / Agent 预设 / 模型路由）+ 会话节奏参数
      h(
        "div",
        { style: { marginTop: 12 } },
        h("button", {
          style: s.btnGhost,
          onClick: () => setShowAdvanced((v) => !v)
        }, showAdvanced ? "\u6536\u8D77\u9AD8\u7EA7\u8BBE\u7F6E" : "\u2699\uFE0F \u9AD8\u7EA7\u8BBE\u7F6E"),
        showAdvanced && h(
          "div",
          { style: { ...s.block, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 } },
          h(
            "div",
            { style: { ...s.muted, fontSize: 12, lineHeight: 1.6 } },
            "\u4EE5\u4E0B\u8BBE\u7F6E\u6309\u5E73\u53F0\u4FDD\u5B58\uFF0C\u53EA\u5F71\u54CD\u8BE5\u5E73\u53F0\u901A\u8FC7 Bot \u65B0\u5EFA\u7684\u4F1A\u8BDD\uFF08\u7559\u7A7A = \u4F7F\u7528 DSH \u9ED8\u8BA4\u503C\uFF09\u3002"
          ),
          // Agent 预设：决定远程会话挂载哪些工具/技能
          h(
            "div",
            null,
            h("div", { style: { ...s.muted, marginBottom: 4 } }, "Agent \u9884\u8BBE \u2014 \u51B3\u5B9A\u8FDC\u7A0B\u4F1A\u8BDD\u53EF\u7528\u7684\u5DE5\u5177\u4E0E\u6280\u80FD\uFF0C\u7559\u7A7A\u7528 DSH \u9ED8\u8BA4\u9884\u8BBE"),
            h("input", {
              style: { ...s.input, width: "100%" },
              list: "dsh-bridge-agent-presets",
              placeholder: presetOptions?.default ? localeT("\u7559\u7A7A = DSH \u9ED8\u8BA4\uFF08${name}\uFF09", { name: presetOptions.default }) : "\u7559\u7A7A = DSH \u9ED8\u8BA4\u9884\u8BBE",
              value: cfgDraft?.agentPreset ?? "",
              onChange: (e) => setCfgDraft((d) => ({ ...d, agentPreset: e.target.value }))
            }),
            h(
              "datalist",
              { id: "dsh-bridge-agent-presets" },
              (presetOptions?.presets ?? []).map((p) => h("option", { key: p.id, value: p.id }, p.name && p.name !== p.id ? p.name : null))
            ),
            h(
              "div",
              { style: { ...s.muted, fontSize: 11, marginTop: 4 } },
              presetOptions == null ? "\u6B63\u5728\u8BFB\u53D6\u672C\u673A\u53EF\u7528\u9884\u8BBE\u2026" : presetOptions.available ? localeT("\u672C\u673A\u53EF\u7528\uFF1A${list}", {
                list: (presetOptions.presets ?? []).map((p) => p.id).join(" / ") || localeT("\uFF08\u65E0\uFF09")
              }) : "\u5F53\u524D DSH \u7248\u672C\u672A\u63D0\u4F9B\u9884\u8BBE\u5217\u8868\uFF0C\u8BF7\u624B\u52A8\u586B\u5199\u9884\u8BBE\u540D"
            )
          ),
          // 工作区
          h(
            "div",
            null,
            h("div", { style: { ...s.muted, marginBottom: 4 } }, "\u5DE5\u4F5C\u533A\u76EE\u5F55 \u2014 \u8BE5\u5E73\u53F0 /new \u65B0\u5EFA\u4F1A\u8BDD\u7684\u9ED8\u8BA4\u76EE\u5F55\uFF0C\u7559\u7A7A\u7528\u9996\u4E2A\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A"),
            h("input", {
              style: { ...s.input, width: "100%" },
              placeholder: "\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u4F8B\u5982 /home/me/project \u6216 D:\\project",
              value: cfgDraft?.cwd ?? "",
              onChange: (e) => setCfgDraft((d) => ({ ...d, cwd: e.target.value }))
            })
          ),
          // 模型路由
          h(
            "div",
            { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 } },
            h(
              "div",
              null,
              h("div", { style: { ...s.muted, marginBottom: 4 } }, "\u6A21\u578B\u63D0\u4F9B\u65B9\uFF08\u53EF\u9009\uFF09"),
              h("input", {
                style: { ...s.input, width: "100%" },
                placeholder: "\u7559\u7A7A = DSH \u9ED8\u8BA4",
                value: cfgDraft?.agentProvider ?? "",
                onChange: (e) => setCfgDraft((d) => ({ ...d, agentProvider: e.target.value }))
              })
            ),
            h(
              "div",
              null,
              h("div", { style: { ...s.muted, marginBottom: 4 } }, "\u6A21\u578B\uFF08\u53EF\u9009\uFF09"),
              h("input", {
                style: { ...s.input, width: "100%" },
                placeholder: "\u7559\u7A7A = DSH \u9ED8\u8BA4",
                value: cfgDraft?.agentModel ?? "",
                onChange: (e) => setCfgDraft((d) => ({ ...d, agentModel: e.target.value }))
              })
            )
          ),
          // 会话节奏参数
          h(
            "div",
            { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 } },
            [
              ["digestIntervalSec", "\u8FDB\u5EA6\u6458\u8981\u95F4\u9694\uFF08\u79D2\uFF09"],
              ["approvalTimeoutSec", "\u5BA1\u6279\u8D85\u65F6\uFF08\u79D2\uFF09"],
              ["maxMessageChars", "\u5355\u6761\u6D88\u606F\u4E0A\u9650\uFF08\u5B57\u7B26\uFF09"],
              ["sendChunkDelayMs", "\u5206\u5757\u53D1\u9001\u95F4\u9694\uFF08\u6BEB\u79D2\uFF09"]
            ].map(([key, label]) => h(
              "div",
              { key },
              h("div", { style: { ...s.muted, marginBottom: 4 } }, label),
              h("input", {
                style: { ...s.input, width: "100%" },
                inputMode: "numeric",
                value: cfgDraft?.[key] ?? "",
                onChange: (e) => setCfgDraft((d) => ({ ...d, [key]: e.target.value }))
              })
            ))
          ),
          h(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
            h("button", {
              style: { ...s.btnPri, opacity: busy || !cfgDirty ? 0.5 : 1 },
              onClick: saveConfig,
              disabled: busy || !cfgDirty
            }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u9AD8\u7EA7\u8BBE\u7F6E"),
            h("button", {
              style: { ...s.btnGhost },
              onClick: resetDefaults,
              disabled: busy
            }, "\u6062\u590D\u63A8\u8350\u8282\u594F\u53C2\u6570")
          )
        )
      ),
      // 飞书 / Telegram 扫码直达对话引导卡片
      (platformId === "feishu" || platformId === "telegram") && platform.botQr && h(
        "div",
        {
          style: {
            marginTop: 12,
            padding: 12,
            background: "var(--dsw-alias-bg-layer-1,#ffffff)",
            border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
            borderRadius: 8,
            display: "flex",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap"
          }
        },
        h("img", { src: platform.botQr, alt: localeT("${name} Bot QR", { name: localeT(platformName) }), style: { width: 110, height: 110, borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", padding: 4, background: "#fff" } }),
        h(
          "div",
          { style: { flex: 1, minWidth: 160 } },
          h("div", { style: { ...s.label, fontSize: 13, fontWeight: 600 } }, localeT("\u{1F4F1} \u624B\u673A ${name} \u626B\u7801\u76F4\u8FBE\u5BF9\u8BDD", { name: localeT(platformName) })),
          h(
            "div",
            { style: { ...s.muted, fontSize: 12, marginTop: 4, lineHeight: 1.5 } },
            localeT("\u7528 ${name} \u626B\u63CF\u5DE6\u4FA7\u4E8C\u7EF4\u7801\uFF0C\u7ACB\u5373\u6253\u5F00\u4E0E Bot \u5BF9\u8BDD\uFF1B\u53D1\u9001\u9996\u6761\u6D88\u606F\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002", { name: localeT(platformName) })
          ),
          platform.botLink && h(
            "div",
            { style: { display: "flex", gap: 8, marginTop: 8 } },
            h("a", {
              href: platform.botLink,
              target: "_blank",
              rel: "noopener noreferrer",
              style: { ...s.btnGhost, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 12 }
            }, localeT("\u5728 ${name} \u5BA2\u6237\u7AEF\u6253\u5F00 \u2197", { name: localeT(platformName) }))
          )
        )
      )
    ),
    // 未配置 / 登录中：表单（QQ / 飞书 / Telegram）或二维码（微信）
    (!platform?.configured || showQr) && h(
      "div",
      { style: s.block },
      !platform?.configured && !showQr && h(
        "div",
        { style: { ...s.muted, marginBottom: 8 } },
        "\u672A\u914D\u7F6E\u51ED\u8BC1 \u2014 \u8BF7\u5148\u5B8C\u6210\u4E0B\u65B9\u914D\u7F6E\u3002"
      ),
      showQr && login.qr ? h(
        "div",
        null,
        h("img", { src: login.qr, alt: "login QR", style: s.qr }),
        h(
          "div",
          { style: { ...s.muted, marginTop: 4 } },
          login.phase === "scaned" ? "\u5DF2\u626B\u7801\uFF0C\u8BF7\u5728\u624B\u673A\u4E0A\u786E\u8BA4\u2026" : platformId === "wechat" ? "\u8BF7\u4F7F\u7528\u5FAE\u4FE1\u626B\u7801\u767B\u5F55\uFF08ClawBot\uFF09" : platformId === "feishu" ? "\u8BF7\u7528\u98DE\u4E66\u626B\u7801\u521B\u5EFA\u5E94\u7528\uFF08\u4E8C\u7EF4\u7801 10 \u5206\u949F\u5185\u6709\u6548\uFF09" : platformId === "qq" ? "\u8BF7\u7528\u624B\u673A QQ \u626B\u7801\u7ED1\u5B9A\u673A\u5668\u4EBA\uFF08\u4E8C\u7EF4\u7801\u8FC7\u671F\u4F1A\u81EA\u52A8\u5237\u65B0\uFF09" : "\u8BF7\u626B\u7801\u767B\u5F55"
        ),
        login.error && h("div", { style: { ...s.muted, marginTop: 4, color: "var(--dsw-alias-label-primary, #0f1115)" } }, login.error),
        (platformId === "feishu" || platformId === "qq") && h(
          "div",
          { style: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" } },
          h("button", {
            style: { ...s.btnGhost, opacity: busy ? 0.5 : 1 },
            onClick: onRefreshQr,
            disabled: busy,
            title: "\u4F5C\u5E9F\u5F53\u524D\u4E8C\u7EF4\u7801\u5E76\u91CD\u65B0\u751F\u6210\uFF08\u65E7\u7801\u7ACB\u5373\u5931\u6548\uFF09"
          }, busy ? "\u751F\u6210\u4E2D\u2026" : "\u{1F504} \u91CD\u65B0\u751F\u6210\u4E8C\u7EF4\u7801"),
          h("span", { style: { ...s.muted, fontSize: 12 } }, "\u626B\u4E0D\u51FA\u6765\u6216\u5DF2\u8FC7\u671F\u65F6\u53EF\u70B9\u6B64\u6362\u65B0\u7801")
        )
      ) : platformId === "qq" || platformId === "feishu" || platformId === "telegram" ? h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 10, marginTop: 4 } },
        (platformId === "feishu" || platformId === "qq") && h(
          "div",
          {
            style: {
              background: "var(--dsw-alias-bg-layer-1,#ffffff)",
              border: "1px dashed var(--dsw-alias-border-l2,#e5e7eb)",
              borderRadius: 6,
              padding: "10px",
              fontSize: 12,
              lineHeight: 1.5
            }
          },
          h(
            "div",
            { style: { ...s.label, marginBottom: 4 } },
            platformId === "qq" ? "\u{1F4F1} \u626B\u7801\u7ED1\u5B9A QQ \u673A\u5668\u4EBA\uFF08\u63A8\u8350\uFF09" : "\u{1F4F1} \u4E00\u952E\u521B\u5EFA\u98DE\u4E66\u5E94\u7528\uFF08\u63A8\u8350\uFF09"
          ),
          h(
            "div",
            { style: { ...s.muted, marginBottom: 8 } },
            platformId === "qq" ? "\u70B9\u51FB\u540E\u7528\u624B\u673A QQ \u626B\u7801\uFF1A\u7531 QQ \u5F00\u653E\u5E73\u53F0\u5B98\u65B9\u63A5\u53E3\u76F4\u63A5\u56DE\u4F20\u673A\u5668\u4EBA\u7684 AppID \u4E0E AppSecret\uFF0C\u65E0\u9700\u624B\u5DE5\u590D\u5236\u7C98\u8D34\u3002" : "\u70B9\u51FB\u540E\u7528\u98DE\u4E66\u626B\u7801\uFF1A\u81EA\u52A8\u521B\u5EFA\u673A\u5668\u4EBA\u5E94\u7528\u5E76\u9884\u7F6E\u6240\u9700\u6743\u9650\u3001\u4E8B\u4EF6\u8BA2\u9605\u4E0E\u5361\u7247\u56DE\u8C03\uFF0C\u65E0\u9700\u8FDB\u5F00\u53D1\u8005\u540E\u53F0\u624B\u5DE5\u914D\u7F6E\u3002"
          ),
          h("button", {
            style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
            onClick: platformId === "qq" ? onBindQqBot : onRegisterApp,
            disabled: busy,
            title: platformId === "qq" ? "\u4F7F\u7528\u624B\u673A QQ \u626B\u7801\u7ED1\u5B9A\u673A\u5668\u4EBA\u5E76\u81EA\u52A8\u586B\u5165\u51ED\u8BC1" : "\u4F7F\u7528\u98DE\u4E66\u626B\u7801\u521B\u5EFA\u5E94\u7528\u5E76\u81EA\u52A8\u586B\u5165\u51ED\u8BC1"
          }, busy ? "\u5904\u7406\u4E2D\u2026" : platformId === "qq" ? "\u626B\u7801\u7ED1\u5B9A\u673A\u5668\u4EBA" : "\u626B\u7801\u4E00\u952E\u521B\u5EFA\u5E94\u7528"),
          platformId === "qq" ? h(
            "div",
            { style: { ...s.muted, marginTop: 8, fontSize: 11 } },
            "\u5DF2\u521B\u5EFA\u8FC7\u673A\u5668\u4EBA\uFF1F",
            "\u5728\u4E0B\u65B9\u624B\u52A8\u586B\u5165 AppID \u4E0E AppSecret\uFF0C\u6216 ",
            h("a", {
              href: "https://q.qq.com/",
              target: "_blank",
              rel: "noopener noreferrer",
              style: s.btnLink
            }, "\u524D\u5F80 QQ \u5F00\u653E\u5E73\u53F0"),
            " \u521B\u5EFA\u540E\u586B\u5165\u3002"
          ) : h(
            "div",
            { style: { ...s.muted, marginTop: 8, fontSize: 11 } },
            "\u5DF2\u6709\u5E94\u7528\uFF1F\u5728\u4E0B\u65B9\u624B\u52A8\u586B\u5165 App ID \u4E0E App Secret\uFF0C\u6216 ",
            h("a", {
              href: "https://open.feishu.cn/app",
              target: "_blank",
              rel: "noopener noreferrer",
              style: s.btnLink
            }, "\u524D\u5F80\u98DE\u4E66\u5F00\u653E\u5E73\u53F0"),
            " \u521B\u5EFA\u540E\u586B\u5165\u3002"
          )
        ),
        platformId === "telegram" ? h(
          React.Fragment,
          null,
          h(
            "div",
            null,
            h("div", { style: { ...s.muted, marginBottom: 4 } }, "Bot Token \u2014 Telegram @BotFather \u4E0B\u53D1\u7684\u673A\u5668\u4EBA Token"),
            h(
              "div",
              { style: { display: "flex", gap: 6, alignItems: "center" } },
              h("input", {
                style: { ...s.input, flex: 1 },
                type: showSecret ? "text" : "password",
                placeholder: "\u8BF7\u8F93\u5165 Telegram Bot Token (\u5982 123456789:ABCdef...)",
                value: cfgDraft?.botToken ?? "",
                onChange: (e) => setCfgDraft((d) => ({ ...d, botToken: e.target.value }))
              }),
              h("button", {
                style: { ...s.btnGhost, height: 32, padding: "0 10px", fontSize: 13, flexShrink: 0 },
                onClick: () => setShowSecret((v) => !v),
                type: "button",
                title: showSecret ? "\u9690\u85CF\u5BC6\u94A5" : "\u663E\u793A\u660E\u6587"
              }, showSecret ? "\u{1F648} \u9690\u85CF" : "\u{1F441}\uFE0F \u663E\u793A")
            )
          ),
          h(
            "div",
            null,
            h("div", { style: { ...s.muted, marginBottom: 4 } }, "\u7F51\u7EDC\u4EE3\u7406 (\u53EF\u9009) \u2014 \u652F\u6301\u56FD\u5185 HTTP / HTTPS \u4EE3\u7406"),
            h("input", {
              style: { ...s.input, width: "100%" },
              placeholder: "\u53EF\u9009\uFF0C\u4F8B\u5982 http://127.0.0.1:7890\uFF08\u4E3A\u7A7A\u5219\u76F4\u8FDE\u6216\u8BFB\u53D6\u73AF\u5883\u53D8\u91CF\uFF09",
              value: cfgDraft?.proxy ?? "",
              onChange: (e) => setCfgDraft((d) => ({ ...d, proxy: e.target.value }))
            })
          )
        ) : h(
          React.Fragment,
          null,
          h(
            "div",
            null,
            h(
              "div",
              { style: { ...s.muted, marginBottom: 4 } },
              platformId === "qq" ? "AppID \u2014 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u5E94\u7528 ID" : "App ID \u2014 \u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u81EA\u5EFA\u5E94\u7528 ID (cli_xxx)"
            ),
            h("input", {
              style: { ...s.input, width: "100%" },
              placeholder: platformId === "qq" ? "\u8BF7\u8F93\u5165 AppID" : "\u8BF7\u8F93\u5165 App ID (\u5982 cli_a1b2c3d4...)",
              value: cfgDraft?.appId ?? "",
              onChange: (e) => setCfgDraft((d) => ({ ...d, appId: e.target.value }))
            })
          ),
          h(
            "div",
            null,
            h(
              "div",
              { style: { ...s.muted, marginBottom: 4 } },
              platformId === "qq" ? "AppSecret \u2014 QQ \u5F00\u653E\u5E73\u53F0\u673A\u5668\u4EBA\u5BC6\u94A5" : "App Secret \u2014 \u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u5E94\u7528\u5BC6\u94A5"
            ),
            h(
              "div",
              { style: { display: "flex", gap: 6, alignItems: "center" } },
              h("input", {
                style: { ...s.input, flex: 1 },
                type: showSecret ? "text" : "password",
                placeholder: platformId === "qq" ? "\u8BF7\u8F93\u5165 AppSecret\uFF08\u626B\u7801\u7ED1\u5B9A\u65F6\u81EA\u52A8\u586B\u5165\uFF09" : "\u8BF7\u8F93\u5165 App Secret",
                value: platformId === "qq" ? cfgDraft?.appSecret ?? "" : cfgDraft?.appSecret ?? "",
                onChange: (e) => setCfgDraft((d) => ({ ...d, appSecret: e.target.value }))
              }),
              h("button", {
                style: { ...s.btnGhost, height: 32, padding: "0 10px", fontSize: 13, flexShrink: 0 },
                onClick: () => setShowSecret((v) => !v),
                type: "button",
                title: showSecret ? "\u9690\u85CF\u5BC6\u94A5" : "\u663E\u793A\u660E\u6587"
              }, showSecret ? "\u{1F648} \u9690\u85CF" : "\u{1F441}\uFE0F \u663E\u793A")
            )
          )
        ),
        h(
          "div",
          null,
          h("a", {
            href: platformId === "qq" ? "https://bot.q.qq.com/wiki/develop/api-v2/" : platformId === "feishu" ? "https://open.feishu.cn/app" : "https://t.me/BotFather",
            target: "_blank",
            rel: "noopener noreferrer",
            style: s.btnLink
          }, platformId === "qq" ? "\u{1F4D6} QQ \u673A\u5668\u4EBA\u5F00\u53D1\u6587\u6863" : "\u{1F4D6} \u524D\u5F80\u98DE\u4E66\u5F00\u653E\u5E73\u53F0\u521B\u5EFA\u4F01\u4E1A\u81EA\u5EFA\u5E94\u7528")
        ),
        h(
          "div",
          { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" } },
          h("button", {
            style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
            onClick: saveConfig,
            disabled: busy || (platformId === "telegram" ? !cfgDraft?.botToken?.trim() : !cfgDraft?.appId?.trim() || !cfgDraft?.appSecret?.trim())
          }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u5E76\u8FDE\u63A5"),
          login.phase === "error" && h("div", { style: { ...s.muted, fontSize: 12 } }, login.error ?? "\u8FDE\u63A5\u5931\u8D25")
        )
      ) : h(
        "div",
        { style: { display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" } },
        h("button", {
          style: { ...s.btnPri, opacity: busy ? 0.5 : 1 },
          onClick: onLogin,
          disabled: busy
        }, busy ? "\u5904\u7406\u4E2D\u2026" : "\u626B\u7801\u767B\u5F55"),
        login.phase === "error" && h("div", { style: { ...s.muted, fontSize: 12 } }, login.error ?? "\u767B\u5F55\u5931\u8D25")
      )
    ),
    h(
      "div",
      { style: s.block },
      h(
        "div",
        { style: { ...s.tip, fontSize: 12 } },
        platformId === "wechat" ? "\u8BF4\u660E: \u626B\u7801\u6210\u529F\u540E\uFF0C\u5411\u8BE5\u5FAE\u4FE1 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u5FAE\u4FE1\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002\u4F7F\u7528\u4E13\u7528\u5FAE\u4FE1\u53F7\uFF0C\u907F\u514D\u5F71\u54CD\u4E3B\u53F7\u3002" : platformId === "qq" ? "\u8BF4\u660E: \u63A8\u8350\u7528\u624B\u673A QQ \u626B\u7801\u4E00\u952E\u7ED1\u5B9A\u673A\u5668\u4EBA\uFF1B\u4E5F\u53EF\u624B\u52A8\u586B\u5165 AppID \u4E0E AppSecret \u540E\u4FDD\u5B58\u5373\u81EA\u52A8\u8FDE\u63A5\uFF08\u5E95\u5C42\u8D70\u817E\u8BAF\u5B98\u65B9 QQ \u673A\u5668\u4EBA SDK\uFF09\u3002\u7528\u6237\u5411 Bot \u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684 QQ \u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002" : "\u8BF4\u660E: \u767B\u5F55\u6210\u529F\u540E\uFF0C\u53D1\u9001\u7B2C\u4E00\u6761\u6D88\u606F\u5373\u81EA\u52A8\u5B8C\u6210\u767D\u540D\u5355\u6388\u6743\u3002\u4EC5\u767D\u540D\u5355\u5185\u7684\u7528\u6237\u80FD\u9A71\u52A8 agent\uFF0C\u5176\u4ED6\u4EBA\u6D88\u606F\u4F1A\u88AB\u5FFD\u7565\u3002"
      )
    )
  );
}
function SystemMetricsWidget({ metrics }) {
  if (!metrics) return null;
  const memUsedPercent = metrics.memory?.usedPercent ?? 0;
  const memUsedGb = (metrics.memory?.usedBytes / 1024 ** 3).toFixed(1);
  const memTotalGb = (metrics.memory?.totalBytes / 1024 ** 3).toFixed(1);
  const heapMb = Math.round((metrics.memory?.processHeapUsed || 0) / 1024 ** 2);
  const formatUptime = (sec = 0) => {
    const days = Math.floor(sec / 86400);
    const hrs = Math.floor(sec % 86400 / 3600);
    const mins = Math.floor(sec % 3600 / 60);
    if (days > 0) return localeT("${days}\u5929 ${hrs}\u5C0F\u65F6 ${mins}\u5206", { days, hrs, mins });
    if (hrs > 0) return localeT("${hrs}\u5C0F\u65F6 ${mins}\u5206", { hrs, mins });
    return localeT("${mins}\u5206\u949F", { mins, count: mins });
  };
  const progressColor = memUsedPercent > 85 ? "#dc2626" : memUsedPercent > 70 ? "#d97706" : "#059669";
  return h(
    "div",
    {
      style: {
        ...s.card,
        marginBottom: 16
      }
    },
    h(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 6 } },
      h(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        "\u{1F4CA} \u5BBF\u4E3B\u7CFB\u7EDF\u4E0E\u8FD0\u884C\u770B\u677F"
      ),
      h(
        "div",
        { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #6b7280)" } },
        `Node ${metrics.os?.nodeVersion || ""} \xB7 ${metrics.os?.platform || ""} ${metrics.os?.arch || ""}`
      )
    ),
    h(
      "div",
      { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 12 } },
      h(
        "div",
        null,
        h("div", { style: { color: "var(--dsw-alias-label-tertiary, #9ca3af)", fontSize: 11, marginBottom: 2 } }, "CPU \u6838\u5FC3\u4E0E\u578B\u53F7"),
        h(
          "div",
          { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary, currentColor)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, title: metrics.cpu?.model },
          localeT("${cores} \u6838\u5FC3 (${model})", {
            cores: metrics.cpu?.cores || 0,
            count: metrics.cpu?.cores || 0,
            model: (metrics.cpu?.model || "").split("@")[0].trim()
          })
        )
      ),
      h(
        "div",
        null,
        h("div", { style: { color: "var(--dsw-alias-label-tertiary, #9ca3af)", fontSize: 11, marginBottom: 2 } }, "DSH \u8FD0\u884C\u65F6\u95F4 (Uptime)"),
        h(
          "div",
          { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary, #0f1115)" } },
          formatUptime(metrics.uptime?.processSec)
        )
      ),
      h(
        "div",
        null,
        h("div", { style: { color: "var(--dsw-alias-label-tertiary, #9ca3af)", fontSize: 11, marginBottom: 2 } }, "Node \u8FDB\u7A0B\u5806\u5185\u5B58"),
        h(
          "div",
          { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary, currentColor)" } },
          `${heapMb} MB`
        )
      )
    ),
    h(
      "div",
      null,
      h(
        "div",
        { style: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--dsw-alias-label-secondary, #6b7280)", marginBottom: 4 } },
        h("span", null, localeT("\u7CFB\u7EDF\u5185\u5B58\u5360\u7528: ${used} GB / ${total} GB", { used: memUsedGb, total: memTotalGb })),
        h("span", { style: { fontWeight: 600, color: progressColor } }, `${memUsedPercent}%`)
      ),
      h(
        "div",
        {
          style: {
            width: "100%",
            height: 6,
            background: "var(--dsw-alias-border-l2, #e5e7eb)",
            borderRadius: 999,
            overflow: "hidden"
          }
        },
        h("div", {
          style: {
            width: `${memUsedPercent}%`,
            height: "100%",
            background: progressColor,
            borderRadius: 999,
            transition: "width .3s ease"
          }
        })
      )
    )
  );
}
function NetworkDiagnosticWidget({ rpcCall }) {
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const runDiagnose = React.useCallback(async () => {
    setRunning(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.diagnoseNetwork, {});
      if (r?.ok) setResult(r.value);
    } catch (e) {
      setResult({ overall: "warning", results: [{ item: "err", name: "\u8BCA\u65AD\u8BF7\u6C42\u5F02\u5E38", status: "fail", detail: e.message }] });
    } finally {
      setRunning(false);
    }
  }, [rpcCall]);
  return h(
    "div",
    { style: { ...s.card, marginBottom: 16 } },
    h(
      "div",
      { style: { marginBottom: 10 } },
      h(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        "\u{1F50D} \u7F51\u7EDC\u8FDE\u901A\u6027\u4E00\u952E\u8BCA\u65AD"
      ),
      h(
        "div",
        { style: { ...s.muted, marginTop: 3 } },
        "\u4E00\u952E\u68C0\u6D4B\u672C\u5730\u53CD\u5411\u4EE3\u7406\u7AEF\u53E3\u3001\u5C40\u57DF\u7F51 IPv4\u3001Cloudflare Anycast \u5EF6\u8FDF\u4EE5\u53CA\u56FD\u5185 npmmirror \u955C\u50CF\u6E90\u8FDE\u901A\u6027\u3002"
      )
    ),
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: result ? 12 : 0 } },
      h(
        "button",
        {
          type: "button",
          style: { ...s.btnPri, height: 32, fontSize: 12, padding: "0 14px" },
          onClick: runDiagnose,
          disabled: running
        },
        running ? "\u6B63\u5728\u63A2\u6D4B\u8FDE\u901A\u6027\u2026" : result ? "\u{1F504} \u91CD\u65B0\u8BCA\u65AD\u7F51\u7EDC" : "\u{1F50D} \u5F00\u59CB\u4E00\u952E\u8BCA\u65AD"
      ),
      result && h("span", {
        style: {
          fontSize: 12,
          color: "var(--dsw-alias-label-primary, #0f1115)",
          fontWeight: 600
        }
      }, result.overall === "healthy" ? "\u2713 \u6240\u6709\u7F51\u7EDC\u63A2\u6D4B\u9879\u6B63\u5E38" : "\u25B2 \u68C0\u6D4B\u5230\u90E8\u5206\u5EF6\u8FDF\u8F83\u9AD8\u6216\u5F02\u5E38")
    ),
    running && !result && h(
      "div",
      {
        style: {
          marginTop: 10,
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--dsw-alias-bg-layer-2, #f9fafb)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--dsw-alias-brand-primary, #4f6ef7)",
          fontSize: 12
        }
      },
      h("span", { style: { animation: "spin 1s linear infinite", display: "inline-flex" } }, h(Icons.refresh)),
      "\u6B63\u5728\u6267\u884C\u7F51\u7EDC\u7AEF\u53E3\u4E0E\u4E91\u7AEF\u8282\u70B9\u8FDE\u901A\u6027\u63A2\u6D4B\u2026"
    ),
    result?.results && h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--dsw-alias-border-l2, #e5e7eb)"
        }
      },
      result.results.map((item, idx) => {
        const isPass = item.status === "pass";
        const isWarn = item.status === "warn";
        return h(
          "div",
          {
            key: idx,
            style: {
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 6,
              background: "var(--dsw-alias-bg-layer-1, rgba(255,255,255,0.7))",
              border: `1px solid ${isPass ? "var(--dsw-alias-state-success-border, #a7f3d0)" : isWarn ? "var(--dsw-alias-state-warn-border, #fde68a)" : "var(--dsw-alias-state-error-border, #fecaca)"}`,
              boxSizing: "border-box"
            }
          },
          h(
            "div",
            { style: { flex: 1, minWidth: 0 } },
            h(
              "div",
              { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary, currentColor)", marginBottom: 2 } },
              isPass ? "\u2713 " : isWarn ? "\u25B2 " : "\u2715 ",
              item.name
            ),
            h("div", { style: { fontSize: 11, color: "var(--dsw-alias-label-secondary, #6b7280)" } }, item.detail)
          ),
          item.latencyMs != null && h("span", {
            style: {
              fontSize: 11,
              fontWeight: 600,
              flexShrink: 0,
              color: "var(--dsw-alias-label-primary, #0f1115)"
            }
          }, `${item.latencyMs}ms`)
        );
      })
    )
  );
}
function BackupRestoreWidget({ rpcCall, onUpdate }) {
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [msg, setMsg] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const handleExport = async () => {
    setExporting(true);
    setMsg(null);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.exportBackup, {});
      if (r?.ok && r.value) {
        const jsonStr = JSON.stringify(r.value, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const now = /* @__PURE__ */ new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
        a.href = url;
        a.download = `dsh-bridge-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setMsg({ ok: true, text: "\u2713 \u5907\u4EFD\u6587\u4EF6\u5DF2\u6210\u529F\u5BFC\u51FA\u5E76\u4E0B\u8F7D\u5230\u672C\u5730\uFF01" });
      } else {
        setMsg({ ok: false, text: r?.error?.message || "\u5BFC\u51FA\u5907\u4EFD\u5931\u8D25" });
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message || "\u5BFC\u51FA\u5F02\u5E38" });
    } finally {
      setExporting(false);
    }
  };
  const handleFileChange = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setImporting(true);
    setMsg(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const r = await rpcCall(BRIDGE_ENDPOINTS.importBackup, { backup });
      if (r?.ok) {
        setMsg({ ok: true, text: "\u2713 \u914D\u7F6E\u5DF2\u6210\u529F\u5BFC\u5165\u5E76\u5237\u65B0\u751F\u6548\uFF01" });
        onUpdate?.(r.value?.status);
      } else {
        setMsg({ ok: false, text: r?.error?.message || "\u5BFC\u5165\u914D\u7F6E\u5931\u8D25" });
      }
    } catch (err) {
      setMsg({ ok: false, text: localeT("\u5BFC\u5165\u89E3\u6790\u5931\u8D25: ${reason}", { reason: localeT(err.message) }) });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  return h(
    "div",
    { style: { ...s.card, marginBottom: 16 } },
    h(
      "div",
      { style: { marginBottom: 10 } },
      h(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        "\u{1F5C4}\uFE0F \u5168\u5C40\u914D\u7F6E\u5907\u4EFD\u4E0E\u6062\u590D"
      ),
      h(
        "div",
        { style: { ...s.muted, marginTop: 3 } },
        "\u652F\u6301\u4E00\u952E\u5BFC\u51FA\u6216\u5BFC\u5165\u6062\u590D\u672C\u63D2\u4EF6\u6240\u6709\u914D\u7F6E\uFF08\u5305\u542B\u5404 IM \u5E73\u53F0\u51ED\u8BC1\u3001\u6388\u6743\u767D\u540D\u5355\u3001\u516C\u7F51\u96A7\u9053\u4E0E\u5B89\u5168\u8BA4\u8BC1\u89C4\u5219\uFF09\u3002"
      )
    ),
    h(
      "div",
      { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
      h("button", {
        type: "button",
        style: { ...s.btnPri, height: 32, fontSize: 12, padding: "0 14px" },
        onClick: handleExport,
        disabled: exporting || importing
      }, exporting ? "\u6B63\u5728\u5BFC\u51FA\u2026" : "\u{1F4E5} \u5BFC\u51FA\u914D\u7F6E\u5907\u4EFD (.json)"),
      h("button", {
        type: "button",
        style: { ...s.btnGhost, height: 32, fontSize: 12, padding: "0 14px" },
        onClick: () => fileInputRef.current?.click(),
        disabled: exporting || importing
      }, importing ? "\u6B63\u5728\u5BFC\u5165\u2026" : "\u{1F4E4} \u5BFC\u5165\u914D\u7F6E\u6062\u590D"),
      h("input", {
        type: "file",
        ref: fileInputRef,
        accept: ".json",
        style: { display: "none" },
        onChange: handleFileChange
      })
    ),
    msg && h("div", {
      style: {
        marginTop: 10,
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 12,
        background: msg.ok ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-state-error-bg,#fef2f2)",
        color: "var(--dsw-alias-label-primary, #0f1115)"
      }
    }, msg.text)
  );
}
function formatActiveWorkWarning(work) {
  if (!work || !work.total) return null;
  const lines = [];
  if (work.sessions?.length) {
    lines.push(localeT("\u2022 \u8FDB\u884C\u4E2D\u7684\u4F1A\u8BDD ${count} \u4E2A\uFF1A", { count: work.sessions.length }));
    for (const s2 of work.sessions.slice(0, 5)) {
      const detail = s2.tools > 0 ? localeT("${count} \u6B21\u5DE5\u5177\u8C03\u7528", { count: s2.tools }) + (s2.lastTool ? localeT("\uFF08\u6700\u8FD1\uFF1A${tool}\uFF09", { tool: s2.lastTool }) : "") : localeT("\u601D\u8003\u4E2D");
      lines.push(localeT("    - ${title}\uFF08\u7B2C ${turn} \u8F6E\uFF0C${detail}\uFF09", { title: localeT(s2.title), turn: s2.turn, detail }));
    }
    if (work.sessions.length > 5) lines.push(localeT("    \u2026\u7B49\u5171 ${count} \u4E2A", { count: work.sessions.length }));
  }
  if (work.subagentSessions?.length) {
    lines.push(localeT("\u2022 \u8FDB\u884C\u4E2D\u7684\u5B50\u4EE3\u7406/agent \u4EFB\u52A1 ${count} \u4E2A\uFF1A", { count: work.subagentSessions.length }));
    for (const s2 of work.subagentSessions.slice(0, 5)) {
      const detail = s2.tools > 0 ? localeT("${count} \u6B21\u5DE5\u5177\u8C03\u7528", { count: s2.tools }) : localeT("\u601D\u8003\u4E2D");
      lines.push(localeT("    - ${title}\uFF08\u7B2C ${turn} \u8F6E\uFF0C${detail}\uFF09", { title: localeT(s2.title), turn: s2.turn, detail }));
    }
    if (work.subagentSessions.length > 5) lines.push(localeT("    \u2026\u7B49\u5171 ${count} \u4E2A", { count: work.subagentSessions.length }));
  }
  if (work.pendingApprovals?.length) {
    lines.push(localeT("\u2022 \u5F85\u5BA1\u6279\u8BF7\u6C42 ${count} \u4E2A\uFF1A", { count: work.pendingApprovals.length }));
    for (const a of work.pendingApprovals.slice(0, 5)) {
      lines.push(localeT("    - [${platform}] ${summary}", { platform: a.platform, summary: localeT(a.summary) }));
    }
    if (work.pendingApprovals.length > 5) lines.push(localeT("    \u2026\u7B49\u5171 ${count} \u4E2A", { count: work.pendingApprovals.length }));
  }
  return localeT("\u26A0\uFE0F \u68C0\u6D4B\u5230\u6709\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\uFF0C\u91CD\u542F\u4F1A\u4E2D\u65AD\u5B83\u4EEC\uFF1A\n\n${list}\n\n\u4E2D\u65AD\u540E\u53EF\u80FD\u9700\u8981\u91CD\u65B0\u53D1\u8D77\u3002\u786E\u5B9A\u8981\u7EE7\u7EED\u91CD\u542F\u5417\uFF1F", { list: lines.join("\n") });
}
function useDshRestart({ rpcCall, maxAttempts = 30, texts = {} } = {}) {
  const T = {
    restarting: "\u6B63\u5728\u5411 DSH \u670D\u52A1\u53D1\u9001\u91CD\u542F\u6307\u4EE4\u2026",
    reconnecting: "DSH \u670D\u52A1\u6B63\u5728\u91CD\u542F\u4E2D\uFF0C\u6B63\u5728\u81EA\u52A8\u91CD\u65B0\u8FDE\u63A5\u2026",
    success: "\u{1F389} \u91CD\u542F\u6210\u529F\uFF01\u5DF2\u91CD\u65B0\u5EFA\u7ACB\u8FDE\u63A5\uFF0C\u6B63\u5728\u5237\u65B0\u9875\u9762\u2026",
    timeout: "\u91CD\u8FDE\u7B49\u5F85\u8D85\u65F6\uFF0C\u8BF7\u624B\u52A8\u5237\u65B0\u9875\u9762\u3002",
    ...texts
  };
  const [restarting, setRestarting] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const pollRef = React.useRef(null);
  const reloadRef = React.useRef(null);
  React.useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (reloadRef.current) clearTimeout(reloadRef.current);
  }, []);
  const startRestart = React.useCallback(async () => {
    setRestarting(true);
    setStatus({ phase: "restarting", text: T.restarting });
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.restartDsh, {});
      if (r && r.ok === false && r.error?.code === "busy") {
        const warning = formatActiveWorkWarning(r.error?.details?.activeWork);
        if (!window.confirm(warning || localeT("\u5F53\u524D\u6709\u4EFB\u52A1\u6B63\u5728\u8FD0\u884C\uFF0C\u91CD\u542F\u4F1A\u4E2D\u65AD\u5B83\u4EEC\u3002\u786E\u5B9A\u7EE7\u7EED\u5417\uFF1F"))) {
          setStatus(null);
          setRestarting(false);
          return;
        }
        const r2 = await rpcCall(BRIDGE_ENDPOINTS.restartDsh, { confirm: true });
        if (r2 && r2.ok === false) {
          setStatus({ phase: "timeout", text: localeT("${label}\uFF1A${reason}", { label: localeT(T.timeout), reason: localeT(r2.error?.message) || localeT("\u672A\u77E5\u539F\u56E0") }) });
          setRestarting(false);
          return;
        }
      } else if (r && r.ok === false) {
        setStatus({ phase: "timeout", text: localeT("${label}\uFF1A${reason}", { label: localeT(T.timeout), reason: localeT(r.error?.message || r.error) || localeT("\u672A\u77E5\u539F\u56E0") }) });
        setRestarting(false);
        return;
      }
    } catch {
    }
    setStatus({ phase: "reconnecting", text: T.reconnecting });
    await new Promise((r) => setTimeout(r, 2e3));
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const r = await rpcCall(BRIDGE_ENDPOINTS.checkVersion, {});
        if (r?.ok) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setStatus({ phase: "success", text: T.success });
          reloadRef.current = setTimeout(() => {
            window.location.reload();
          }, 1e3);
          return;
        }
      } catch {
      }
      if (attempts >= maxAttempts) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setStatus({ phase: "timeout", text: T.timeout });
        setRestarting(false);
      }
    }, 1e3);
  }, [rpcCall, maxAttempts]);
  const resetStatus = React.useCallback(() => setStatus(null), []);
  return { restarting, status, startRestart, resetStatus };
}
function RestartDshCard({ rpcCall }) {
  const { restarting, status, startRestart: handleRestart } = useDshRestart({ rpcCall });
  return h(
    "div",
    { style: { ...s.card, marginBottom: 16 } },
    h(
      "div",
      { style: { marginBottom: 10 } },
      h(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        "\u{1F504} DSH \u670D\u52A1\u5E73\u6ED1\u91CD\u542F"
      ),
      h(
        "div",
        { style: { ...s.muted, marginTop: 3 } },
        "\u4F18\u96C5\u9000\u51FA\u5E76\u91CD\u65B0\u62C9\u8D77\u5F53\u524D DSH \u8FDB\u7A0B\u4E0E\u6240\u6709\u63D2\u4EF6\u670D\u52A1\uFF0C\u524D\u7AEF\u5C06\u5728\u51E0\u79D2\u540E\u81EA\u52A8\u63A2\u6D4B\u91CD\u8FDE\u5E76\u5237\u65B0\u9875\u9762\u3002"
      )
    ),
    !restarting && !status && h("button", {
      type: "button",
      style: { ...s.btnGhost, height: 32, fontSize: 12, padding: "0 14px" },
      onClick: handleRestart
    }, "\u{1F504} \u7ACB\u5373\u91CD\u542F DSH \u670D\u52A1"),
    (restarting || status) && h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--dsw-alias-label-primary, #0f1115)",
          fontWeight: 500
        }
      },
      status?.phase !== "success" && status?.phase !== "timeout" && h("span", {
        style: { animation: "spin 1s linear infinite", display: "inline-flex" }
      }, h(Icons.refresh)),
      status?.text || "\u6B63\u5728\u8C03\u5EA6\u2026"
    )
  );
}
function PageTweaksCard({ status, rpcCall }) {
  const [pending, setPending] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const effective = status?.mobileUi ?? true;
  const hostAllows = status?.mobileUiHost ?? true;
  const toggle = async () => {
    setPending(true);
    setErr(null);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.uiUpdateConfig, { pageTweaks: !effective });
      if (!r?.ok) throw new Error(r?.error?.message ?? "\u4FDD\u5B58\u5931\u8D25");
      try {
        window.localStorage?.setItem("dsh_bridge:feature:pageTweaks", r.value.effective ? "1" : "0");
      } catch {
      }
      window.location.reload();
    } catch (e) {
      setErr(e?.message ?? String(e));
    } finally {
      setPending(false);
    }
  };
  return h(
    "div",
    { style: { ...s.card, marginBottom: 16 } },
    h(
      "div",
      { style: { marginBottom: 10 } },
      h(
        "div",
        { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
        "\u{1F4F1} \u79FB\u52A8\u7AEF\u9875\u9762\u6539\u5199\u5C42"
      ),
      h(
        "div",
        { style: { ...s.muted, marginTop: 3 } },
        localeT("\u63A7\u5236\u624B\u673A\u7AEF\u9876\u680F\u3001\u5168\u5C40\u79FB\u52A8\u6837\u5F0F\u3001\u8F93\u5165\u6846\u6298\u53E0\u7B49\u9875\u9762\u6539\u5199\u3002\u5173\u95ED\u540E\u4EC5\u4FDD\u7559\u8FDC\u7A0B\u8BBF\u95EE/\u96A7\u9053/\u673A\u5668\u4EBA\u529F\u80FD\uFF0C\u5237\u65B0\u9875\u9762\u751F\u6548\u3002") + (!hostAllows ? localeT("\u5F53\u524D\u5BBF\u4E3B\u5DF2\u5168\u5C40\u5173\u95ED\u6B64\u5C42\uFF08mobileUi:false\uFF09\uFF0C\u6B64\u5904\u4E0D\u53EF\u5F00\u542F\u3002") : "")
      )
    ),
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 10 } },
      h("button", {
        type: "button",
        disabled: pending || !hostAllows,
        onClick: toggle,
        style: { ...effective ? s.btnGhost : s.btnPri, height: 32, fontSize: 12, padding: "0 14px", opacity: pending || !hostAllows ? 0.5 : 1 }
      }, pending ? "\u4FDD\u5B58\u4E2D\u2026" : effective ? "\u5173\u95ED\u9875\u9762\u6539\u5199" : hostAllows ? "\u5F00\u542F\u9875\u9762\u6539\u5199" : "\u5BBF\u4E3B\u5DF2\u5173\u95ED"),
      h(
        "span",
        { style: { ...s.muted, fontSize: 12 } },
        localeT("\u5F53\u524D\uFF1A${state}", { state: effective ? localeT("\u5F00\u542F") : localeT("\u5173\u95ED") })
      )
    ),
    err && h("div", { style: { marginTop: 8, fontSize: 12, color: "var(--dsw-alias-label-primary, #0f1115)" } }, localeT("\u4FDD\u5B58\u5931\u8D25\uFF1A${reason}", { reason: localeT(err) }))
  );
}
function RemoteWorkspaceCard({ rpcCall }) {
  const [workspaces, setWorkspaces] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const load = React.useCallback(async () => {
    if (!rpcCall) return;
    setLoading(true);
    try {
      const res = await rpcCall(BRIDGE_ENDPOINTS.listWorkspaces, {});
      const list = res?.value || res;
      if (Array.isArray(list)) setWorkspaces(list);
      else if (list?.workspaces && Array.isArray(list.workspaces)) setWorkspaces(list.workspaces);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [rpcCall]);
  React.useEffect(() => {
    load();
  }, [load]);
  return h(
    "div",
    { style: { ...s.card, marginBottom: 16 } },
    h(
      "div",
      {
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }
      },
      h(
        "div",
        null,
        h(
          "div",
          { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", gap: 6 } },
          "\u{1F5C2}\uFE0F \u8FDC\u7A0B\u5DE5\u4F5C\u533A\u7BA1\u7406 (\u76EE\u5F55\u6D4F\u89C8\u5668)"
        ),
        h(
          "div",
          { style: { ...s.muted, marginTop: 3 } },
          "\u5728\u79FB\u52A8\u7AEF\u6216\u8FDC\u7A0B\u8BBE\u5907\u4E0A\u53EF\u89C6\u70B9\u9009\u7535\u8111\u4E0A\u7684\u6587\u4EF6\u5939\u6216\u76F4\u63A5\u8F93\u5165\u8DEF\u5F84\u6DFB\u52A0\u81F3 DSH\u3002"
        )
      ),
      h("button", {
        type: "button",
        style: { ...s.btnPri, height: 32, fontSize: 12, padding: "0 14px" },
        onClick: () => {
          if (typeof window.__dshOpenRemoteWorkspaceModal === "function") {
            window.__dshOpenRemoteWorkspaceModal();
          }
        }
      }, "+ \u8FDC\u7A0B\u6DFB\u52A0\u5DE5\u4F5C\u533A")
    ),
    workspaces.length > 0 ? h(
      "div",
      {
        style: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }
      },
      workspaces.map((ws, i) => h(
        "div",
        {
          key: ws.path || i,
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "7px 12px",
            background: "var(--dsw-alias-bg-layer-1,#ffffff)",
            border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
            borderRadius: 8,
            fontSize: 12
          }
        },
        h(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, overflow: "hidden" } },
          h("span", { style: { fontWeight: 600, color: "var(--dsw-alias-brand-primary,#4f6ef7)", flexShrink: 0 } }, `@${i + 1} ${ws.title || ""}`),
          h("span", { style: { ...s.code, color: "var(--dsw-alias-label-tertiary,#6b7280)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, ws.path)
        )
      ))
    ) : h("div", {
      style: { ...s.muted, marginTop: 6, padding: "10px 14px", background: "var(--dsw-alias-bg-layer-1,#ffffff)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 8, textAlign: "center" }
    }, loading ? "\u6B63\u5728\u8BFB\u53D6\u5DE5\u4F5C\u533A\u5217\u8868\u2026" : "\u6682\u65E0\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A\uFF0C\u70B9\u51FB\u53F3\u4E0A\u89D2\u300C+ \u8FDC\u7A0B\u6DFB\u52A0\u5DE5\u4F5C\u533A\u300D\u5373\u53EF\u6D4F\u89C8\u6DFB\u52A0\u3002")
  );
}
function UpgradeCommandRow({ cmd }) {
  const [copied, copy] = useCopy();
  return h(
    "div",
    { style: { display: "flex", gap: 6, alignItems: "center" } },
    h("code", {
      style: { ...s.code, flex: "1 1 auto", fontSize: 12, lineHeight: 1.5, wordBreak: "break-all" }
    }, cmd),
    h("button", {
      style: { ...s.btnGhost, height: 26, padding: "0 10px", fontSize: 11, flex: "0 0 auto" },
      onClick: () => copy(cmd)
    }, copied ? "\u2713 \u5DF2\u590D\u5236" : "\u590D\u5236")
  );
}
function VersionBanner({ rpcCall }) {
  const [info, setInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [upgrading, setUpgrading] = React.useState(false);
  const [upgradeResult, setUpgradeResult] = React.useState(null);
  const [showManual, setShowManual] = React.useState(false);
  const [dismissRestart, setDismissRestart] = React.useState(false);
  const { restarting, status: restartStatus, startRestart: handleRestart, resetStatus: resetRestartStatus } = useDshRestart({
    rpcCall,
    texts: {
      restarting: "\u6B63\u5728\u8C03\u5EA6 DSH \u670D\u52A1\u91CD\u542F\u2026",
      success: "\u{1F389} \u91CD\u542F\u6210\u529F\uFF01\u5DF2\u81EA\u52A8\u52A0\u8F7D\u6700\u65B0\u7248\u672C\u3002\u6B63\u5728\u5237\u65B0\u9875\u9762\u2026"
    }
  });
  const check = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.checkVersion, {});
      if (r?.ok) setInfo(r.value);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [rpcCall]);
  React.useEffect(() => {
    check();
  }, [check]);
  const hasUpdate = info?.latest && info?.current && !info.error && semverGt(info.latest, info.current);
  const isLatest = info?.latest && info?.current && !info.error && !semverGt(info.latest, info.current);
  const releaseNoteLines = formatReleaseNotes(info?.releaseNotes);
  const dshHasUpdate = !!(info?.dshLatest && info?.dshVersion && !info.error && semverGt(info.dshLatest, info.dshVersion));
  const handleUpgrade = React.useCallback(async () => {
    if (!info?.latest || upgrading) return;
    setUpgrading(true);
    setUpgradeResult(null);
    setDismissRestart(false);
    resetRestartStatus();
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.upgradePlugin, { version: info.latest });
      if (r?.ok && r.value?.ok) {
        setUpgradeResult({ ok: true, message: localeT("\u5DF2\u6210\u529F\u5347\u7EA7\u5230 v${version}\uFF01", { version: info.latest }) });
      } else {
        setUpgradeResult({ ok: false, message: r?.value?.error || r?.error?.message || "\u5347\u7EA7\u5931\u8D25" });
        setShowManual(true);
      }
    } catch (e) {
      setUpgradeResult({ ok: false, message: e.message || "\u5347\u7EA7\u8BF7\u6C42\u5931\u8D25" });
      setShowManual(true);
    } finally {
      setUpgrading(false);
    }
  }, [info?.latest, upgrading, rpcCall]);
  const [dshUpgrading, setDshUpgrading] = React.useState(false);
  const [dshUpgradeResult, setDshUpgradeResult] = React.useState(null);
  const handleUpgradeDsh = React.useCallback(async () => {
    if (!info?.dshLatest || dshUpgrading) return;
    setDshUpgrading(true);
    setDshUpgradeResult(null);
    setDismissRestart(false);
    resetRestartStatus();
    try {
      const r = await rpcCall(BRIDGE_ENDPOINTS.upgradeDsh, { version: info.dshLatest });
      if (r?.ok && r.value?.ok) {
        setDshUpgradeResult({ ok: true, message: localeT("DSH \u5DF2\u6210\u529F\u5347\u7EA7\u5230 v${version}\uFF01", { version: info.dshLatest }) });
      } else {
        const msg = r?.value?.error || r?.error?.message || "\u5347\u7EA7\u5931\u8D25";
        setDshUpgradeResult({ ok: false, message: msg, manual: true });
      }
    } catch (e) {
      setDshUpgradeResult({ ok: false, message: e.message || "\u5347\u7EA7\u8BF7\u6C42\u5931\u8D25", manual: true });
    } finally {
      setDshUpgrading(false);
    }
  }, [info?.dshLatest, dshUpgrading, rpcCall]);
  const links = h(
    "div",
    { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
    h("a", {
      href: GITHUB_URL,
      target: "_blank",
      rel: "noreferrer",
      style: s.btnLink
    }, h(Icons.github), "GitHub"),
    h("a", {
      href: RELEASES_URL,
      target: "_blank",
      rel: "noreferrer",
      style: s.btnLink
    }, "\u66F4\u65B0\u65E5\u5FD7"),
    h("a", {
      href: ISSUES_URL,
      target: "_blank",
      rel: "noreferrer",
      style: s.btnLink
    }, "\u53CD\u9988 Issue")
  );
  return h(
    "div",
    { style: { marginBottom: 16 } },
    // 顶部状态行：版本徽标 + 刷新按钮 + 链接组
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8
        }
      },
      // 左组：版本徽标 + DSH 版本 + 检查更新。
      // flexWrap + minWidth:0 是必需的：此前只写 display:flex，左组既不能收缩也不能换行，
      // 会把整行顶到 305px；手机设置页内容列只有 277px，溢出部分被
      // overflow-x:hidden 静默裁掉（「检查更新」按钮被切一半）。
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 } },
        // 版本状态徽标
        h(
          "span",
          {
            style: {
              ...s.tag,
              background: hasUpdate ? "var(--dsw-alias-state-info-bg,#eff6ff)" : isLatest ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              color: hasUpdate || isLatest ? "var(--dsw-alias-label-primary, #0f1115)" : "var(--dsw-alias-label-secondary,#6b7280)",
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            }
          },
          loading ? h("span", {
            style: { display: "inline-flex", alignItems: "center" }
          }, h(Icons.refresh)) : isLatest ? h(Icons.check) : null,
          info ? `v${info.current}` : "\u7248\u672C\u68C0\u67E5\u4E2D\u2026",
          isLatest && h("span", { style: { opacity: 0.85, fontSize: 11, fontWeight: 400 } }, "\xB7 \u5DF2\u662F\u6700\u65B0"),
          hasUpdate && h("span", { style: { fontWeight: 600, fontSize: 11 } }, `\u2794 v${info.latest}`),
          info?.error && h("span", { style: { color: "var(--dsw-alias-label-primary, #0f1115)", fontSize: 11 } }, "(\u7F51\u7EDC\u8D85\u65F6)")
        ),
        // DSH 宿主版本标签（有新版时黄色高亮）
        info?.dshVersion && h(
          "span",
          {
            style: {
              ...s.tag,
              background: dshHasUpdate ? "var(--dsw-alias-state-warn-bg,#fffbeb)" : "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              color: dshHasUpdate ? "var(--dsw-alias-label-primary, #0f1115)" : "var(--dsw-alias-label-tertiary,#6b7280)",
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 5
            },
            title: dshHasUpdate ? localeT("\u53D1\u73B0 DSH \u65B0\u7248\u672C v${version}", { version: info.dshLatest }) : void 0
          },
          h("span", { style: { opacity: 0.75, fontSize: 11, fontWeight: 400 } }, "DSH"),
          `v${info.dshVersion}`,
          dshHasUpdate && h("span", { style: { fontWeight: 600, fontSize: 11 } }, `\u2794 v${info.dshLatest}`)
        ),
        // 刷新检查按钮
        h(
          "button",
          {
            style: {
              ...s.btnGhost,
              height: 24,
              padding: "0 8px",
              fontSize: 11,
              opacity: loading ? 0.5 : 1,
              gap: 4,
              // 按钮是 inline-flex，文字会成为匿名 flex 项；被挤窄时会把「检查更新」
              // 折成两行。nowrap + flexShrink:0 保证它整体换行（由父级 flexWrap 负责）。
              whiteSpace: "nowrap",
              flexShrink: 0
            },
            onClick: check,
            disabled: loading || upgrading || restarting,
            title: "\u91CD\u65B0\u68C0\u67E5 npm \u7EBF\u4E0A\u7248\u672C"
          },
          h(Icons.refresh),
          loading ? "\u68C0\u67E5\u4E2D\u2026" : "\u68C0\u67E5\u66F4\u65B0"
        )
      ),
      links
    ),
    // 发现新版本高亮卡片（支持一键直接升级）
    hasUpdate && h(
      "div",
      {
        style: {
          ...s.card,
          background: "var(--dsw-alias-state-info-bg,#eff6ff)",
          border: "1px solid var(--dsw-alias-state-info-border,#bfdbfe)",
          padding: "14px 16px",
          marginTop: 10,
          marginBottom: 0
        }
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "flex-start", gap: 12 } },
        h("span", { style: { fontSize: 22 } }, "\u{1F680}"),
        h(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 } },
            h("div", {
              style: {
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dsw-alias-label-primary, #0f1115)"
              }
            }, localeT("\u53D1\u73B0\u65B0\u7248\u672C v${latest}\uFF08\u5F53\u524D v${current}\uFF09", { latest: info.latest, current: info.current })),
            h(
              "button",
              {
                style: {
                  ...s.btnPri,
                  height: 28,
                  fontSize: 12,
                  padding: "0 14px",
                  background: upgradeResult?.ok ? "#047857" : "var(--dsw-alias-brand-primary,#4f6ef7)",
                  color: upgradeResult?.ok ? "#ffffff" : "var(--dsw-alias-label-primary-foreground, #fff)",
                  opacity: upgrading || restarting ? 0.6 : 1
                },
                onClick: handleUpgrade,
                disabled: upgrading || restarting || upgradeResult?.ok
              },
              upgrading ? h(
                "span",
                { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
                h("span", { style: { animation: "spin 1s linear infinite", display: "inline-flex" } }, h(Icons.refresh)),
                "\u6B63\u5728\u81EA\u52A8\u5347\u7EA7\u2026"
              ) : upgradeResult?.ok ? "\u2713 \u5347\u7EA7\u5B8C\u6210" : localeT("\u4E00\u952E\u5347\u7EA7\u5230 v${version}", { version: info.latest })
            )
          ),
          // 简短更新内容 / Release Notes 亮点展示（issue #79 后续：旧格式一坨长文 → 归一成要点列表）
          releaseNoteLines.length > 0 && h(
            "div",
            {
              style: {
                fontSize: 12,
                color: "var(--dsw-alias-label-primary, #374151)",
                background: "var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.85))",
                border: "1px solid var(--dsw-alias-state-info-border, rgba(191, 219, 254, 0.8))",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 10,
                lineHeight: 1.6
              }
            },
            h("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary, #0f1115)", marginBottom: 4 } }, "\u2728 \u66F4\u65B0\u4EAE\u70B9\uFF1A"),
            h(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: 3 } },
              releaseNoteLines.map((line, index) => h(
                "div",
                {
                  key: index,
                  style: { display: "flex", gap: 6, alignItems: "flex-start" }
                },
                h("span", { style: { flexShrink: 0, color: "var(--dsw-alias-brand-primary,#4f6ef7)", lineHeight: "18px" } }, "\u2022"),
                h("span", { style: { flex: "1 1 auto", minWidth: 0 } }, line)
              ))
            )
          ),
          // 升级成功后：引导重启 DSH 操作卡片
          upgradeResult?.ok && !dismissRestart && h(
            "div",
            {
              style: {
                background: "var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.95))",
                border: "1px solid var(--dsw-alias-state-success-border, #a7f3d0)",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 10
              }
            },
            h(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
              h("span", { style: { fontSize: 16 } }, "\u2728"),
              h("span", {
                style: { fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary, #0f1115)" }
              }, localeT("\u5DF2\u6210\u529F\u5347\u7EA7\u5230 v${version}\uFF01\u9700\u8981\u91CD\u542F DSH \u670D\u52A1\u4F7F\u65B0\u7248\u672C\u751F\u6548", { version: info.latest }))
            ),
            !restarting && !restartStatus && h(
              "div",
              {
                style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }
              },
              h("button", {
                style: {
                  ...s.btnPri,
                  height: 30,
                  fontSize: 12,
                  padding: "0 14px",
                  background: "#047857",
                  color: "#ffffff"
                },
                onClick: handleRestart
              }, "\u{1F504} \u7ACB\u5373\u91CD\u542F DSH \u670D\u52A1"),
              h("button", {
                style: {
                  ...s.btnGhost,
                  height: 30,
                  fontSize: 12,
                  padding: "0 12px"
                },
                onClick: () => setDismissRestart(true)
              }, "\u7A0D\u540E\u624B\u52A8\u91CD\u542F")
            ),
            (restarting || restartStatus) && h(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: "var(--dsw-alias-label-primary, #0f1115)",
                  fontWeight: 500
                }
              },
              restartStatus?.phase !== "success" && restartStatus?.phase !== "timeout" && h("span", {
                style: { animation: "spin 1s linear infinite", display: "inline-flex" }
              }, h(Icons.refresh)),
              restartStatus?.text || "\u6B63\u5728\u5904\u7406\u2026"
            )
          ),
          // 失败提示
          upgradeResult && !upgradeResult.ok && h("div", {
            style: {
              background: "var(--dsw-alias-state-error-bg,#fef2f2)",
              border: "1px solid var(--dsw-alias-state-error-border,#fecaca)",
              color: "var(--dsw-alias-label-primary, #0f1115)",
              padding: "8px 12px",
              borderRadius: 6,
              fontSize: 12,
              marginBottom: 8,
              lineHeight: 1.5
            }
          }, upgradeResult.message),
          h(
            "div",
            { style: { marginTop: 4 } },
            h("button", {
              style: { ...s.btnLink, fontSize: 11, color: "var(--dsw-alias-label-secondary,#6b7280)" },
              onClick: () => setShowManual((v) => !v)
            }, showManual ? "\u25B4 \u6298\u53E0\u624B\u52A8\u547D\u4EE4\u884C" : "\u25BE \u67E5\u770B\u624B\u52A8\u5347\u7EA7\u547D\u4EE4 (\u5982\u9700)")
          ),
          showManual && h(
            "div",
            {
              style: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }
            },
            upgradeCommands(info.latest).map(
              ({ id, cmd }) => h(UpgradeCommandRow, { key: id, cmd })
            )
          )
        )
      )
    ),
    // ── DSH 宿主有新版本时的提示 / 一键升级卡片 ──
    dshHasUpdate && h(
      "div",
      {
        style: {
          ...s.card,
          background: "var(--dsw-alias-state-warn-bg,#fffbeb)",
          border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)",
          padding: "14px 16px",
          marginTop: 10,
          marginBottom: 0
        }
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "flex-start", gap: 12 } },
        h("span", { style: { fontSize: 22 } }, "\u{1F6E0}\uFE0F"),
        h(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 } },
            h("div", {
              style: { fontSize: 13, fontWeight: 600, color: "var(--dsw-alias-label-primary, #0f1115)" }
            }, localeT("DSH \u6709\u65B0\u7248\u672C v${latest}\uFF08\u5F53\u524D v${current}\uFF09", { latest: info.dshLatest, current: info.dshVersion })),
            info?.dshUpgradable ? h(
              "button",
              {
                style: {
                  ...s.btnPri,
                  height: 28,
                  fontSize: 12,
                  padding: "0 14px",
                  background: dshUpgradeResult?.ok ? "#047857" : "var(--dsw-alias-brand-primary,#4f6ef7)",
                  color: dshUpgradeResult?.ok ? "#ffffff" : "var(--dsw-alias-label-primary-foreground, #fff)",
                  opacity: dshUpgrading || restarting ? 0.6 : 1
                },
                onClick: handleUpgradeDsh,
                disabled: dshUpgrading || restarting || dshUpgradeResult?.ok
              },
              dshUpgrading ? h(
                "span",
                { style: { display: "inline-flex", alignItems: "center", gap: 6 } },
                h("span", { style: { animation: "spin 1s linear infinite", display: "inline-flex" } }, h(Icons.refresh)),
                "\u6B63\u5728\u5347\u7EA7 DSH\u2026"
              ) : dshUpgradeResult?.ok ? "\u2713 DSH \u5347\u7EA7\u5B8C\u6210" : localeT("\u4E00\u952E\u5347\u7EA7 DSH \u5230 v${version}", { version: info.dshLatest })
            ) : h("a", {
              href: GITHUB_URL,
              target: "_blank",
              rel: "noreferrer",
              style: { ...s.btnLink, fontSize: 12, fontWeight: 600 }
            }, "\u67E5\u770B\u5B98\u65B9\u5347\u7EA7\u65B9\u5F0F \u2197")
          ),
          h(
            "div",
            {
              style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.6 }
            },
            info?.dshUpgradable ? "\u5347\u7EA7 DSH \u547D\u4EE4\u884C\u5DE5\u5177\u540E\u9700\u91CD\u542F DSH \u670D\u52A1\u751F\u6548\u3002" : info?.dshUpgradeReason || "\u5F53\u524D DSH \u975E npm \u5168\u5C40\u5B89\u88C5\uFF0C\u65E0\u6CD5\u4E00\u952E\u81EA\u52A8\u5347\u7EA7\uFF0C\u8BF7\u6309\u5B98\u65B9\u6E20\u9053\u624B\u52A8\u66F4\u65B0\u3002"
          ),
          dshUpgradeResult && h("div", {
            style: {
              marginTop: 10,
              fontSize: 12,
              lineHeight: 1.6,
              color: "var(--dsw-alias-label-primary, #0f1115)"
            }
          }, dshUpgradeResult.message),
          dshUpgradeResult?.ok && !dismissRestart && h(
            "div",
            {
              style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }
            },
            h("button", {
              style: { ...s.btnPri, height: 30, fontSize: 12, padding: "0 14px", background: "#047857", color: "#ffffff" },
              onClick: handleRestart
            }, "\u{1F504} \u7ACB\u5373\u91CD\u542F DSH \u670D\u52A1"),
            h("button", {
              style: { ...s.btnGhost, height: 30, fontSize: 12, padding: "0 12px" },
              onClick: () => setDismissRestart(true)
            }, "\u7A0D\u540E\u624B\u52A8\u91CD\u542F")
          ),
          (restarting || restartStatus) && h(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                marginTop: 8,
                color: "var(--dsw-alias-label-primary, #0f1115)",
                fontWeight: 500
              }
            },
            restartStatus?.phase !== "success" && restartStatus?.phase !== "timeout" && h("span", {
              style: { animation: "spin 1s linear infinite", display: "inline-flex" }
            }, h(Icons.refresh)),
            restartStatus?.text || "\u6B63\u5728\u5904\u7406\u2026"
          )
        )
      )
    )
  );
}
var TABS = [
  { id: "lan", label: "\u5C40\u57DF\u7F51", icon: Icons.lan },
  { id: "tunnel", label: "\u516C\u7F51\u96A7\u9053", icon: Icons.tunnel },
  { id: "im", label: "IM \u673A\u5668\u4EBA", icon: Icons.bot },
  { id: "security", label: "\u5B89\u5168\u8BA4\u8BC1", icon: Icons.security },
  { id: "ops", label: "\u8FD0\u7EF4\u76D1\u63A7", icon: Icons.ops }
];
function TabBar({ active, onChange, dots }) {
  const scrollRef = React.useRef(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return void 0;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft > 1;
      const right = max > 1 && el.scrollLeft < max - 1;
      setEdges((prev) => prev.left === left && prev.right === right ? prev : { left, right });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    let observer = null;
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(update);
      observer.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", update);
      if (observer) observer.disconnect();
    };
  }, []);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = el.querySelector('[data-dsh-tab-active="true"]');
    if (!target) return;
    const elRect = el.getBoundingClientRect();
    const tabRect = target.getBoundingClientRect();
    if (tabRect.left < elRect.left) el.scrollLeft -= elRect.left - tabRect.left + 8;
    else if (tabRect.right > elRect.right) el.scrollLeft += tabRect.right - elRect.right + 8;
  }, [active]);
  const maskStops = [];
  if (edges.left) maskStops.push("transparent 0px", "#000 20px");
  else maskStops.push("#000 0px");
  if (edges.right) maskStops.push("#000 calc(100% - 20px)", "transparent 100%");
  else maskStops.push("#000 100%");
  const maskImage = `linear-gradient(to right, ${maskStops.join(", ")})`;
  return h(
    "div",
    {
      ref: scrollRef,
      className: "dsh-tabbar-container",
      style: {
        display: "flex",
        gap: 4,
        marginBottom: 20,
        borderBottom: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        maxWidth: "100%",
        flexWrap: "nowrap",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitMaskImage: maskImage,
        maskImage
      }
    },
    TABS.map(({ id, label, icon: TabIcon }) => {
      const isActive = active === id;
      const hasDot = dots?.[id];
      return h(
        "button",
        {
          key: id,
          "data-dsh-tab-active": isActive ? "true" : void 0,
          onClick: () => onChange(id),
          style: {
            font: "inherit",
            cursor: "pointer",
            border: "none",
            background: "none",
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-secondary,#6b7280)",
            borderBottom: isActive ? "2px solid var(--dsw-alias-brand-primary,#4f6ef7)" : "2px solid transparent",
            marginBottom: -1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "color .15s, border-color .15s",
            whiteSpace: "nowrap",
            flexShrink: 0
          }
        },
        TabIcon && h(TabIcon, {
          style: {
            color: isActive ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-label-tertiary,#9ca3af)",
            width: 16,
            height: 16,
            flexShrink: 0
          }
        }),
        label,
        hasDot && h("span", {
          style: {
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--dsw-alias-state-success-primary,#10b981)",
            flexShrink: 0
          }
        })
      );
    })
  );
}
function BridgePanel({ rpcCall, preferredTab }) {
  const [status, setStatus] = React.useState(null);
  const [err, setErr] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState(preferredTab || "lan");
  React.useEffect(() => {
    if (preferredTab) setActiveTab(preferredTab);
  }, [preferredTab]);
  const [platforms, setPlatforms] = React.useState(null);
  const [platformsError, setPlatformsError] = React.useState(null);
  const [platformsSeq, setPlatformsSeq] = React.useState(0);
  const [selectedPlatform, setSelectedPlatform] = React.useState("feishu");
  const [addingAccount, setAddingAccount] = React.useState(false);
  const [accountsError, setAccountsError] = React.useState(null);
  const [recentAccountId, setRecentAccountId] = React.useState(null);
  React.useEffect(() => {
    if (!recentAccountId) return;
    const t2 = setTimeout(() => setRecentAccountId(null), 4e3);
    return () => clearTimeout(t2);
  }, [recentAccountId]);
  React.useEffect(() => {
    setAccountsError(null);
  }, [selectedPlatform]);
  const [copiedUrl, setCopiedUrl] = React.useState("");
  const copyEntryUrl = React.useCallback((url) => {
    const done = () => {
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(""), 2e3);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => done());
    } else {
      done();
    }
  }, []);
  const isLocalhost = typeof window === "undefined" || (!window.location.hostname || window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost" || window.location.hostname === "::1" || window.location.hostname === "" || window.location.protocol === "file:" || window.location.protocol === "vscode-webview:" || window.location.protocol === "app:" || // 官方 Desktop 使用 dsh-app://app/；漏判会使 IM 轮询在首次请求前被暂停。
  window.location.protocol === "dsh-app:" && window.location.hostname === "app" || window.location.hostname.endsWith(".local"));
  const [adminUnlocked, setAdminUnlocked] = React.useState(false);
  const [unlockPassword, setUnlockPassword] = React.useState("");
  const [unlockErr, setUnlockErr] = React.useState(null);
  const [tokenHint, setTokenHint] = React.useState(false);
  const [unlocking, setUnlocking] = React.useState(false);
  const [showForgotGuide, setShowForgotGuide] = React.useState(false);
  const [showUnlockModal, setShowUnlockModal] = React.useState(false);
  const fetchLoopbackToken = React.useCallback(async () => {
    if (!isLocalhost) return null;
    const token = await fetchLoopbackTokenOnce();
    if (token) {
      setAdminUnlocked(true);
    }
    return token;
  }, [isLocalhost]);
  React.useEffect(() => {
    if (isLocalhost && !adminUnlocked) {
      fetchLoopbackToken();
    }
  }, [isLocalhost, adminUnlocked, fetchLoopbackToken]);
  const handleAccessSessionExpired = React.useCallback(() => {
    setAdminUnlocked(false);
    clearAdminToken();
    const reloaded = reloadToLoginPage();
    if (!reloaded) {
      setErr("\u8BBF\u95EE\u4F1A\u8BDD\u5DF2\u5931\u6548\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u91CD\u65B0\u767B\u5F55");
    }
  }, []);
  const authRpcCall = React.useCallback(async (endpoint, payload = {}, signal) => {
    let token = getAdminToken();
    if (isLocalhost && !token) {
      token = await fetchLoopbackToken();
      if (!token) setTokenHint(true);
      else setTokenHint(false);
    }
    const enriched = {
      ...payload,
      ...token ? { adminToken: token } : {},
      ...isLocalhost ? { isLocalhost: true } : {}
    };
    let res;
    try {
      res = await rpcCall(endpoint, enriched, signal);
    } catch (e) {
      if (isAccessSessionFailure(e)) {
        handleAccessSessionExpired();
      }
      throw e;
    }
    if (res?.ok === false) {
      const msg = res?.error?.message || "";
      if (msg.includes("\u7BA1\u7406\u5458\u6743\u9650") || msg.includes("\u7BA1\u7406\u5BC6\u7801\u89E3\u9501")) {
        queuePendingOperation(async () => {
          let fresh = getAdminToken();
          if (!fresh && isLocalhost) fresh = await fetchLoopbackToken();
          if (!fresh) return;
          const retry = await rpcCall(endpoint, { ...payload, adminToken: fresh, ...isLocalhost ? { isLocalhost: true } : {} }, signal);
          if (retry?.ok) {
            setStatus(retry.value);
            setErr(null);
          }
        });
        setUnlockErr(msg);
        setShowUnlockModal(true);
      }
    }
    return res;
  }, [rpcCall, isLocalhost, fetchLoopbackToken, handleAccessSessionExpired]);
  const handleUnlockAdmin = React.useCallback(async (e) => {
    e?.preventDefault?.();
    setUnlocking(true);
    setUnlockErr(null);
    const res = await unlockAdmin(rpcCall, unlockPassword);
    if (res.ok) {
      setAdminUnlocked(true);
      setUnlockPassword("");
      setShowUnlockModal(false);
      setErr(null);
    } else {
      setUnlockErr(res.error);
    }
    setUnlocking(false);
  }, [rpcCall, unlockPassword]);
  const handleLockAdmin = React.useCallback(async () => {
    try {
      const t2 = getAdminToken();
      if (t2) {
        await rpcCall(BRIDGE_ENDPOINTS.authAdminLock, { adminToken: t2 });
      }
    } catch {
    }
    clearAdminToken();
    setAdminUnlocked(false);
  }, [rpcCall]);
  const loadInFlightRef = React.useRef(false);
  const loadSeqRef = React.useRef(0);
  const load = React.useCallback(async (quiet = false) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    const currentSeq = ++loadSeqRef.current;
    try {
      const r = await authRpcCall(BRIDGE_ENDPOINTS.getStatus, {});
      if (currentSeq !== loadSeqRef.current) return;
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setStatus(r.value);
      if (!quiet) setErr(null);
      clearAccessExpiredFlag();
    } catch (e) {
      if (currentSeq === loadSeqRef.current) {
        if (isAccessSessionFailure(e)) {
          handleAccessSessionExpired();
        } else {
          setErr(e.message);
        }
      }
    } finally {
      loadInFlightRef.current = false;
    }
  }, [authRpcCall, handleAccessSessionExpired]);
  const pollPlatformsSeqRef = React.useRef(0);
  React.useEffect(() => {
    let alive = true;
    let inFlight = false;
    const poll = async () => {
      if (inFlight || !alive) return;
      inFlight = true;
      const currentSeq = ++pollPlatformsSeqRef.current;
      try {
        const r = await authRpcCall(BRIDGE_ENDPOINTS.listPlatforms, {});
        if (!alive || currentSeq !== pollPlatformsSeqRef.current) return;
        if (r?.ok) {
          setPlatforms(r.value ?? {});
          setPlatformsError(null);
        } else {
          const msg = r?.error?.message ?? r?.message ?? "listPlatforms \u67E5\u8BE2\u5931\u8D25";
          setPlatformsError(msg);
          try {
            console.warn("[dsh-bridge] listPlatforms failed:", msg);
          } catch {
          }
        }
      } catch (e) {
        if (alive && currentSeq === pollPlatformsSeqRef.current) {
          const msg = e?.message ?? String(e);
          setPlatformsError(msg);
          try {
            console.warn("[dsh-bridge] listPlatforms RPC error:", msg);
          } catch {
          }
        }
      } finally {
        inFlight = false;
      }
    };
    if (!adminUnlocked && !isLocalhost) return;
    poll();
    const t2 = setInterval(poll, 4e3);
    return () => {
      alive = false;
      clearInterval(t2);
    };
  }, [authRpcCall, adminUnlocked, isLocalhost, platformsSeq]);
  React.useEffect(() => {
    load();
    if (!adminUnlocked && !isLocalhost) return;
    const t2 = setInterval(() => load(true), 3e3);
    return () => clearInterval(t2);
  }, [load, adminUnlocked, isLocalhost]);
  const tunnelGate = needsTunnelPassword(status?.auth);
  const refreshPlatforms = React.useCallback(() => setPlatformsSeq((seq) => seq + 1), []);
  const addPlatformAccount = React.useCallback(async () => {
    if (addingAccount) return;
    setAddingAccount(true);
    setAccountsError(null);
    try {
      const r = await authRpcCall(BRIDGE_ENDPOINTS.platformAddAccount, { platformId: selectedPlatform });
      if (!r?.ok) throw new Error(r?.error?.message ?? "\u6DFB\u52A0\u8D26\u53F7\u5931\u8D25");
      const addedInstanceId = r.value?.instanceId ?? null;
      refreshPlatforms();
      if (addedInstanceId) setRecentAccountId(addedInstanceId);
    } catch (e) {
      setAccountsError(e.message);
    } finally {
      setAddingAccount(false);
    }
  }, [addingAccount, authRpcCall, selectedPlatform, refreshPlatforms]);
  const removePlatformAccountLocally = React.useCallback((removedInstanceId) => {
    setPlatforms((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (Object.hasOwn(next, removedInstanceId)) delete next[removedInstanceId];
      for (const [key, value] of Object.entries(next)) {
        if (value && value.instanceId === removedInstanceId) delete next[key];
      }
      return next;
    });
    refreshPlatforms();
  }, [refreshPlatforms]);
  const act = React.useCallback(async (endpoint, payload) => {
    try {
      const r = await authRpcCall(endpoint, payload ?? {});
      if (!r?.ok) throw new Error(r?.error?.message ?? "RPC failed");
      setStatus(r.value);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, [authRpcCall]);
  const onStartCloudflared = React.useCallback(() => {
    if (tunnelGate) {
      setErr(TUNNEL_PASSWORD_TEXT);
      return;
    }
    return act(BRIDGE_ENDPOINTS.startCloudflared);
  }, [act, tunnelGate]);
  const onStopCloudflared = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCloudflared), [act]);
  const onResetCloudflared = React.useCallback(() => {
    if (tunnelGate) {
      setErr(TUNNEL_PASSWORD_TEXT);
      return;
    }
    return act(BRIDGE_ENDPOINTS.stopCloudflared).then(() => act(BRIDGE_ENDPOINTS.startCloudflared));
  }, [act, tunnelGate]);
  const onToggleCloudflaredAutoStart = React.useCallback((autoStart) => {
    if (tunnelGate) {
      setErr(TUNNEL_PASSWORD_TEXT);
      return;
    }
    return act(BRIDGE_ENDPOINTS.setTunnelAutoStart, { tunnel: "cloudflared", autoStart });
  }, [act, tunnelGate]);
  const saveCloudflaredConfig = React.useCallback((patch) => {
    if (tunnelGate) {
      setErr(TUNNEL_PASSWORD_TEXT);
      return;
    }
    return act(BRIDGE_ENDPOINTS.saveCloudflaredConfig, patch || {});
  }, [act, tunnelGate]);
  const onSelectLanIp = React.useCallback((ip) => act(BRIDGE_ENDPOINTS.setLanIp, { ip }), [act]);
  const onStartCustom = React.useCallback(() => {
    if (tunnelGate) {
      setErr(TUNNEL_PASSWORD_TEXT);
      return;
    }
    return act(BRIDGE_ENDPOINTS.startCustomTunnel);
  }, [act, tunnelGate]);
  const onStopCustom = React.useCallback(() => act(BRIDGE_ENDPOINTS.stopCustomTunnel), [act]);
  const onToggleCustomAutoStart = React.useCallback((autoStart) => {
    if (tunnelGate) {
      setErr(TUNNEL_PASSWORD_TEXT);
      return;
    }
    return act(BRIDGE_ENDPOINTS.setTunnelAutoStart, { tunnel: "customTunnel", autoStart });
  }, [act, tunnelGate]);
  const saveConfig = React.useCallback((serverUrl, accessToken) => {
    if (tunnelGate) {
      setErr(TUNNEL_PASSWORD_TEXT);
      return;
    }
    return act(BRIDGE_ENDPOINTS.saveCustomTunnelConfig, { serverUrl, accessToken });
  }, [act, tunnelGate]);
  const saveExternalTunnel = React.useCallback((url) => {
    if (tunnelGate) {
      setErr(TUNNEL_PASSWORD_TEXT);
      return;
    }
    return act(BRIDGE_ENDPOINTS.saveExternalTunnel, { url });
  }, [act, tunnelGate]);
  const navSecurity = React.useCallback(() => setActiveTab("security"), []);
  const cfNetwork = React.useMemo(() => ({
    protocol: status?.cloudflared?.protocol || "",
    edgeIpVersion: status?.cloudflared?.edgeIpVersion || "",
    region: status?.cloudflared?.region || ""
  }), [
    status?.cloudflared?.protocol,
    status?.cloudflared?.edgeIpVersion,
    status?.cloudflared?.region
  ]);
  if (!status && !err) {
    return h("div", {
      style: { padding: 32, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontSize: 13 }
    }, "\u52A0\u8F7D\u4E2D\u2026");
  }
  const ct = status?.customTunnel;
  const imConnected = platforms && Object.values(platforms).some(
    (p) => p.status === "connected" || p.status === "starting" || p.status === "reconnecting"
  );
  const dots = {
    lan: !!status?.proxy?.running,
    tunnel: !!(status?.cloudflared?.running || ct?.running),
    im: !!imConnected,
    security: !!status?.auth?.enabled
  };
  let tabContent;
  if (activeTab === "lan") {
    tabContent = h(
      TunnelCard,
      {
        title: "\u5C40\u57DF\u7F51\u8BBF\u95EE",
        desc: "\u540C\u4E00 Wi-Fi \u4E0B\u7684\u8BBE\u5907\u53EF\u76F4\u63A5\u626B\u7801\u8BBF\u95EE",
        data: { running: status?.proxy?.running, url: status?.lan?.url, qr: status?.lan?.qr },
        auth: status?.auth,
        onNavigateSecurity: navSecurity
      },
      h(LanNetworkSelector, {
        lan: status?.lan,
        onSelectIp: onSelectLanIp
      })
    );
  } else if (activeTab === "tunnel") {
    const ext = status?.externalTunnel;
    const cf = status?.cloudflared;
    const cfDesc = cf?.tokenConfigured ? "\u56FA\u5B9A\u57DF\u540D\u6A21\u5F0F" : "\u514D\u767B\u5F55\u4E34\u65F6\u57DF\u540D";
    const entries = [
      ct && ct.running && {
        key: "custom",
        title: "\u81EA\u5EFA\u96A7\u9053",
        desc: "VPS \u81EA\u5EFA \xB7 \u56FA\u5B9A\u5730\u5740",
        url: ct.url || null,
        qr: ct.qr,
        running: true,
        phase: ct.state && ct.state.phase,
        stateDetail: ct.state && ct.state.detail,
        autoStart: ct.autoStart,
        onToggleAutoStart: onToggleCustomAutoStart,
        onStart: onStartCustom,
        onStop: onStopCustom
      },
      cf && cf.running && {
        key: "cloudflared",
        title: "Cloudflare \u96A7\u9053",
        desc: cfDesc,
        url: cf.url || null,
        qr: cf.qr,
        running: true,
        phase: cf.state && cf.state.phase,
        stateDetail: cf.state && cf.state.detail,
        autoStart: cf.autoStart,
        onToggleAutoStart: onToggleCloudflaredAutoStart,
        onStart: onStartCloudflared,
        onStop: onStopCloudflared,
        onReset: onResetCloudflared
      },
      ext && ext.configured && ext.url && {
        key: "external",
        title: "\u5916\u90E8\u5DF2\u90E8\u7F72\u96A7\u9053",
        desc: "\u81EA\u884C\u90E8\u7F72\u767B\u8BB0",
        url: ext.url,
        qr: ext.qr,
        running: true
      }
    ].filter(Boolean);
    const primary = entries[0] || null;
    const otherCount = primary ? entries.length - 1 : entries.length;
    tabContent = h(
      React.Fragment,
      null,
      tunnelGate && h(TunnelPasswordNotice, { onNavigateSecurity: navSecurity }),
      h(TunnelEntryCard, {
        entry: primary,
        onCopy: copyEntryUrl,
        copied: Boolean(copiedUrl && primary && copiedUrl === primary.url),
        autoStart: primary ? primary.autoStart : void 0,
        onToggleAutoStart: primary ? primary.onToggleAutoStart : void 0,
        onStart: primary ? primary.onStart : cf ? onStartCloudflared : null,
        onStop: primary ? primary.onStop : void 0,
        onReset: primary ? primary.onReset : void 0
      }),
      otherCount > 0 && h("div", {
        style: { ...s.muted, fontSize: 11, marginBottom: 8, textAlign: "center" }
      }, localeT("\u53E6\u6709 ${count} \u4E2A\u96A7\u9053\u5165\u53E3\u5728\u8FD0\u884C\uFF0C\u53EF\u5728\u4E0B\u65B9\u300C\u96A7\u9053\u914D\u7F6E\u300D\u4E2D\u67E5\u770B\u4E0E\u7BA1\u7406", { count: otherCount })),
      h(
        TunnelConfigGroup,
        null,
        h(
          TunnelCard,
          {
            title: "Cloudflare \u96A7\u9053",
            desc: cf && cf.tokenConfigured ? "\u56FA\u5B9A\u57DF\u540D\u6A21\u5F0F\uFF08Token \u8FD0\u884C \xB7 \u91CD\u542F URL \u4FDD\u6301\u4E0D\u53D8\uFF09" : "\u4E00\u952E\u83B7\u53D6\u516C\u7F51\u5730\u5740\uFF08\u514D\u767B\u5F55\u4E34\u65F6\u968F\u673A\u57DF\u540D\uFF09",
            data: {
              running: cf && cf.running,
              url: cf && cf.url,
              qr: cf && cf.qr,
              state: cf && cf.state
            },
            autoStart: cf && cf.autoStart,
            onToggleAutoStart: onToggleCloudflaredAutoStart,
            auth: status && status.auth,
            onNavigateSecurity: navSecurity,
            onStart: onStartCloudflared,
            onStop: onStopCloudflared,
            onReset: cf && cf.running ? onResetCloudflared : null
          },
          h(CloudflareDiagnostics, {
            dataPlane: cf && cf.dataPlane,
            binary: cf && cf.binary,
            foreignRunner: cf && cf.foreignRunner
          }),
          h(CloudflareConfigForm, {
            token: cf && cf.token || "",
            hostname: cf && cf.hostname || "",
            // issue #83：用 useMemo 稳定后的引用，禁止在此处再写字面量对象
            network: cf ? cfNetwork : void 0,
            onSave: saveCloudflaredConfig
          })
        ),
        h(
          TunnelCard,
          {
            title: "\u81EA\u5EFA\u96A7\u9053",
            desc: "\u8FDE\u63A5\u81EA\u5DF1\u90E8\u7F72\u7684\u96A7\u9053\u670D\u52A1\u5668\uFF0C\u83B7\u5F97\u56FA\u5B9A\u57DF\u540D",
            data: {
              configured: ct && ct.configured,
              running: ct && ct.running,
              url: ct && ct.url,
              qr: ct && ct.qr,
              state: ct && ct.state
            },
            autoStart: ct && ct.autoStart,
            onToggleAutoStart: onToggleCustomAutoStart,
            auth: status && status.auth,
            onNavigateSecurity: navSecurity,
            onStart: onStartCustom,
            onStop: onStopCustom
          },
          h(CustomTunnelGuide),
          h(CustomTunnelConfigForm, {
            serverUrl: ct && ct.serverUrl || "",
            accessToken: ct && ct.accessToken || "",
            onSave: saveConfig
          })
        ),
        h(ExternalTunnelCard, {
          ext,
          onSave: saveExternalTunnel
        })
      )
    );
  } else if (activeTab === "security") {
    tabContent = h(AccessAuthCard, {
      auth: status?.auth,
      rpcCall: authRpcCall,
      onUpdate: () => load(true)
    });
  } else if (activeTab === "ops") {
    tabContent = h(
      React.Fragment,
      null,
      h(SystemMetricsWidget, { metrics: status?.system }),
      h(PageTweaksCard, { status, rpcCall: authRpcCall }),
      h(RemoteWorkspaceCard, { rpcCall: authRpcCall }),
      h(NetworkDiagnosticWidget, { rpcCall: authRpcCall }),
      h(BackupRestoreWidget, {
        rpcCall: authRpcCall,
        onUpdate: () => load(true)
      }),
      h(RestartDshCard, { rpcCall: authRpcCall })
    );
  } else if (activeTab === "im") {
    const IM_PLATFORMS = [
      { id: "qq", label: "QQ", icon: Icons.qq, brandColor: "#12B7F5", desc: "\u626B\u7801\u4E00\u952E\u7ED1\u5B9A \xB7 \u5B98\u65B9 SDK \xB7 \u79C1\u804A/\u7FA4\u804A/\u6309\u94AE", recommended: true },
      { id: "feishu", label: "\u98DE\u4E66", icon: Icons.feishu, brandColor: "#00D6B9", desc: "\u626B\u7801\u4E00\u952E\u521B\u5EFA \xB7 \u659C\u6760\u6307\u4EE4 \xB7 \u6587\u6863\u8BC4\u8BBA" },
      { id: "wechat", label: "\u5FAE\u4FE1", icon: Icons.wechat, brandColor: "#07C160", desc: "ClawBot \u626B\u7801\u76F4\u8FDE \xB7 \u65E0\u9700\u516C\u7F51" },
      { id: "telegram", label: "Telegram", icon: Icons.telegram, brandColor: "#24A1DE", desc: "\u5B98\u65B9 Bot API" }
    ];
    const RecommendedTag = () => h("span", {
      style: {
        fontSize: 10,
        lineHeight: "16px",
        padding: "0 6px",
        borderRadius: 8,
        border: "1px solid var(--dsw-alias-brand-primary,#4f6ef7)",
        color: "var(--dsw-alias-brand-primary,#4f6ef7)",
        background: "var(--dsw-alias-state-info-bg,#eff6ff)",
        fontWeight: 600,
        flexShrink: 0
      }
    }, "\u63A8\u8350");
    const platformsLoaded = platforms !== null && !platformsError;
    const selectedMeta = IM_PLATFORMS.find((p) => p.id === selectedPlatform);
    const selectedLabel = selectedMeta?.label ?? selectedPlatform;
    const accounts = platformAccountsOf(platforms, selectedPlatform);
    const atAccountLimit = accounts.length >= PLATFORM_ACCOUNT_LIMIT;
    const renderAddAccountButton = ({ primary = false } = {}) => h("button", {
      style: { ...primary ? s.btnPri : s.btnGhost, opacity: addingAccount || atAccountLimit ? 0.5 : 1, whiteSpace: "nowrap" },
      onClick: addPlatformAccount,
      disabled: addingAccount || atAccountLimit,
      title: atAccountLimit ? localeT("\u6BCF\u4E2A\u5E73\u53F0\u6700\u591A ${limit} \u4E2A\u8D26\u53F7", { limit: PLATFORM_ACCOUNT_LIMIT }) : localeT("\u6DFB\u52A0\u4E00\u4E2A\u65B0\u8D26\u53F7\uFF08\u540C\u4E00\u5E73\u53F0\u53EF\u63A5\u5165\u591A\u4E2A\u8D26\u53F7\uFF09")
    }, addingAccount ? "\u6DFB\u52A0\u4E2D\u2026" : "\uFF0B \u6DFB\u52A0\u8D26\u53F7");
    tabContent = h(
      "div",
      null,
      // #55：清单查询失败时显错 + 重试，不再静默画成“即将支持”
      platformsError && h(
        "div",
        {
          style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dsw-alias-state-danger-primary,#f87171)", background: "var(--dsw-alias-state-danger-bg,#fef2f2)", fontSize: 12 }
        },
        h("span", { style: { flex: 1 } }, localeT("\u5E73\u53F0\u6E05\u5355\u52A0\u8F7D\u5931\u8D25\uFF1A${reason}", { reason: localeT(platformsError) })),
        h("button", {
          onClick: () => {
            setPlatformsError(null);
            setPlatformsSeq((s2) => s2 + 1);
          },
          style: { cursor: "pointer", borderRadius: 6, padding: "4px 12px" }
        }, "\u91CD\u8BD5")
      ),
      // 平台类型选择器：四个类型恒可点击（0 账号也必须能进入空状态添加第一个账号；
      // 不能按「至少一个实例」置灰，否则删光账号后永远回不来）。点击后进入该类型账号列表。
      h(
        "div",
        {
          style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }
        },
        IM_PLATFORMS.map(({ id, label, icon: IconComponent, brandColor, desc, recommended }) => {
          const typeAccounts = platformAccountsOf(platforms, id);
          const active = typeAccounts.some(({ status: status2 }) => isPlatformStatusActive(status2?.status));
          return h(
            "div",
            {
              key: id,
              style: {
                flex: "1 1 135px",
                border: `1px solid ${selectedPlatform === id ? "var(--dsw-alias-brand-primary,#4f6ef7)" : active ? "var(--dsw-alias-state-success-primary,#10b981)" : "var(--dsw-alias-border-l2,#e5e7eb)"}`,
                borderRadius: 10,
                padding: "12px 14px",
                cursor: "pointer",
                background: selectedPlatform === id ? "var(--dsw-alias-state-info-bg,#eff6ff)" : active ? "var(--dsw-alias-state-success-bg,#ecfdf5)" : "var(--dsw-alias-bg-layer-2,#f9fafb)",
                boxShadow: selectedPlatform === id ? "0 0 0 1px var(--dsw-alias-brand-primary,#4f6ef7)" : "none",
                transition: "all 0.15s ease"
              },
              onClick: () => setSelectedPlatform(id)
            },
            h(
              "div",
              { style: { ...s.label, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" } },
              h(
                "span",
                { style: { display: "flex", alignItems: "center", gap: 7, minWidth: 0 } },
                IconComponent && h(IconComponent, { style: { color: brandColor, width: 18, height: 18, flexShrink: 0 } }),
                label,
                recommended && h(RecommendedTag)
              ),
              active && h("span", {
                style: { width: 6, height: 6, borderRadius: "50%", background: "var(--dsw-alias-state-success-primary,#10b981)", flexShrink: 0 }
              }),
              platformsError && h("span", {
                style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontWeight: 400 }
              }, "\u6570\u636E\u7F3A\u5931"),
              !platformsError && platforms === null && h("span", {
                style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontWeight: 400 }
              }, "\u52A0\u8F7D\u4E2D\u2026"),
              !platformsError && platformsLoaded && typeAccounts.length === 0 && h("span", {
                style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#9ca3af)", fontWeight: 400 }
              }, "\u672A\u6DFB\u52A0\u8D26\u53F7"),
              !active && !platformsError && platformsLoaded && typeAccounts.length > 0 && h("span", {
                style: { fontSize: 11, color: "var(--dsw-alias-label-tertiary,#6b7280)", fontWeight: 400 }
              }, "\u672A\u8FDE\u63A5")
            ),
            h("div", { style: { ...s.muted, marginTop: 4, fontSize: 11 } }, desc),
            typeAccounts.length > 1 && h("div", {
              style: { marginTop: 6, fontSize: 11, color: "var(--dsw-alias-brand-primary,#4f6ef7)", fontWeight: 500 }
            }, localeT("${count} \u4E2A\u8D26\u53F7", { count: typeAccounts.length }))
          );
        })
      ),
      // 选中类型的账号列表：每个账号一张完整卡片；0 账号显示空状态
      platformsLoaded && h(
        "div",
        null,
        accounts.length > 0 && h(
          "div",
          { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" } },
          h("div", { style: { ...s.muted } }, localeT("\u8D26\u53F7\u5217\u8868\uFF08${count} \u4E2A\uFF09", { count: accounts.length })),
          renderAddAccountButton()
        ),
        // 服务端错误（添加失败 / 上限 / 查重等）原样展示，不吞
        accountsError && h("div", { style: { ...s.err, marginBottom: 12 } }, accountsError),
        atAccountLimit && h(
          "div",
          { style: { ...s.muted, marginBottom: 10 } },
          localeT("\u5DF2\u8FBE\u5355\u5E73\u53F0\u8D26\u53F7\u4E0A\u9650\uFF08\u6700\u591A ${limit} \u4E2A\uFF09", { limit: PLATFORM_ACCOUNT_LIMIT })
        ),
        accounts.length === 0 ? h(
          "div",
          {
            style: { ...s.card, textAlign: "center", padding: "28px 20px" }
          },
          h("div", { style: { fontSize: 30, lineHeight: "38px", marginBottom: 8 } }, "\u2795"),
          h(
            "div",
            { style: { ...s.label, fontSize: 14, fontWeight: 600 } },
            localeT("\u8FD8\u6CA1\u6709\u6DFB\u52A0\u300C${name}\u300D\u8D26\u53F7", { name: localeT(selectedLabel) })
          ),
          h(
            "div",
            { style: { ...s.muted, marginTop: 6, marginBottom: 14, lineHeight: 1.6 } },
            localeT("\u6DFB\u52A0\u8D26\u53F7\u540E\u53EF\u586B\u5199\u8BE5\u8D26\u53F7\u7684\u51ED\u8BC1\u5E76\u72EC\u7ACB\u8FDE\u63A5\uFF1B\u540C\u4E00\u5E73\u53F0\u652F\u6301\u540C\u65F6\u63A5\u5165\u591A\u4E2A\u8D26\u53F7\uFF0C\u51ED\u8BC1\u3001\u767D\u540D\u5355\u4E0E\u4F1A\u8BDD\u5F52\u5C5E\u4E92\u4E0D\u5F71\u54CD\u3002")
          ),
          renderAddAccountButton({ primary: true })
        ) : accounts.map(({ instanceId, status: status2 }, index) => h(PlatformCard, {
          // key 用 instanceId：切换类型 / 账号增删时保证每张卡片状态跟随账号，不串号
          key: instanceId,
          instanceId,
          displayName: accountDisplayName(status2, selectedLabel, index + 1),
          accountIndex: index + 1,
          accountCount: accounts.length,
          highlight: recentAccountId === instanceId,
          platformRecommended: selectedMeta?.recommended === true,
          platformId: selectedPlatform,
          platformName: selectedLabel,
          platformDesc: selectedMeta?.desc ?? "",
          rpcCall: authRpcCall,
          onAccountRemoved: removePlatformAccountLocally,
          onAccountRenamed: refreshPlatforms
        }))
      ),
      // 清单还没回来时给个明确的加载态（不是“数据缺失”）
      platforms === null && !platformsError && h("div", { style: { ...s.muted, padding: "12px 2px" } }, "\u52A0\u8F7D\u4E2D\u2026")
    );
  }
  const auth = status?.auth;
  const policy = auth?.adminPolicy ?? "password_unlock";
  const hasAnyPassword2 = !!(auth?.hasPassword || auth?.hasAdminPassword);
  const unlockUsesAdmin = !!auth?.hasAdminPassword;
  const unlockPwdKind = unlockUsesAdmin ? localeT("\u7BA1\u7406\u5BC6\u7801") : localeT("\u8BBF\u95EE\u5BC6\u7801");
  const unlockPwdHint = unlockUsesAdmin ? localeT("\u8BF7\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\u7BA1\u7406\u6743\u9650\u3002") : localeT("\u5F53\u524D\u672A\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801\uFF0C\u8F93\u5165\u60A8\u7684\u8BBF\u95EE\u5BC6\u7801\u5373\u53EF\u89E3\u9501\u3002");
  const isLocked = !isLocalhost && auth?.adminProtection !== false && policy !== "open" && !adminUnlocked && (policy === "local_only" || hasAnyPassword2);
  if (isLocked) {
    return h(
      "div",
      { style: { maxWidth: 620 } },
      policy === "local_only" ? h(
        "div",
        {
          style: { ...s.card, textAlign: "center", padding: "36px 20px", marginTop: 10 }
        },
        h("div", { style: { fontSize: 40, marginBottom: 12 } }, "\u{1F6E1}\uFE0F"),
        h("div", { style: { ...s.label, fontSize: 16, fontWeight: 600, marginBottom: 8 } }, "\u7BA1\u7406\u63A7\u5236\u53F0\u5DF2\u9501\u5B9A\uFF08\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\uFF09"),
        h(
          "div",
          { style: { ...s.muted, maxWidth: 420, margin: "0 auto", lineHeight: 1.6, fontSize: 13 } },
          "\u5F53\u524D\u8BBE\u5907\u901A\u8FC7\u8FDC\u7A0B\u5C40\u57DF\u7F51\u6216\u516C\u7F51\u63A5\u5165\u3002\u5DF2\u5F00\u542F\u300C\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\u300D\u6700\u9AD8\u5B89\u5168\u7B56\u7565\uFF0C\u8FDC\u7A0B\u8BBE\u5907\u7981\u6B62\u67E5\u770B\u4E0E\u4FEE\u6539\u4EFB\u4F55\u7F51\u7EDC\u4E0E\u673A\u5668\u4EBA\u914D\u7F6E\u3002\u5982\u9700\u7BA1\u7406\u8BF7\u5728\u7535\u8111\u672C\u673A\uFF08127.0.0.1\uFF09\u4E0A\u64CD\u4F5C\u3002"
        ),
        h(
          "div",
          { style: { marginTop: 20 } },
          h("button", {
            type: "button",
            style: { ...s.btnLink, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" },
            onClick: () => setShowForgotGuide((v) => !v)
          }, "\u2753 \u8FDC\u7A0B\u5982\u4F55\u6551\u6025\u89E3\u9664\u9501\u5B9A\uFF1F")
        ),
        showForgotGuide && h(
          "div",
          {
            style: {
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.6,
              background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              color: "var(--dsw-alias-label-secondary,#4b5563)",
              textAlign: "left",
              maxWidth: 420,
              margin: "14px auto 0"
            }
          },
          h("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", marginBottom: 4 } }, "\u{1F6DF} \u6551\u6025\u89E3\u9664\u9501\u5B9A\u6307\u5F15\uFF1A"),
          h("div", null, "1. ", h("strong", null, "\u7535\u8111\u672C\u673A\u76F4\u8FDE\u4FEE\u6539"), "\uFF1A\u76F4\u63A5\u5728\u8FD0\u884C\u672C\u7A0B\u5E8F\u7684\u7535\u8111\u672C\u673A\u6253\u5F00\u672C\u63A7\u5236\u53F0\uFF08127.0.0.1 \u4EAB\u6709\u7269\u7406\u514D\u9501\u7279\u6743\uFF09\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u7B56\u7565\u6216\u6E05\u9664\u5BC6\u7801\u3002"),
          h("div", { style: { marginTop: 4 } }, "2. ", h("strong", null, "\u670D\u52A1\u5668 / \u65E0\u5934\u73AF\u5883"), "\uFF1A\u6551\u6025\u91CD\u7F6E\u6B65\u9AA4\u53C2\u89C1 GitHub README \u7684\u300C\u4E09\u91CD\u5BB9\u707E\u4FDD\u547D\u4F53\u7CFB\u300D\u7AE0\u8282\u3002")
        )
      ) : h(
        "div",
        {
          style: { ...s.card, maxWidth: 440, margin: "20px auto", padding: "32px 24px" }
        },
        h(
          "div",
          { style: { textAlign: "center", marginBottom: 20 } },
          h("div", { style: { fontSize: 40, marginBottom: 10 } }, "\u{1F512}"),
          h("div", { style: { ...s.label, fontSize: 16, fontWeight: 600 } }, "\u7BA1\u7406\u63A7\u5236\u53F0\u5DF2\u9501\u5B9A"),
          // 醒目提示该输入哪种密码
          h(
            "div",
            { style: { marginTop: 10, display: "flex", justifyContent: "center" } },
            unlockUsesAdmin ? h("span", {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: "var(--dsw-alias-state-info-bg,#eff6ff)",
                color: "var(--dsw-alias-label-primary, #0f1115)",
                border: "1px solid var(--dsw-alias-state-info-border,#bfdbfe)"
              }
            }, "\u{1F511} \u4F7F\u7528\u7BA1\u7406\u5BC6\u7801\u89E3\u9501") : h("span", {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                background: "var(--dsw-alias-state-success-bg,#ecfdf5)",
                color: "var(--dsw-alias-label-primary, #0f1115)",
                border: "1px solid var(--dsw-alias-state-success-border,#a7f3d0)"
              }
            }, "\u{1F510} \u4F7F\u7528\u8BBF\u95EE\u5BC6\u7801\u89E3\u9501")
          ),
          h(
            "div",
            { style: { ...s.muted, fontSize: 12, marginTop: 10, lineHeight: 1.6 } },
            localeT("\u5F53\u524D\u8BBE\u5907\u4E3A\u8FDC\u7A0B\u8BBF\u95EE\u3002\u4E3A\u4FDD\u62A4\u60A8\u7684\u7F51\u7EDC\u4E0E\u5E73\u53F0\u914D\u7F6E\u5B89\u5168\uFF0C${hint}", { hint: unlockPwdHint })
          )
        ),
        h(
          "form",
          {
            onSubmit: handleUnlockAdmin,
            style: { display: "flex", flexDirection: "column", gap: 12 }
          },
          h("input", {
            type: "password",
            style: s.input,
            placeholder: localeT("\u8F93\u5165${kind}", { kind: unlockPwdKind }),
            value: unlockPassword,
            onChange: (e) => setUnlockPassword(e.target.value),
            autoFocus: true
          }),
          unlockErr && h("div", {
            style: { fontSize: 12, color: "var(--dsw-alias-label-primary, #0f1115)" }
          }, unlockErr),
          h("button", {
            type: "submit",
            style: { ...s.btnPri, width: "100%", justifyContent: "center", height: 36, background: "#4560ea", color: "#ffffff" },
            disabled: unlocking
          }, unlocking ? "\u9A8C\u8BC1\u4E2D\u2026" : "\u89E3\u9501\u7BA1\u7406\u6743\u9650")
        ),
        h(
          "div",
          { style: { marginTop: 16, textAlign: "center" } },
          h("button", {
            type: "button",
            style: { ...s.btnLink, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" },
            onClick: () => setShowForgotGuide((v) => !v)
          }, localeT("\u2753 \u5FD8\u8BB0${kind}\uFF1F", { kind: unlockPwdKind }))
        ),
        showForgotGuide && h(
          "div",
          {
            style: {
              marginTop: 12,
              padding: "12px 14px",
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.6,
              background: "var(--dsw-alias-bg-layer-2,#f3f4f6)",
              border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)",
              color: "var(--dsw-alias-label-secondary,#4b5563)",
              textAlign: "left"
            }
          },
          h("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", marginBottom: 4 } }, localeT("\u{1F6DF} \u627E\u56DE\u4E0E\u91CD\u7F6E${kind}\u6307\u5F15\uFF1A", { kind: unlockPwdKind })),
          h("div", null, "1. ", h("strong", null, "\u7535\u8111\u672C\u673A\u76F4\u8FDE\u4FEE\u6539"), "\uFF1A\u76F4\u63A5\u5728\u8FD0\u884C\u672C\u7A0B\u5E8F\u7684\u7535\u8111\u672C\u673A\u6253\u5F00\u672C\u63A7\u5236\u53F0\uFF08127.0.0.1 \u4EAB\u6709\u7269\u7406\u514D\u9501\u7279\u6743\uFF09\uFF0C\u53EF\u968F\u65F6\u4FEE\u6539\u6216\u6E05\u9664\u5BC6\u7801\u3002"),
          h("div", { style: { marginTop: 4 } }, "2. ", h("strong", null, "\u670D\u52A1\u5668 / \u65E0\u5934\u73AF\u5883"), "\uFF1A\u6551\u6025\u91CD\u7F6E\u6B65\u9AA4\u53C2\u89C1 GitHub README \u7684\u300C\u4E09\u91CD\u5BB9\u707E\u4FDD\u547D\u4F53\u7CFB\u300D\u7AE0\u8282\u3002")
        )
      )
    );
  }
  const isInterceptionErr = err && (err.includes("\u7BA1\u7406\u5458\u6743\u9650") || err.includes("\u7BA1\u7406\u5BC6\u7801\u89E3\u9501"));
  const consoleUrl = `http://127.0.0.1:${status?.proxy?.port || 3082}`;
  return h(
    "div",
    { style: { maxWidth: 620, position: "relative" } },
    // issue #76：桌面窗口（dsh-app://app）无法跨源领取 adminToken 时的明确出路提示
    tokenHint && h(
      "div",
      {
        style: {
          ...s.card,
          background: "var(--dsw-alias-state-warn-bg,#fffbeb)",
          border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)",
          color: "var(--dsw-alias-label-primary, #0f1115)",
          fontSize: 12,
          lineHeight: 1.6,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8
        }
      },
      h(
        "span",
        { style: { flex: "1 1 auto" } },
        // 措辞中性化：isLocalhost 还覆盖 file: / vscode-webview: / *.local 等场景，
        // 不一定都是"桌面窗口跨源限制"（复核建议 F3）。
        localeT("\u672C\u673A\u8BBF\u95EE\u672A\u80FD\u81EA\u52A8\u83B7\u53D6\u7BA1\u7406\u4EE4\u724C\uFF08\u53EF\u80FD\u662F\u684C\u9762\u7A97\u53E3/\u81EA\u5B9A\u4E49\u534F\u8BAE\u7684\u8DE8\u6E90\u9650\u5236\uFF09\u3002\u8BF7\u6539\u7528\u7535\u8111\u6D4F\u89C8\u5668\u6253\u5F00 ${url} \u8FDB\u884C\u7BA1\u7406\u7C7B\u64CD\u4F5C\u3002", { url: consoleUrl })
      ),
      h("a", {
        href: consoleUrl,
        target: "_blank",
        rel: "noreferrer",
        style: { ...s.btnGhost, height: 26, fontSize: 12, textDecoration: "none", display: "inline-flex", alignItems: "center", flexShrink: 0 }
      }, localeT("\u6253\u5F00\u63A7\u5236\u53F0 \u2197")),
      h("button", {
        type: "button",
        style: { ...s.btnGhost, height: 26, fontSize: 12, flexShrink: 0 },
        onClick: () => setTokenHint(false)
      }, localeT("\u77E5\u9053\u4E86"))
    ),
    // 错误横幅（如果是权限拦截，直接提供醒目的输入密码解锁按钮）
    err && h(
      "div",
      {
        style: {
          ...s.card,
          background: "var(--dsw-alias-state-error-bg,#fef2f2)",
          color: "var(--dsw-alias-label-primary, #0f1115)",
          fontSize: 13,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10
        }
      },
      h("span", { style: { flex: "1 1 auto" } }, err),
      isInterceptionErr && h("button", {
        type: "button",
        style: { ...s.btnPri, background: "#dc2626", color: "#ffffff", height: 26, fontSize: 12, padding: "0 10px", flexShrink: 0 },
        onClick: () => {
          setUnlockErr(err);
          setShowUnlockModal(true);
        }
      }, localeT("\u{1F511} \u7ACB\u5373\u8F93\u5165${kind}\u89E3\u9501", { kind: unlockPwdKind }))
    ),
    // 管理员解锁状态提示条
    !isLocalhost && adminUnlocked && h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "var(--dsw-alias-state-info-bg,#eff6ff)",
          border: "1px solid var(--dsw-alias-brand-primary,#4f6ef7)",
          borderRadius: 8,
          marginBottom: 14,
          fontSize: 12,
          color: "var(--dsw-alias-brand-primary,#4f6ef7)"
        }
      },
      h("span", null, "\u{1F513} \u7BA1\u7406\u5458\u6743\u9650\u5DF2\u89E3\u9501\uFF08\u5F53\u524D\u4E34\u65F6\u4F1A\u8BDD\u6709\u6548\uFF09"),
      h("button", {
        style: { ...s.btnGhost, height: 24, fontSize: 11, padding: "0 8px" },
        onClick: handleLockAdmin
      }, "\u{1F512} \u91CD\u65B0\u9501\u5B9A\u540E\u53F0")
    ),
    // 未解锁时的顶部引导条：未设密码 → 提示先设密码；已设密码 → 提示解锁
    !isLocalhost && !adminUnlocked && auth?.enabled && policy !== "open" && h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "var(--dsw-alias-state-warn-bg,#fffbeb)",
          border: "1px solid var(--dsw-alias-state-warn-border,#fde68a)",
          borderRadius: 8,
          marginBottom: 14,
          fontSize: 12,
          color: "var(--dsw-alias-label-primary, #0f1115)"
        }
      },
      h(
        "span",
        null,
        hasAnyPassword2 ? "\u{1F512} \u540E\u53F0\u7BA1\u7406\u6743\u9650\u672A\u89E3\u9501\uFF08\u4FEE\u6539\u654F\u611F\u914D\u7F6E\u9700\u5148\u89E3\u9501\uFF09" : "\u26A0\uFE0F \u5C1A\u672A\u8BBE\u7F6E\u4EFB\u4F55\u8BBF\u95EE\u5BC6\u7801 / \u7BA1\u7406\u5BC6\u7801\uFF0C\u8FDC\u7A0B\u8BBF\u5BA2\u53EF\u514D\u5BC6\u8FDB\u5165\uFF01"
      ),
      hasAnyPassword2 ? h("button", {
        type: "button",
        style: { ...s.btnPri, ...s.btnWarn, height: 24, fontSize: 11, padding: "0 10px" },
        onClick: () => setShowUnlockModal(true)
      }, "\u{1F511} \u89E3\u9501\u7BA1\u7406\u6743\u9650") : h("button", {
        type: "button",
        style: { ...s.btnPri, ...s.btnWarn, height: 24, fontSize: 11, padding: "0 10px" },
        onClick: () => setActiveTab("security")
      }, "\u{1F510} \u7ACB\u5373\u8BBE\u7F6E\u5BC6\u7801")
    ),
    h(VersionBanner, { rpcCall: authRpcCall }),
    h(TabBar, { active: activeTab, onChange: setActiveTab, dots }),
    tabContent,
    // 全局交互式解锁弹窗 Modal
    showUnlockModal && h(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16
        },
        onClick: (e) => {
          if (e.target === e.currentTarget) setShowUnlockModal(false);
        }
      },
      h(
        "div",
        {
          style: {
            background: "var(--dsw-alias-bg-layer-1,#ffffff)",
            borderRadius: 14,
            padding: "24px 24px",
            maxWidth: 420,
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)"
          }
        },
        h(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } },
          h(
            "div",
            { style: { fontSize: 16, fontWeight: 600, color: "var(--dsw-alias-label-primary,currentColor)", display: "flex", alignItems: "center", gap: 8 } },
            "\u{1F512} \u89E3\u9501\u540E\u53F0\u7BA1\u7406\u6743\u9650"
          ),
          h("button", {
            type: "button",
            style: { border: "none", background: "none", cursor: "pointer", fontSize: 18, color: "var(--dsw-alias-label-tertiary,#9ca3af)", padding: 0 },
            onClick: () => setShowUnlockModal(false)
          }, "\u2715")
        ),
        h(
          "div",
          { style: { fontSize: 13, color: "var(--dsw-alias-label-secondary,#4b5563)", marginBottom: 16, lineHeight: 1.5 } },
          unlockUsesAdmin ? "\u5F53\u524D\u64CD\u4F5C\u9700\u8981\u540E\u53F0\u7BA1\u7406\u5458\u6743\u9650\u3002\u4E3A\u4FDD\u62A4\u60A8\u7684\u7F51\u7EDC\u914D\u7F6E\u4E0E\u673A\u5668\u4EBA\u5E73\u53F0\u5B89\u5168\uFF0C\u8BF7\u8F93\u5165\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\uFF1A" : "\u5F53\u524D\u64CD\u4F5C\u9700\u8981\u540E\u53F0\u7BA1\u7406\u6743\u9650\u3002\u672A\u8BBE\u7F6E\u72EC\u7ACB\u7BA1\u7406\u5BC6\u7801\uFF0C\u8F93\u5165\u60A8\u7684\u8BBF\u95EE\u5BC6\u7801\u5373\u53EF\u89E3\u9501\uFF1A"
        ),
        h(
          "form",
          {
            onSubmit: handleUnlockAdmin,
            style: { display: "flex", flexDirection: "column", gap: 12 }
          },
          h("input", {
            type: "password",
            style: s.input,
            placeholder: localeT("\u8F93\u5165${kind}", { kind: unlockPwdKind }),
            value: unlockPassword,
            onChange: (e) => setUnlockPassword(e.target.value),
            autoFocus: true
          }),
          unlockErr && h("div", {
            style: { fontSize: 12, color: "var(--dsw-alias-label-primary, #0f1115)" }
          }, unlockErr),
          h(
            "div",
            { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 } },
            h("button", {
              type: "button",
              style: s.btnGhost,
              onClick: () => setShowUnlockModal(false)
            }, "\u53D6\u6D88"),
            h("button", {
              type: "submit",
              style: { ...s.btnPri, background: "#4560ea", color: "#fff" },
              disabled: unlocking || !unlockPassword
            }, unlocking ? "\u9A8C\u8BC1\u4E2D\u2026" : "\u7ACB\u5373\u89E3\u9501")
          )
        ),
        h(
          "div",
          { style: { marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--dsw-alias-border-l2,#f3f4f6)", fontSize: 11, color: "var(--dsw-alias-label-tertiary,#9ca3af)", textAlign: "center", lineHeight: 1.5 } },
          "\u{1F4A1} \u63D0\u793A\uFF1A\u82E5\u672A\u5355\u72EC\u914D\u7F6E\u7BA1\u7406\u5BC6\u7801\uFF0C\u8BF7\u8F93\u5165\u521D\u6B21\u8BBE\u7F6E\u7684\u8BBF\u95EE\u5BC6\u7801\uFF1B\u7535\u8111\u672C\u673A\uFF08127.0.0.1\uFF09\u8BBF\u95EE\u4EAB\u6709\u514D\u5BC6\u7BA1\u7406\u7279\u6743\u3002"
        )
      )
    )
  );
}
function injectThemeTokens() {
  if (typeof document === "undefined") return;
  if (document.getElementById("dsh-bridge-theme-tokens")) return;
  const style = document.createElement("style");
  style.id = "dsh-bridge-theme-tokens";
  style.dataset.plugin = "@wenbin_wb/dsh-bridge";
  style.dataset.pluginCss = "@wenbin_wb/dsh-bridge/theme-tokens";
  style.textContent = THEME_TOKENS_CSS;
  document.head.appendChild(style);
}
function injectMobileStyles() {
  if (typeof document === "undefined") return;
  if (shouldYieldMobileStyles()) return;
  const css = hostFamiliesCss || renderMobileStyles(MOBILE_STYLES_CSS, hostFamilies);
  let style = document.getElementById("dsh-bridge-mobile-styles");
  if (!style) {
    style = document.createElement("style");
    style.id = "dsh-bridge-mobile-styles";
    style.dataset.plugin = "@wenbin_wb/dsh-bridge";
    style.dataset.pluginCss = "@wenbin_wb/dsh-bridge/mobile-styles";
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}
var hostFamilies = {};
var hostFamiliesSignature = "";
var hostFamiliesCss = "";
var hostFamiliesWarned = "";
function familySelector(slot, local) {
  return `[class*="${hostFamilies[slot] || ABSENT_FAMILY}_${local}"]`;
}
function workbenchPanelSelector({ openOnly = false } = {}) {
  const suffix = openOnly ? ':not([class*="panelHidden"])' : "";
  return [
    `div${familySelector("WB", "panel")}${suffix}`,
    `div[class*="workbench_panel"]${suffix}`,
    `div[class*="workbenchPanel"]${suffix}`
  ].join(", ");
}
function publishHostFamilies(result) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!root) return;
  try {
    root.setAttribute("data-dshbr-families", JSON.stringify(result.families));
    root.setAttribute("data-dshbr-family-sources", JSON.stringify(result.sources));
    root.setAttribute("data-dshbr-compat", result.compat ?? (result.degraded ? "degraded" : "ok"));
  } catch {
  }
}
function refreshHostFamilies() {
  if (typeof document === "undefined") return null;
  const result = resolveHostFamilies(document);
  publishHostFamilies(result);
  const sig = familiesSignature(result.families);
  if (sig !== hostFamiliesSignature) {
    hostFamiliesSignature = sig;
    hostFamilies = result.families;
    hostFamiliesCss = renderMobileStyles(MOBILE_STYLES_CSS, hostFamilies);
  }
  injectMobileStyles();
  const warnKey = `${sig}|degraded=${result.degraded}`;
  if (result.degraded && hostFamiliesWarned !== warnKey) {
    hostFamiliesWarned = warnKey;
    try {
      console.warn(
        `[dsh-bridge] \u65E0\u6CD5\u89E3\u6790\u5BBF\u4E3B\u8BBE\u7F6E\u5F39\u7A97\u7684 CSS-module \u524D\u7F00\uFF0C\u79FB\u52A8\u7AEF\u8BBE\u7F6E\u9875\u6837\u5F0F\u5C06\u4E0D\u751F\u6548\u3002 \u5DF2\u89E3\u6790=${JSON.stringify(result.families)} \u6765\u6E90=${JSON.stringify(result.sources)}`
      );
    } catch {
    }
  } else if (!result.degraded && (result.unverified?.length || result.missing?.length)) {
    hostFamiliesWarned = warnKey;
    try {
      console.debug(
        `[dsh-bridge] \u90E8\u5206\u5BBF\u4E3B\u524D\u7F00\u6309\u57FA\u7EBF\u5047\u8BBE\uFF08\u5BF9\u5E94\u89C4\u5219\u53EF\u80FD\u4E0D\u751F\u6548\uFF09\uFF1A \u672A\u9A8C\u8BC1=${JSON.stringify(result.unverified ?? [])} \u7F3A\u5931=${JSON.stringify(result.missing ?? [])} \u6765\u6E90=${JSON.stringify(result.sources)}`
      );
    } catch {
    }
  }
  return result;
}
function setupSettingsDrilldown() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const root = document.documentElement;
  if (root.dataset[DRILLDOWN_GATE_FLAG] === "1") return;
  root.dataset[DRILLDOWN_GATE_FLAG] = "1";
  if (typeof window.matchMedia !== "function") return;
  let narrowQuery;
  try {
    narrowQuery = window.matchMedia(`(max-width: ${SETTINGS_DRILLDOWN_MAX_WIDTH}px)`);
  } catch {
    return;
  }
  if (!narrowQuery) return;
  const isNarrow = () => narrowQuery.matches === true;
  const onDocumentClick = (event) => {
    if (!isNarrow()) return;
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const panel = target.closest(`div${familySelector("SETTINGS", "panel")}`);
    if (!panel) return;
    const nav = panel.querySelector(`nav${familySelector("SETTINGS", "nav")}`);
    if (!nav || !nav.contains(target)) return;
    if (target.closest(`button${familySelector("SETTINGS", "navCell")}`)) {
      panel.setAttribute(SETTINGS_VIEW_ATTR, SETTINGS_VIEW_DETAIL);
      if (nav.scrollTop) nav.scrollTop = 0;
      return;
    }
    if (panel.getAttribute(SETTINGS_VIEW_ATTR) === SETTINGS_VIEW_DETAIL) {
      panel.removeAttribute(SETTINGS_VIEW_ATTR);
    }
  };
  const syncGate = () => {
    if (narrowQuery.matches === true) root.setAttribute(DRILLDOWN_GATE_ATTR, DRILLDOWN_GATE_READY);
    else root.removeAttribute(DRILLDOWN_GATE_ATTR);
  };
  try {
    document.addEventListener("click", onDocumentClick, false);
  } catch {
    return;
  }
  try {
    if (typeof narrowQuery.addEventListener === "function") narrowQuery.addEventListener("change", syncGate);
    else if (typeof narrowQuery.addListener === "function") narrowQuery.addListener(syncGate);
  } catch {
  }
  syncGate();
}
function setupMobileExperience(rpcCall, ctx) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  injectMobileStyles();
  if (shouldYieldMobileHeader()) return;
  let header = document.querySelector(".dsh-mobile-app-header");
  let titleEl = document.querySelector(".dsh-mobile-header-title");
  if (!header) {
    header = document.createElement("header");
    header.className = "dsh-mobile-app-header";
    const leftBtn = document.createElement("button");
    leftBtn.className = "dsh-header-menu-btn";
    leftBtn.title = localeT("menu.open");
    leftBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="3" y1="8" x2="21" y2="8"></line>
        <line x1="3" y1="15" x2="14" y2="15"></line>
      </svg>
    `;
    leftBtn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = document.body.classList.toggle("dsh-drawer-open");
      if (isOpen) {
        const expand = document.querySelector(
          'button[aria-label*="\u6253\u5F00\u4FA7\u8FB9\u680F"], button[title*="\u6253\u5F00\u4FA7\u8FB9\u680F"], button[aria-label*="Open sidebar"], button[title*="Open sidebar"]'
        );
        if (expand) expand.click();
      }
    };
    titleEl = document.createElement("div");
    titleEl.className = "dsh-mobile-header-title";
    titleEl.innerText = localeT("title.fallback");
    titleEl.onclick = () => {
      const openPanels = document.querySelectorAll(workbenchPanelSelector({ openOnly: true }));
      openPanels.forEach((p) => p.classList.add("dsh-bridge-panelHidden"));
    };
    const rightBtn = document.createElement("button");
    rightBtn.className = "dsh-header-new-btn";
    rightBtn.title = localeT("menu.newSession");
    rightBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9.5"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
      </svg>
    `;
    rightBtn.onclick = () => {
      const openPanels = document.querySelectorAll(workbenchPanelSelector({ openOnly: true }));
      openPanels.forEach((p) => p.classList.add("dsh-bridge-panelHidden"));
      const dshNewBtn = document.querySelector('button[aria-label="\u65B0\u5EFA\u4F1A\u8BDD"], button[aria-label="New session"]');
      if (dshNewBtn) dshNewBtn.click();
    };
    header.appendChild(leftBtn);
    header.appendChild(titleEl);
    header.appendChild(rightBtn);
    document.body.appendChild(header);
  }
  const MOBILE_TITLE_FALLBACK_TEXT = () => localeT("title.fallback");
  const readHostSessionTitle = () => {
    if (typeof document === "undefined") return "";
    const nav = document.querySelector('nav[aria-label="Session hierarchy"], nav[aria-label="\u4F1A\u8BDD\u5C42\u7EA7"]');
    if (!nav) return "";
    const segs = [...nav.querySelectorAll('[class*="crumbSeg"]')];
    const lastSeg = segs[segs.length - 1];
    const lastCrumb = lastSeg ? lastSeg.querySelector('[class*="crumbCurrent"]') || lastSeg.querySelector("span, button") : null;
    if (!lastCrumb) return "";
    const text = (lastCrumb.getAttribute?.("aria-label") || lastCrumb.textContent || "").trim();
    if (!text || /^\d+\s+(item|items|项|个)/i.test(text)) return "";
    return text;
  };
  const setTitleText = (next) => {
    if (titleEl.textContent === next) return;
    titleEl.innerText = next;
  };
  const syncMobileTitle = () => {
    if (!titleEl) titleEl = document.querySelector(".dsh-mobile-header-title");
    if (!titleEl) return;
    const hostTitle = readHostSessionTitle();
    if (hostTitle) {
      setTitleText(hostTitle);
      return;
    }
    const snap = ctx?.sessions?.list?.getSnapshot?.();
    if (!snap) return;
    const cur = snap.current ? snap.byId?.[snap.current] : null;
    if (!cur || cur.blank) {
      setTitleText(MOBILE_TITLE_FALLBACK_TEXT());
    } else {
      setTitleText(cur.displayTitle || cur.title || MOBILE_TITLE_FALLBACK_TEXT());
    }
  };
  syncMobileTitle();
  if (typeof ctx?.sessions?.list?.subscribe === "function") {
    ctx.sessions.list.subscribe(syncMobileTitle);
  }
  if (typeof MutationObserver !== "undefined") {
    let mobileTitleRaf = 0;
    const mobileTitleObserver = new MutationObserver(() => {
      if (mobileTitleRaf) return;
      mobileTitleRaf = requestAnimationFrame(() => {
        mobileTitleRaf = 0;
        syncMobileTitle();
      });
    });
    mobileTitleObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (typeof ctx?.sessions?.active?.subscribe === "function") {
    ctx.sessions.active.subscribe(() => {
      if (document.body.classList.contains("dsh-drawer-open")) {
        document.body.classList.remove("dsh-drawer-open");
      }
      if (typeof window !== "undefined" && window.innerWidth <= MOBILE_MAX_WIDTH) {
        document.body.classList.remove("dsh-workbench-open");
        const openPanels = document.querySelectorAll(workbenchPanelSelector({ openOnly: true }));
        openPanels.forEach((p) => p.classList.add("dsh-bridge-panelHidden"));
      }
    });
  }
  const ensurePanelCloseButton = () => {
    if (typeof window === "undefined") return;
    if (window.innerWidth > MOBILE_MAX_WIDTH) {
      document.querySelectorAll(".dsh-mobile-panel-close-btn").forEach((btn) => btn.remove());
      return;
    }
    const panels = document.querySelectorAll(workbenchPanelSelector({ openOnly: true }));
    panels.forEach((p) => {
      const bar = p.querySelector(`div[class*="tabBar"], div${familySelector("WB", "tabBar")}`);
      if (bar && !bar.querySelector(".dsh-mobile-panel-close-btn")) {
        const btn = document.createElement("button");
        btn.className = "dsh-mobile-panel-close-btn";
        btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>${localeT("panel.backToChat")}</span>`;
        btn.onclick = (e) => {
          e.stopPropagation();
          document.body.classList.remove("dsh-workbench-open");
          p.classList.add("dsh-bridge-panelHidden");
          const collapseBtn = document.querySelector('button[class*="toggleButton"][aria-label*="\u6536\u8D77"], button[class*="toggleButton"][aria-label*="Collapse"]');
          if (collapseBtn) collapseBtn.click();
        };
        bar.appendChild(btn);
      }
    });
  };
  const MOBILE_POPOVERS = [
    {
      key: "team",
      selector: "[data-team-panel]",
      hostClass: "dsh-bridge-team-panel"
    },
    {
      key: "subagent",
      selector: 'body > div[class*="_menu"]:has(> div[role="tree"])',
      hostClass: "dsh-bridge-subagent-menu"
    }
  ];
  const POPOVER_CLOSE_CLASS = "dsh-mobile-popover-close-btn";
  const POPOVER_KEY_ATTR = "data-dshbr-popover";
  const setPopoverHostClass = (el, cls, on) => {
    if (on === el.classList.contains(cls)) return;
    if (on) el.classList.add(cls);
    else el.classList.remove(cls);
  };
  const closeMobilePopover = (node) => {
    if (node === void 0 || !node.isConnected) return;
    const PointerCtor = typeof window.PointerEvent === "function" ? window.PointerEvent : window.MouseEvent;
    document.body.dispatchEvent(new PointerCtor("pointerdown", { bubbles: true, cancelable: true }));
    const fallbackToEscape = () => {
      if (node.isConnected) {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      }
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(fallbackToEscape);
    else setTimeout(fallbackToEscape, 0);
  };
  const popoverSelectorWarned = /* @__PURE__ */ new Set();
  const popoverNodes = (selector) => {
    try {
      return document.querySelectorAll(selector);
    } catch (reason) {
      if (!popoverSelectorWarned.has(selector)) {
        popoverSelectorWarned.add(selector);
        try {
          console.warn(`[dsh-bridge] \u6D6E\u5C42\u9009\u62E9\u5668\u4E0D\u88AB\u5F53\u524D\u6D4F\u89C8\u5668\u652F\u6301\uFF0C\u8BE5\u5904\u6D6E\u5C42\u4E0D\u4F1A\u6CE8\u5165\u6536\u8D77\u6309\u94AE\uFF1A${selector}`, reason);
        } catch {
        }
      }
      return [];
    }
  };
  const ensureMobilePopoverCloseButtons = () => {
    if (typeof window === "undefined") return;
    const mobile = window.innerWidth <= MOBILE_MAX_WIDTH;
    if (!mobile) {
      document.querySelectorAll(`.${POPOVER_CLOSE_CLASS}`).forEach((btn) => btn.remove());
      MOBILE_POPOVERS.forEach((popover) => {
        popoverNodes(popover.selector).forEach((node) => setPopoverHostClass(node, popover.hostClass, false));
      });
      return;
    }
    MOBILE_POPOVERS.forEach((popover) => {
      popoverNodes(popover.selector).forEach((node) => {
        setPopoverHostClass(node, popover.hostClass, true);
        const collapseLabel = localeT("popover.collapse");
        const existing = node.querySelector(`.${POPOVER_CLOSE_CLASS}`);
        if (existing !== null) {
          const text = existing.querySelector("span");
          if (text !== null && text.textContent !== collapseLabel) text.textContent = collapseLabel;
          if (existing.getAttribute("aria-label") !== collapseLabel) existing.setAttribute("aria-label", collapseLabel);
          return;
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = POPOVER_CLOSE_CLASS;
        btn.setAttribute(POPOVER_KEY_ATTR, popover.key);
        btn.setAttribute("aria-label", collapseLabel);
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        const label = document.createElement("span");
        label.textContent = collapseLabel;
        btn.appendChild(label);
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeMobilePopover(node);
        });
        node.appendChild(btn);
      });
    });
  };
  const syncMobilePanelAffordances = () => {
    ensurePanelCloseButton();
    ensureMobilePopoverCloseButtons();
  };
  const panelObserver = new MutationObserver(syncMobilePanelAffordances);
  panelObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  panelObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.addEventListener("resize", syncMobilePanelAffordances);
  document.addEventListener("click", (e) => {
    if (typeof window === "undefined" || window.innerWidth > MOBILE_MAX_WIDTH) return;
    const trigger = e.target.closest('button[aria-label*="\u9762\u677F"], button[aria-label*="\u5DE5\u4F5C\u533A"], button[aria-label*="workspace"], button[aria-label*="Workspace"], div[class*="toggleCluster"] button, button[class*="subagent"], div[class*="headerActions"] button, div[class*="titleRow"] button');
    if (trigger && !trigger.classList.contains("dsh-mobile-panel-close-btn") && !trigger.classList.contains("dsh-header-menu-btn") && !trigger.classList.contains("dsh-header-new-btn")) {
      document.body.classList.add("dsh-workbench-open");
    }
  }, true);
  document.addEventListener("click", (e) => {
    if (typeof window === "undefined" || window.innerWidth > MOBILE_MAX_WIDTH) return;
    const toggle = e.target.closest('button[aria-label*="\u6536\u8D77\u4FA7\u8FB9\u680F"], button[title*="\u6536\u8D77\u4FA7\u8FB9\u680F"], button[aria-label*="Collapse sidebar"], button[title*="Collapse sidebar"]');
    if (toggle) {
      document.body.classList.remove("dsh-drawer-open");
    }
  }, true);
  let backdrop = document.querySelector(".dsh-mobile-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "dsh-mobile-backdrop";
    backdrop.addEventListener("click", () => {
      document.body.classList.remove("dsh-drawer-open");
    });
    document.body.appendChild(backdrop);
  }
  let lastLongPressTime = 0;
  document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("dsh-drawer-open")) return;
    if (Date.now() - lastLongPressTime < 600) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (e.target.closest('div[class*="portal"], div[class*="_portal"], div[role="menu"], div[role="dialog"], div[class*="popup"], div[class*="dropdown"], div[class*="overlay"]')) {
      return;
    }
    const sidebar = document.querySelector('div[class*="_sidebarCol"]');
    if (sidebar && sidebar.contains(e.target)) {
      if (e.target.closest('input, select, textarea, div[class*="searchInput"]')) {
        return;
      }
      const btn = e.target.closest('button, [role="button"]');
      if (btn) {
        const label = btn.getAttribute("aria-label") || btn.innerText || "";
        if (label.includes("\u64CD\u4F5C") || label.includes("\u89C6\u56FE") || label.includes("\u6DFB\u52A0") || label.includes("\u641C\u7D22") || label.includes("\u8BBE\u7F6E") || btn.matches('button[class*="toggle"], button[class*="trigger"], button[class*="iconButton"], button[class*="searchButton"]')) {
          return;
        }
        if (label.includes("\u65B0\u4F1A\u8BDD") || btn.matches('button[class*="newSession"]')) {
          document.body.classList.remove("dsh-drawer-open");
          return;
        }
      }
      const sessionRow = e.target.closest('a, div[class*="sessionRow"]');
      if (sessionRow) {
        setTimeout(() => {
          if (document.body.classList.contains("dsh-drawer-open")) {
            document.body.classList.remove("dsh-drawer-open");
          }
        }, 80);
      }
    } else if (e.target.classList?.contains("dsh-mobile-backdrop")) {
      document.body.classList.remove("dsh-drawer-open");
    }
  }, true);
  let longPressTimer = null;
  let touchStartX = 0;
  let touchStartY = 0;
  window.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
    if (!document.body.classList.contains("dsh-drawer-open")) return;
    const sidebar = document.querySelector('div[class*="_sidebarCol"]');
    if (!sidebar || !sidebar.contains(e.target)) return;
    const sessionRow = e.target.closest('div[class*="sessionRow"]');
    if (!sessionRow) return;
    longPressTimer = setTimeout(() => {
      lastLongPressTime = Date.now();
      try {
        if (navigator.vibrate) navigator.vibrate(40);
      } catch (_) {
      }
      const actionBtn = sessionRow.querySelector('button[aria-label*="\u64CD\u4F5C"], button[aria-label*="Session actions"], button[class*="iconButton"], button');
      if (actionBtn) {
        actionBtn.click();
      }
    }, 380);
  }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    if (longPressTimer && e.touches && e.touches.length > 0) {
      const moveX = Math.abs(e.touches[0].clientX - touchStartX);
      const moveY = Math.abs(e.touches[0].clientY - touchStartY);
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0 && touchStartX <= 35) {
        document.body.classList.add("dsh-drawer-open");
        const collapsedToggle = document.querySelector(
          `div${familySelector("SIDEBAR", "collapsed")} button${familySelector("SIDEBAR", "toggle")}, button[aria-label*="\u6253\u5F00\u4FA7\u8FB9\u680F"], button[title*="\u6253\u5F00\u4FA7\u8FB9\u680F"], button[aria-label*="Open sidebar"], button[title*="Open sidebar"]`
        );
        if (collapsedToggle) collapsedToggle.click();
      } else if (deltaX < 0 && document.body.classList.contains("dsh-drawer-open")) {
        document.body.classList.remove("dsh-drawer-open");
      }
    }
  }, { passive: true });
  document.addEventListener("click", (e) => {
    if (isLocalEnvironment()) return;
    const btn = e.target.closest('button, [role="button"], a');
    if (!btn) return;
    if (btn.closest("#dsh-remote-workspace-modal")) return;
    const label = (btn.getAttribute("aria-label") || btn.innerText || btn.title || "").trim();
    const isAddWorkspace = label === "\u6DFB\u52A0\u5DE5\u4F5C\u533A" || label === "\u65B0\u5EFA\u5DE5\u4F5C\u533A" || label === "\u6253\u5F00\u5DE5\u4F5C\u533A" || label === "\u6253\u5F00\u6587\u4EF6\u5939" || label === "Add Workspace" || label === "Open Folder" || label.includes("\u6DFB\u52A0\u5DE5\u4F5C\u533A") || label.includes("\u6253\u5F00\u5DE5\u4F5C\u533A") || label.includes("\u6253\u5F00\u6587\u4EF6\u5939") || btn.matches('button[aria-label*="\u5DE5\u4F5C\u533A"][aria-label*="\u6DFB\u52A0"], button[aria-label*="\u5DE5\u4F5C\u533A"][aria-label*="\u6253\u5F00"], button[aria-label*="Workspace"][aria-label*="add"], button[aria-label*="Workspace"][aria-label*="open"], button[aria-label*="Add workspace"], button[aria-label*="Open workspace"]');
    if (isAddWorkspace) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (typeof window.__dshOpenRemoteWorkspaceModal === "function") {
        window.__dshOpenRemoteWorkspaceModal();
      }
    }
  }, true);
}
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function showRemoteWorkspaceDialog(rpcCall, onWorkspaceAdded, clientCtx, onPicked, onCancel) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const existing = document.getElementById("dsh-remote-workspace-modal");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "dsh-remote-workspace-modal";
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 100000;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(5px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: var(--dsw-alias-label-primary, #111827);
  `;
  const modal = document.createElement("div");
  modal.className = "dsh-ws-dialog-card";
  let currentPath = "";
  let parentPath = null;
  let breadcrumbs = [];
  let entries = [];
  let roots = [];
  let drives = [];
  let workspaces = [];
  let filterQuery = "";
  let showManualInput = false;
  let isLoading = false;
  let isSubmitting = false;
  let statusMessage = null;
  let isErrorMessage = false;
  let needUnlock = false;
  let unlockable = true;
  let unlockInput = "";
  let unlockErr = null;
  let unlocking = false;
  function closeModal() {
    document.removeEventListener("keydown", handleKeydown);
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.15s ease";
    setTimeout(() => overlay.remove(), 150);
    if (typeof onCancel === "function") {
      try {
        onCancel();
      } catch (e) {
      }
    }
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  const handleKeydown = (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  };
  document.addEventListener("keydown", handleKeydown);
  function render() {
    const filteredEntries = (entries || []).filter((e) => {
      if (!filterQuery.trim()) return true;
      return e.name.toLowerCase().includes(filterQuery.trim().toLowerCase());
    });
    modal.innerHTML = `
      <!-- mobile drag handle -->
      <div class="dsh-ws-drag-handle" style="width: 36px; height: 4px; background: var(--dsw-alias-border-l2, #d1d5db); border-radius: 2px; margin: 8px auto 0 auto; display: none;"></div>

      <!-- modal header -->
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e7eb); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; background: var(--dsw-alias-bg-layer-2, #f9fafb);">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <span style="font-size: 20px; flex-shrink: 0;">\u{1F5C2}\uFE0F</span>
          <div style="overflow: hidden;">
            <div style="font-size: 15px; font-weight: 600; color: var(--dsw-alias-label-primary, #111827); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${localeT("\u9009\u62E9\u7535\u8111\u5DE5\u4F5C\u533A")}</div>
            <div style="font-size: 11px; color: var(--dsw-alias-label-tertiary, #6b7280); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${localeT("\u70B9\u51FB\u8FDB\u5165\u6587\u4EF6\u5939\uFF0C\u6216\u70B9\u51FB\u300C+ \u9009\u4E3A\u5DE5\u4F5C\u533A\u300D\u76F4\u63A5\u6DFB\u52A0\u5E76\u5207\u6362")}</div>
          </div>
        </div>
        <button id="dsh-ws-close-btn" style="border: none; background: none; font-size: 18px; cursor: pointer; color: var(--dsw-alias-label-tertiary, #9ca3af); padding: 4px 8px; border-radius: 6px; line-height: 1; flex-shrink: 0;">\u2715</button>
      </div>

      <!-- admin unlock block (remote access needs the admin password; hidden under local_only) -->
      ${needUnlock && unlockable ? `
        <div style="padding: 14px 16px; background: var(--dsw-alias-state-warn-bg, #fffbeb); border-bottom: 1px solid var(--dsw-alias-state-warn-border, #fde68a); flex-shrink: 0;">
          <div style="font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary, #0f1115); margin-bottom: 6px;">${localeT("\u{1F512} \u6B64\u64CD\u4F5C\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650")}</div>
          <div style="font-size: 11px; color: var(--dsw-alias-label-secondary, #6b7280); margin-bottom: 8px; line-height: 1.5;">${localeT("\u8FDC\u7A0B\u8BBF\u95EE\u65F6\u6D4F\u89C8/\u6DFB\u52A0\u5DE5\u4F5C\u533A\u9700\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801\u89E3\u9501\uFF08\u4E0E\u8BBF\u95EE\u5BC6\u7801\u4E0D\u540C\uFF09\u3002")}</div>
          <form id="dsh-ws-unlock-form" style="display: flex; gap: 8px;">
            <input id="dsh-ws-unlock-input" type="password" placeholder="${localeT("\u8BF7\u8F93\u5165\u540E\u53F0\u7BA1\u7406\u5BC6\u7801")}" value="${escapeHtml(unlockInput)}"
              style="flex: 1; font: inherit; font-size: 13px; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, currentColor); outline: none; box-sizing: border-box;" />
            <button type="submit" style="border: none; background: var(--dsw-static-blue-600, #4f6ef7); color: #fff; border-radius: 8px; padding: 0 14px; font-size: 12px; font-weight: 600; cursor: pointer; flex-shrink: 0;" ${unlocking ? "disabled" : ""}>${unlocking ? localeT("\u89E3\u9501\u4E2D\u2026") : localeT("\u89E3\u9501")}</button>
          </form>
          ${unlockErr ? `<div style="font-size: 11px; color: var(--dsw-alias-label-primary, #0f1115); margin-top: 6px;">${escapeHtml(unlockErr)}</div>` : ""}
        </div>
      ` : ""}

      <div style="padding: 12px 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px;">
        <!-- status banner -->
        ${statusMessage ? `
          <div style="padding: 8px 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; font-weight: 500; display: flex; align-items: center; gap: 8px; ${isErrorMessage ? "background: var(--dsw-alias-state-error-bg, #fef2f2); border: 1px solid var(--dsw-alias-state-error-border, #fecaca); color: var(--dsw-alias-label-primary, #0f1115);" : "background: var(--dsw-alias-state-success-bg, #ecfdf5); border: 1px solid var(--dsw-alias-state-success-border, #a7f3d0); color: var(--dsw-alias-label-primary, #0f1115);"}">
            <span>${isErrorMessage ? "\u26A0\uFE0F" : "\u{1F389}"}</span>
            <span>${escapeHtml(statusMessage)}</span>
          </div>
        ` : ""}

        <!-- quick access + drives strip -->
        <div class="dsh-ws-chips-scroll">
          ${(drives || []).map((d) => {
      const isActive = currentPath.startsWith(d.path) || currentPath === d.path;
      return `
              <button class="dsh-ws-quick-btn" data-path="${escapeHtml(d.path)}" style="border: 1px solid ${isActive ? "var(--dsw-static-blue-600, #4f6ef7)" : "var(--dsw-alias-border-l2, #d1d5db)"}; background: ${isActive ? "var(--dsw-static-blue-600, #4f6ef7)" : "var(--dsw-alias-bg-layer-2, #f9fafb)"}; color: ${isActive ? "#fff" : "var(--dsw-alias-label-primary, #111827)"}; border-radius: 14px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 500; flex-shrink: 0; transition: all 0.1s;">
                \u{1F4BE} ${escapeHtml(localeT(d.name))}
              </button>
            `;
    }).join("")}
          <span style="color: var(--dsw-alias-border-l2, #d1d5db); margin: 0 1px; flex-shrink: 0;">|</span>
          ${(roots || []).map((r) => {
      const isActive = currentPath === r.path;
      return `
              <button class="dsh-ws-quick-btn" data-path="${escapeHtml(r.path)}" style="border: 1px solid ${isActive ? "var(--dsw-alias-brand-primary, #4f6ef7)" : "var(--dsw-alias-border-l2, #d1d5db)"}; background: ${isActive ? "var(--dsw-alias-state-info-bg, #eff6ff)" : "var(--dsw-alias-bg-layer-2, #f9fafb)"}; color: ${isActive ? "var(--dsw-alias-brand-primary, #4f6ef7)" : "var(--dsw-alias-label-secondary, #374151)"}; border-radius: 14px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-weight: 500; flex-shrink: 0;">
                ${escapeHtml(localeT(r.name))}
              </button>
            `;
    }).join("")}
        </div>

        <!-- breadcrumbs -->
        <div style="background: var(--dsw-alias-bg-layer-3, #f3f4f6); border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); border-radius: 10px; padding: 6px 10px; display: flex; align-items: center; justify-content: space-between; gap: 6px;">
          <div class="dsh-ws-chips-scroll" style="flex: 1;">
            <span style="font-size: 12px; margin-right: 2px; flex-shrink: 0;">\u{1F4C2}</span>
            ${(breadcrumbs || []).map((crumb, idx) => {
      const isLast = idx === breadcrumbs.length - 1;
      return `
                <button class="dsh-ws-crumb-btn" data-path="${escapeHtml(crumb.path)}" style="border: none; background: ${isLast ? "var(--dsw-alias-bg-layer-1, #fff)" : "transparent"}; color: ${isLast ? "var(--dsw-alias-brand-primary, #4f6ef7)" : "var(--dsw-alias-label-secondary, #4b5563)"}; font-family: ui-monospace, Menlo, monospace; font-size: 11px; font-weight: ${isLast ? "700" : "500"}; padding: 3px 6px; border-radius: 4px; cursor: pointer; text-decoration: ${isLast ? "none" : "underline"}; text-underline-offset: 2px; flex-shrink: 0; box-shadow: ${isLast ? "0 1px 2px rgba(0,0,0,0.06)" : "none"};">
                  ${escapeHtml(crumb.name)}
                </button>
                ${!isLast ? `<span style="color: var(--dsw-alias-label-tertiary, #9ca3af); font-size: 11px; font-weight: 600; flex-shrink: 0;">/</span>` : ""}
              `;
    }).join("")}
          </div>

          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            ${parentPath ? `
              <button id="dsh-ws-up-btn" data-path="${escapeHtml(parentPath)}" title="${localeT("\u8FD4\u56DE\u4E0A\u4E00\u7EA7")}" style="border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827); padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 2px;">
                ${localeT("\u2B06\uFE0F \u4E0A\u7EA7")}
              </button>
            ` : ""}
            <button id="dsh-ws-refresh-btn" title="${localeT("\u5237\u65B0\u76EE\u5F55")}" style="border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827); padding: 3px 6px; border-radius: 6px; font-size: 11px; cursor: pointer;">
              \u{1F504}
            </button>
          </div>
        </div>

        <!-- current directory action card -->
        <div style="background: var(--dsw-alias-state-info-bg, #eff6ff); border: 1px solid var(--dsw-alias-state-info-border, #bfdbfe); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <span style="font-size: 11px; font-weight: 600; color: var(--dsw-alias-brand-primary, #2563eb); flex-shrink: 0;">${localeT("\u5F53\u524D\u76EE\u5F55:")}</span>
            <span style="font-family: ui-monospace, Menlo, monospace; font-size: 11px; color: var(--dsw-alias-label-primary, var(--dsw-alias-brand-primary, #1e3a8a)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: right; font-weight: 600;">${escapeHtml(currentPath)}</span>
          </div>
          <button id="dsh-ws-add-current-btn" style="border: none; background: var(--dsw-static-blue-600, #2563eb); color: #fff; height: 36px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; box-shadow: 0 2px 4px rgba(37,99,235,0.25); transition: opacity 0.1s;" ${isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? localeT("\u6B63\u5728\u6DFB\u52A0\u5E76\u5207\u6362\u2026") : localeT("\u{1F449} \u8BBE\u4E3A\u5F53\u524D\u5DE5\u4F5C\u533A\u5E76\u8FDB\u5165")}
          </button>
        </div>

        <!-- subfolder list + filter -->
        <div style="border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; background: var(--dsw-alias-bg-layer-1, #fff);">
          <!-- live filter box -->
          <div style="padding: 7px 10px; background: var(--dsw-alias-bg-layer-2, #f9fafb); border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e7eb); display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
              <span style="font-size: 11px; color: var(--dsw-alias-label-tertiary, #9ca3af);">\u{1F50D}</span>
              <input id="dsh-ws-filter-input" type="text" value="${escapeHtml(filterQuery)}" placeholder="${localeT("\u8FC7\u6EE4\u5B50\u6587\u4EF6\u5939\u2026")}" style="border: none; background: transparent; font-size: 12px; width: 100%; color: var(--dsw-alias-label-primary, #111827); outline: none;" />
            </div>
            <span style="font-size: 10px; color: var(--dsw-alias-label-tertiary, #6b7280); flex-shrink: 0;">
              ${localeT("${count} \u4E2A\u6587\u4EF6\u5939", { count: filteredEntries.length })}
            </span>
          </div>

          <!-- subfolder list (comfortable tap targets) -->
          <div style="max-height: 240px; min-height: 120px; overflow-y: auto; padding: 2px 0;">
            ${isLoading ? `
              <div style="padding: 32px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); display: flex; flex-direction: column; align-items: center; gap: 6px;">
                <span style="font-size: 20px;">\u23F3</span>
                <span>${localeT("\u6B63\u5728\u8BFB\u53D6\u76EE\u5F55\u5185\u5BB9\u2026")}</span>
              </div>
            ` : filteredEntries.length === 0 ? `
              <div style="padding: 26px 16px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-tertiary, #6b7280); display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <span style="font-size: 22px;">\u{1F4C1}</span>
                <span>${filterQuery ? localeT("\u672A\u627E\u5230\u5339\u914D\u7684\u5B50\u6587\u4EF6\u5939") : localeT("\u5F53\u524D\u6587\u4EF6\u5939\u4E0B\u6CA1\u6709\u66F4\u591A\u5B50\u6587\u4EF6\u5939")}</span>
                <span style="font-size: 11px; color: var(--dsw-alias-label-tertiary, #9ca3af);">${localeT("\uFF08\u76F4\u63A5\u70B9\u51FB\u4E0A\u65B9\u84DD\u8272\u6309\u94AE\u5373\u53EF\u8FDB\u5165\u5F53\u524D\u76EE\u5F55\uFF09")}</span>
              </div>
            ` : filteredEntries.map((e) => `
              <div class="dsh-ws-entry-row" data-path="${escapeHtml(e.path)}" style="display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid var(--dsw-alias-border-l2, #f3f4f6); cursor: pointer; font-size: 12px; transition: background 0.1s; min-height: 40px;">
                <div class="dsh-ws-drill-btn" data-path="${escapeHtml(e.path)}" style="display: flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; padding: 2px 0;">
                  <span style="font-size: 16px; flex-shrink: 0;">\u{1F4C1}</span>
                  <span style="font-family: ui-monospace, Menlo, monospace; font-weight: 500; color: var(--dsw-alias-label-primary, #111827); overflow: hidden; text-overflow: ellipsis;">${escapeHtml(e.name)}</span>
                  <span style="color: var(--dsw-alias-label-tertiary, #9ca3af); font-size: 12px; margin-left: 2px; flex-shrink: 0;">\u203A</span>
                </div>
                <button class="dsh-ws-pick-entry-btn" data-path="${escapeHtml(e.path)}" title="${localeT("\u76F4\u63A5\u6DFB\u52A0\u6B64\u5B50\u6587\u4EF6\u5939\u4E3A\u5DE5\u4F5C\u533A\u5E76\u8FDB\u5165")}" style="border: 1px solid var(--dsw-alias-state-success-border, #a7f3d0); background: var(--dsw-alias-state-success-bg, #ecfdf5); color: var(--dsw-alias-label-primary, #0f1115); padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; margin-left: 8px; white-space: nowrap; transition: all 0.1s;">
                  ${localeT("+ \u9009\u4E3A\u5DE5\u4F5C\u533A")}
                </button>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- manual path input (collapsible) -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <button id="dsh-ws-toggle-manual" style="border: none; background: none; color: var(--dsw-alias-label-tertiary, #6b7280); font-size: 11px; cursor: pointer; padding: 2px 0; text-decoration: underline;">
              ${showManualInput ? localeT("\u25BC \u6536\u8D77\u7EDD\u5BF9\u8DEF\u5F84\u624B\u52A8\u8F93\u5165") : localeT("\u25B6 \u624B\u52A8\u7C98\u8D34/\u8F93\u5165\u7EDD\u5BF9\u8DEF\u5F84")}
            </button>
          </div>
          ${showManualInput ? `
            <div style="margin-top: 6px; display: flex; gap: 6px;">
              <input id="dsh-ws-manual-input" type="text" value="${escapeHtml(currentPath)}" placeholder="${localeT("\u8F93\u5165\u7535\u8111\u7EDD\u5BF9\u8DEF\u5F84\uFF0C\u4F8B\u5982 C:\\Projects\\my-app")}" style="flex: 1; font-family: ui-monospace, Menlo, monospace; font-size: 11px; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827); outline: none;" />
              <button id="dsh-ws-manual-jump-btn" style="border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-2, #f9fafb); color: var(--dsw-alias-label-primary, #111827); padding: 0 10px; border-radius: 8px; font-size: 11px; cursor: pointer; white-space: nowrap;">
                ${localeT("\u524D\u5F80")}
              </button>
              <button id="dsh-ws-manual-add-btn" style="border: none; background: var(--dsw-static-blue-600, #4f6ef7); color: #fff; padding: 0 12px; border-radius: 8px; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap;">
                ${localeT("\u6DFB\u52A0\u5E76\u8FDB\u5165")}
              </button>
            </div>
          ` : ""}
        </div>

        <!-- registered workspaces (one-click switch) -->
        ${workspaces && workspaces.length > 0 ? `
          <div style="padding-top: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-tertiary, #6b7280); margin-bottom: 4px;">${localeT("\u5DF2\u6CE8\u518C\u5DE5\u4F5C\u533A (${count} \u4E2A\uFF0C\u70B9\u51FB\u76F4\u63A5\u5207\u6362)\uFF1A", { count: workspaces.length })}</div>
            <div style="display: flex; flex-direction: column; gap: 4px; max-height: 80px; overflow-y: auto;">
              ${workspaces.map((w, i) => `
                <div class="dsh-ws-registered-row" data-ws-id="${escapeHtml(w.id || "")}" data-ws-path="${escapeHtml(w.path)}" style="display: flex; align-items: center; justify-content: space-between; background: var(--dsw-alias-bg-layer-2, #f9fafb); border: 1px solid var(--dsw-alias-border-l2, #e5e7eb); border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer; transition: background 0.1s;">
                  <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                    <span style="font-weight: 600; color: var(--dsw-alias-brand-primary, #4f6ef7);">@${i + 1} ${escapeHtml(w.title || "")}</span>
                    <span style="color: var(--dsw-alias-label-tertiary, #6b7280); margin-left: 6px; font-family: ui-monospace, Menlo, monospace; font-size: 10px;">${escapeHtml(w.path)}</span>
                  </div>
                  <button class="dsh-ws-switch-btn" data-ws-id="${escapeHtml(w.id || "")}" data-ws-path="${escapeHtml(w.path)}" style="border: 1px solid var(--dsw-alias-brand-primary, #4f6ef7); background: var(--dsw-alias-state-info-bg, #eff6ff); color: var(--dsw-alias-brand-primary, #4f6ef7); padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; cursor: pointer; flex-shrink: 0; margin-left: 6px; white-space: nowrap;">
                    ${localeT("\u8FDB\u5165 \u2794")}
                  </button>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>

      <!-- modal footer -->
      <div style="padding: 8px 16px; border-top: 1px solid var(--dsw-alias-border-l2, #e5e7eb); display: flex; align-items: center; justify-content: space-between; background: var(--dsw-alias-bg-layer-2, #f9fafb); flex-shrink: 0;">
        <span style="font-size: 10px; color: var(--dsw-alias-label-tertiary, #6b7280);">
          ${localeT("\u{1F4A1} \u70B9\u51FB\u6587\u4EF6\u5939\u53EF\u9010\u7EA7\u8FDB\u5165")}
        </span>
        <button id="dsh-ws-cancel-btn" style="border: 1px solid var(--dsw-alias-border-l2, #d1d5db); background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #111827); padding: 5px 14px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 500;">${localeT("\u5173\u95ED")}</button>
      </div>
    `;
    modal.querySelector("#dsh-ws-close-btn")?.addEventListener("click", closeModal);
    modal.querySelector("#dsh-ws-cancel-btn")?.addEventListener("click", closeModal);
    const unlockForm = modal.querySelector("#dsh-ws-unlock-form");
    if (unlockForm) {
      unlockForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (unlocking) return;
        const input = modal.querySelector("#dsh-ws-unlock-input");
        const pwd = input?.value || "";
        if (!pwd) return;
        unlocking = true;
        unlockErr = null;
        render();
        const res = await unlockAdmin(rpcCall, pwd);
        if (res.ok) {
          needUnlock = false;
          unlockInput = "";
          statusMessage = null;
          isErrorMessage = false;
          await loadDirectory(currentPath);
        } else {
          unlockErr = localeT(res.error) || localeT("\u89E3\u9501\u5931\u8D25");
        }
        unlocking = false;
        render();
      });
    }
    modal.querySelectorAll(".dsh-ws-crumb-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = btn.getAttribute("data-path");
        if (p) loadDirectory(p);
      });
    });
    modal.querySelectorAll(".dsh-ws-quick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = btn.getAttribute("data-path");
        if (p) loadDirectory(p);
      });
    });
    modal.querySelector("#dsh-ws-up-btn")?.addEventListener("click", (e) => {
      const p = e.currentTarget.getAttribute("data-path");
      if (p) loadDirectory(p);
    });
    modal.querySelector("#dsh-ws-refresh-btn")?.addEventListener("click", () => {
      loadDirectory(currentPath);
    });
    modal.querySelector("#dsh-ws-add-current-btn")?.addEventListener("click", () => {
      doSubmit(currentPath);
    });
    const filterInput = modal.querySelector("#dsh-ws-filter-input");
    if (filterInput) {
      filterInput.addEventListener("input", (e) => {
        filterQuery = e.target.value;
        render();
        const nextInput = modal.querySelector("#dsh-ws-filter-input");
        if (nextInput) {
          nextInput.focus();
          nextInput.selectionStart = nextInput.selectionEnd = nextInput.value.length;
        }
      });
    }
    modal.querySelectorAll(".dsh-ws-drill-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const p = btn.getAttribute("data-path");
        if (p) loadDirectory(p);
      });
    });
    modal.querySelectorAll(".dsh-ws-entry-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".dsh-ws-pick-entry-btn")) return;
        const p = row.getAttribute("data-path");
        if (p) loadDirectory(p);
      });
    });
    modal.querySelectorAll(".dsh-ws-pick-entry-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const p = btn.getAttribute("data-path");
        if (p) doSubmit(p);
      });
    });
    modal.querySelectorAll(".dsh-ws-registered-row, .dsh-ws-switch-btn").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const wsId = el.getAttribute("data-ws-id");
        const wsPath = el.getAttribute("data-ws-path");
        if (wsId || wsPath) {
          switchToWorkspace(wsId, wsPath);
        }
      });
    });
    modal.querySelector("#dsh-ws-toggle-manual")?.addEventListener("click", () => {
      showManualInput = !showManualInput;
      render();
    });
    const manualInput = modal.querySelector("#dsh-ws-manual-input");
    modal.querySelector("#dsh-ws-manual-jump-btn")?.addEventListener("click", () => {
      if (manualInput && manualInput.value.trim()) {
        loadDirectory(manualInput.value.trim());
      }
    });
    modal.querySelector("#dsh-ws-manual-add-btn")?.addEventListener("click", () => {
      if (manualInput && manualInput.value.trim()) {
        doSubmit(manualInput.value.trim());
      }
    });
    if (manualInput) {
      manualInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          doSubmit(manualInput.value.trim());
        }
      });
    }
  }
  async function authRpc(endpoint, payload = {}) {
    let token = getAdminToken();
    if (isLocalEnvironment()) {
      token = await fetchLoopbackTokenOnce();
    }
    const enriched = {
      ...payload,
      ...token ? { adminToken: token } : {},
      ...isLocalEnvironment() ? { isLocalhost: true } : {}
    };
    const res = await rpcCall(endpoint, enriched).catch((e) => {
      if (isAccessSessionFailure(e)) {
        clearAdminToken();
        reloadToLoginPage();
      }
      throw e;
    });
    if (res?.ok === false) {
      const msg = res?.error?.message || "";
      if (isLocalEnvironment() && (msg.includes("\u7BA1\u7406\u5458\u6743\u9650") || msg.includes("\u7BA1\u7406\u5BC6\u7801\u89E3\u9501"))) {
        const fresh = await fetchLoopbackTokenOnce(true);
        if (fresh) {
          return rpcCall(endpoint, { ...payload, adminToken: fresh, isLocalhost: true });
        }
      }
      if (msg.includes("\u7BA1\u7406\u5458\u6743\u9650") || msg.includes("\u7BA1\u7406\u5BC6\u7801\u89E3\u9501")) {
        clearAdminToken();
        const err = new Error("need-unlock");
        err.needUnlock = true;
        err.message = msg;
        err.unlockable = !msg.includes("\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406");
        throw err;
      }
    }
    return res;
  }
  async function switchToWorkspace(wsId, wsPath) {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      statusMessage = localeT("\u6B63\u5728\u5207\u6362\u5DE5\u4F5C\u533A\u2026");
      isErrorMessage = false;
      render();
      if (typeof onPicked === "function" && wsPath) {
        try {
          onPicked(wsPath);
        } catch (e) {
        }
      }
      let switched = false;
      if (clientCtx?.workspaces?.startSession && wsId) {
        try {
          clientCtx.workspaces.startSession(wsId);
          switched = true;
        } catch (e) {
          console.warn("[dsh-bridge] startSession failed:", e);
        }
      }
      if (!switched && wsPath) {
        try {
          if (clientCtx?.workspaces?.create) {
            const ws = await clientCtx.workspaces.create({ path: wsPath });
            if (ws?.workspaceId && clientCtx?.workspaces?.startSession) {
              clientCtx.workspaces.startSession(ws.workspaceId);
              switched = true;
            }
          }
          if (!switched) {
            const raw = await authRpc(BRIDGE_ENDPOINTS.addRemoteWorkspace, { path: wsPath });
            const res = raw?.value || raw;
            if (res?.workspaceId && clientCtx?.workspaces?.startSession) {
              try {
                clientCtx.workspaces.startSession(res.workspaceId);
                switched = true;
              } catch (e) {
              }
            }
            if (!switched && res?.sessionId && clientCtx?.sessions?.open) {
              try {
                clientCtx.sessions.open(res.sessionId);
              } catch (e) {
              }
            }
          }
        } catch (e) {
        }
      }
      statusMessage = localeT("\u2713 \u5DF2\u5207\u6362\u81F3\u5DE5\u4F5C\u533A\uFF01");
      render();
      setTimeout(() => {
        closeModal();
        document.body.classList.remove("dsh-drawer-open");
      }, 400);
    } finally {
      isSubmitting = false;
    }
  }
  async function loadDirectory(targetPath) {
    if (isSubmitting) return;
    if (!rpcCall) return;
    isLoading = true;
    filterQuery = "";
    statusMessage = null;
    isErrorMessage = false;
    render();
    try {
      const raw = await authRpc(BRIDGE_ENDPOINTS.listRemoteDirectories, { path: targetPath });
      const res = raw?.value || raw;
      if (res) {
        currentPath = res.currentPath || targetPath || "";
        parentPath = res.parentPath || null;
        breadcrumbs = res.breadcrumbs || [];
        entries = res.entries || [];
        roots = res.roots || [];
        drives = res.drives || [];
        workspaces = res.workspaces || [];
        if (res.error) {
          statusMessage = typeof res.error === "string" ? localeT(res.error) : localeT(res.error?.message) || localeT("\u8BFB\u53D6\u76EE\u5F55\u5931\u8D25");
          isErrorMessage = true;
        }
      }
    } catch (err) {
      if (err?.needUnlock) {
        needUnlock = true;
        unlockErr = null;
        statusMessage = null;
        isErrorMessage = false;
        unlockable = err.unlockable !== false;
        if (!unlockable) {
          statusMessage = localeT(err.message) || localeT("\u5F53\u524D\u7B56\u7565\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\uFF0C\u8FDC\u7A0B\u65E0\u6CD5\u89E3\u9501");
          isErrorMessage = true;
        }
      } else {
        statusMessage = localeT(err.message) || localeT("\u8BFB\u53D6\u76EE\u5F55\u5931\u8D25");
        isErrorMessage = true;
      }
    } finally {
      isLoading = false;
      render();
    }
  }
  async function doSubmit(pathToRegister) {
    if (isSubmitting) return;
    const p = (pathToRegister || currentPath || "").trim();
    if (!p) {
      statusMessage = localeT("\u8BF7\u8F93\u5165\u6216\u9009\u62E9\u5DE5\u4F5C\u533A\u8DEF\u5F84");
      isErrorMessage = true;
      render();
      return;
    }
    if (!rpcCall) return;
    isSubmitting = true;
    statusMessage = null;
    isErrorMessage = false;
    render();
    try {
      let clientWs = null;
      if (clientCtx?.workspaces?.create) {
        try {
          clientWs = await clientCtx.workspaces.create({ path: p });
        } catch (e) {
          console.warn("[dsh-bridge] clientCtx.workspaces.create failed:", e);
        }
      }
      const raw = await authRpc(BRIDGE_ENDPOINTS.addRemoteWorkspace, { path: p });
      const res = raw?.value || raw;
      if (res && res.ok) {
        statusMessage = localeT("\u2713 \u5DE5\u4F5C\u533A\u300C${name}\u300D\u5DF2\u9009\u5B9A\uFF0C\u6B63\u5728\u5207\u6362\u2026", { name: res.title || p });
        isErrorMessage = false;
        workspaces = res.workspaces || [];
        render();
        const targetWorkspaceId = clientWs?.workspaceId || res.workspaceId;
        if (typeof onPicked === "function") {
          try {
            onPicked(p);
          } catch (e) {
          }
        }
        let switched = false;
        if (clientCtx?.workspaces?.startSession && targetWorkspaceId) {
          try {
            clientCtx.workspaces.startSession(targetWorkspaceId);
            switched = true;
          } catch (e) {
            console.warn("[dsh-bridge] startSession failed:", e);
          }
        }
        if (!switched && clientCtx?.sessions?.open && res.sessionId) {
          try {
            clientCtx.sessions.open(res.sessionId);
          } catch (e) {
            console.warn("[dsh-bridge] sessions.open failed:", e);
          }
        }
        if (typeof onWorkspaceAdded === "function") {
          onWorkspaceAdded(res);
        }
        setTimeout(() => {
          closeModal();
          document.body.classList.remove("dsh-drawer-open");
        }, 500);
      } else {
        statusMessage = localeT(res?.error) || localeT(raw?.error) || localeT("\u6DFB\u52A0\u5DE5\u4F5C\u533A\u5931\u8D25");
        isErrorMessage = true;
        render();
      }
    } catch (err) {
      if (err?.needUnlock) {
        needUnlock = true;
        unlockable = err.unlockable !== false;
        unlockErr = null;
        statusMessage = null;
        isErrorMessage = false;
        if (!unlockable) {
          statusMessage = localeT(err.message) || localeT("\u5F53\u524D\u7B56\u7565\u4EC5\u9650\u7535\u8111\u672C\u673A\u7BA1\u7406\uFF0C\u8FDC\u7A0B\u65E0\u6CD5\u89E3\u9501");
          isErrorMessage = true;
        }
      } else {
        statusMessage = localeT(err.message) || localeT("\u6DFB\u52A0\u5DE5\u4F5C\u533A\u5F02\u5E38");
        isErrorMessage = true;
      }
      render();
    } finally {
      isSubmitting = false;
    }
  }
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  loadDirectory("");
}
function RemoteDirectoryFlow(props) {
  const { open, pick } = props;
  const outcome = React.useRef(props);
  outcome.current = props;
  const armed = React.useRef(false);
  const openRemoteModal = () => {
    if (typeof window.__dshOpenRemoteWorkspaceModal === "function") {
      window.__dshOpenRemoteWorkspaceModal(
        (res) => {
          if (res?.path && outcome.current?.onPicked) {
            outcome.current.onPicked(res.path);
          }
        },
        (chosenPath) => {
          if (chosenPath && outcome.current?.onPicked) {
            outcome.current.onPicked(chosenPath);
          }
        },
        () => {
          if (outcome.current?.onCancel) {
            outcome.current.onCancel();
          }
        }
      );
    } else if (outcome.current?.onCancel) {
      outcome.current.onCancel();
    }
  };
  React.useEffect(() => {
    if (!open) {
      armed.current = false;
      return;
    }
    if (armed.current) return;
    armed.current = true;
    const isNativeHost = typeof window !== "undefined" && (window.electron || window.__DSH_NATIVE_HOST__);
    if (isNativeHost || isLocalEnvironment()) {
      const pickFn = typeof pick === "function" ? pick : typeof window.__dshClientCtx?.workspaces?.pickDirectory === "function" ? () => window.__dshClientCtx.workspaces.pickDirectory() : null;
      if (pickFn) {
        try {
          const promise = pickFn();
          if (promise && typeof promise.then === "function") {
            promise.then((chosenPath) => {
              if (chosenPath === null) {
                if (outcome.current?.onCancel) outcome.current.onCancel();
              } else if (chosenPath) {
                if (outcome.current?.onPicked) outcome.current.onPicked(chosenPath);
              }
            }).catch(() => {
              openRemoteModal();
            });
            return;
          }
        } catch {
          openRemoteModal();
          return;
        }
      }
    }
    openRemoteModal();
  }, [open, pick]);
  return null;
}
function setupIosKeyboardAdapter() {
  if (typeof window === "undefined" || !window.visualViewport) return;
  if (!/iPhone|iPad|iPod/.test(navigator.userAgent || "")) return;
  const vv = window.visualViewport;
  const isEditable = (el) => el && (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "INPUT");
  let keyboardOpen = false;
  let pinnedEl = null;
  let pinnedH = null;
  let pinnedInline = null;
  const findScrollContainer = (el) => {
    let n = el;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && n.scrollHeight > n.clientHeight) {
        return n;
      }
      n = n.parentElement;
    }
    return null;
  };
  vv.addEventListener("resize", () => {
    const ratio = vv.height / window.innerHeight;
    const nowOpen = ratio < 0.75;
    if (nowOpen === keyboardOpen) return;
    keyboardOpen = nowOpen;
    const el = document.activeElement;
    if (nowOpen) {
      const scroller = isEditable(el) ? findScrollContainer(el) : null;
      if (scroller) {
        pinnedEl = scroller;
        pinnedInline = scroller.style.height || "";
        pinnedH = scroller.getBoundingClientRect().height;
        scroller.style.height = `${Math.round(pinnedH)}px`;
      }
      requestAnimationFrame(() => {
        if (isEditable(el)) {
          try {
            el.scrollIntoView({ block: "nearest" });
          } catch {
          }
        }
      });
    } else {
      if (pinnedEl) {
        pinnedEl.style.height = pinnedInline;
        pinnedEl = null;
        pinnedH = null;
        pinnedInline = null;
      }
    }
  });
}
function setupComposerCollapse() {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof MutationObserver === "undefined") return;
  if (window.innerWidth > MOBILE_MAX_WIDTH) return;
  if (shouldYieldComposerCollapse()) return;
  const LS_KEY = "dsh-composer-fold";
  let bar = null;
  let busy = false;
  let lastHadSeat = null;
  const getFoldBtn = () => {
    const existing = document.querySelector(".dsh-header-fold-btn");
    if (existing) return existing;
    const utils = document.querySelector(`div${familySelector("CONV", "headerUtilities")}, div[class*="headerUtilities"]`);
    const logBtn = document.querySelector(`button${familySelector("LOG", "sessionLogButton")}, button[class*="sessionLogButton"]`);
    if (!utils) return null;
    const btn = document.createElement("button");
    btn.className = "dsh-header-fold-btn";
    btn.setAttribute("aria-label", `${localeT("composer.expand")} / ${localeT("composer.collapse")}`);
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="18" x2="21" y2="18"></line><polyline points="6 9 12 15 18 9"></polyline></svg>';
    if (logBtn && logBtn.parentElement === utils) utils.insertBefore(btn, logBtn);
    else utils.appendChild(btn);
    return btn;
  };
  const isCollapsed = () => document.body.classList.contains("dsh-composer-collapsed");
  const readPref = () => {
    try {
      return localStorage.getItem(LS_KEY) === "1";
    } catch {
      return false;
    }
  };
  const ensureBar = () => {
    if (bar && document.body.contains(bar)) return bar;
    const seat = document.querySelector('div[class*="composerSeat"]');
    const scrollBody = seat ? seat.parentElement : null;
    if (!scrollBody) return null;
    bar = document.createElement("div");
    bar.className = "dsh-composer-collapsed-bar";
    bar.textContent = localeT("composer.placeholder");
    scrollBody.insertBefore(bar, seat);
    bar.addEventListener("click", () => setCollapsed(false));
    return bar;
  };
  const removeBar = () => {
    if (bar) {
      try {
        bar.remove();
      } catch {
      }
      bar = null;
    }
  };
  const setCollapsed = (collapsed) => {
    if (busy) return;
    busy = true;
    try {
      if (isCollapsed() !== collapsed) {
        document.body.classList.toggle("dsh-composer-collapsed", collapsed);
        try {
          localStorage.setItem(LS_KEY, collapsed ? "1" : "0");
        } catch {
        }
        updateButton(collapsed);
      }
      if (collapsed) ensureBar();
      else removeBar();
    } finally {
      busy = false;
    }
  };
  const updateButton = (collapsed) => {
    const btn = getFoldBtn();
    if (!btn) return;
    btn.title = collapsed ? localeT("composer.expand") : localeT("composer.collapse");
    const icon = collapsed ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"></rect><line x1="6" y1="10" x2="6.01" y2="10"></line><line x1="10" y1="10" x2="10.01" y2="10"></line><line x1="14" y1="10" x2="14.01" y2="10"></line><line x1="6" y1="14" x2="10" y2="14"></line><line x1="14" y1="14" x2="18" y2="14"></line></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="18" x2="21" y2="18"></line><polyline points="6 9 12 15 18 9"></polyline></svg>';
    const existing = btn.querySelector("svg");
    if (!existing || existing.outerHTML !== icon) btn.innerHTML = icon;
  };
  const handleSeatPresent = () => {
    const btn = getFoldBtn();
    if (!btn) return false;
    btn.style.display = "inline-flex";
    if (!btn._dshFoldWired) {
      btn._dshFoldWired = true;
      btn.onclick = (e) => {
        e.stopPropagation();
        setCollapsed(!isCollapsed());
      };
    }
    document.body.classList.add("dsh-composer-active");
    const want = readPref();
    if (want !== isCollapsed()) {
      setCollapsed(want);
    } else {
      updateButton(isCollapsed());
    }
    return true;
  };
  const handleSeatAbsent = () => {
    const btn = getFoldBtn();
    if (btn) {
      btn.style.display = "none";
    }
    document.body.classList.remove("dsh-composer-active");
    removeBar();
  };
  const onComposerChange = () => {
    const hasSeat = !!document.querySelector('div[class*="composerSeat"]');
    const hasBtn = !!document.querySelector(".dsh-header-fold-btn");
    if (busy) return;
    if (hasSeat === lastHadSeat && hasSeat === hasBtn) return;
    busy = true;
    try {
      if (hasSeat) {
        lastHadSeat = handleSeatPresent();
      } else {
        handleSeatAbsent();
        lastHadSeat = false;
      }
    } finally {
      busy = false;
    }
  };
  const observer = new MutationObserver(() => {
    observer.disconnect();
    try {
      onComposerChange();
    } finally {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  onComposerChange();
}
function apply(ctx) {
  window.__dshClientCtx = ctx;
  injectThemeTokens();
  const intl = createTranslator(ctx);
  localeT = (key, vars) => intl.t(key, vars);
  const pageTweaksOn = !shouldYieldAllPageTweaks();
  if (pageTweaksOn) {
    refreshHostFamilies();
    const stopWatchingFamilies = watchHostFamilies(() => refreshHostFamilies());
    if (typeof ctx.effect === "function") {
      ctx.effect(() => stopWatchingFamilies, "dsh-bridge: host family watcher");
    }
  }
  if (pageTweaksOn) {
    setupSettingsDrilldown();
  }
  if (pageTweaksOn) {
    const navIconFamilies = () => hostFamilies;
    if (typeof ctx.effect === "function") {
      ctx.effect(() => registerSettingsNavIcon(() => localeT("\u8FDC\u7A0B\u8BBF\u95EE"), navIconFamilies), "dsh-bridge: settings nav icon");
    } else {
      registerSettingsNavIcon(() => localeT("\u8FDC\u7A0B\u8BBF\u95EE"), navIconFamilies);
    }
  }
  const rpcCall = (endpoint, payload, signal) => ctx.connection.rpc.call(BRIDGE_RPC_CHANNEL, endpoint, payload, signal);
  window.__dshOpenRemoteWorkspaceModal = (onAdded, onPickDirect, onCancel) => showRemoteWorkspaceDialog(rpcCall, onAdded, ctx, onPickDirect, onCancel);
  if (pageTweaksOn) {
    setupIosKeyboardAdapter();
    setupComposerCollapse();
    setupMobileExperience(rpcCall, ctx);
  }
  const injected = () => ({ pick: () => ctx.workspaces?.pickDirectory?.() });
  ctx.slots.inject(
    "conversation.hero.workspace.directoryFlow",
    () => ctx.slots.inject("sidebar.workspaces.directoryFlow", function* () {
      if (shouldYieldToOfficialPicker({
        local: isLocalEnvironment(),
        officialPicker: hasOfficialDirectoryPicker(ctx)
      })) return;
      yield ctx.slots.register(
        {
          name: "conversation.hero.workspace.directoryFlow",
          priority: -10,
          inject: injected
        },
        RemoteDirectoryFlow
      );
      yield ctx.slots.register(
        {
          name: "sidebar.workspaces.directoryFlow",
          priority: -10,
          inject: injected
        },
        RemoteDirectoryFlow
      );
    })
  );
  let settingsVisible = true;
  let sectionRegistration = null;
  const ensureSectionRegistered = () => {
    if (!settingsVisible || sectionRegistration) return;
    try {
      sectionRegistration = ctx.slots.register(
        {
          name: "settings.section",
          id: "dsh-bridge",
          order: 10,
          label: () => localeT("\u8FDC\u7A0B\u8BBF\u95EE"),
          inject: () => ({ rpcCall })
        },
        BridgePanel
      );
    } catch {
    }
  };
  const ensureSectionUnregistered = () => {
    if (!sectionRegistration) return;
    try {
      if (typeof sectionRegistration === "function") {
        sectionRegistration();
      } else if (typeof sectionRegistration.dispose === "function") {
        sectionRegistration.dispose();
      }
    } catch {
    }
    sectionRegistration = null;
  };
  const sectionGate = {
    visible: () => settingsVisible,
    setVisible: (visible) => {
      const next = !!visible;
      if (settingsVisible === next) return;
      settingsVisible = next;
      if (next) {
        ensureSectionRegistered();
      } else {
        ensureSectionUnregistered();
      }
    }
  };
  ctx.slots.inject("settings.section", () => {
    if (settingsVisible) {
      ensureSectionRegistered();
    }
  });
  const bridgeControl = {
    version: 1,
    /** 把插件自己的面板交给宿主渲染（返回 React element） */
    render: (props = {}) => {
      return h(BridgePanel, {
        rpcCall,
        preferredTab: props.preferredTab,
        ...props
      });
    },
    /** 宿主收编面板后，撤下设置页那条重复入口 */
    setSettingsVisible: (visible) => sectionGate.setVisible(visible),
    settingsVisible: () => sectionGate.visible(),
    /** 运行时动态特性开关配置 (Issue #52) */
    configureFeatures: (flags) => setRuntimeFeatureOverrides(flags),
    getFeatures: () => getRuntimeFeatureOverrides()
  };
  if (typeof ctx.provide === "function") {
    ctx.provide("dsh-bridge", bridgeControl);
  }
}

    return module.exports;
  }
});
