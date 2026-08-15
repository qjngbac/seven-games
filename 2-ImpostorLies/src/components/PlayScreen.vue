<script setup lang="ts">
import { computed, ref } from "vue";
import { useGame } from "../game/store";
import type { RoleId } from "../logic/ast";

const game = useGame();
const puzzle = computed(() => game.puzzle!);
const noteText = ref("");

const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function toggleRole(charId: string, role: RoleId): void {
  const cur = game.board!.getCharacterMark(charId);
  game.markCharacter(charId, cur === role ? null : role);
}
function toggleTruth(stmtId: string, truth: boolean): void {
  const cur = game.board!.getStatementMark(stmtId);
  game.markStatement(stmtId, cur === truth ? null : truth);
}
function activeHint(): string | null {
  const h = game.hints;
  if (!h.texts) return null;
  if (h.level >= 1) return h.texts[0];
  return null;
}
function hint2(): string | null {
  const h = game.hints;
  if (h.texts && h.level >= 2) return h.texts[1];
  return null;
}
function hint3(): string | null {
  const h = game.hints;
  if (h.texts && h.level >= 3) return h.texts[2];
  return null;
}
function saveNote(): void {
  game.setNote("__notes__", noteText.value);
}
function dismiss(): void {
  game.dismissViolation();
}
</script>

<template>
  <div>
    <div class="topbar">
      <button class="btn small ghost" @click="game.openChapters()">← 退出</button>
      <div class="row" style="gap: 14px">
        <span class="timer">⏱ {{ fmtTime(game.elapsedMs) }}</span>
        <span class="chip">错误 {{ game.errors }}</span>
        <span class="chip">提示 {{ game.hintsUsed }}</span>
      </div>
      <button class="btn small" :disabled="!game.board?.canUndo" @click="game.undo()">↶ 撤销</button>
    </div>

    <!-- 错误分析 -->
    <div v-if="game.lastViolation" class="violation" :class="{ shake: !game.settings.reduceShake }">
      <b>⚠ 推理有矛盾：</b>
      <div style="margin: 6px 0; line-height: 1.6">{{ game.lastViolation.message }}</div>
      <div class="row">
        <button class="btn small" @click="game.undo(); dismiss()">↶ 撤销刚才的判断</button>
        <button class="btn small ghost" @click="dismiss()">继续推理</button>
      </div>
    </div>

    <!-- 提示面板 -->
    <div class="hint-box" v-if="activeHint() || game.hints.level > 0">
      <div class="lv">💡 提示（已用 {{ game.hintsUsed }} 次，扣分但不阻断）</div>
      <div v-if="activeHint()" style="margin-top: 6px">① {{ activeHint() }}</div>
      <div v-if="hint2()" style="margin-top: 6px">② {{ hint2() }}</div>
      <div v-if="hint3()" style="margin-top: 6px">③ {{ hint3() }}</div>
      <div class="row" style="margin-top: 10px" v-if="game.hints.level < 3">
        <button class="btn small" @click="game.requestHint()">再要一层提示 ▶</button>
      </div>
    </div>
    <div class="row" style="margin-bottom: 10px" v-else>
      <button class="btn small ghost" @click="game.requestHint()">💡 卡住了？请求提示</button>
    </div>

    <!-- 陈述与真假标记 -->
    <div class="card">
      <div style="font-weight: 700; margin-bottom: 8px">🗣 角色的陈述（标记你判断的真假）</div>
      <div v-for="s in puzzle.statements" :key="s.id" class="stmt">
        <div class="speaker">{{ game.puzzle!.characters.find((c) => c.id === s.speaker)?.name }}：</div>
        <div class="text">「{{ s.text }}」</div>
        <div class="mark-group">
          <button
            class="mark-btn"
            :class="{ 'sel-true': game.board!.getStatementMark(s.id) === true }"
            @click="toggleTruth(s.id, true)"
          >
            真
          </button>
          <button
            class="mark-btn"
            :class="{ 'sel-false': game.board!.getStatementMark(s.id) === false }"
            @click="toggleTruth(s.id, false)"
          >
            假
          </button>
          <button
            class="mark-btn"
            :class="{ 'sel-role': game.board!.getStatementMark(s.id) === null }"
            @click="game.markStatement(s.id, null)"
          >
            未知
          </button>
        </div>
      </div>
    </div>

    <!-- 角色身份标记 -->
    <div class="card">
      <div style="font-weight: 700; margin-bottom: 8px">🧑‍🤝‍🧑 判断每个人的身份</div>
      <div v-for="c in puzzle.characters" :key="c.id" class="char-card">
        <div class="char-avatar">{{ c.name.slice(0, 1) }}</div>
        <div class="grow">
          <div style="font-weight: 700">{{ c.name }}</div>
          <div class="muted" style="font-size: 0.8rem">{{ c.blurb }}</div>
        </div>
        <div class="mark-group">
          <button
            v-for="r in puzzle.roles"
            :key="r"
            class="mark-btn"
            :class="['role-' + r, { 'sel-role': game.board!.getCharacterMark(c.id) === r }]"
            @click="toggleRole(c.id, r)"
          >
            {{ puzzle.roleLabels?.[r] ?? r }}
          </button>
          <button
            class="mark-btn"
            :class="{ 'sel-role': game.board!.getCharacterMark(c.id) === null }"
            @click="game.markCharacter(c.id, null)"
          >
            未知
          </button>
        </div>
      </div>
      <div class="row" style="margin-top: 8px">
        <button class="btn small ghost" @click="game.clearBoard()">清空标记</button>
      </div>
    </div>

    <!-- 笔记 -->
    <div class="card">
      <div style="font-weight: 700; margin-bottom: 6px">📝 推理笔记</div>
      <textarea
        v-model="noteText"
        @blur="saveNote"
        rows="3"
        style="width: 100%; background: var(--bg-soft); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 8px; font-family: inherit"
        placeholder="随手记点什么…（如：若 A 说谎，则 B 必为真）"
      ></textarea>
    </div>

    <div class="row" style="justify-content: center; margin-top: 6px">
      <button class="btn primary" :disabled="!game.canSubmit" @click="game.submit()">
        ✅ 提交判断
      </button>
    </div>
    <div class="center muted" style="font-size: 0.8rem; margin-top: 6px" v-if="!game.canSubmit">
      给每个人都标上身份后才能提交
    </div>
  </div>
</template>
