# Todo Board (`dsh-todo-board`)

[中文](README.md) | English

A personal to-do board for the DSH Web GUI, drawn as sticky notes on a month
calendar: pastel paper, tape, a slight tilt, a printed serif (Georgia over Songti /
SimSun), and a rubber-stamp counter. It adds three surfaces:

| Surface | What it shows |
|---|---|
| `sidebar.panellist` | A checklist icon; a brand dot appears while tasks are open. Clicking opens the page. |
| `main` (key `todo-board`) | A month calendar with notes pinned to days, the day's sticky notes (add, complete, edit, delete, reschedule, clear completed), and a Pomodoro focus timer above the board. |
| `conversation.input.dock` | A collapsible pending summary above the composer: open count, next task, and the first few checkable rows. It hides itself when nothing is open, and shows a running focus timer beside it. |

## Pomodoro focus timer

A paper card at the top of the board holds a focus countdown: a hand-drawn ring, the
remaining time, and the phase (专注 / 小憩 / 长休息). Press 开始专注 to start; the card
can be folded to a one-line strip and remembers that choice.

- Length: 15 / 25 / 50 minutes (default 25). A finished focus starts its 5-minute
  break automatically; every fourth focus starts a 15-minute long break; a finished
  break waits for the user before a new focus begins.
- A note can be linked to the round (`连一张便利贴`); when the focus ends the card asks
  whether that note is done and marks it complete in one click.
- A soft three-note chime plays at each phase change (mutable), and the card counts
  today's finished tomatoes.
- 重置 replays the current phase, 跳到下一段 skips it without counting a tomato.
- The running timer also appears above the composer. Both places read the same clock.
- Timer state lives in `localStorage` (`todo-board.pomodoro.v2`) as an absolute
  deadline, so a reload or a throttled background tab still reports the right time.
  No timer data reaches the Host half.

## Calendar and dates

Each task carries an optional `dueDate` (`YYYY-MM-DD`, local calendar day). The page
opens on the current month with today selected; the calendar shows up to two notes
per day (`+N` for the rest) and clicking a day switches the list below to that day.
A note is pinned to a day by dragging its card onto a cell, or by clicking the card
and then the day. The `未排期` chip collects notes without a date and accepts drops
to remove a date. The composer's date field defaults to today; clearing it creates an
unscheduled note.

## Bundled fonts

`fonts/ChenYuluoyan-Thin.ttf` (辰宇落雁體, SIL OFL 1.1, reserved font name kept) is
served by the Host half at `GET /todo-board/font/<file name>` (public asset,
immutable cache) and offered in the `Aa` font menu. Attribution is in
`fonts/NOTICE.md`.

A second, handwritten font (我爱万伟伟手写体) is **not shipped with this repository**:
the file carries no copyright or licence metadata and its source states that
commercial use requires contacting the author, so it stays on the author's machine
only. Without the file, that menu entry falls back to a kai-style font.

## Where the data lives

The browser half never stores tasks itself. It calls two same-origin routes that
the Host half registers:

- `GET /todo-board/state` — the current list
- `POST /todo-board/mutate` — one operation: `add`, `toggle`, `edit`, `remove`,
  `schedule`, `clearDone`

Both routes pass the Web carrier's trust check (`ctx.connection.requestRejection`)
and answer `401`/`403` otherwise. State is a single JSON file at
`<dsh home>/todo-board/state.json` (for example `~/.dsh/todo-board/state.json`),
written atomically, so the list survives reloads, app restarts, a changed GUI
port, and a different browser using the same Harness home. The file format is
version 2 (version 1 records simply load as unscheduled).

Only one operation runs at a time per Host process, and a malformed state file is
moved aside (`state.json.corrupt-<timestamp>`) instead of overwritten.

## Install

```
dsh plugin add github:serein772/dsh-todo-board
```

Or find it in the plugin market. For local development, point a profile dependency
at this directory with `link:`.

Both halves are plain JavaScript; there is no build step. The Host row and the
`dsh.client` declaration in `package.json` are all the wiring the bundle needs.
