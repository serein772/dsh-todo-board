/**
 * Browser half of the Todo Board bundle — sticky-note style.
 *
 * Three surfaces, one shared store:
 *   - sidebar.panellist  a note glyph that opens the board (dot while notes are open)
 *   - main               the board: a "pin a note" card and a grid of paper notes
 *   - conversation.input.dock  a small sticky note above the composer with the open count
 *
 * The data itself lives in the Host half, reached through two same-origin routes,
 * so it survives reloads, restarts, port changes and other browsers.
 */
/**
 * `window.__ModuleLoader__.load({ id })` must use the package name literally —
 * that is the browser module identity the Host composes into its boot graph.
 *
 * Do not try to derive it from `document.currentScript.src`: a combo script is
 * served from ONE url for many rows (`/plugins/??a/client.js,b/client.js&rev=…`),
 * so a url match returns whichever row comes first and the module registers
 * under that row's id instead of its own. The other half then fails to arrive
 * and the page reports "…does not register <package>".
 *
 * The IIFE matters too: combo entries are concatenated into one scope, so any
 * top-level `const` here would collide with a same-named helper in another
 * plugin and break the whole bundle with "Identifier … has already been declared".
 */
;(() => {
const MODULE_ID = 'dsh-todo-board'

window.__ModuleLoader__.load({
  id: MODULE_ID,
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'todo-board'
    const PANEL_KEY = 'todo-board'
    const STATE_URL = '/todo-board/state'
    const MUTATE_URL = '/todo-board/mutate'
    const DOCK_LIMIT = 5
    const FONT_KEY = 'todo-board.font.v5'

    // Latin/digit faces only; Chinese always falls through to KaiTi below.
    // A stack never ends with a generic family: a generic serif/sans would claim
    // the CJK glyphs first and bypass KaiTi.
    const FONT_CHOICES = [
      { id: 'times', label: 'Times New Roman', group: 'neat', stack: '"Times New Roman", Times, "Liberation Serif"' },
      { id: 'palatino', label: 'Palatino Linotype', group: 'neat', stack: '"Palatino Linotype", "Book Antiqua", Palatino' },
      { id: 'bookman', label: 'Bookman Old Style', group: 'neat', stack: '"Bookman Old Style", Bookman' },
      { id: 'garamond', label: 'Garamond', group: 'neat', stack: 'Garamond, "Times New Roman"' },
      { id: 'segoe', label: 'Segoe UI', group: 'neat', stack: '"Segoe UI", Arial' },
      { id: 'candara', label: 'Candara', group: 'neat', stack: 'Candara, "Segoe UI", Arial' },
      { id: 'chenyuluoyan', label: 'ChenYuluoyan 辰宇落雁', group: 'art', cjk: true, stack: '"ChenYuluoyan Thin", "KaiTi", "Segoe Script"' },
      { id: 'woaiwww', label: '我爱万伟伟手写体', group: 'art', cjk: true, stack: '"Woaiwww Hand", "ChenYuluoyan Thin", "KaiTi"' },
      { id: 'gabriola', label: 'Gabriola', group: 'art', stack: 'Gabriola' },
      { id: 'corsiva', label: 'Monotype Corsiva', group: 'art', stack: '"Monotype Corsiva", "Segoe Script"' },
      { id: 'french', label: 'French Script MT', group: 'art', stack: '"French Script MT", "Segoe Script"' },
      { id: 'pristina', label: 'Pristina', group: 'art', stack: 'Pristina, "Segoe Script"' },
      { id: 'freescript', label: 'Freestyle Script', group: 'art', stack: '"Freestyle Script", "Segoe Script"' },
    ]

    const DEFAULT_FONT_ID = 'chenyuluoyan'

    const FONT_GROUPS = [
      { id: 'art', labelKey: 'panel.font.group.art' },
      { id: 'neat', labelKey: 'panel.font.group.neat' },
    ]

    const DICTIONARIES = {
      zh: {
        'panel.title': '待做事项',
        'panel.subtitle': '写下要做的事，贴上就别忘了。',
        'panel.subtitle.empty': '板上还没有便利贴。',
        'panel.stamp': '已完成 {done} / {total}',
        'panel.loading': '正在把便利贴铺开…',
        'panel.add.placeholder': '写点要做的事，回车贴上',
        'panel.add.action': '贴上',
        'panel.filter.open': '待完成',
        'panel.filter.done': '已完成',
        'panel.empty.open': '全部贴完啦，写一张新的吧。',
        'panel.empty.done': '还没有贴完的便利贴。',
        'panel.foot.total': '共 {total} 张便利贴',
        'panel.footer.clear': '清掉已完成的',
        'panel.font': '换一种英文/数字字体',
        'panel.font.tag.cjk': '中文',
        'panel.font.tag.latin': '英文/数字',
        'panel.font.group.art': '艺术体',
        'panel.font.group.neat': '规整体',
        'cal.today': '今天',
        'cal.unscheduled': '未排期',
        'cal.none': '没有未排期的便利贴。',
        'cal.empty': '这一天还没有便利贴，上面写好点「贴上」。',
        'cal.viewUnscheduled': '查看未排期',
        'cal.clear': '不排期',
        'view.label': '视图',
        'view.calendar': '月历',
        'view.wall': '便利贴墙',
        'wall.title': '便利贴墙',
        'wall.empty': '还没有便利贴，上面写好贴一张。',
        'cal.pickHint': '已选中一张便利贴，点日历上的日期把它贴过去。',
        'cal.prev': '上个月',
        'cal.next': '下个月',
        'panel.add.date': '日期',
        'panel.error.load': '没读到便利贴：{detail}',
        'panel.error.save': '没贴上：{detail}',
        'panel.error.retry': '再试一次',
        'row.edit': '编辑',
        'row.delete': '撕掉',
        'row.markDone': '标记为已完成',
        'row.markOpen': '标记为未完成',
        'dock.title': '我的待办',
        'dock.pending': '{count} 张待完成',
        'dock.more': '还有 {count} 张',
        'dock.open': '打开待办面板',
        'dock.retry': '待办没读出来，点一下重试',
        'focus.title': '番茄钟',
        'focus.phase.focus': '专注',
        'focus.phase.short': '小憩',
        'focus.phase.long': '长休息',
        'focus.today': '今日 {count} 个番茄',
        'focus.start': '开始专注',
        'focus.pause': '暂停',
        'focus.continue': '继续',
        'focus.reset': '重置本段',
        'focus.skip': '跳到下一段',
        'focus.minutes': '{minutes} 分钟',
        'focus.mute': '静音提示音',
        'focus.unmute': '打开提示音',
        'focus.fold': '收起番茄钟',
        'focus.unfold': '展开番茄钟',
        'focus.task.none': '连一张便利贴，盯着它做',
        'focus.task.current': '专注：{text}',
        'focus.task.menu': '挑一张正在做的便利贴',
        'focus.task.clear': '不关联',
        'focus.task.empty': '没有待完成的便利贴。',
        'focus.finished.focus': '这一轮专注完成，去歇一会儿。',
        'focus.finished.break': '休息结束，准备好就来下一轮。',
        'focus.ask.done': '「{text}」做完了吗？',
        'focus.ask.yes': '标记完成',
        'focus.ask.no': '再做一轮',
      },
      en: {
        'panel.title': 'Todo Board',
        'panel.subtitle': 'Write it down, pin it, and stop holding it in your head.',
        'panel.subtitle.empty': 'The board is still empty.',
        'panel.stamp': 'Done {done} / {total}',
        'panel.loading': 'Spreading the notes out…',
        'panel.add.placeholder': 'Write a task, press Enter to pin it',
        'panel.add.action': 'Pin it',
        'panel.filter.open': 'Open',
        'panel.filter.done': 'Done',
        'panel.empty.open': 'All pinned and done. Add the next one when you are ready.',
        'panel.empty.done': 'No finished notes yet.',
        'panel.foot.total': '{total} notes',
        'panel.footer.clear': 'Clear finished',
        'panel.font': 'Change the Latin font',
        'panel.font.tag.cjk': 'CJK',
        'panel.font.tag.latin': 'Latin',
        'panel.font.group.art': 'Artistic',
        'panel.font.group.neat': 'Neat',
        'cal.today': 'Today',
        'cal.unscheduled': 'Unscheduled',
        'cal.none': 'No unscheduled notes.',
        'cal.empty': 'No notes on this day yet. Write one above and pin it.',
        'cal.viewUnscheduled': 'See unscheduled',
        'cal.clear': 'No date',
        'view.label': 'View',
        'view.calendar': 'Calendar',
        'view.wall': 'Wall',
        'wall.title': 'All notes',
        'wall.empty': 'No notes yet. Write one above and pin it.',
        'cal.pickHint': 'A note is selected — click a day to pin it there.',
        'cal.prev': 'Previous month',
        'cal.next': 'Next month',
        'panel.add.date': 'Date',
        'panel.error.load': 'Could not load the notes: {detail}',
        'panel.error.save': 'Could not pin it: {detail}',
        'panel.error.retry': 'Try again',
        'row.edit': 'Edit',
        'row.delete': 'Tear off',
        'row.markDone': 'Mark as done',
        'row.markOpen': 'Mark as open',
        'dock.title': 'My notes',
        'dock.pending': '{count} open',
        'dock.more': '{count} more',
        'dock.open': 'Open the board',
        'dock.retry': 'The notes did not load. Click to retry.',
        'focus.title': 'Focus timer',
        'focus.phase.focus': 'Focus',
        'focus.phase.short': 'Break',
        'focus.phase.long': 'Long break',
        'focus.today': '{count} today',
        'focus.start': 'Start focus',
        'focus.pause': 'Pause',
        'focus.continue': 'Resume',
        'focus.reset': 'Reset this round',
        'focus.skip': 'Skip to next',
        'focus.minutes': '{minutes} min',
        'focus.mute': 'Mute the chime',
        'focus.unmute': 'Turn the chime on',
        'focus.fold': 'Collapse the timer',
        'focus.unfold': 'Expand the timer',
        'focus.task.none': 'Link a note and work on it',
        'focus.task.current': 'Focusing: {text}',
        'focus.task.menu': 'Pick a note to work on',
        'focus.task.clear': 'No note',
        'focus.task.empty': 'No open notes.',
        'focus.finished.focus': 'Focus done — go take a break.',
        'focus.finished.break': 'Break over — ready for the next round.',
        'focus.ask.done': 'Did you finish “{text}”?',
        'focus.ask.yes': 'Mark it done',
        'focus.ask.no': 'One more round',
      },
    }

    const CSS = `
@font-face {
  font-family: "ChenYuluoyan Thin";
  src: url("todo-board/font/ChenYuluoyan-Thin.ttf") format("truetype"),
       url("todo-board/font") format("truetype");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "Woaiwww Hand";
  src: url("todo-board/font/WoaiwwwShouxieti.ttf") format("truetype");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

.tb-page,
.tb-dock {
  --tb-ink: #2b2418;
  --tb-ink-soft: rgba(43, 36, 24, 0.58);
  --tb-ink-line: rgba(43, 36, 24, 0.34);
  --tb-hand: var(--tb-latin, "ChenYuluoyan Thin"), "KaiTi", "STKaiti", "Kaiti SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-synthesis: none;
  --tb-yellow: #fdf0a3;
  --tb-pink: #ffd8de;
  --tb-mint: #ddf3cf;
  --tb-sky: #dbe8ff;
  --tb-peach: #ffe3c7;
  --tb-lilac: #e9ddff;
  --tb-tape: rgba(255, 255, 255, 0.45);
  --tb-shadow: 0 1px 1px rgba(31, 26, 16, 0.1), 0 12px 22px -16px rgba(31, 26, 16, 0.6);
}

.tb-page {
  height: 100%;
  min-height: 100%;
  overflow: auto;
  background-color: var(--dsw-alias-bg-base);
  background-image: radial-gradient(
    circle at 1px 1px,
    color-mix(in srgb, var(--dsw-alias-label-secondary) 14%, transparent) 1px,
    transparent 1px
  );
  background-size: 18px 18px;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-family: var(--tb-hand);
}
.tb-page * { box-sizing: border-box; }

.tb-inner {
  max-width: 740px;
  margin: 0 auto;
  padding: 28px 26px 64px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tb-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.tb-head__text { min-width: 0; }
.tb-head__side { flex: none; display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.tb-title {
  margin: 0;
  font-family: var(--tb-hand);
  font-size: 26px;
  line-height: 1.15;
  font-weight: 400;
  letter-spacing: 0.01em;
}
.tb-subtitle {
  margin: 7px 0 0;
  font-family: var(--tb-hand);
  font-size: 13.5px;
  line-height: 1.45;
  color: var(--dsw-alias-label-secondary);
}
.tb-stamp {
  flex: none;
  padding: 3px 10px;
  border: 1.5px dashed color-mix(in srgb, var(--dsw-alias-label-secondary) 55%, transparent);
  border-radius: 4px;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
  letter-spacing: 0.02em;
  white-space: nowrap;
  transform: rotate(-3.5deg);
  font-variant-numeric: tabular-nums;
}
.tb-font {
  flex: none;
  padding: 2px 7px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--tb-latin, "ChenYuluoyan Thin"), Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.tb-font__mark { font-family: var(--tb-latin, "ChenYuluoyan Thin"), Arial, sans-serif; }
.tb-font__name {
  margin-left: 6px;
  max-width: 108px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--tb-hand);
  font-size: 11px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.tb-font:hover {
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-primary);
}

/* font picker */
.tb-fontpick { position: relative; flex: none; }
.tb-fontmenu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  width: 236px;
  max-height: 320px;
  overflow: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 18px 36px -20px rgba(0, 0, 0, 0.5);
}
.tb-fontmenu__group { padding: 2px 0 4px; }
.tb-fontmenu__title {
  padding: 4px 8px 2px;
  font-size: 10.5px;
  line-height: 1.5;
  letter-spacing: 0.04em;
  color: var(--dsw-alias-label-secondary);
}
.tb-fontmenu__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}
.tb-fontmenu__item:hover { background: var(--dsw-alias-bg-layer-2); }
.tb-fontmenu__item[aria-selected="true"] { background: var(--dsw-alias-bg-layer-2); }
.tb-fontmenu__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-fontmenu__tag { flex: none; font-family: inherit; font-size: 9.5px; line-height: 1.4; padding: 1px 4px; border-radius: 3px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.tb-fontmenu__sample { flex: none; font-size: 11.5px; color: var(--dsw-alias-label-secondary); }

/* the "write a new note" card */
.tb-write {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 14px 12px;
  border: none;
  border-radius: 3px;
  background-color: var(--tb-yellow);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 30%);
  transform: rotate(-0.5deg);
  box-shadow: var(--tb-shadow);
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.tb-write:focus-within { transform: rotate(0deg); box-shadow: 0 2px 2px rgba(31, 26, 16, 0.12), 0 16px 26px -16px rgba(31, 26, 16, 0.62); }
.tb-write__tape,
.tb-note__tape,
.tb-dock__tape {
  position: absolute;
  background: var(--tb-tape);
  border: 1px solid rgba(255, 255, 255, 0.3);
  pointer-events: none;
}
.tb-write__tape { top: -7px; left: 20px; width: 54px; height: 15px; transform: rotate(-2.5deg); }
.tb-write__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 15px;
  line-height: 1.5;
  padding: 2px 0;
}
.tb-write__input::placeholder { color: rgba(43, 36, 24, 0.42); }
.tb-write__submit {
  flex: none;
  padding: 5px 12px;
  border: 1.5px solid rgba(43, 36, 24, 0.48);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.42);
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transform: rotate(-0.6deg);
  transition: background-color 120ms ease, opacity 120ms ease;
}
.tb-write__submit:hover:not(:disabled) { background: rgba(255, 255, 255, 0.72); }
.tb-write__submit:disabled { opacity: 0.45; cursor: default; }

/* filters */
.tb-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.tb-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-label-secondary) 30%, transparent);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
  cursor: pointer;
  transition: color 120ms ease, background-color 120ms ease, border-color 120ms ease;
}
.tb-tab:hover { color: var(--dsw-alias-label-primary); }
.tb-tab[aria-selected="true"] {
  background: var(--tb-yellow);
  border-color: transparent;
  color: var(--tb-ink);
  box-shadow: 0 2px 6px -3px rgba(31, 26, 16, 0.5);
  transform: rotate(-0.6deg);
}
.tb-tab__count { font-variant-numeric: tabular-nums; opacity: 0.75; }

/* the board */
.tb-board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(198px, 1fr));
  gap: 16px;
  padding: 4px 4px 6px;
}
.tb-note {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 138px;
  padding: 15px 13px 10px;
  border-radius: 3px;
  background-color: var(--tb-paper, var(--tb-yellow));
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 30%);
  transform: rotate(var(--tb-rot, 0deg));
  box-shadow: var(--tb-shadow);
  color: var(--tb-ink);
  transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}
.tb-note:hover, .tb-note:focus-within {
  transform: rotate(0deg) translateY(-2px);
  box-shadow: 0 2px 2px rgba(31, 26, 16, 0.12), 0 16px 26px -16px rgba(31, 26, 16, 0.62);
  z-index: 1;
}
.tb-note[data-done="true"] {
  background-color: color-mix(in srgb, var(--tb-paper, var(--tb-yellow)) 62%, #ffffff);
}
.tb-note__tape { top: -7px; left: 50%; width: 46px; height: 14px; margin-left: -23px; transform: rotate(-1.6deg); }
.tb-note__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tb-note__date {
  font-family: var(--tb-hand);
  font-size: 11px;
  line-height: 1.3;
  color: var(--tb-ink-soft);
  font-variant-numeric: tabular-nums;
}
.tb-note__check {
  flex: none;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1.6px solid var(--tb-ink-line);
  border-radius: 4px;
  background: transparent;
  color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.tb-note__check:hover { border-color: rgba(43, 36, 24, 0.7); }
.tb-note__check[aria-checked="true"] {
  background: var(--tb-ink);
  border-color: var(--tb-ink);
  color: #ffffff;
}
.tb-note__text {
  flex: 1;
  margin: 0;
  font-family: var(--tb-hand);
  font-size: 15px;
  line-height: 1.5;
  color: var(--tb-ink);
  word-break: break-word;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.tb-note[data-done="true"] .tb-note__text {
  color: rgba(43, 36, 24, 0.62);
  text-decoration: line-through;
  text-decoration-thickness: 1.5px;
  text-decoration-color: rgba(43, 36, 24, 0.42);
}
.tb-note__edit {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 2px 4px;
  border: none;
  border-bottom: 1.6px dashed var(--tb-ink-line);
  outline: none;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 2px;
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 15px;
  line-height: 1.5;
}
.tb-note__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  min-height: 26px;
  opacity: 0;
  transition: opacity 120ms ease;
}
.tb-note:hover .tb-note__foot, .tb-note:focus-within .tb-note__foot { opacity: 1; }
@media (hover: none) { .tb-note__foot { opacity: 1; } }
.tb-note__act {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(43, 36, 24, 0.55);
  cursor: pointer;
  transition: background-color 100ms ease, color 100ms ease;
}
.tb-note__act:hover { background: rgba(255, 255, 255, 0.42); color: var(--tb-ink); }
.tb-note__act--danger:hover { color: #8f2c1f; }

.tb-empty {
  padding: 42px 22px;
  border: 1.6px dashed color-mix(in srgb, var(--dsw-alias-label-secondary) 45%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--tb-yellow) 20%, transparent);
  text-align: center;
  font-family: var(--tb-hand);
  font-size: 14px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}

.tb-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.tb-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: underline dashed;
  text-underline-offset: 3px;
}
.tb-link:hover { color: var(--dsw-alias-label-primary); }

.tb-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 11px;
  border-radius: 3px;
  border: 1.5px dashed color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
  color: var(--dsw-alias-state-error-primary);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
}
.tb-banner__text { flex: 1; min-width: 0; }
.tb-banner__retry {
  flex: none;
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* calendar */
.tb-cal { display: flex; flex-direction: column; gap: 9px; }
.tb-cal__bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap;   font-family: var(--tb-hand);
}
.tb-cal__navbtn {
  width: 26px;
  height: 26px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.tb-cal__navbtn:hover {
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-primary);
}
.tb-cal__title {
  min-width: 104px;
  font-family: var(--tb-hand);
  font-size: 18px;
  font-weight: 400;
  line-height: 1.3;
  color: var(--dsw-alias-label-primary);
  font-variant-numeric: tabular-nums;
}
.tb-cal__today {
  margin-left: 4px;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--tb-hand);
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.tb-cal__today:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.tb-cal__unscheduled {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px dashed color-mix(in srgb, var(--dsw-alias-label-secondary) 40%, transparent);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--tb-hand);
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}
.tb-cal__unscheduled:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.tb-cal__unscheduled[data-active="true"] {
  border-style: solid;
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
}
.tb-cal__count { font-variant-numeric: tabular-nums;   font-family: var(--tb-hand);
}
.tb-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  text-align: center;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}
.tb-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.tb-day {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 82px;
  min-width: 0;
  padding: 5px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--tb-hand);
  font-size: 11px;
  text-align: left;
  cursor: pointer;
  transition: border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease;
}
.tb-day:hover { border-color: var(--dsw-alias-border-l2); }
.tb-page[data-dragging="true"] .tb-day { border-style: dashed; }
.tb-day[data-out="true"] { opacity: 0.42; }
.tb-day[data-selected="true"] {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent);
}
.tb-day__num {
  align-self: flex-start;
  min-width: 19px;
  height: 19px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 19px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
  font-family: var(--tb-hand);
}
.tb-day[data-today="true"] .tb-day__num {
  background: var(--dsw-alias-brand-primary);
  color: #ffffff;
}
.tb-day__chips { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tb-day__chip {
  display: block;
  min-width: 0;
  padding: 1px 4px;
  border-left: 2px solid var(--tb-paper, var(--dsw-alias-brand-primary));
  border-radius: 3px;
  background: color-mix(in srgb, var(--tb-paper, var(--dsw-alias-bg-layer-2)) 20%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-primary);
  font-size: 10.5px;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--tb-hand);
}
.tb-day__chip[data-done="true"] { opacity: 0.55; text-decoration: line-through; }
.tb-day__more { font-size: 10px; line-height: 1.5; color: var(--dsw-alias-label-secondary);   font-family: var(--tb-hand);
}

.tb-daylist { display: flex; flex-direction: column; gap: 12px; }
.tb-daylist__head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tb-daylist__title {
  margin: 0;
  font-family: var(--tb-hand);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.4;
  color: var(--dsw-alias-label-primary);
}
.tb-daylist__count { font-size: 11.5px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums;   font-family: var(--tb-hand);
}
.tb-daylist__head .tb-tabs { margin-left: auto; }
.tb-empty__link { display: block; margin: 8px auto 0; }
.tb-hint {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px dashed var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  color: var(--dsw-alias-brand-primary);
  font-family: var(--tb-hand);
  font-size: 12px;
  line-height: 1.5;
}
.tb-note[draggable="true"] { cursor: grab; }
.tb-note[draggable="true"]:active { cursor: grabbing; }
.tb-note[data-picked="true"] {
  box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary), var(--tb-shadow);
  transform: rotate(0deg) translateY(-2px);
}
.tb-write { flex-wrap: wrap; }
/* custom date field + popover picker */
.tb-datefield { position: relative; flex: none; }
.tb-datefield__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 168px;
  padding: 4px 8px;
  border: 1px dashed rgba(43, 36, 24, 0.35);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.35);
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.tb-datefield__btn:hover {
  background: rgba(255, 255, 255, 0.6);
  border-color: rgba(43, 36, 24, 0.5);
}
.tb-datefield__value {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.tb-picker {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 30;
  width: 240px;
  padding: 8px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 18px 36px -20px rgba(0, 0, 0, 0.5);
  font-family: var(--tb-hand);
  color: var(--dsw-alias-label-primary);
}
.tb-picker__head { display: flex; align-items: center; gap: 4px; }
.tb-picker__title {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
  font-variant-numeric: tabular-nums;
}
.tb-picker__nav {
  width: 24px;
  height: 24px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.tb-picker__nav:hover {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.tb-picker__week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin: 6px 0 2px;
  text-align: center;
  font-size: 10px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}
.tb-picker__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.tb-picker__day {
  position: relative;
  height: 26px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  font-variant-numeric: tabular-nums;
}
.tb-picker__day:hover { background: var(--dsw-alias-bg-layer-2); }
.tb-picker__day[data-out="true"] { opacity: 0.4; }
.tb-picker__day[data-today="true"] { box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary); }
.tb-picker__day[data-selected="true"] {
  background: var(--dsw-alias-brand-primary);
  color: #ffffff;
}
.tb-picker__day[data-marked="true"]::after {
  content: "";
  position: absolute;
  bottom: 3px;
  left: 50%;
  width: 3px;
  height: 3px;
  margin-left: -1.5px;
  border-radius: 50%;
  background: var(--dsw-alias-brand-primary);
}
.tb-picker__day[data-selected="true"][data-marked="true"]::after { background: #ffffff; }
.tb-picker__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}

.tb-write__datelabel { font-family: var(--tb-hand); font-size: 12px; color: rgba(43, 36, 24, 0.55); }

@media (max-width: 560px) {
  .tb-day { min-height: 64px; padding: 4px; }
  .tb-day__chip { font-size: 9.5px; }
  .tb-cal__title { font-size: 16px; min-width: 92px; }
  .tb-daylist__head .tb-tabs { margin-left: 0; }
  .tb-datefield { width: 100%; }
  .tb-datefield__btn { max-width: 100%; }
}
/* view switch */
.tb-viewbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tb-viewswitch {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.tb-viewswitch__btn {
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
  padding: 4px 11px;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.tb-viewswitch__btn:hover { color: var(--dsw-alias-label-primary); }
.tb-viewswitch__btn[aria-selected="true"] {
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.tb-wall { display: flex; flex-direction: column; gap: 12px; }
.tb-page[data-view="calendar"] .tb-wall { display: none; }
.tb-page[data-view="wall"] .tb-cal,
.tb-page[data-view="wall"] .tb-daylist { display: none; }

/* the small sticky note above the composer */
.tb-dock { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; font-family: var(--tb-hand); }
.tb-dock__note {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: min(100%, 520px);
  padding: 5px 11px 5px 10px;
  border: none;
  border-radius: 2px;
  background-color: var(--tb-yellow);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 34%);
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
  transform: rotate(-0.7deg);
  box-shadow: 0 1px 1px rgba(31, 26, 16, 0.1), 0 8px 16px -12px rgba(31, 26, 16, 0.55);
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.tb-dock__note:hover { transform: rotate(0deg) translateY(-1px); }
.tb-dock__note[aria-expanded="true"] { transform: rotate(0deg); }
.tb-dock__tape { top: -5px; left: 50%; width: 32px; height: 10px; margin-left: -16px; transform: rotate(-1.4deg); }
.tb-dock__label { flex: none; font-weight: 400; letter-spacing: 0.01em; }
.tb-dock__count { flex: none; color: rgba(43, 36, 24, 0.62); font-variant-numeric: tabular-nums; }
.tb-dock__next {
  flex: 1;
  min-width: 0;
  max-width: 300px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgba(43, 36, 24, 0.72);
}
.tb-dock__next::before { content: "·"; margin-right: 6px; opacity: 0.55; }
.tb-dock__chev { flex: none; display: inline-flex; color: rgba(43, 36, 24, 0.6); transition: transform 150ms ease; }
.tb-dock__note[aria-expanded="true"] .tb-dock__chev { transform: rotate(180deg); }
.tb-dock__pad {
  width: 100%;
  max-width: 420px;
  padding: 8px 10px 6px;
  border-radius: 3px;
  background-color: var(--tb-yellow);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0) 30%);
  transform: rotate(-0.4deg);
  box-shadow: var(--tb-shadow);
}
@media (prefers-reduced-motion: no-preference) {
  .tb-dock__pad { animation: tb-drop 140ms ease-out; }
}
@keyframes tb-drop { from { opacity: 0; transform: translateY(-4px) rotate(-0.4deg); } to { opacity: 1; transform: rotate(-0.4deg); } }
.tb-dock__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 5px 4px;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 13px;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
}
.tb-dock__row:hover { background: rgba(255, 255, 255, 0.38); }
.tb-dock__check {
  flex: none;
  width: 15px;
  height: 15px;
  margin-top: 2px;
  border: 1.5px solid rgba(43, 36, 24, 0.4);
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
}
.tb-dock__rowtext { min-width: 0; overflow-wrap: anywhere; }
.tb-dock__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 5px;
  padding-top: 6px;
  border-top: 1px dashed rgba(43, 36, 24, 0.25);
  font-family: var(--tb-hand);
  font-size: 11.5px;
  line-height: 1.5;
  color: rgba(43, 36, 24, 0.62);
  font-variant-numeric: tabular-nums;
}
.tb-dock__open {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: var(--tb-ink);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* pomodoro focus card */
.tb-focus {
  --tb-focus-accent: #d9634f;
  position: relative;
  padding: 16px 17px 13px;
  border-radius: 4px;
  background-color: #fffaf0;
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.55), rgba(255, 255, 255, 0) 38%);
  color: var(--tb-ink);
  box-shadow: var(--tb-shadow);
}
.tb-focus::after {
  content: "";
  position: absolute;
  inset: 6px;
  border: 1px dashed rgba(43, 36, 24, 0.15);
  border-radius: 3px;
  pointer-events: none;
}
.tb-focus[data-phase="short"] { --tb-focus-accent: #5f9a72; }
.tb-focus[data-phase="long"] { --tb-focus-accent: #4f7fa8; }
.tb-focus__tape {
  position: absolute;
  top: -7px;
  left: 50%;
  width: 62px;
  height: 15px;
  margin-left: -31px;
  background: var(--tb-tape);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transform: rotate(-1.8deg);
  pointer-events: none;
}
.tb-focus__row { display: flex; align-items: center; gap: 20px; }
.tb-focus__clock {
  position: relative;
  flex: none;
  width: 112px;
  height: 112px;
  display: grid;
  place-items: center;
}
.tb-focus[data-running="true"] .tb-focus__clock { animation: tb-breathe 4.6s ease-in-out infinite; }
.tb-focus__ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.tb-focus__ring-track { fill: none; stroke: rgba(43, 36, 24, 0.1); stroke-width: 5; }
.tb-focus__ring-fill {
  fill: none;
  stroke: var(--tb-focus-accent);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 260ms linear, stroke 200ms ease;
}
.tb-focus[data-running="false"] .tb-focus__ring-fill { stroke: rgba(43, 36, 24, 0.42); }
.tb-focus__face { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1px; }
.tb-focus__time {
  font-family: var(--tb-latin, "ChenYuluoyan Thin"), Arial, sans-serif;
  font-size: 25px;
  line-height: 1.1;
  letter-spacing: 0.01em;
  font-variant-numeric: tabular-nums;
}
.tb-focus__phase {
  font-family: var(--tb-hand);
  font-size: 11.5px;
  line-height: 1.4;
  letter-spacing: 0.08em;
  color: var(--tb-ink-soft);
}
.tb-focus__meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.tb-focus__top { display: flex; align-items: center; gap: 8px; }
.tb-focus__title {
  margin: 0;
  font-family: var(--tb-hand);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0.06em;
}
.tb-focus__count {
  margin-left: auto;
  font-family: var(--tb-hand);
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--tb-ink-soft);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.tb-focus__fold {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--tb-ink-soft);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.tb-focus__fold:hover { background: rgba(43, 36, 24, 0.08); color: var(--tb-ink); }
.tb-focus__fold svg { transform: rotate(180deg); transition: transform 150ms ease; }
.tb-focus[data-folded="true"] .tb-focus__fold svg { transform: rotate(0deg); }
.tb-focus__dots { display: flex; gap: 5px; }
.tb-focus__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.4px solid rgba(43, 36, 24, 0.32);
  background: transparent;
  transition: background-color 160ms ease, border-color 160ms ease;
}
.tb-focus__dot[data-on="true"] { background: #d9634f; border-color: #d9634f; }
.tb-focus__picker { position: relative; display: flex; min-width: 0; }
.tb-focus__task {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 9px;
  border: 1px dashed rgba(43, 36, 24, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.tb-focus__task:hover { border-color: rgba(43, 36, 24, 0.55); background: rgba(255, 255, 255, 0.82); }
.tb-focus__task[data-linked="true"] { border-style: solid; border-color: rgba(43, 36, 24, 0.26); }
.tb-focus__tasktext { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.tb-focus__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 30;
  width: min(320px, 78vw);
  max-height: 240px;
  overflow: auto;
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 18px 36px -20px rgba(0, 0, 0, 0.5);
}
.tb-focus__menutitle {
  padding: 4px 8px 3px;
  font-family: var(--tb-hand);
  font-size: 10.5px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.tb-focus__menuitem {
  display: block;
  width: 100%;
  padding: 5px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
  text-align: left;
  cursor: pointer;
}
.tb-focus__menuitem:hover { background: var(--dsw-alias-bg-layer-2); }
.tb-focus__menuitem[data-current="true"] { color: var(--dsw-alias-brand-primary); }
.tb-focus__menuitem--clear {
  margin-top: 4px;
  border-top: 1px dashed rgba(43, 36, 24, 0.18);
  border-radius: 0;
  color: rgba(43, 36, 24, 0.62);
}
.tb-focus__menuempty {
  padding: 8px;
  font-family: var(--tb-hand);
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
.tb-focus__controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tb-focus__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 12px;
  border: 1.5px solid rgba(43, 36, 24, 0.42);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.42);
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.4;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.tb-focus__btn:hover { background: rgba(255, 255, 255, 0.78); }
.tb-focus__btn--primary {
  min-width: 82px;
  border-color: var(--tb-ink);
  background: var(--tb-ink);
  color: #fdf6e9;
}
.tb-focus__btn--primary:hover { background: #3b3324; }
.tb-focus__btn--icon { padding: 5px 7px; color: rgba(43, 36, 24, 0.72); }
.tb-focus__btn--icon[aria-pressed="true"] { color: rgba(43, 36, 24, 0.45); }
.tb-focus__presets {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  flex-wrap: wrap;
}
.tb-focus__chip {
  padding: 2px 8px;
  border: 1px solid rgba(43, 36, 24, 0.26);
  border-radius: 999px;
  background: transparent;
  color: var(--tb-ink-soft);
  font-family: var(--tb-hand);
  font-size: 11px;
  line-height: 1.5;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}
.tb-focus__chip:hover { border-color: rgba(43, 36, 24, 0.5); color: var(--tb-ink); }
.tb-focus__chip[data-active="true"] {
  border-color: rgba(43, 36, 24, 0.48);
  background: rgba(43, 36, 24, 0.08);
  color: var(--tb-ink);
}
.tb-focus__flash {
  margin-top: 10px;
  padding: 6px 10px;
  border: 1.5px dashed color-mix(in srgb, var(--tb-focus-accent) 55%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--tb-focus-accent) 8%, transparent);
  color: color-mix(in srgb, var(--tb-focus-accent) 82%, #5b2418);
  font-family: var(--tb-hand);
  font-size: 12px;
  line-height: 1.5;
}
.tb-focus__ask {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding: 7px 10px;
  border: 1px dashed rgba(217, 99, 79, 0.45);
  border-radius: 4px;
  background: rgba(217, 99, 79, 0.07);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
}
.tb-focus__asktext { flex: 1; min-width: 140px; }
.tb-focus__askbtn {
  padding: 3px 9px;
  border: 1.4px solid rgba(43, 36, 24, 0.4);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.55);
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 12px;
  line-height: 1.4;
  cursor: pointer;
}
.tb-focus__askbtn--yes { border-color: var(--tb-ink); background: var(--tb-ink); color: #fdf6e9; }
.tb-focus[data-folded="true"] { padding: 9px 14px; }
.tb-focus[data-folded="true"]::after { inset: 4px; }
.tb-focus__mini { display: flex; align-items: center; gap: 9px; min-width: 0; }
.tb-focus__minidot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--tb-focus-accent); }
.tb-focus[data-running="true"] .tb-focus__minidot { animation: tb-pulse 1.9s ease-in-out infinite; }
.tb-focus__minitime {
  flex: none;
  font-family: var(--tb-latin, "ChenYuluoyan Thin"), Arial, sans-serif;
  font-size: 18px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.tb-focus__minitask {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-family: var(--tb-hand);
  font-size: 12px;
  line-height: 1.5;
  color: var(--tb-ink-soft);
}
.tb-focus__miniactions { flex: none; display: flex; align-items: center; gap: 6px; }
.tb-focus__miniactions .tb-focus__fold { margin-left: 0; }
@keyframes tb-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.015); } }
@keyframes tb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) {
  .tb-focus[data-running="true"] .tb-focus__clock,
  .tb-focus[data-running="true"] .tb-focus__minidot { animation: none; }
  .tb-focus__ring-fill { transition: none; }
}
/* a running focus timer beside the composer's pending summary */
.tb-dock__focus {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  max-width: min(100%, 520px);
  padding: 4px 11px;
  border: 1px dashed rgba(43, 36, 24, 0.3);
  border-radius: 999px;
  background: #fffaf0;
  color: var(--tb-ink);
  font-family: var(--tb-hand);
  font-size: 12.5px;
  line-height: 1.5;
  cursor: pointer;
  box-shadow: 0 6px 14px -12px rgba(31, 26, 16, 0.55);
  transition: border-color 120ms ease, background-color 120ms ease;
}
.tb-dock__focus:hover { border-style: solid; background: #fffdf7; }
.tb-dock__focusdot { flex: none; width: 7px; height: 7px; border-radius: 50%; background: #d9634f; }
.tb-dock__focus[data-running="true"] .tb-dock__focusdot { animation: tb-pulse 1.9s ease-in-out infinite; }
.tb-dock__focustime {
  flex: none;
  font-family: var(--tb-latin, "ChenYuluoyan Thin"), Arial, sans-serif;
  font-variant-numeric: tabular-nums;
}
.tb-dock__focusphase { flex: none; color: rgba(43, 36, 24, 0.62); }
.tb-dock__focustask {
  min-width: 0;
  max-width: 220px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgba(43, 36, 24, 0.72);
}

@media (max-width: 560px) {
  .tb-focus { padding: 13px 13px 11px; }
  .tb-focus__row { gap: 13px; }
  .tb-focus__clock { width: 88px; height: 88px; }
  .tb-focus__time { font-size: 20px; }
  .tb-focus__count { display: none; }
  .tb-focus__presets { margin-left: 0; width: 100%; }
  .tb-focus__btn--primary { min-width: 74px; }
}

@media (max-width: 560px) {
  .tb-inner { padding: 20px 15px 56px; gap: 17px; }
  .tb-title { font-size: 23px; }
  .tb-stamp { display: none; }
  .tb-board { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 13px; }
  .tb-note { min-height: 126px; }
}
`

    /* ------------------------------------------------------------------ */
    /* shared data store                                                   */
    /* ------------------------------------------------------------------ */

    async function readPayload(response) {
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok || payload === null || payload.ok !== true) {
        const detail = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`
        throw new Error(detail)
      }
      return payload
    }

    function asTodos(list) {
      return Array.isArray(list) ? list.filter((todo) => todo && typeof todo.text === 'string') : []
    }

    function createStore() {
      let state = { status: 'idle', todos: [], error: null, busy: false }
      const listeners = new Set()
      let inFlight = null
      let chain = Promise.resolve()
      let pendingWrites = 0

      const emit = () => {
        for (const listener of [...listeners]) {
          try {
            listener()
          } catch (error) {
            console.error('todo-board: store listener crashed', error)
          }
        }
      }
      const patch = (next) => {
        state = { ...state, ...next }
        emit()
      }

      const load = () => {
        if (inFlight !== null) return inFlight
        if (state.status === 'idle') patch({ status: 'loading' })
        inFlight = (async () => {
          try {
            const response = await fetch(STATE_URL, { credentials: 'same-origin', cache: 'no-store' })
            const payload = await readPayload(response)
            patch({ status: 'ready', todos: asTodos(payload.todos), error: null })
          } catch (error) {
            patch({
              status: state.todos.length > 0 ? 'ready' : 'error',
              error: String(error?.message ?? error),
            })
          } finally {
            inFlight = null
          }
        })()
        return inFlight
      }

      const write = async (operation) => {
        pendingWrites += 1
        patch({ busy: true, error: null })
        try {
          const response = await fetch(MUTATE_URL, {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(operation),
          })
          const payload = await readPayload(response)
          patch({ status: 'ready', todos: asTodos(payload.todos), error: null })
          return true
        } catch (error) {
          patch({ error: String(error?.message ?? error) })
          return false
        } finally {
          pendingWrites -= 1
          if (pendingWrites === 0) patch({ busy: false })
        }
      }

      const mutate = (operation) => {
        const run = chain.then(() => write(operation))
        chain = run.then(
          () => undefined,
          () => undefined,
        )
        return run
      }

      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        start() {
          if (state.status === 'idle') void load()
        },
        refresh() {
          if (inFlight === null) void load()
        },
        load,
        mutate,
      }
    }

    /* ------------------------------------------------------------------ */
    /* font choice (Latin + digits only)                                   */
    /* ------------------------------------------------------------------ */

    const VIEW_KEY = 'todo-board.view'

    function readView() {
      try {
        return window.localStorage.getItem(VIEW_KEY) === 'wall' ? 'wall' : 'calendar'
      } catch {
        return 'calendar'
      }
    }

    function writeView(next) {
      try {
        window.localStorage.setItem(VIEW_KEY, next)
      } catch {
        /* preference only */
      }
    }

    const fontStore = (() => {
      let current = null
      const listeners = new Set()
      const read = () => {
        if (current !== null) return current
        current = FONT_CHOICES.find((choice) => choice.id === DEFAULT_FONT_ID) || FONT_CHOICES[0]
        try {
          const saved = window.localStorage.getItem(FONT_KEY)
          const found = FONT_CHOICES.find((choice) => choice.id === saved)
          if (found !== undefined) current = found
        } catch {
          /* private mode without storage: keep the default */
        }
        return current
      }
      return {
        get: () => read(),
        set(id) {
          const found = FONT_CHOICES.find((choice) => choice.id === id)
          if (found === undefined) return
          current = found
          try {
            window.localStorage.setItem(FONT_KEY, found.id)
          } catch {
            /* preference only; the choice still applies this session */
          }
          for (const listener of [...listeners]) listener()
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
      }
    })()

    /* ------------------------------------------------------------------ */
    /* paper helpers                                                       */
    /* ------------------------------------------------------------------ */

    const PAPER = ['yellow', 'pink', 'mint', 'sky', 'peach', 'lilac']

    function hashOf(text) {
      let hash = 2166136261
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
      }
      return hash >>> 0
    }

    function paperOf(id) {
      return `var(--tb-${PAPER[hashOf(String(id)) % PAPER.length]})`
    }

    function tiltOf(id) {
      const step = hashOf(String(id)) % 25
      return `${(step / 10 - 1.2).toFixed(2)}deg`
    }

    /* ------------------------------------------------------------------ */
    /* calendar helpers                                                    */
    /* ------------------------------------------------------------------ */

    const pad2 = (value) => String(value).padStart(2, '0')
    const ymdOf = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    const todayYmd = () => ymdOf(new Date())

    function parseYmd(value) {
      if (typeof value !== 'string') return null
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
      if (match === null) return null
      const year = Number(match[1])
      const month = Number(match[2]) - 1
      const day = Number(match[3])
      const date = new Date(year, month, day)
      if (Number.isNaN(date.getTime())) return null
      if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
      return date
    }

    /** 42 cells starting on the Monday of the week that holds the 1st. */
    function monthGrid(year, monthIndex) {
      const first = new Date(year, monthIndex, 1)
      const offset = (first.getDay() + 6) % 7
      const cells = []
      for (let index = 0; index < 42; index += 1) {
        const date = new Date(year, monthIndex, 1 - offset + index)
        cells.push({ date: ymdOf(date), day: date.getDate(), inMonth: date.getMonth() === monthIndex })
      }
      return cells
    }

    function addMonths(year, monthIndex, delta) {
      const date = new Date(year, monthIndex + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    }

    const WEEKDAY_LABELS = {
      zh: ['一', '二', '三', '四', '五', '六', '日'],
      en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    }

    function shortDay(value, locale) {
      const date = parseYmd(value)
      if (date === null) return ''
      try {
        return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
      } catch {
        return ''
      }
    }

    function formatDayTitle(value, locale) {
      const date = parseYmd(value)
      if (date === null) return value
      try {
        return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'long',
          day: 'numeric',
          weekday: 'short',
        })
      } catch {
        return value
      }
    }

    /* ------------------------------------------------------------------ */
    /* pomodoro focus timer                                                */
    /* ------------------------------------------------------------------ */

    const TIMER_KEY = 'todo-board.pomodoro.v2'
    const FOCUS_PRESETS = [15, 25, 50]
    const SHORT_BREAK_MINUTES = 5
    const LONG_BREAK_MINUTES = 15
    const LONG_BREAK_EVERY = 4
    const TIMER_TICK_MS = 250
    const MINUTE_MS = 60000
    const RING_RADIUS = 46
    const RING_LENGTH = 2 * Math.PI * RING_RADIUS

    const PHASE_TEXT_KEY = {
      focus: 'focus.phase.focus',
      short: 'focus.phase.short',
      long: 'focus.phase.long',
    }

    const phaseMinutes = (phase, focusMinutes) =>
      phase === 'short' ? SHORT_BREAK_MINUTES : phase === 'long' ? LONG_BREAK_MINUTES : focusMinutes

    const phaseDuration = (state) => phaseMinutes(state.phase, state.focusMinutes) * MINUTE_MS

    function formatClock(ms) {
      const total = Math.max(0, Math.ceil(ms / 1000))
      return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`
    }

    /**
     * One Pomodoro clock shared by the page card and the composer dock.
     *
     * Only the absolute `endsAt` is trusted while running, so a reload, a throttled
     * background tab, or a laptop waking from sleep still reports the right time.
     * Everything else (session length, linked note, daily count, chime, folded
     * layout) is a small localStorage preference. Nothing is written to the Host.
     */
    function createPomodoro() {
      const defaultState = () => ({
        phase: 'focus',
        running: false,
        endsAt: null,
        remaining: 25 * MINUTE_MS,
        focusMinutes: 25,
        completed: 0,
        day: todayYmd(),
        taskId: null,
        muted: false,
        folded: false,
        lastFinish: null,
      })

      const listeners = new Set()
      let state = defaultState()
      let handle = null
      let audio = null

      const emit = () => {
        for (const listener of [...listeners]) {
          try {
            listener()
          } catch (error) {
            console.error('todo-board: pomodoro listener crashed', error)
          }
        }
      }

      const persist = () => {
        try {
          const { lastFinish, ...rest } = state
          window.localStorage.setItem(TIMER_KEY, JSON.stringify(rest))
        } catch {
          /* a timer still runs without storage; only the preference is lost */
        }
      }

      const subscribe = (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }

      const unlockAudio = () => {
        try {
          const Ctor = window.AudioContext || window.webkitAudioContext
          if (typeof Ctor !== 'function') return
          if (audio === null) audio = new Ctor()
          if (audio.state === 'suspended') void audio.resume()
        } catch {
          audio = null
        }
      }

      /** A soft three-note bell; every failure is swallowed so the clock keeps going. */
      const chime = () => {
        if (state.muted) return
        unlockAudio()
        if (audio === null) return
        try {
          const start = audio.currentTime + 0.02
          const notes = [
            [880, 0, 0.16],
            [1174.66, 0.2, 0.18],
            [1567.98, 0.42, 0.34],
          ]
          for (const [frequency, offset, length] of notes) {
            const oscillator = audio.createOscillator()
            const gain = audio.createGain()
            oscillator.type = 'sine'
            oscillator.frequency.value = frequency
            gain.gain.setValueAtTime(0.0001, start + offset)
            gain.gain.exponentialRampToValueAtTime(0.16, start + offset + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + length)
            oscillator.connect(gain)
            gain.connect(audio.destination)
            oscillator.start(start + offset)
            oscillator.stop(start + offset + length + 0.02)
          }
        } catch {
          /* no audio device, no problem */
        }
      }

      const stopTick = () => {
        if (handle === null) return
        window.clearInterval(handle)
        handle = null
      }

      /** Fold the absolute deadline back into `remaining`; true when it reached zero. */
      const sync = () => {
        if (!state.running || state.endsAt === null) return false
        const remaining = Math.max(0, state.endsAt - Date.now())
        state = { ...state, remaining }
        return remaining <= 0
      }

      const startTick = () => {
        if (handle !== null) return
        handle = window.setInterval(() => {
          if (!state.running) {
            stopTick()
            return
          }
          if (sync()) finish(false)
          else emit()
        }, TIMER_TICK_MS)
      }

      const finish = (silent) => {
        stopTick()
        const at = Date.now()
        const finished = state.phase
        let next = state
        if (finished === 'focus') {
          const day = todayYmd()
          const completed = (state.day === day ? state.completed : 0) + 1
          next = { ...state, day, completed, phase: completed % LONG_BREAK_EVERY === 0 ? 'long' : 'short' }
        } else {
          next = { ...state, phase: 'focus' }
        }
        const duration = phaseDuration(next)
        // A finished focus starts its break right away; a finished break waits for the
        // user, because nobody wants a new focus block to begin unattended.
        const autoStart = finished === 'focus'
        state = {
          ...next,
          running: autoStart,
          endsAt: autoStart ? at + duration : null,
          remaining: duration,
          lastFinish: { phase: finished, at, taskId: state.taskId },
        }
        if (!silent) chime()
        persist()
        emit()
        if (autoStart) startTick()
      }

      const commit = () => {
        persist()
        emit()
      }

      const start = () => {
        unlockAudio()
        if (state.running) return
        if (state.remaining <= 0) state = { ...state, remaining: phaseDuration(state) }
        state = { ...state, running: true, endsAt: Date.now() + state.remaining }
        startTick()
        commit()
      }

      const pause = () => {
        if (!state.running) return
        stopTick()
        state = {
          ...state,
          running: false,
          endsAt: null,
          remaining: Math.max(0, (state.endsAt ?? 0) - Date.now()),
        }
        commit()
      }

      const toggle = () => {
        if (state.running) pause()
        else start()
      }

      const reset = () => {
        stopTick()
        state = { ...state, running: false, endsAt: null, remaining: phaseDuration(state) }
        commit()
      }

      const skip = () => {
        stopTick()
        const longDue = state.completed > 0 && state.completed % LONG_BREAK_EVERY === 0
        const phase = state.phase === 'focus' ? (longDue ? 'long' : 'short') : 'focus'
        const next = { ...state, phase, running: false, endsAt: null }
        state = { ...next, remaining: phaseDuration(next) }
        commit()
      }

      const setFocusMinutes = (minutes) => {
        if (!FOCUS_PRESETS.includes(minutes)) return
        const resetFocus = state.phase === 'focus'
        if (resetFocus) stopTick()
        state = {
          ...state,
          focusMinutes: minutes,
          ...(resetFocus ? { running: false, endsAt: null, remaining: minutes * MINUTE_MS } : null),
        }
        commit()
      }

      const setTask = (id) => {
        state = { ...state, taskId: typeof id === 'string' && id !== '' ? id : null }
        commit()
      }

      const toggleMute = () => {
        state = { ...state, muted: !state.muted }
        commit()
      }

      const toggleFold = () => {
        state = { ...state, folded: !state.folded }
        commit()
      }

      const dismissFinish = () => {
        if (state.lastFinish === null) return
        state = { ...state, lastFinish: null }
        emit()
      }

      const get = () => {
        if (state.running) sync()
        return { ...state, duration: phaseDuration(state) }
      }

      const restore = () => {
        let saved = null
        try {
          saved = JSON.parse(window.localStorage.getItem(TIMER_KEY) || 'null')
        } catch {
          saved = null
        }
        if (saved === null || typeof saved !== 'object') return
        const phase = saved.phase === 'short' || saved.phase === 'long' ? saved.phase : 'focus'
        const focusMinutes = FOCUS_PRESETS.includes(saved.focusMinutes) ? saved.focusMinutes : 25
        const duration = phaseMinutes(phase, focusMinutes) * MINUTE_MS
        const today = todayYmd()
        const wasRunning = saved.running === true && Number.isFinite(saved.endsAt)
        state = {
          ...state,
          phase,
          focusMinutes,
          completed:
            saved.day === today && Number.isFinite(saved.completed) ? Math.max(0, Math.floor(saved.completed)) : 0,
          day: today,
          taskId: typeof saved.taskId === 'string' && saved.taskId !== '' ? saved.taskId : null,
          muted: saved.muted === true,
          folded: saved.folded === true,
          running: wasRunning,
          endsAt: wasRunning ? saved.endsAt : null,
          remaining: wasRunning
            ? Math.max(0, saved.endsAt - Date.now())
            : Math.min(Math.max(Number(saved.remaining) || duration, 0), duration),
        }
      }

      restore()
      if (state.running) {
        // The page may have been closed across the finish line; settle it silently.
        if (sync()) finish(true)
        else startTick()
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden || !state.running) return
          if (sync()) finish(false)
          else emit()
        })
      }

      return {
        get,
        subscribe,
        start,
        pause,
        toggle,
        reset,
        skip,
        setFocusMinutes,
        setTask,
        toggleMute,
        toggleFold,
        dismissFinish,
      }
    }

    const pomodoro = createPomodoro()

    /* ------------------------------------------------------------------ */
    /* glyphs                                                              */
    /* ------------------------------------------------------------------ */

    function Glyph({ size = 16, children }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 20 20',
          fill: 'none',
          'aria-hidden': true,
          focusable: false,
          style: { display: 'block', flex: 'none' },
        },
        children,
      )
    }

    function IconCheck({ size = 12 }) {
      return h(
        Glyph,
        { size },
        h('path', {
          d: 'M4.4 10.6l3.4 3.4 7.4-8',
          stroke: 'currentColor',
          strokeWidth: 2.1,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconChevron({ size = 11 }) {
      return h(
        Glyph,
        { size },
        h('path', {
          d: 'M5.5 8l4.5 4.5L14.5 8',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconChevronLeft({ size = 13 }) {
      return h(
        Glyph,
        { size },
        h('path', {
          d: 'M12.5 5L7.5 10l5 5',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconChevronRight({ size = 13 }) {
      return h(
        Glyph,
        { size },
        h('path', {
          d: 'M7.5 5l5 5-5 5',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconCalendar({ size = 13 }) {
      return h(
        Glyph,
        { size },
        h('rect', { x: 3.5, y: 4.5, width: 13, height: 12, rx: 2.5, stroke: 'currentColor', strokeWidth: 1.5 }),
        h('path', { d: 'M3.5 8h13M7 3.1v2.8M13 3.1v2.8', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
      )
    }

    function IconPencil({ size = 14 }) {
      return h(
        Glyph,
        { size },
        h('path', {
          d: 'M4 16h3.2l8-8-3.2-3.2-8 8V16z',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M11.2 5.4l3.2 3.2', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
      )
    }

    function IconTrash({ size = 14 }) {
      return h(
        Glyph,
        { size },
        h('path', {
          d: 'M4.5 6h11M8 6V4.2h4V6M6 6l.7 10h6.6L14 6',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function IconPlay({ size = 12 }) {
      return h(Glyph, { size }, h('path', { d: 'M6.2 4.4l8.2 5.6-8.2 5.6z', fill: 'currentColor' }))
    }

    function IconPause({ size = 12 }) {
      return h(Glyph, { size }, h('path', { d: 'M6 4.2h2.6v11.6H6zM11.4 4.2H14v11.6h-2.6z', fill: 'currentColor' }))
    }

    function IconReset({ size = 12 }) {
      return h(
        Glyph,
        { size },
        h('path', {
          d: 'M15.6 10a5.6 5.6 0 1 1-1.7-4',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          fill: 'none',
        }),
        h('path', {
          d: 'M15.4 3.4v3.3h-3.3',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          fill: 'none',
        }),
      )
    }

    function IconSkip({ size = 12 }) {
      return h(
        Glyph,
        { size },
        h('path', { d: 'M4.6 4.4l7 5.6-7 5.6z', fill: 'currentColor' }),
        h('path', { d: 'M14 4.4v11.2', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' }),
      )
    }

    function IconBell({ size = 14, off = false }) {
      return h(
        Glyph,
        { size },
        h('path', {
          d: 'M4.6 13.4V9.2a5.4 5.4 0 0 1 10.8 0v4.2l1 1.2H3.6z',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinejoin: 'round',
          fill: 'none',
        }),
        h('path', {
          d: 'M8.4 16.6a1.9 1.9 0 0 0 3.2 0',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          fill: 'none',
        }),
        off
          ? h('path', { d: 'M3.8 3.8l12.4 12.4', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' })
          : null,
      )
    }

    function StyleSheet() {
      return h('style', { 'data-dsh-todo-board': '' }, CSS)
    }

    /* ------------------------------------------------------------------ */
    /* plugin                                                              */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'todo-board: dictionaries')

        const t = ctx.locale.bind(NS)
        const store = createStore()

        const localeId = () => {
          try {
            const active = ctx.locale.getLocale().active
            return typeof active === 'string' ? active : 'en'
          } catch {
            return 'en'
          }
        }

        const dayLabel = (iso, locale) => {
          const date = new Date(iso)
          if (Number.isNaN(date.getTime())) return ''
          try {
            return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
              month: 'short',
              day: 'numeric',
            })
          } catch {
            return ''
          }
        }

        const openPanel = () => {
          const layout = ctx.get('layout')
          if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_KEY)
        }

        function useTranslate() {
          const [, bump] = React.useState(0)
          React.useEffect(() => {
            if (typeof ctx.locale.subscribe !== 'function') return undefined
            return ctx.locale.subscribe(() => bump((value) => value + 1))
          }, [])
          return t
        }

        function useTodos() {
          const [snapshot, setSnapshot] = React.useState(store.get())
          React.useEffect(() => {
            const unsubscribe = store.subscribe(() => setSnapshot(store.get()))
            store.start()
            const onFocus = () => store.refresh()
            window.addEventListener('focus', onFocus)
            return () => {
              unsubscribe()
              window.removeEventListener('focus', onFocus)
            }
          }, [])
          return snapshot
        }

        function useFont() {
          const [font, setFont] = React.useState(fontStore.get())
          React.useEffect(() => fontStore.subscribe(() => setFont(fontStore.get())), [])
          return font
        }

        function usePomodoro() {
          const [snapshot, setSnapshot] = React.useState(pomodoro.get())
          React.useEffect(() => pomodoro.subscribe(() => setSnapshot(pomodoro.get())), [])
          return snapshot
        }

        function useActions() {
          return {
            add: (text, dueDate) => store.mutate({ kind: 'add', text, dueDate }),
            toggle: (id) => store.mutate({ kind: 'toggle', id }),
            edit: (id, text) => store.mutate({ kind: 'edit', id, text }),
            remove: (id) => store.mutate({ kind: 'remove', id }),
            schedule: (id, dueDate) => store.mutate({ kind: 'schedule', id, dueDate }),
            clearDone: () => store.mutate({ kind: 'clearDone' }),
            retry: () => store.load(),
          }
        }

        /* ---------------------------- sidebar icon ---------------------------- */

        function TodoIcon(props) {
          const size = typeof props.size === 'number' && props.size > 0 ? props.size : 20
          const snapshot = useTodos()
          let pending = 0
          for (const todo of snapshot.todos) if (!todo.done) pending += 1
          return h(
            'svg',
            {
              width: size,
              height: size,
              viewBox: '0 0 20 20',
              fill: 'none',
              'aria-hidden': true,
              focusable: false,
              style: { display: 'block', flex: 'none' },
            },
            h('path', {
              d: 'M3.6 3.4h12.8v9.1l-4 4H3.6z',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinejoin: 'round',
            }),
            h('path', {
              d: 'M12.4 16.5v-4h4',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinejoin: 'round',
            }),
            h('path', {
              d: 'M6.1 7.3h7.8M6.1 10.1h5.4',
              stroke: 'currentColor',
              strokeWidth: 1.4,
              strokeLinecap: 'round',
              opacity: 0.75,
            }),
            pending > 0
              ? h('circle', {
                  cx: 16.2,
                  cy: 3.8,
                  r: 2.7,
                  fill: 'var(--dsw-alias-brand-primary)',
                  stroke: 'var(--dsw-specific-sidebar-fill)',
                  strokeWidth: 1.1,
                })
              : null,
          )
        }

        /* ------------------------------- page -------------------------------- */

        function DateField({ value, marked, onChange }) {
          const [open, setOpen] = React.useState(false)
          const [view, setView] = React.useState(() => {
            const date = parseYmd(value) || new Date()
            return { year: date.getFullYear(), month: date.getMonth() }
          })
          const ref = React.useRef(null)
          const locale = localeId()
          const today = todayYmd()

          React.useEffect(() => {
            if (!open) return undefined
            const onPointerDown = (event) => {
              if (ref.current !== null && !ref.current.contains(event.target)) setOpen(false)
            }
            const onKeyDown = (event) => {
              if (event.key === 'Escape') setOpen(false)
            }
            document.addEventListener('pointerdown', onPointerDown)
            document.addEventListener('keydown', onKeyDown)
            return () => {
              document.removeEventListener('pointerdown', onPointerDown)
              document.removeEventListener('keydown', onKeyDown)
            }
          }, [open])

          const toggle = () => {
            if (!open) {
              const date = parseYmd(value) || new Date()
              setView({ year: date.getFullYear(), month: date.getMonth() })
            }
            setOpen((current) => !current)
          }

          const pick = (date) => {
            onChange(date)
            setOpen(false)
          }

          const cells = monthGrid(view.year, view.month)
          const monthLabel =
            locale === 'zh'
              ? `${view.year} 年 ${view.month + 1} 月`
              : new Date(view.year, view.month, 1).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })
          const weekdays = WEEKDAY_LABELS[locale === 'zh' ? 'zh' : 'en']

          return h(
            'div',
            { className: 'tb-datefield', ref },
            h(
              'button',
              {
                type: 'button',
                className: 'tb-datefield__btn',
                'aria-haspopup': 'dialog',
                'aria-expanded': open ? 'true' : 'false',
                title: t('panel.add.date'),
                onClick: toggle,
              },
              h(IconCalendar, { size: 13 }),
              h(
                'span',
                { className: 'tb-datefield__value' },
                parseYmd(value) === null ? t('cal.unscheduled') : formatDayTitle(value, locale),
              ),
            ),
            open
              ? h(
                  'div',
                  { className: 'tb-picker', role: 'dialog', 'aria-label': t('panel.add.date') },
                  h(
                    'div',
                    { className: 'tb-picker__head' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'tb-picker__nav',
                        'aria-label': t('cal.prev'),
                        title: t('cal.prev'),
                        onClick: () => setView((current) => addMonths(current.year, current.month, -1)),
                      },
                      h(IconChevronLeft, { size: 12 }),
                    ),
                    h('span', { className: 'tb-picker__title' }, monthLabel),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'tb-picker__nav',
                        'aria-label': t('cal.next'),
                        title: t('cal.next'),
                        onClick: () => setView((current) => addMonths(current.year, current.month, 1)),
                      },
                      h(IconChevronRight, { size: 12 }),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'tb-picker__week', 'aria-hidden': true },
                    weekdays.map((label) => h('span', { key: label }, label)),
                  ),
                  h(
                    'div',
                    { className: 'tb-picker__grid' },
                    cells.map((cell) =>
                      h(
                        'button',
                        {
                          key: cell.date,
                          type: 'button',
                          className: 'tb-picker__day',
                          'data-out': cell.inMonth ? 'false' : 'true',
                          'data-today': cell.date === today ? 'true' : 'false',
                          'data-selected': cell.date === value ? 'true' : 'false',
                          'data-marked': marked.has(cell.date) ? 'true' : 'false',
                          'aria-label': formatDayTitle(cell.date, locale),
                          onClick: () => pick(cell.date),
                        },
                        String(cell.day),
                      ),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'tb-picker__foot' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'tb-link',
                        onClick: () => pick(today),
                      },
                      t('cal.today'),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'tb-link',
                        onClick: () => pick(''),
                      },
                      t('cal.clear'),
                    ),
                  ),
                )
              : null,
          )
        }

        /* ------------------------------ pomodoro ------------------------------ */

        function FocusCard({ todos, actions }) {
          const translate = useTranslate()
          const timer = usePomodoro()
          const [menuOpen, setMenuOpen] = React.useState(false)
          const [flash, setFlash] = React.useState(null)
          const [askDone, setAskDone] = React.useState(null)
          const menuRef = React.useRef(null)
          const seenFinish = React.useRef(null)
          const flashTimer = React.useRef(null)
          const todosRef = React.useRef(todos)
          todosRef.current = todos

          const openTodos = todos.filter((todo) => !todo.done)
          const task =
            timer.taskId === null ? null : todos.find((todo) => todo.id === timer.taskId && !todo.done) || null
          const duration = timer.duration > 0 ? timer.duration : 1
          const progress = Math.min(1, Math.max(0, 1 - timer.remaining / duration))
          const phaseLabel = translate(PHASE_TEXT_KEY[timer.phase] || PHASE_TEXT_KEY.focus)
          const clock = formatClock(timer.remaining)
          const filledDots =
            timer.completed > 0 && timer.completed % LONG_BREAK_EVERY === 0
              ? LONG_BREAK_EVERY
              : timer.completed % LONG_BREAK_EVERY
          const started = timer.running || timer.remaining < duration
          const primaryLabel = timer.running
            ? translate('focus.pause')
            : started
              ? translate('focus.continue')
              : translate('focus.start')

          React.useEffect(() => {
            if (!menuOpen) return undefined
            const onPointerDown = (event) => {
              if (menuRef.current !== null && !menuRef.current.contains(event.target)) setMenuOpen(false)
            }
            const onKeyDown = (event) => {
              if (event.key === 'Escape') setMenuOpen(false)
            }
            document.addEventListener('pointerdown', onPointerDown)
            document.addEventListener('keydown', onKeyDown)
            return () => {
              document.removeEventListener('pointerdown', onPointerDown)
              document.removeEventListener('keydown', onKeyDown)
            }
          }, [menuOpen])

          React.useEffect(() => {
            const finish = timer.lastFinish
            if (finish === null || seenFinish.current === finish.at) return
            seenFinish.current = finish.at
            setFlash(finish.phase)
            const target =
              finish.taskId === null
                ? null
                : todosRef.current.find((todo) => todo.id === finish.taskId && !todo.done) || null
            if (finish.phase === 'focus' && target !== null) setAskDone(target)
            if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
            flashTimer.current = window.setTimeout(() => setFlash(null), 7000)
          }, [timer.lastFinish])

          const primaryButton = h(
            'button',
            {
              type: 'button',
              className: 'tb-focus__btn tb-focus__btn--primary',
              onClick: () => pomodoro.toggle(),
            },
            timer.running ? h(IconPause, { size: 10 }) : h(IconPlay, { size: 10 }),
            h('span', null, primaryLabel),
          )

          if (timer.folded) {
            return h(
              'section',
              {
                className: 'tb-focus',
                'data-phase': timer.phase,
                'data-running': timer.running ? 'true' : 'false',
                'data-folded': 'true',
              },
              h('span', { className: 'tb-focus__tape', 'aria-hidden': true }),
              h(
                'div',
                { className: 'tb-focus__mini' },
                h('span', { className: 'tb-focus__minidot', 'aria-hidden': true }),
                h('span', { className: 'tb-focus__minitime' }, clock),
                h('span', { className: 'tb-focus__phase' }, phaseLabel),
                task !== null ? h('span', { className: 'tb-focus__minitask' }, task.text) : null,
                h(
                  'div',
                  { className: 'tb-focus__miniactions' },
                  primaryButton,
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-focus__fold',
                      title: translate('focus.unfold'),
                      'aria-label': translate('focus.unfold'),
                      onClick: () => pomodoro.toggleFold(),
                    },
                    h(IconChevron, { size: 11 }),
                  ),
                ),
              ),
            )
          }

          return h(
            'section',
            {
              className: 'tb-focus',
              'data-phase': timer.phase,
              'data-running': timer.running ? 'true' : 'false',
              'data-folded': 'false',
            },
            h('span', { className: 'tb-focus__tape', 'aria-hidden': true }),
            h(
              'div',
              { className: 'tb-focus__row' },
              h(
                'div',
                { className: 'tb-focus__clock', role: 'timer', 'aria-label': `${phaseLabel} ${clock}` },
                h(
                  'svg',
                  { className: 'tb-focus__ring', viewBox: '0 0 112 112', 'aria-hidden': true, focusable: false },
                  h('circle', { className: 'tb-focus__ring-track', cx: 56, cy: 56, r: RING_RADIUS }),
                  h('circle', {
                    className: 'tb-focus__ring-fill',
                    cx: 56,
                    cy: 56,
                    r: RING_RADIUS,
                    strokeDasharray: RING_LENGTH.toFixed(2),
                    strokeDashoffset: (RING_LENGTH * (1 - progress)).toFixed(2),
                  }),
                ),
                h(
                  'div',
                  { className: 'tb-focus__face' },
                  h('span', { className: 'tb-focus__time' }, clock),
                  h('span', { className: 'tb-focus__phase' }, phaseLabel),
                ),
              ),
              h(
                'div',
                { className: 'tb-focus__meta' },
                h(
                  'div',
                  { className: 'tb-focus__top' },
                  h('h2', { className: 'tb-focus__title' }, translate('focus.title')),
                  h('span', { className: 'tb-focus__count' }, translate('focus.today', { count: timer.completed })),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-focus__fold',
                      title: translate('focus.fold'),
                      'aria-label': translate('focus.fold'),
                      onClick: () => pomodoro.toggleFold(),
                    },
                    h(IconChevron, { size: 11 }),
                  ),
                ),
                h(
                  'div',
                  { className: 'tb-focus__dots', 'aria-hidden': true },
                  Array.from({ length: LONG_BREAK_EVERY }, (_, index) =>
                    h('span', {
                      key: index,
                      className: 'tb-focus__dot',
                      'data-on': index < filledDots ? 'true' : 'false',
                    }),
                  ),
                ),
                h(
                  'div',
                  { className: 'tb-focus__picker', ref: menuRef },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-focus__task',
                      'data-linked': task !== null ? 'true' : 'false',
                      'aria-haspopup': 'listbox',
                      'aria-expanded': menuOpen ? 'true' : 'false',
                      onClick: () => setMenuOpen((value) => !value),
                    },
                    h(IconPencil, { size: 11 }),
                    h(
                      'span',
                      { className: 'tb-focus__tasktext' },
                      task === null
                        ? translate('focus.task.none')
                        : translate('focus.task.current', { text: task.text }),
                    ),
                  ),
                  menuOpen
                    ? h(
                        'div',
                        { className: 'tb-focus__menu', role: 'listbox', 'aria-label': translate('focus.task.menu') },
                        h('div', { className: 'tb-focus__menutitle' }, translate('focus.task.menu')),
                        openTodos.length === 0
                          ? h('div', { className: 'tb-focus__menuempty' }, translate('focus.task.empty'))
                          : openTodos.slice(0, 8).map((todo) =>
                              h(
                                'button',
                                {
                                  key: todo.id,
                                  type: 'button',
                                  role: 'option',
                                  className: 'tb-focus__menuitem',
                                  'data-current': timer.taskId === todo.id ? 'true' : 'false',
                                  'aria-selected': timer.taskId === todo.id ? 'true' : 'false',
                                  onClick: () => {
                                    pomodoro.setTask(todo.id)
                                    setMenuOpen(false)
                                  },
                                },
                                todo.text,
                              ),
                            ),
                        h(
                          'button',
                          {
                            type: 'button',
                            className: 'tb-focus__menuitem tb-focus__menuitem--clear',
                            onClick: () => {
                              pomodoro.setTask(null)
                              setMenuOpen(false)
                            },
                          },
                          translate('focus.task.clear'),
                        ),
                      )
                    : null,
                ),
                h(
                  'div',
                  { className: 'tb-focus__controls' },
                  primaryButton,
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-focus__btn tb-focus__btn--icon',
                      title: translate('focus.reset'),
                      'aria-label': translate('focus.reset'),
                      onClick: () => pomodoro.reset(),
                    },
                    h(IconReset, { size: 12 }),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-focus__btn tb-focus__btn--icon',
                      title: translate('focus.skip'),
                      'aria-label': translate('focus.skip'),
                      onClick: () => pomodoro.skip(),
                    },
                    h(IconSkip, { size: 12 }),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-focus__btn tb-focus__btn--icon',
                      title: translate(timer.muted ? 'focus.unmute' : 'focus.mute'),
                      'aria-label': translate(timer.muted ? 'focus.unmute' : 'focus.mute'),
                      'aria-pressed': timer.muted ? 'true' : 'false',
                      onClick: () => pomodoro.toggleMute(),
                    },
                    h(IconBell, { size: 13, off: timer.muted }),
                  ),
                  h(
                    'div',
                    { className: 'tb-focus__presets' },
                    FOCUS_PRESETS.map((minutes) =>
                      h(
                        'button',
                        {
                          key: minutes,
                          type: 'button',
                          className: 'tb-focus__chip',
                          'data-active': timer.focusMinutes === minutes ? 'true' : 'false',
                          'aria-pressed': timer.focusMinutes === minutes ? 'true' : 'false',
                          onClick: () => pomodoro.setFocusMinutes(minutes),
                        },
                        translate('focus.minutes', { minutes }),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            flash === null
              ? null
              : h(
                  'div',
                  { className: 'tb-focus__flash', role: 'status' },
                  translate(flash === 'focus' ? 'focus.finished.focus' : 'focus.finished.break'),
                ),
            askDone === null
              ? null
              : h(
                  'div',
                  { className: 'tb-focus__ask' },
                  h(
                    'span',
                    { className: 'tb-focus__asktext' },
                    translate('focus.ask.done', { text: askDone.text }),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-focus__askbtn tb-focus__askbtn--yes',
                      onClick: () => {
                        void actions.toggle(askDone.id)
                        setAskDone(null)
                        pomodoro.dismissFinish()
                      },
                    },
                    translate('focus.ask.yes'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-focus__askbtn',
                      onClick: () => {
                        setAskDone(null)
                        pomodoro.dismissFinish()
                      },
                    },
                    translate('focus.ask.no'),
                  ),
                ),
          )
        }

        function TodoPage() {
          const translate = useTranslate()
          const snapshot = useTodos()
          const actions = useActions()
          const font = useFont()
          const [draft, setDraft] = React.useState('')
          const [draftDate, setDraftDate] = React.useState(() => todayYmd())
          const [filter, setFilter] = React.useState('open')
          const [editing, setEditing] = React.useState(null)
          const [month, setMonth] = React.useState(() => {
            const now = new Date()
            return { year: now.getFullYear(), month: now.getMonth() }
          })
          const [bucket, setBucket] = React.useState(() => ({ type: 'date', date: todayYmd() }))
          const [picked, setPicked] = React.useState(null)
          const [dragging, setDragging] = React.useState(null)
          const [fontOpen, setFontOpen] = React.useState(false)
          const [view, setView] = React.useState(() => readView())
          const fontRef = React.useRef(null)
          const inputRef = React.useRef(null)
          const editGuard = React.useRef(false)

          React.useEffect(() => {
            if (!fontOpen) return undefined
            const onPointerDown = (event) => {
              if (fontRef.current !== null && !fontRef.current.contains(event.target)) setFontOpen(false)
            }
            const onKeyDown = (event) => {
              if (event.key === 'Escape') setFontOpen(false)
            }
            document.addEventListener('pointerdown', onPointerDown)
            document.addEventListener('keydown', onKeyDown)
            return () => {
              document.removeEventListener('pointerdown', onPointerDown)
              document.removeEventListener('keydown', onKeyDown)
            }
          }, [fontOpen])

          const todos = snapshot.todos
          const locale = localeId()
          const today = todayYmd()

          const switchView = (next) => {
            setView(next)
            writeView(next)
            setPicked(null)
            setDragging(null)
          }

          const byDate = new Map()
          const undated = []
          for (const todo of todos) {
            if (typeof todo.dueDate === 'string' && parseYmd(todo.dueDate) !== null) {
              const list = byDate.get(todo.dueDate)
              if (list === undefined) byDate.set(todo.dueDate, [todo])
              else list.push(todo)
            } else {
              undated.push(todo)
            }
          }

          const bucketTodos = bucket.type === 'none' ? undated : byDate.get(bucket.date) || []
          const pending = bucketTodos.filter((todo) => !todo.done)
          const done = bucketTodos.filter((todo) => todo.done)
          const visible = filter === 'done' ? done : pending
          const wallPending = todos.filter((todo) => !todo.done)
          const wallDone = todos.filter((todo) => todo.done)
          const wallTodos = filter === 'done' ? wallDone : wallPending
          const cells = monthGrid(month.year, month.month)

          const selectDate = (date) => {
            if (picked !== null) {
              void actions.schedule(picked, date)
              setPicked(null)
            }
            setBucket({ type: 'date', date })
            setDraftDate(date)
          }

          const selectUnscheduled = () => {
            if (picked !== null) {
              void actions.schedule(picked, null)
              setPicked(null)
            }
            setBucket({ type: 'none' })
          }

          const jumpToToday = () => {
            const now = new Date()
            setMonth({ year: now.getFullYear(), month: now.getMonth() })
            selectDate(todayYmd())
          }

          const submit = (event) => {
            event.preventDefault()
            const text = draft.trim()
            if (text === '' || snapshot.busy) return
            const target = parseYmd(draftDate) === null ? null : draftDate
            void actions.add(text, target).then((saved) => {
              if (!saved) return
              setDraft('')
              setFilter('open')
              if (target === null) {
                setBucket({ type: 'none' })
              } else {
                setBucket({ type: 'date', date: target })
                const date = parseYmd(target)
                if (date !== null) setMonth({ year: date.getFullYear(), month: date.getMonth() })
              }
              if (inputRef.current) inputRef.current.focus()
            })
          }

          const beginEdit = (todo) => {
            editGuard.current = false
            setEditing({ id: todo.id, text: todo.text })
          }

          const finishEdit = (save) => {
            if (editGuard.current) return
            editGuard.current = true
            const current = editing
            setEditing(null)
            if (!save || current === null) return
            const text = current.text.trim()
            if (text === '') return
            const original = todos.find((todo) => todo.id === current.id)
            if (original && original.text === text) return
            void actions.edit(current.id, text)
          }

          const startDrag = (event, todo) => {
            try {
              event.dataTransfer.setData('text/plain', todo.id)
              event.dataTransfer.effectAllowed = 'move'
            } catch {
              /* drag data is best effort */
            }
            setDragging(todo.id)
            setPicked(null)
          }

          const finishDrag = () => setDragging(null)

          const dropOnDate = (event, date) => {
            event.preventDefault()
            let id = dragging
            try {
              const carried = event.dataTransfer.getData('text/plain')
              if (carried !== '') id = carried
            } catch {
              /* fall back to the tracked id */
            }
            setDragging(null)
            if (id !== null) void actions.schedule(id, date)
          }

          const dropOnUnscheduled = (event) => {
            event.preventDefault()
            let id = dragging
            try {
              const carried = event.dataTransfer.getData('text/plain')
              if (carried !== '') id = carried
            } catch {
              /* fall back to the tracked id */
            }
            setDragging(null)
            if (id !== null) void actions.schedule(id, null)
          }

          const monthLabel =
            locale === 'zh'
              ? `${month.year} 年 ${month.month + 1} 月`
              : new Date(month.year, month.month, 1).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })
          const bucketTitle = bucket.type === 'none' ? translate('cal.unscheduled') : formatDayTitle(bucket.date, locale)
          const weekdays = WEEKDAY_LABELS[locale === 'zh' ? 'zh' : 'en']

          const errorDetails = snapshot.error
          const banner =
            errorDetails === null
              ? null
              : h(
                  'div',
                  { className: 'tb-banner', role: 'status' },
                  h(
                    'span',
                    { className: 'tb-banner__text' },
                    translate(snapshot.status === 'error' ? 'panel.error.load' : 'panel.error.save', {
                      detail: errorDetails,
                    }),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-banner__retry',
                      onClick: () => {
                        void actions.retry()
                      },
                    },
                    translate('panel.error.retry'),
                  ),
                )

          const renderNote = (todo) =>
            h(
              'article',
              {
                key: todo.id,
                className: 'tb-note',
                'data-done': todo.done ? 'true' : 'false',
                'data-picked': picked === todo.id ? 'true' : 'false',
                draggable: view === 'calendar',
                onDragStart: (event) => startDrag(event, todo),
                onDragEnd: finishDrag,
                onClick: view === 'calendar' ? () => setPicked((current) => (current === todo.id ? null : todo.id)) : undefined,
                style: { '--tb-paper': paperOf(todo.id), '--tb-rot': tiltOf(todo.id) },
              },
              h('span', { className: 'tb-note__tape', 'aria-hidden': true }),
              h(
                'div',
                { className: 'tb-note__head' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'tb-note__check',
                    role: 'checkbox',
                    'aria-checked': todo.done ? 'true' : 'false',
                    'aria-label': translate(todo.done ? 'row.markOpen' : 'row.markDone'),
                    title: translate(todo.done ? 'row.markOpen' : 'row.markDone'),
                    onClick: (event) => {
                      event.stopPropagation()
                      void actions.toggle(todo.id)
                    },
                  },
                  todo.done ? h(IconCheck, { size: 11 }) : null,
                ),
                h(
                  'span',
                  {
                    className: 'tb-note__date',
                    title: todo.dueDate ? translate('panel.add.date') : undefined,
                  },
                  todo.dueDate ? shortDay(todo.dueDate, locale) : dayLabel(todo.createdAt, locale),
                ),
              ),
              editing !== null && editing.id === todo.id
                ? h('input', {
                    className: 'tb-note__edit',
                    value: editing.text,
                    autoFocus: true,
                    'aria-label': translate('row.edit'),
                    onClick: (event) => event.stopPropagation(),
                    onChange: (event) => setEditing({ id: todo.id, text: event.target.value }),
                    onBlur: () => finishEdit(true),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        finishEdit(true)
                      } else if (event.key === 'Escape') {
                        event.preventDefault()
                        finishEdit(false)
                      }
                    },
                  })
                : h('p', { className: 'tb-note__text' }, todo.text),
              h(
                'div',
                { className: 'tb-note__foot' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'tb-note__act',
                    title: translate('row.edit'),
                    'aria-label': translate('row.edit'),
                    onClick: (event) => {
                      event.stopPropagation()
                      beginEdit(todo)
                    },
                  },
                  h(IconPencil, { size: 13 }),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'tb-note__act tb-note__act--danger',
                    title: translate('row.delete'),
                    'aria-label': translate('row.delete'),
                    onClick: (event) => {
                      event.stopPropagation()
                      void actions.remove(todo.id)
                    },
                  },
                  h(IconTrash, { size: 13 }),
                ),
              ),
            )

          const notes = visible.map(renderNote)
          const wallNotes = wallTodos.map(renderNote)

          const bucketEmpty =
            filter === 'done'
              ? translate('panel.empty.done')
              : bucket.type === 'none'
                ? translate('cal.none')
                : translate('cal.empty')
          const loading = snapshot.status === 'loading' && todos.length === 0

          return h(
            'div',
            {
              className: 'tb-page',
              'data-dragging': dragging !== null ? 'true' : 'false',
              'data-view': view,
              style: { '--tb-latin': font.stack },
            },
            h(StyleSheet),
            h(
              'div',
              { className: 'tb-inner' },
              h(
                'header',
                { className: 'tb-head' },
                h(
                  'div',
                  { className: 'tb-head__text' },
                  h('h1', { className: 'tb-title', style: { fontFamily: 'var(--tb-hand)', fontWeight: 400 } }, translate('panel.title')),
                  h(
                    'p',
                    { className: 'tb-subtitle' },
                    todos.length === 0 ? translate('panel.subtitle.empty') : translate('panel.subtitle'),
                  ),
                ),
                h(
                  'div',
                  { className: 'tb-head__side' },
                  h(
                    'div',
                    { className: 'tb-fontpick', ref: fontRef },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'tb-font',
                        title: `${translate('panel.font')} (${font.label})`,
                        'aria-label': translate('panel.font'),
                        'aria-haspopup': 'listbox',
                        'aria-expanded': fontOpen ? 'true' : 'false',
                        onClick: () => setFontOpen((value) => !value),
                      },
                      h('span', { className: 'tb-font__mark' }, 'Aa'),
                      h('span', { className: 'tb-font__name' }, font.label),
                    ),
                    fontOpen
                      ? h(
                          'div',
                          { className: 'tb-fontmenu', role: 'listbox', 'aria-label': translate('panel.font') },
                          FONT_GROUPS.map((group) =>
                            h(
                              'div',
                              { key: group.id, className: 'tb-fontmenu__group' },
                              h('div', { className: 'tb-fontmenu__title' }, translate(group.labelKey)),
                              FONT_CHOICES.filter((choice) => choice.group === group.id).map((choice) =>
                                h(
                                  'button',
                                  {
                                    key: choice.id,
                                    type: 'button',
                                    role: 'option',
                                    className: 'tb-fontmenu__item',
                                    'aria-selected': font.id === choice.id ? 'true' : 'false',
                                    style: { fontFamily: choice.stack },
                                    onClick: () => {
                                      fontStore.set(choice.id)
                                      setFontOpen(false)
                                    },
                                  },
                                  h('span', { className: 'tb-fontmenu__name' }, choice.label),
                                  h(
                                    'span',
                                    { className: 'tb-fontmenu__tag' },
                                    translate(choice.cjk === true ? 'panel.font.tag.cjk' : 'panel.font.tag.latin'),
                                  ),
                                  h('span', { className: 'tb-fontmenu__sample' }, '123 Aa'),
                                ),
                              ),
                            ),
                          ),
                        )
                      : null,
                  ),
                  todos.length > 0
                    ? h(
                        'span',
                        { className: 'tb-stamp', 'aria-hidden': true },
                        translate('panel.stamp', { done: wallDone.length, total: todos.length }),
                      )
                    : null,
                ),
              ),
              banner,
              h(FocusCard, { todos, actions }),
              h(
                'form',
                { className: 'tb-write', onSubmit: submit },
                h('span', { className: 'tb-write__tape', 'aria-hidden': true }),
                h('input', {
                  ref: inputRef,
                  className: 'tb-write__input',
                  value: draft,
                  placeholder: translate('panel.add.placeholder'),
                  'aria-label': translate('panel.add.placeholder'),
                  maxLength: 500,
                  onChange: (event) => setDraft(event.target.value),
                }),
                h('span', { className: 'tb-write__datelabel' }, translate('panel.add.date')),
                h(DateField, {
                  value: draftDate,
                  marked: new Set(byDate.keys()),
                  onChange: (next) => {
                    setDraftDate(next)
                    const date = parseYmd(next)
                    if (date !== null) setMonth({ year: date.getFullYear(), month: date.getMonth() })
                  },
                }),
                h(
                  'button',
                  {
                    type: 'submit',
                    className: 'tb-write__submit',
                    disabled: snapshot.busy || draft.trim() === '',
                  },
                  translate('panel.add.action'),
                ),
              ),
              h(
                'div',
                { className: 'tb-viewbar' },
                h(
                  'div',
                  { className: 'tb-viewswitch', role: 'tablist', 'aria-label': translate('view.label') },
                  h(
                    'button',
                    {
                      type: 'button',
                      role: 'tab',
                      className: 'tb-viewswitch__btn',
                      'aria-selected': view === 'calendar' ? 'true' : 'false',
                      onClick: () => switchView('calendar'),
                    },
                    translate('view.calendar'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      role: 'tab',
                      className: 'tb-viewswitch__btn',
                      'aria-selected': view === 'wall' ? 'true' : 'false',
                      onClick: () => switchView('wall'),
                    },
                    translate('view.wall'),
                  ),
                ),
              ),
              h(
                'section',
                { className: 'tb-cal' },
                h(
                  'div',
                  { className: 'tb-cal__bar' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-cal__navbtn',
                      'aria-label': translate('cal.prev'),
                      title: translate('cal.prev'),
                      onClick: () => setMonth((current) => addMonths(current.year, current.month, -1)),
                    },
                    h(IconChevronLeft, { size: 13 }),
                  ),
                  h('span', { className: 'tb-cal__title', style: { fontFamily: 'var(--tb-hand)', fontWeight: 400 } }, monthLabel),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-cal__navbtn',
                      'aria-label': translate('cal.next'),
                      title: translate('cal.next'),
                      onClick: () => setMonth((current) => addMonths(current.year, current.month, 1)),
                    },
                    h(IconChevronRight, { size: 13 }),
                  ),
                  h(
                    'button',
                    { type: 'button', className: 'tb-cal__today', onClick: jumpToToday },
                    translate('cal.today'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'tb-cal__unscheduled',
                      'data-active': bucket.type === 'none' ? 'true' : 'false',
                      onClick: selectUnscheduled,
                      onDragOver: (event) => {
                        if (dragging !== null) {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }
                      },
                      onDrop: dropOnUnscheduled,
                    },
                    translate('cal.unscheduled'),
                    h('span', { className: 'tb-cal__count' }, undated.length),
                  ),
                ),
                h(
                  'div',
                  { className: 'tb-week', 'aria-hidden': true },
                  weekdays.map((label) => h('span', { key: label }, label)),
                ),
                h(
                  'div',
                  { className: 'tb-grid' },
                  cells.map((cell) => {
                    const dayTodos = byDate.get(cell.date) || []
                    return h(
                      'button',
                      {
                        key: cell.date,
                        type: 'button',
                        className: 'tb-day',
                        'data-out': cell.inMonth ? 'false' : 'true',
                        'data-today': cell.date === today ? 'true' : 'false',
                        'data-selected': bucket.type === 'date' && bucket.date === cell.date ? 'true' : 'false',
                        'aria-label': formatDayTitle(cell.date, locale),
                        onClick: () => selectDate(cell.date),
                        onDragOver: (event) => {
                          if (dragging !== null) {
                            event.preventDefault()
                            event.dataTransfer.dropEffect = 'move'
                          }
                        },
                        onDrop: (event) => dropOnDate(event, cell.date),
                      },
                      h('span', { className: 'tb-day__num' }, String(cell.day)),
                      h(
                        'span',
                        { className: 'tb-day__chips' },
                        dayTodos.slice(0, 2).map((todo) =>
                          h(
                            'span',
                            {
                              key: todo.id,
                              className: 'tb-day__chip',
                              'data-done': todo.done ? 'true' : 'false',
                              style: { '--tb-paper': paperOf(todo.id) },
                              title: todo.text,
                            },
                            todo.text,
                          ),
                        ),
                        dayTodos.length > 2
                          ? h('span', { className: 'tb-day__more' }, `+${dayTodos.length - 2}`)
                          : null,
                      ),
                    )
                  }),
                ),
              ),
              h(
                'section',
                { className: 'tb-daylist' },
                h(
                  'div',
                  { className: 'tb-daylist__head' },
                  h('h2', { className: 'tb-daylist__title', style: { fontFamily: 'var(--tb-hand)', fontWeight: 400 } }, bucketTitle),
                  h(
                    'span',
                    { className: 'tb-daylist__count' },
                    translate('panel.foot.total', { total: bucketTodos.length }),
                  ),
                  h(
                    'div',
                    { className: 'tb-tabs', role: 'tablist' },
                    h(
                      'button',
                      {
                        type: 'button',
                        role: 'tab',
                        className: 'tb-tab',
                        'aria-selected': filter === 'open' ? 'true' : 'false',
                        onClick: () => setFilter('open'),
                      },
                      translate('panel.filter.open'),
                      h('span', { className: 'tb-tab__count' }, pending.length),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        role: 'tab',
                        className: 'tb-tab',
                        'aria-selected': filter === 'done' ? 'true' : 'false',
                        onClick: () => setFilter('done'),
                      },
                      translate('panel.filter.done'),
                      h('span', { className: 'tb-tab__count' }, done.length),
                    ),
                  ),
                ),
                picked !== null
                  ? h('div', { className: 'tb-hint' }, translate('cal.pickHint'))
                  : null,
                loading
                  ? h('div', { className: 'tb-empty' }, translate('panel.loading'))
                  : visible.length === 0
                    ? h(
                        'div',
                        { className: 'tb-empty' },
                        bucketEmpty,
                        bucket.type === 'date' && filter === 'open' && undated.length > 0
                          ? h(
                              'button',
                              {
                                type: 'button',
                                className: 'tb-link tb-empty__link',
                                onClick: selectUnscheduled,
                              },
                              `${translate('cal.viewUnscheduled')} (${undated.length})`,
                            )
                          : null,
                      )
                    : h('div', { className: 'tb-board' }, notes),
              ),
              h(
                'section',
                { className: 'tb-wall' },
                h(
                  'div',
                  { className: 'tb-daylist__head' },
                  h(
                    'h2',
                    { className: 'tb-daylist__title', style: { fontFamily: 'var(--tb-hand)', fontWeight: 400 } },
                    translate('wall.title'),
                  ),
                  h('span', { className: 'tb-daylist__count' }, translate('panel.foot.total', { total: todos.length })),
                  h(
                    'div',
                    { className: 'tb-tabs', role: 'tablist' },
                    h(
                      'button',
                      {
                        type: 'button',
                        role: 'tab',
                        className: 'tb-tab',
                        'aria-selected': filter === 'open' ? 'true' : 'false',
                        onClick: () => setFilter('open'),
                      },
                      translate('panel.filter.open'),
                      h('span', { className: 'tb-tab__count' }, wallPending.length),
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        role: 'tab',
                        className: 'tb-tab',
                        'aria-selected': filter === 'done' ? 'true' : 'false',
                        onClick: () => setFilter('done'),
                      },
                      translate('panel.filter.done'),
                      h('span', { className: 'tb-tab__count' }, wallDone.length),
                    ),
                  ),
                ),
                loading
                  ? h('div', { className: 'tb-empty' }, translate('panel.loading'))
                  : wallTodos.length === 0
                    ? h('div', { className: 'tb-empty' }, translate('wall.empty'))
                    : h('div', { className: 'tb-board' }, wallNotes),
              ),
              h(
                'footer',
                { className: 'tb-foot' },
                h('span', null, translate('panel.foot.total', { total: todos.length })),
                wallDone.length > 0
                  ? h(
                      'button',
                      {
                        type: 'button',
                        className: 'tb-link',
                        onClick: () => {
                          void actions.clearDone()
                        },
                      },
                      translate('panel.footer.clear'),
                    )
                  : null,
              ),
            ),
          )
        }


        /* -------------------------------- dock -------------------------------- */

        function TodoDock() {
          const translate = useTranslate()
          const snapshot = useTodos()
          const actions = useActions()
          const font = useFont()
          const timer = usePomodoro()
          const [open, setOpen] = React.useState(false)

          const pending = snapshot.todos.filter((todo) => !todo.done)
          const focusActive = timer.running || timer.remaining < timer.duration
          const timerTask = focusActive ? snapshot.todos.find((todo) => todo.id === timer.taskId) || null : null

          React.useEffect(() => {
            if (pending.length === 0) setOpen(false)
          }, [pending.length])

          if (snapshot.status === 'error' && snapshot.todos.length === 0 && !focusActive) {
            return h(
              'div',
              { className: 'tb-dock', style: { '--tb-latin': font.stack } },
              h(StyleSheet),
              h(
                'button',
                {
                  type: 'button',
                  className: 'tb-dock__note',
                  title: translate('dock.retry'),
                  onClick: () => {
                    void actions.retry()
                  },
                },
                h('span', { className: 'tb-dock__tape', 'aria-hidden': true }),
                h('span', { className: 'tb-dock__label' }, translate('dock.retry')),
              ),
            )
          }

          if (pending.length === 0 && !focusActive) return null

          const extra = pending.length - DOCK_LIMIT

          return h(
            'div',
            { className: 'tb-dock', style: { '--tb-latin': font.stack } },
            h(StyleSheet),
            focusActive
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'tb-dock__focus',
                    'data-running': timer.running ? 'true' : 'false',
                    title: translate('dock.open'),
                    onClick: openPanel,
                  },
                  h('span', { className: 'tb-dock__focusdot', 'aria-hidden': true }),
                  h(
                    'span',
                    { className: 'tb-dock__focusphase' },
                    translate(PHASE_TEXT_KEY[timer.phase] || PHASE_TEXT_KEY.focus),
                  ),
                  h('span', { className: 'tb-dock__focustime' }, formatClock(timer.remaining)),
                  timerTask !== null ? h('span', { className: 'tb-dock__focustask' }, timerTask.text) : null,
                )
              : null,
            pending.length > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'tb-dock__note',
                    'aria-expanded': open ? 'true' : 'false',
                    onClick: () => setOpen((value) => !value),
                  },
                  h('span', { className: 'tb-dock__tape', 'aria-hidden': true }),
                  h('span', { className: 'tb-dock__label' }, translate('dock.title')),
                  h('span', { className: 'tb-dock__count' }, translate('dock.pending', { count: pending.length })),
                  h('span', { className: 'tb-dock__next' }, pending[0].text),
                  h('span', { className: 'tb-dock__chev' }, h(IconChevron, { size: 11 })),
                )
              : null,
            open && pending.length > 0
              ? h(
                  'div',
                  { className: 'tb-dock__pad' },
                  pending.slice(0, DOCK_LIMIT).map((todo) =>
                    h(
                      'button',
                      {
                        key: todo.id,
                        type: 'button',
                        className: 'tb-dock__row',
                        onClick: () => {
                          void actions.toggle(todo.id)
                        },
                      },
                      h('span', { className: 'tb-dock__check', 'aria-hidden': true }, h(IconCheck, { size: 9 })),
                      h('span', { className: 'tb-dock__rowtext' }, todo.text),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'tb-dock__foot' },
                    extra > 0
                      ? h('span', null, translate('dock.more', { count: extra }))
                      : h('span', null),
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'tb-dock__open',
                        onClick: openPanel,
                      },
                      translate('dock.open'),
                    ),
                  ),
                )
              : null,
            pending.length === 0
              ? h(
                  'button',
                  { type: 'button', className: 'tb-dock__open', onClick: openPanel },
                  translate('dock.open'),
                )
              : null,
          )
        }

        /* ------------------------------ registers ----------------------------- */

        ctx.effect(
          () =>
            ctx.slots.inject('sidebar.panellist', () =>
              ctx.slots.register(
                {
                  name: 'sidebar.panellist',
                  id: PANEL_KEY,
                  order: 30,
                  label: () => t('panel.title'),
                  locale: NS,
                },
                TodoIcon,
              ),
            ),
          'todo-board: sidebar entry',
        )

        ctx.effect(
          () =>
            ctx.slots.inject('main', () =>
              ctx.slots.register({ name: 'main', key: PANEL_KEY, locale: NS }, TodoPage),
            ),
          'todo-board: main panel',
        )

        ctx.effect(
          () =>
            ctx.slots.inject('conversation.input.dock', () =>
              ctx.slots.register({ name: 'conversation.input.dock', id: PANEL_KEY, order: 5, locale: NS }, TodoDock),
            ),
          'todo-board: composer summary',
        )
      },
    }
  },
})
})()
