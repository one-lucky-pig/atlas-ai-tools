type WorkflowPage =
  | "overview"
  | "topics"
  | "selection"
  | "drafts"
  | "review"
  | "publish"
  | "automation";

type WorkflowOverviewResponse = {
  overview: {
    counts: Record<string, number>;
    pendingPublish: number;
    lastPublishedAt: string | null;
    recentFailures: Array<{ id: string; title: string; status: string; reviewNotes: string[] }>;
  };
  candidates: Array<Record<string, any>>;
  topicQueue: Array<Record<string, any>>;
  draftQueue: Array<Record<string, any>>;
  publishLog: Array<Record<string, any>>;
  automation: {
    currentStatus: string;
    lastRunAt: string | null;
    settings: {
      enabled: boolean;
      intervalMinutes: number;
      fetchLimit: number;
      generateLimit: number;
      minHeatScore: number;
      minRelevanceScore: number;
    };
    recentRuns: Array<Record<string, any>>;
  };
};

const bridgeUrl = "http://127.0.0.1:4323";

function byId<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function setText(selector: string, value: string): void {
  const node = document.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "尚未运行";
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function sectionsToText(sections: Array<{ heading: string; paragraphs: string[] }> = []): string {
  return sections
    .map((section) => `## ${section.heading}\n${section.paragraphs.join("\n\n")}`.trim())
    .join("\n\n");
}

function textToSections(raw: string): Array<{ heading: string; paragraphs: string[] }> {
  return raw
    .split(/\n(?=##\s+)/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim());
      const headingLine = lines.shift() ?? "";
      const heading = headingLine.replace(/^##\s+/, "").trim();
      const paragraphs = lines.join("\n").split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
      return { heading, paragraphs };
    });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "请求失败。");
  }
  return payload as T;
}

async function fetchOverview(): Promise<WorkflowOverviewResponse> {
  return requestJson<WorkflowOverviewResponse>(`${bridgeUrl}/workflow/overview`);
}

function updateGlobalChrome(data: WorkflowOverviewResponse): void {
  setText("[data-workflow-status]", data.automation.currentStatus === "running" ? "自动任务运行中" : "工作流已连接");
  setText(
    "[data-workflow-status-detail]",
    data.automation.currentStatus === "running"
      ? `最近一次自动任务：${formatDateTime(data.automation.lastRunAt)}`
      : `最近一次自动任务：${formatDateTime(data.automation.lastRunAt)}，待发布 ${data.overview.pendingPublish} 篇`
  );

  const badgeMap: Record<string, string> = {
    all: String(
      data.overview.counts.fetched +
        data.overview.counts.shortlisted +
        data.overview.counts.drafted +
        data.overview.counts.reviewed +
        data.overview.counts.approved
    ),
    fetched: String(data.overview.counts.fetched ?? 0),
    shortlisted: String(data.overview.counts.shortlisted ?? 0),
    drafted: String(data.overview.counts.drafted ?? 0),
    reviewed: String(data.overview.counts.reviewed ?? 0),
    approved: String(data.overview.counts.approved ?? 0),
    auto: data.automation.settings.enabled ? "ON" : "OFF",
    legacy: "旧"
  };

  document.querySelectorAll<HTMLElement>("[data-workflow-badge]").forEach((node) => {
    const key = node.dataset.workflowBadge || "";
    node.textContent = badgeMap[key] ?? "0";
  });

  setText("[data-workflow-failures]", String(data.overview.recentFailures.length));
  setText("[data-workflow-last-published]", data.overview.lastPublishedAt ? formatDateTime(data.overview.lastPublishedAt) : "尚未发布");
}

function renderOverviewPage(data: WorkflowOverviewResponse): void {
  const stepGrid = byId<HTMLDivElement>("workflow-overview-step-grid");
  const publishLog = byId<HTMLDivElement>("workflow-overview-publish-log");
  if (!stepGrid || !publishLog) return;

  const cards = [
    ["抓热点", "从外部内容服务拉回候选热点。", "fetched", "/studio/topics"],
    ["选题池", "把候选题加入短名单，决定要不要进入草稿。", "shortlisted", "/studio/selection"],
    ["草稿生成", "把短名单推进成结构化草稿。", "drafted", "/studio/drafts"],
    ["审核质检", "检查正文、来源、内链和风险。", "reviewed", "/studio/review"],
    ["发布队列", "勾选已批准草稿，一键发布。", "approved", "/studio/publish"],
    ["自动运行", "配置夜间循环和运行阈值。", "auto", "/studio/automation"]
  ] as const;

  stepGrid.innerHTML = cards
    .map(
      ([title, detail, key, href]) => `
        <article class="workflow-step-card">
          <div class="section-kicker">Step</div>
          <h3>${title}</h3>
          <p>${detail}</p>
          <footer>
            <span class="workflow-chip">当前数量：${key === "auto" ? (data.automation.settings.enabled ? "已开启" : "未开启") : data.overview.counts[key] ?? 0}</span>
            <a class="workflow-link-button" href="${href}">进入步骤</a>
          </footer>
        </article>
      `
    )
    .join("");

  publishLog.innerHTML =
    data.publishLog.length > 0
      ? data.publishLog
          .slice()
          .reverse()
          .slice(0, 6)
          .map(
            (entry) => `
              <article class="workflow-list-item">
                <div class="workflow-meta-row">
                  <span class="workflow-chip">${entry.status === "success" ? "成功" : "失败"}</span>
                  <span class="workflow-chip">${formatDateTime(entry.finishedAt)}</span>
                </div>
                <h3>${entry.message}</h3>
                <p>涉及草稿：${(entry.draftIds || []).join(", ") || "无"}</p>
              </article>
            `
          )
          .join("")
      : `<div class="workflow-empty">还没有发布日志。等第一批通过审核的草稿上线后，这里会出现完整记录。</div>`;
}

function getSelectionKey(page: WorkflowPage): string {
  return `studio-v2:${page}:selected`;
}

function getFilterKey(page: WorkflowPage): string {
  return `studio-v2:${page}:filter`;
}

function renderSelectableList(params: {
  page: WorkflowPage;
  items: Array<Record<string, any>>;
  listId: string;
  itemTitle: (item: Record<string, any>) => string;
  itemMeta: (item: Record<string, any>) => string[];
  itemBody?: (item: Record<string, any>) => string;
  allowedStatuses?: string[];
}): string[] {
  const listNode = byId<HTMLDivElement>(params.listId);
  if (!listNode) return [];

  const filter = loadJson<string>(getFilterKey(params.page), "");
  const selectedIds = new Set(loadJson<string[]>(getSelectionKey(params.page), []));
  const filtered = params.items.filter((item) => {
    if (params.allowedStatuses && !params.allowedStatuses.includes(item.status)) {
      return false;
    }
    if (!filter) return true;
    const haystack = `${params.itemTitle(item)} ${item.summary || ""} ${item.source || ""}`.toLowerCase();
    return haystack.includes(filter.toLowerCase());
  });

  listNode.innerHTML =
    filtered.length > 0
      ? filtered
          .map(
            (item) => `
              <article class="workflow-list-item">
                <label class="workflow-chip">
                  <input type="checkbox" data-select-page="${params.page}" value="${item.id}" ${
                    selectedIds.has(item.id) ? "checked" : ""
                  } />
                  选择
                </label>
                <h3>${params.itemTitle(item)}</h3>
                <div class="workflow-chip-row">
                  ${params.itemMeta(item).map((value) => `<span class="workflow-chip">${value}</span>`).join("")}
                </div>
                ${params.itemBody ? `<p>${params.itemBody(item)}</p>` : ""}
              </article>
            `
          )
          .join("")
      : `<div class="workflow-empty">当前没有可显示的内容。</div>`;

  listNode.querySelectorAll<HTMLInputElement>(`input[data-select-page="${params.page}"]`).forEach((input) => {
    input.addEventListener("change", () => {
      const next = new Set(loadJson<string[]>(getSelectionKey(params.page), []));
      if (input.checked) next.add(input.value);
      else next.delete(input.value);
      saveJson(getSelectionKey(params.page), Array.from(next));
    });
  });

  return filtered.map((item) => item.id as string);
}

function renderTopicsPage(data: WorkflowOverviewResponse): void {
  const filterInput = byId<HTMLInputElement>("topics-filter");
  const fetchButton = byId<HTMLButtonElement>("topics-fetch-button");
  const shortlistButton = byId<HTMLButtonElement>("topics-shortlist-button");
  const listId = "topics-candidate-list";

  if (!filterInput || !fetchButton || !shortlistButton) return;

  filterInput.value = loadJson<string>(getFilterKey("topics"), "");
  filterInput.oninput = () => {
    saveJson(getFilterKey("topics"), filterInput.value);
    renderTopicsPage(data);
  };

  renderSelectableList({
    page: "topics",
    items: data.candidates,
    listId,
    itemTitle: (item) => item.title,
    itemMeta: (item) => [
      `来源：${item.source}`,
      `热度：${item.heatScore}`,
      `相关度：${item.relevanceScore}`
    ],
    itemBody: (item) => item.suggestedAngle || item.summary
  });

  fetchButton.onclick = async () => {
    fetchButton.disabled = true;
    try {
      await requestJson(`${bridgeUrl}/topics/fetch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          limit: Number(byId<HTMLInputElement>("topics-fetch-limit")?.value || 12),
          minHeatScore: Number(byId<HTMLInputElement>("topics-min-heat")?.value || 0),
          minRelevanceScore: Number(byId<HTMLInputElement>("topics-min-relevance")?.value || 0)
        })
      });
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      fetchButton.disabled = false;
    }
  };

  shortlistButton.onclick = async () => {
    const ids = loadJson<string[]>(getSelectionKey("topics"), []);
    if (ids.length === 0) {
      alert("先勾选要加入选题池的候选热点。");
      return;
    }

    shortlistButton.disabled = true;
    try {
      await requestJson(`${bridgeUrl}/topics/shortlist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids })
      });
      saveJson(getSelectionKey("topics"), []);
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      shortlistButton.disabled = false;
    }
  };
}

function renderSelectionPage(data: WorkflowOverviewResponse): void {
  const filterInput = byId<HTMLInputElement>("selection-filter");
  const generateButton = byId<HTMLButtonElement>("selection-generate-button");
  if (!filterInput || !generateButton) return;

  filterInput.value = loadJson<string>(getFilterKey("selection"), "");
  filterInput.oninput = () => {
    saveJson(getFilterKey("selection"), filterInput.value);
    renderSelectionPage(data);
  };

  renderSelectableList({
    page: "selection",
    items: data.topicQueue,
    listId: "selection-topic-list",
    allowedStatuses: ["shortlisted"],
    itemTitle: (item) => item.title,
    itemMeta: (item) => [
      `来源：${item.source}`,
      `热度：${item.heatScore}`,
      `相关度：${item.relevanceScore}`
    ],
    itemBody: (item) => item.suggestedAngle || item.summary
  });

  generateButton.onclick = async () => {
    const ids = loadJson<string[]>(getSelectionKey("selection"), []);
    if (ids.length === 0) {
      alert("先勾选要生成草稿的选题。");
      return;
    }

    generateButton.disabled = true;
    try {
      await requestJson(`${bridgeUrl}/drafts/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids })
      });
      saveJson(getSelectionKey("selection"), []);
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      generateButton.disabled = false;
    }
  };
}

function renderDraftsPage(data: WorkflowOverviewResponse): void {
  const filterInput = byId<HTMLInputElement>("drafts-filter");
  const regenerateButton = byId<HTMLButtonElement>("drafts-regenerate-button");
  if (!filterInput || !regenerateButton) return;

  filterInput.value = loadJson<string>(getFilterKey("drafts"), "");
  filterInput.oninput = () => {
    saveJson(getFilterKey("drafts"), filterInput.value);
    renderDraftsPage(data);
  };

  const items = data.draftQueue.filter((draft) => ["briefed", "drafted", "failed_generate"].includes(draft.status));
  renderSelectableList({
    page: "drafts",
    items,
    listId: "drafts-list",
    itemTitle: (item) => item.draft?.workingTitle || item.title,
    itemMeta: (item) => [`状态：${item.status}`, `来源：${item.source}`],
    itemBody: (item) => item.draft?.metaDescription || item.summary
  });

  regenerateButton.onclick = async () => {
    const topicIds = data.draftQueue
      .filter((draft) => loadJson<string[]>(getSelectionKey("drafts"), []).includes(draft.id))
      .map((draft) => draft.topicId);

    if (topicIds.length === 0) {
      alert("先勾选要重新生成的草稿。");
      return;
    }

    regenerateButton.disabled = true;
    try {
      await requestJson(`${bridgeUrl}/drafts/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: topicIds })
      });
      saveJson(getSelectionKey("drafts"), []);
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      regenerateButton.disabled = false;
    }
  };
}

function renderReviewPage(data: WorkflowOverviewResponse): void {
  const drafts = data.draftQueue.filter((draft) => ["drafted", "reviewed", "failed_review"].includes(draft.status));
  const listNode = byId<HTMLDivElement>("review-list");
  const selectedDraftInput = byId<HTMLInputElement>("review-current-id");
  if (!listNode || !selectedDraftInput) return;

  const currentReviewId = loadJson<string | null>("studio-v2:review:current", drafts[0]?.id ?? null);
  const currentDraft = drafts.find((draft) => draft.id === currentReviewId) ?? drafts[0] ?? null;
  if (currentDraft) {
    saveJson("studio-v2:review:current", currentDraft.id);
  }

  listNode.innerHTML =
    drafts.length > 0
      ? drafts
          .map(
            (draft) => `
              <article class="workflow-list-item">
                <div class="workflow-meta-row">
                  <label class="workflow-chip">
                    <input type="checkbox" data-select-page="review" value="${draft.id}" ${
                      loadJson<string[]>(getSelectionKey("review"), []).includes(draft.id) ? "checked" : ""
                    } />
                    选择
                  </label>
                  <span class="workflow-chip">状态：${draft.status}</span>
                </div>
                <h3>${draft.draft?.workingTitle || draft.title}</h3>
                <p>${draft.draft?.metaDescription || draft.summary}</p>
                <footer>
                  <span class="workflow-chip">${draft.source}</span>
                  <button class="workflow-button" type="button" data-review-open="${draft.id}">查看 / 编辑</button>
                </footer>
              </article>
            `
          )
          .join("")
      : `<div class="workflow-empty">还没有待审核草稿。先去“草稿生成”步骤推进内容。</div>`;

  listNode.querySelectorAll<HTMLInputElement>('input[data-select-page="review"]').forEach((input) => {
    input.addEventListener("change", () => {
      const next = new Set(loadJson<string[]>(getSelectionKey("review"), []));
      if (input.checked) next.add(input.value);
      else next.delete(input.value);
      saveJson(getSelectionKey("review"), Array.from(next));
    });
  });

  listNode.querySelectorAll<HTMLButtonElement>("[data-review-open]").forEach((button) => {
    button.onclick = () => {
      saveJson("studio-v2:review:current", button.dataset.reviewOpen);
      renderReviewPage(data);
    };
  });

  selectedDraftInput.value = currentDraft?.id || "";
  byId<HTMLInputElement>("review-working-title")!.value = currentDraft?.draft?.workingTitle || "";
  byId<HTMLInputElement>("review-seo-title")!.value = currentDraft?.draft?.seoTitle || "";
  byId<HTMLTextAreaElement>("review-meta-description")!.value = currentDraft?.draft?.metaDescription || "";
  byId<HTMLTextAreaElement>("review-outline")!.value = currentDraft?.draft?.outline.join("\n") || "";
  byId<HTMLTextAreaElement>("review-body")!.value = sectionsToText(currentDraft?.draft?.bodySections || []);
  byId<HTMLTextAreaElement>("review-faq")!.value =
    currentDraft?.draft?.faq
      .map((item: { question: string; answer: string }) => `${item.question} | ${item.answer}`)
      .join("\n") || "";
  byId<HTMLTextAreaElement>("review-links")!.value =
    currentDraft?.draft?.internalLinks
      .map((item: { label: string; href: string }) => `${item.label} | ${item.href}`)
      .join("\n") || "";
  byId<HTMLTextAreaElement>("review-citations")!.value =
    currentDraft?.draft?.sourceCitations
      .map((item: { label: string; url: string }) => `${item.label} | ${item.url}`)
      .join("\n") || "";
  byId<HTMLTextAreaElement>("review-quality-notes")!.value =
    (currentDraft?.reviewNotes || currentDraft?.draft?.qualityNotes || []).join("\n");

  byId<HTMLButtonElement>("review-save-button")!.onclick = async () => {
    if (!currentDraft) return;

    try {
      await requestJson(`${bridgeUrl}/drafts/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids: [currentDraft.id],
          action: "update",
          patch: {
            workingTitle: byId<HTMLInputElement>("review-working-title")!.value,
            seoTitle: byId<HTMLInputElement>("review-seo-title")!.value,
            metaDescription: byId<HTMLTextAreaElement>("review-meta-description")!.value,
            outline: byId<HTMLTextAreaElement>("review-outline")!.value.split("\n").map((item) => item.trim()).filter(Boolean),
            bodySections: textToSections(byId<HTMLTextAreaElement>("review-body")!.value),
            faq: byId<HTMLTextAreaElement>("review-faq")!
              .value.split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [question = "", answer = ""] = line.split("|").map((item) => item.trim());
                return { question, answer };
              }),
            internalLinks: byId<HTMLTextAreaElement>("review-links")!
              .value.split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [label = "", href = ""] = line.split("|").map((item) => item.trim());
                return { label, href };
              }),
            sourceCitations: byId<HTMLTextAreaElement>("review-citations")!
              .value.split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [label = "", url = ""] = line.split("|").map((item) => item.trim());
                return { label, url };
              }),
            qualityNotes: byId<HTMLTextAreaElement>("review-quality-notes")!
              .value.split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
          }
        })
      });
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };

  const wireReviewAction = (buttonId: string, action: "mark-reviewed" | "approve" | "reopen") => {
    byId<HTMLButtonElement>(buttonId)!.onclick = async () => {
      const ids = loadJson<string[]>(getSelectionKey("review"), []);
      if (ids.length === 0) {
        alert("先勾选要执行操作的草稿。");
        return;
      }

      try {
        await requestJson(`${bridgeUrl}/drafts/review`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids, action })
        });
        saveJson(getSelectionKey("review"), []);
        location.reload();
      } catch (error) {
        alert(error instanceof Error ? error.message : String(error));
      }
    };
  };

  wireReviewAction("review-mark-reviewed-button", "mark-reviewed");
  wireReviewAction("review-approve-button", "approve");
  wireReviewAction("review-reopen-button", "reopen");
}

function renderPublishPage(data: WorkflowOverviewResponse): void {
  const list = data.draftQueue.filter((draft) => ["approved", "published", "failed_publish"].includes(draft.status));
  const publishButton = byId<HTMLButtonElement>("publish-run-button");
  const logNode = byId<HTMLDivElement>("publish-log-list");
  if (!publishButton || !logNode) return;

  renderSelectableList({
    page: "publish",
    items: list,
    listId: "publish-list",
    allowedStatuses: ["approved"],
    itemTitle: (item) => item.draft?.workingTitle || item.title,
    itemMeta: (item) => [`状态：${item.status}`, item.publishedSlug ? `Slug：${item.publishedSlug}` : `来源：${item.source}`],
    itemBody: (item) => item.draft?.metaDescription || item.summary
  });

  publishButton.onclick = async () => {
    const ids = loadJson<string[]>(getSelectionKey("publish"), []);
    if (ids.length === 0) {
      alert("先勾选要发布的已批准草稿。");
      return;
    }

    publishButton.disabled = true;
    try {
      await requestJson(`${bridgeUrl}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids })
      });
      saveJson(getSelectionKey("publish"), []);
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      publishButton.disabled = false;
    }
  };

  logNode.innerHTML =
    data.publishLog.length > 0
      ? data.publishLog
          .slice()
          .reverse()
          .map(
            (entry) => `
              <article class="workflow-list-item">
                <div class="workflow-chip-row">
                  <span class="workflow-chip">${entry.status === "success" ? "成功" : "失败"}</span>
                  <span class="workflow-chip">${formatDateTime(entry.finishedAt)}</span>
                </div>
                <h4>${entry.message}</h4>
                <p>${entry.commitHash ? `Commit: ${entry.commitHash}` : "本次没有 commit hash。"}</p>
              </article>
            `
          )
          .join("")
      : `<div class="workflow-empty">还没有发布日志。</div>`;
}

function renderAutomationPage(data: WorkflowOverviewResponse): void {
  const settings = data.automation.settings;
  const enabled = byId<HTMLInputElement>("automation-enabled");
  const interval = byId<HTMLInputElement>("automation-interval");
  const fetchLimit = byId<HTMLInputElement>("automation-fetch-limit");
  const generateLimit = byId<HTMLInputElement>("automation-generate-limit");
  const minHeat = byId<HTMLInputElement>("automation-min-heat");
  const minRelevance = byId<HTMLInputElement>("automation-min-relevance");
  const saveButton = byId<HTMLButtonElement>("automation-save-button");
  const runButton = byId<HTMLButtonElement>("automation-run-button");
  const logNode = byId<HTMLDivElement>("automation-log-list");

  if (!enabled || !interval || !fetchLimit || !generateLimit || !minHeat || !minRelevance || !saveButton || !runButton || !logNode) {
    return;
  }

  enabled.checked = settings.enabled;
  interval.value = String(settings.intervalMinutes);
  fetchLimit.value = String(settings.fetchLimit);
  generateLimit.value = String(settings.generateLimit);
  minHeat.value = String(settings.minHeatScore);
  minRelevance.value = String(settings.minRelevanceScore);

  saveButton.onclick = async () => {
    try {
      await requestJson(`${bridgeUrl}/automation/settings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled: enabled.checked,
          intervalMinutes: Number(interval.value),
          fetchLimit: Number(fetchLimit.value),
          generateLimit: Number(generateLimit.value),
          minHeatScore: Number(minHeat.value),
          minRelevanceScore: Number(minRelevance.value)
        })
      });
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };

  runButton.onclick = async () => {
    runButton.disabled = true;
    try {
      await requestJson(`${bridgeUrl}/automation/run-once`, {
        method: "POST"
      });
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      runButton.disabled = false;
    }
  };

  logNode.innerHTML =
    data.automation.recentRuns.length > 0
      ? data.automation.recentRuns
          .map(
            (run) => `
              <article class="workflow-list-item">
                <div class="workflow-chip-row">
                  <span class="workflow-chip">状态：${run.status}</span>
                  <span class="workflow-chip">开始：${formatDateTime(run.startedAt)}</span>
                  <span class="workflow-chip">结束：${formatDateTime(run.finishedAt)}</span>
                </div>
                <h4>${run.message}</h4>
                <p>抓到 ${run.fetchedCount} 条，短名单 ${run.shortlistedCount} 条，生成 ${run.generatedCount} 条。</p>
              </article>
            `
          )
          .join("")
      : `<div class="workflow-empty">自动任务还没有运行记录。</div>`;
}

export async function initStudioWorkflowPage(page: WorkflowPage): Promise<void> {
  try {
    const data = await fetchOverview();
    updateGlobalChrome(data);

    if (page === "overview") renderOverviewPage(data);
    if (page === "topics") renderTopicsPage(data);
    if (page === "selection") renderSelectionPage(data);
    if (page === "drafts") renderDraftsPage(data);
    if (page === "review") renderReviewPage(data);
    if (page === "publish") renderPublishPage(data);
    if (page === "automation") renderAutomationPage(data);
  } catch (error) {
    setText("[data-workflow-status]", "桥接未连接");
    setText("[data-workflow-status-detail]", error instanceof Error ? error.message : String(error));
  }
}
