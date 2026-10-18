import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../ui/layout";
import { makeButton, makeTitle } from "../ui/widgets";
import { fontStack } from "../ui/stimulusView";
import { loadHistory, clearHistory } from "../settings";

export class HistoryScene extends Phaser.Scene {
  private page = 0;
  private readonly pageSize = 4;
  private listContainers: Phaser.GameObjects.Container[] = [];
  private pageText!: Phaser.GameObjects.Text;
  private prevBtn!: ReturnType<typeof makeButton>;
  private nextBtn!: ReturnType<typeof makeButton>;

  constructor() {
    super("History");
  }

  create(): void {
    this.page = 0;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    makeTitle(this, WIDTH / 2, 46, "📜 战绩历史档案", 34);

    const records = loadHistory();
    const totalRuns = records.length;
    const maxScore = records.reduce((m, r) => Math.max(m, r.score), 0);
    const avgAcc = totalRuns > 0
      ? (records.reduce((s, r) => s + r.accuracy, 0) / totalRuns * 100).toFixed(1)
      : "0.0";

    // 统计栏
    const statBg = this.add.rectangle(WIDTH / 2, 98, WIDTH - 120, 48, COLORS.panel).setOrigin(0.5);
    statBg.setStrokeStyle(1, COLORS.panelLine);

    this.add
      .text(
        WIDTH / 2,
        98,
        `总对局：${totalRuns} 场      历史最高分：${maxScore} 分      平均准确率：${avgAcc}%`,
        { fontFamily: fontStack(), fontSize: "17px", color: "#ffd666" }
      )
      .setOrigin(0.5);

    // 分页文本与翻页按钮
    this.pageText = this.add
      .text(WIDTH / 2, HEIGHT - 110, "", { fontFamily: fontStack(), fontSize: "16px", color: COLORS.sub })
      .setOrigin(0.5);

    this.prevBtn = makeButton(this, WIDTH / 2 - 120, HEIGHT - 110, "上一页", () => this.changePage(-1), {
      w: 90,
      h: 34,
      fontSize: 15,
      fill: 0x39405c,
    });
    this.nextBtn = makeButton(this, WIDTH / 2 + 120, HEIGHT - 110, "下一页", () => this.changePage(1), {
      w: 90,
      h: 34,
      fontSize: 15,
      fill: 0x39405c,
    });

    // 底部操作按钮
    makeButton(this, 140, HEIGHT - 52, "🗑️ 清空历史", () => this.handleClear(), {
      w: 140,
      h: 44,
      fontSize: 17,
      fill: 0x822a2a,
    });

    makeButton(this, WIDTH / 2, HEIGHT - 52, "返回菜单", () => this.scene.start("Menu"), {
      w: 160,
      h: 44,
      fontSize: 18,
    });

    makeButton(this, WIDTH - 140, HEIGHT - 52, "🏠 游戏大厅", () => {
      window.location.href = "../../index.html";
    }, {
      w: 140,
      h: 44,
      fontSize: 17,
      fill: 0x4b5168,
    });

    this.renderPage();
  }

  private renderPage(): void {
    this.listContainers.forEach((c) => c.destroy());
    this.listContainers = [];

    const records = loadHistory();
    const total = records.length;
    const maxPage = Math.max(0, Math.ceil(total / this.pageSize) - 1);
    this.page = Math.min(this.page, maxPage);

    if (total === 0) {
      const empty = this.add.container(WIDTH / 2, 280);
      const t = this.add
        .text(0, 0, "暂无战绩记录，快去挑战一局吧！", {
          fontFamily: fontStack(),
          fontSize: "20px",
          color: COLORS.sub,
        })
        .setOrigin(0.5);
      empty.add(t);
      this.listContainers.push(empty);
      this.pageText.setText("");
      this.prevBtn.container.setVisible(false);
      this.nextBtn.container.setVisible(false);
      return;
    }

    this.prevBtn.container.setVisible(this.page > 0);
    this.nextBtn.container.setVisible(this.page < maxPage);
    this.pageText.setText(`第 ${this.page + 1} / ${maxPage + 1} 页`);

    const startIdx = this.page * this.pageSize;
    const slice = records.slice(startIdx, startIdx + this.pageSize);

    slice.forEach((r, i) => {
      const y = 165 + i * 82;
      const c = this.add.container(WIDTH / 2, y);

      const bg = this.add.rectangle(0, 0, WIDTH - 120, 72, COLORS.panel).setOrigin(0.5);
      bg.setStrokeStyle(1, COLORS.panelLine);
      c.add(bg);

      // 模式与包名
      const title = this.add
        .text(-WIDTH / 2 + 80, -18, `【${r.modeName}】${r.packName}`, {
          fontFamily: fontStack(),
          fontSize: "18px",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5);
      c.add(title);

      // 结果标签
      const reasonLabel =
        r.reason === "manual" ? "手动退出" : r.reason === "lives" ? "生命耗尽" : "挑战完成";
      const reasonColor =
        r.reason === "manual" ? "#ffd666" : r.reason === "lives" ? "#ff7875" : "#95de64";
      const reasonText = this.add
        .text(-WIDTH / 2 + 350, -18, `[${reasonLabel}]`, {
          fontFamily: fontStack(),
          fontSize: "15px",
          color: reasonColor,
        })
        .setOrigin(0, 0.5);
      c.add(reasonText);

      // 标签
      if (r.tags && r.tags.length > 0) {
        const tagStr = r.tags.map((t) => `「${t}」`).join(" ");
        const tagText = this.add
          .text(-WIDTH / 2 + 450, -18, tagStr, {
            fontFamily: fontStack(),
            fontSize: "14px",
            color: "#69c0ff",
          })
          .setOrigin(0, 0.5);
        c.add(tagText);
      }

      // 明细行
      const meta = `准确率：${(r.accuracy * 100).toFixed(0)}% (${r.correct}/${r.rounds})   连击：${r.maxCombo}   反应均值：${Math.round(r.reactionAvg)}ms`;
      const metaText = this.add
        .text(-WIDTH / 2 + 80, 16, meta, {
          fontFamily: fontStack(),
          fontSize: "14px",
          color: COLORS.sub,
        })
        .setOrigin(0, 0.5);
      c.add(metaText);

      // 时间
      const timeText = this.add
        .text(WIDTH / 2 - 200, 16, r.timestamp, {
          fontFamily: fontStack(),
          fontSize: "13px",
          color: COLORS.sub,
        })
        .setOrigin(1, 0.5);
      c.add(timeText);

      // 得分
      const scoreText = this.add
        .text(WIDTH / 2 - 80, 0, `${r.score} 分`, {
          fontFamily: fontStack(),
          fontSize: "24px",
          color: "#95de64",
        })
        .setOrigin(1, 0.5);
      c.add(scoreText);

      this.listContainers.push(c);
    });
  }

  private changePage(dir: number): void {
    this.page += dir;
    this.renderPage();
  }

  private handleClear(): void {
    if (confirm("确定要清空所有战绩历史记录吗？")) {
      clearHistory();
      this.page = 0;
      this.renderPage();
    }
  }
}
