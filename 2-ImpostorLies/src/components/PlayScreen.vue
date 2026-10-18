<script setup lang="ts">
import { computed, ref } from "vue";
import { useGame } from "../game/store";
import type { RoleId } from "../logic/ast";

const game = useGame();
const puzzle = computed(() => game.puzzle!);
const noteText = ref(game.board?.getNote("__notes__") ?? "");

const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function goLobby(): void {
  window.location.href = "../../index.html";
}

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
function clearAll(): void {
  game.clearBoard();
  noteText.value = "";
}
function saveNote(): void {
  game.setNote("__notes__", noteText.value);
}
function dismiss(): void {
  game.dismissViolation();
}
</script>

<template>
  <div class="playscreen-container">
    <div class="topbar">
      <div class="row" style="gap: 8px">
        <button class="btn small ghost" @click="game.openChapters()" title="返回关卡选择">← 关卡</button>
        <button class="btn small ghost" @click="goLobby()" title="返回游戏大厅">🏠 大厅</button>
      </div>
      <div class="row" style="gap: 12px">
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

    <!-- 桌面双列布局 -->
    <div class="play-grid">
      <!-- 左列：角色陈述与提示 -->
      <div class="play-left-col">
        <div class="card">
          <div class="card-section-title">🗣 角色的陈述（标记你判断的真假）</div>
          <div v-for="s in puzzle.statements" :key="s.id" class="stmt">
            <div class="speaker">{{ game.puzzle!.characters.find((c) => c.id === s.speaker)?.name }}：</div>
            <div class="text">「{{ s.text.replace(/。+$/, "") }}」</div>
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
        <div class="row" style="margin-bottom: 12px" v-else>
          <button class="btn small ghost" @click="game.requestHint()">💡 卡住了？请求提示</button>
        </div>
      </div>

      <!-- 右列：角色身份标记与提交 -->
      <div class="play-right-col">
        <div class="card">
          <div class="card-section-title">🧑‍🤝‍🧑 判断每个人的身份</div>
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
          <div class="row" style="margin-top: 10px; justify-content: flex-end">
            <button class="btn small ghost" @click="clearAll">清空标记</button>
          </div>
        </div>

        <!-- 笔记 -->
        <div class="card">
          <div class="card-section-title">📝 推理笔记</div>
          <textarea
            v-model="noteText"
            @blur="saveNote"
            rows="3"
            class="note-textarea"
            placeholder="随手记点什么…（如：若 A 说谎，则 B 必为真）"
          ></textarea>
        </div>

        <!-- 提交区域 -->
        <div class="card center submit-card">
          <button class="btn primary submit-btn" :disabled="!game.canSubmit" @click="game.submit()">
            ✅ 提交判断
          </button>
          <div class="muted" style="font-size: 0.82rem; margin-top: 8px" v-if="!game.canSubmit">
            给每个人都标上身份后才能提交
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playscreen-container {
  width: 100%;
}
.play-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 820px) {
  .play-grid {
    grid-template-columns: 1fr;
  }
}
.card-section-title {
  font-weight: 700;
  margin-bottom: 10px;
  font-size: 0.96rem;
  color: var(--text);
}
.note-textarea {
  width: 100%;
  background: var(--bg-soft);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}
.submit-card {
  padding: 16px;
}
.submit-btn {
  width: 100%;
  padding: 12px;
  font-size: 1.05rem;
}
</style>
