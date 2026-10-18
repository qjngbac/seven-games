<script setup lang="ts">
import { computed } from "vue";
import type { Stimulus, ColorKey, ShapeKey, CharKey } from "../game/rules/schema";

const props = defineProps<{
  stimulus: Stimulus;
  colorblind?: boolean;
}>();

const COLOR_MAP: Record<ColorKey, { hex: string; name: string }> = {
  red: { hex: "#ef4444", name: "红色" },
  blue: { hex: "#3b82f6", name: "蓝色" },
  green: { hex: "#22c55e", name: "绿色" },
  yellow: { hex: "#eab308", name: "黄色" },
  purple: { hex: "#a855f7", name: "紫色" },
};

const CHAR_MAP: Record<CharKey, { emoji: string; name: string }> = {
  cat: { emoji: "🐱", name: "猫咪" },
  dog: { emoji: "🐶", name: "小狗" },
  robot: { emoji: "🤖", name: "机器人" },
  ghost: { emoji: "👻", name: "幽灵" },
  alien: { emoji: "👽", name: "外星人" },
};

const SHAPE_NAMES: Record<ShapeKey, string> = {
  circle: "圆形",
  square: "方形",
  triangle: "三角形",
  star: "五角星",
  cross: "十字形",
};

const curColor = computed(() => {
  if (props.stimulus.color) return COLOR_MAP[props.stimulus.color];
  return { hex: "#94a3b8", name: "无色" };
});

const curChar = computed(() => {
  if (props.stimulus.character) return CHAR_MAP[props.stimulus.character];
  return null;
});

const shapeName = computed(() => {
  if (props.stimulus.shape) return SHAPE_NAMES[props.stimulus.shape];
  return "";
});
</script>

<template>
  <div class="stimulus-card" :style="{ borderColor: curColor.hex }">
    <!-- 顶部辅助标签 (色弱模式或属性标签) -->
    <div class="stimulus-tags">
      <span v-if="stimulus.color" class="stim-tag" :style="{ color: curColor.hex }">
        ● {{ curColor.name }}
      </span>
      <span v-if="shapeName" class="stim-tag">
        {{ shapeName }}
      </span>
      <span v-if="curChar" class="stim-tag">
        {{ curChar.emoji }} {{ curChar.name }}
      </span>
      <span v-if="stimulus.number !== undefined" class="stim-tag num-tag">
        #{{ stimulus.number }} ({{ stimulus.number % 2 === 0 ? "偶数" : "奇数" }})
      </span>
    </div>

    <!-- 核心视觉图形区 -->
    <div class="shape-canvas">
      <svg viewBox="0 0 160 160" class="shape-svg" :style="{ filter: `drop-shadow(0 0 16px ${curColor.hex}66)` }">
        <!-- 圆形 -->
        <circle
          v-if="stimulus.shape === 'circle' || !stimulus.shape"
          cx="80"
          cy="80"
          r="66"
          :fill="curColor.hex"
        />

        <!-- 正方形 -->
        <rect
          v-else-if="stimulus.shape === 'square'"
          x="20"
          y="20"
          width="120"
          height="120"
          rx="14"
          :fill="curColor.hex"
        />

        <!-- 三角形 -->
        <polygon
          v-else-if="stimulus.shape === 'triangle'"
          points="80,16 148,136 12,136"
          :fill="curColor.hex"
        />

        <!-- 五角星 -->
        <polygon
          v-else-if="stimulus.shape === 'star'"
          points="80,14 100,60 148,64 108,98 122,146 80,118 38,146 52,98 12,64 60,60"
          :fill="curColor.hex"
        />

        <!-- 十字形 -->
        <polygon
          v-else-if="stimulus.shape === 'cross'"
          points="54,16 106,16 106,54 144,54 144,106 106,106 106,144 54,144 54,106 16,106 16,54 54,54"
          :fill="curColor.hex"
        />
      </svg>

      <!-- 角色图标 -->
      <div v-if="curChar" class="char-overlay">
        {{ curChar.emoji }}
      </div>

      <!-- 中心文字 -->
      <div v-if="stimulus.word" class="word-overlay">
        {{ stimulus.word }}
      </div>

      <!-- 中心数字展示：极大字号，超强对比，一目了然 -->
      <div v-if="stimulus.number !== undefined && !curChar && !stimulus.word" class="number-center-overlay">
        <span class="num-hero">{{ stimulus.number }}</span>
      </div>
    </div>

    <!-- 底部补充数值展示 (数值放大) -->
    <div v-if="stimulus.number !== undefined && !stimulus.word" class="number-display">
      <span class="num-val">{{ stimulus.number }}</span>
      <span class="num-lbl">{{ stimulus.number % 2 === 0 ? "偶数" : "奇数" }}</span>
    </div>
  </div>
</template>

<style scoped>
.stimulus-card {
  width: 100%;
  max-width: 440px;
  min-height: 310px;
  margin: 0 auto;
  background: radial-gradient(circle at center, rgba(30, 41, 69, 0.95) 0%, rgba(15, 20, 36, 0.98) 100%);
  border: 2.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 22px;
  padding: 18px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
  position: relative;
  transition: all 0.2s ease;
}

.stimulus-tags {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
}
.stim-tag {
  font-size: 1.05rem;
  font-weight: 800;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  color: var(--text);
  letter-spacing: 0.5px;
}
.num-tag {
  color: var(--accent);
  background: rgba(255, 209, 102, 0.18);
  border-color: rgba(255, 209, 102, 0.45);
  font-size: 1.15rem;
  font-weight: 900;
}

.shape-canvas {
  position: relative;
  width: 190px;
  height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 12px 0;
}
.shape-svg {
  width: 100%;
  height: 100%;
  transition: transform 0.2s ease;
}

.char-overlay {
  position: absolute;
  font-size: 4.2rem;
  line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.7));
  pointer-events: none;
}

.word-overlay {
  position: absolute;
  font-size: 2.6rem;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 3px 10px rgba(0, 0, 0, 0.95), 0 0 25px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  letter-spacing: 3px;
}

.number-center-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.num-hero {
  font-size: 4.8rem;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.95), 0 0 30px rgba(0, 0, 0, 0.85);
  letter-spacing: 2px;
}

.number-display {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  background: rgba(0, 0, 0, 0.35);
  padding: 6px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.num-val {
  font-size: 2.4rem;
  font-weight: 900;
  color: var(--accent);
  letter-spacing: 1px;
}
.num-lbl {
  font-size: 1.25rem;
  font-weight: 800;
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.14);
  padding: 3px 10px;
  border-radius: 6px;
}
</style>
