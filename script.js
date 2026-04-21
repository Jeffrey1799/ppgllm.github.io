/**
 * 返回 [0, 1] 范围内的安全进度值。
 * @param {number} value 原始数值。
 * @returns {number} 夹紧后的数值。
 */
function clamp(value) {
  return Math.min(1, Math.max(0, value));
}

/**
 * 判断用户是否启用了减少动态效果。
 * @returns {boolean} 是否启用 reduced motion。
 */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 读取当前固定头部的实际偏移量，用于锚点滚动和 section 跟踪。
 * @returns {number} 滚动定位时需要减去的头部高度。
 */
function getHeaderOffset() {
  const header = document.getElementById("siteHeader");
  return header ? header.getBoundingClientRect().height + 20 : 90;
}

const HD_ASSET_VERSION = "20260419-hd2";
const HD_ASSET_FILE_NAMES = new Set([
  "STM32F103C8T6.png",
  "MAX86916.png",
  "MIKROE-4724.png",
  "MIKROE-4724_2.png",
  "STM32F103.png",
  "图片1.png",
  "图片2.png",
  "图片3.png",
  "图片4.png",
  "图片5.png",
  "图片6.png",
  "图片7.png",
]);

/**
 * 为指定高清图片生成带版本号的 URL，用于强制浏览器刷新同名资源缓存。
 * @param {string | null} url 原始资源地址。
 * @returns {string | null} 添加版本号后的资源地址；非目标资源则原样返回。
 */
function getHdAssetVersionedUrl(url) {
  if (!url) {
    return url;
  }

  const [urlWithoutHash, hash = ""] = url.split("#");
  const [cleanUrl] = urlWithoutHash.split("?");
  const fileName = decodeURIComponent(cleanUrl.split("/").pop() || "");

  if (!HD_ASSET_FILE_NAMES.has(fileName)) {
    return url;
  }

  const versionedUrl = `${cleanUrl}?v=${HD_ASSET_VERSION}`;
  return hash ? `${versionedUrl}#${hash}` : versionedUrl;
}

/**
 * 统一刷新主页面中高清图片的资源引用，避免同名替换后仍命中旧缓存。
 * @returns {void}
 */
function refreshHdAssetReferences() {
  const bindings = [
    { selector: "img[src]", attribute: "src" },
    { selector: "[data-lightbox-src]", attribute: "data-lightbox-src" },
    { selector: "a[href]", attribute: "href" },
  ];

  bindings.forEach(({ selector, attribute }) => {
    const nodes = Array.from(document.querySelectorAll(selector));

    nodes.forEach((node) => {
      const currentValue = node.getAttribute(attribute);
      const nextValue = getHdAssetVersionedUrl(currentValue);

      if (nextValue && nextValue !== currentValue) {
        node.setAttribute(attribute, nextValue);
      }
    });
  });
}

/**
 * 为移动端导航抽屉同步开合状态。
 * @param {HTMLElement | null} drawer 抽屉容器。
 * @param {HTMLElement | null} toggle 触发按钮。
 * @param {boolean} open 是否打开。
 * @returns {void}
 */
function setDrawerOpenState(drawer, toggle, open) {
  if (!drawer || !toggle) {
    return;
  }

  if (open) {
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("is-open"));
    document.body.classList.add("nav-open");
  } else {
    drawer.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    window.setTimeout(() => {
      if (!drawer.classList.contains("is-open")) {
        drawer.hidden = true;
      }
    }, 220);
  }

  toggle.setAttribute("aria-expanded", open ? "true" : "false");
}

/**
 * 计算某个 section 在当前滚动中的完成进度，用于轻量滚动变量。
 * @param {HTMLElement} section 页面区段元素。
 * @returns {number} 当前区段滚动进度。
 */
function getSectionProgress(section) {
  const rect = section.getBoundingClientRect();
  const travel = Math.max(1, rect.height - window.innerHeight);

  if (rect.height <= window.innerHeight) {
    return clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height));
  }

  return clamp(-rect.top / travel);
}

/**
 * 初始化移动端导航抽屉。
 * @returns {void}
 */
function setupNavigationDrawer() {
  const drawer = document.getElementById("mobileNavDrawer");
  const toggle = document.getElementById("navToggle");
  const closeButton = document.getElementById("navDrawerClose");

  if (!drawer || !toggle || !closeButton) {
    return;
  }

  const closeDrawer = () => setDrawerOpenState(drawer, toggle, false);
  const openDrawer = () => setDrawerOpenState(drawer, toggle, true);

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  closeButton.addEventListener("click", closeDrawer);

  drawer.addEventListener("click", (event) => {
    if (event.target === drawer) {
      closeDrawer();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !drawer.hidden) {
      closeDrawer();
    }
  });
}

/**
 * 初始化 section 跟踪，联动顶部导航高亮和深浅主题。
 * @returns {void}
 */
function setupSectionTracking() {
  const header = document.getElementById("siteHeader");
  const sections = Array.from(document.querySelectorAll("main section[id]"));
  const navLinks = Array.from(document.querySelectorAll("[data-nav-link]"));

  if (!header || !sections.length || !navLinks.length) {
    return;
  }

  const update = () => {
    const marker = getHeaderOffset();
    let activeSection = sections[0];

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top - marker <= 0) {
        activeSection = section;
      }
    });

    const activeHash = `#${activeSection.id}`;
    const activeTheme = activeSection.dataset.theme || "light";

    header.classList.toggle("header-dark", activeTheme === "dark");

    navLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === activeHash;
      link.classList.toggle("is-current", isCurrent);
      if (isCurrent) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  let ticking = false;
  const requestUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
      ticking = true;
    }
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", update);
}

/**
 * 初始化进入视口 reveal 动画。
 * @returns {void}
 */
function setupReveal() {
  const items = Array.from(document.querySelectorAll(".reveal"));

  if (!items.length) {
    return;
  }

  items.forEach((item) => {
    const delay = item.getAttribute("data-delay");
    if (delay) {
      item.style.setProperty("--delay", `${delay}s`);
    }
  });

  if (prefersReducedMotion()) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  items.forEach((item) => observer.observe(item));
}

/**
 * 初始化顶部锚点滚动，并在触发后关闭移动端导航抽屉。
 * @returns {void}
 */
function setupAnchorNavigation() {
  const links = Array.from(document.querySelectorAll('a[href^="#"]'));
  const drawer = document.getElementById("mobileNavDrawer");
  const toggle = document.getElementById("navToggle");

  if (!links.length) {
    return;
  }

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") {
        return;
      }

      const target = document.querySelector(hash);
      if (!target) {
        return;
      }

      event.preventDefault();

      const top = Math.max(target.getBoundingClientRect().top + window.scrollY - getHeaderOffset(), 0);
      window.scrollTo({
        top,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });

      history.replaceState(null, "", hash);

      if (drawer && toggle && !drawer.hidden) {
        setDrawerOpenState(drawer, toggle, false);
      }
    });
  });
}

/**
 * 初始化工作站 tab 切换、键盘导航和滑动指示器。
 * @returns {void}
 */
function setupStageTabs() {
  const buttons = Array.from(document.querySelectorAll("[data-stage-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-stage-panel]"));
  const summaries = Array.from(document.querySelectorAll("[data-stage-summary]"));
  const tabsList = document.getElementById("stageTabList");
  const summaryStack = document.getElementById("stageSummaryStack");
  const stageViewport = document.querySelector(".stage__viewport");
  const defaultPanelTransitionMs = 640;
  const defaultPanelTransformMs = 1040;
  const slowPanelTransitionMs = 960;
  const slowPanelTransformMs = 1560;

  if (!buttons.length || !panels.length || !tabsList) {
    return;
  }

  const hasSummaries = Boolean(summaryStack) && summaries.length === buttons.length;
  const panelTimers = new WeakMap();
  let currentPanelTransitionMs = defaultPanelTransitionMs;

  let activeIndex = Math.max(
    0,
    buttons.findIndex((button) => button.classList.contains("is-active"))
  );

  const updateIndicator = (button) => {
    const listRect = tabsList.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const tone = getComputedStyle(button).getPropertyValue("--tab-tone").trim();

    tabsList.style.setProperty("--indicator-x", `${buttonRect.left - listRect.left}px`);
    tabsList.style.setProperty("--indicator-width", `${buttonRect.width}px`);
    tabsList.style.setProperty("--indicator-height", `${buttonRect.height}px`);
    tabsList.style.setProperty("--indicator-color", tone || "rgba(223, 90, 60, 0.94)");
  };

  const syncSummaryHeight = () => {
    if (!hasSummaries) {
      return;
    }

    const activeSummary = summaries[activeIndex];
    if (!activeSummary) {
      return;
    }

    summaryStack.style.height = `${activeSummary.offsetHeight}px`;
  };

  const clearPanelTimer = (panel) => {
    const currentTimer = panelTimers.get(panel);
    if (currentTimer) {
      window.clearTimeout(currentTimer);
      panelTimers.delete(panel);
    }
  };

  const schedulePanelCleanup = (panel, callback) => {
    clearPanelTimer(panel);
    const timer = window.setTimeout(() => {
      panelTimers.delete(panel);
      callback();
    }, currentPanelTransitionMs);
    panelTimers.set(panel, timer);
  };

  const setPanelTransitionTiming = (fromIndex = activeIndex, toIndex = activeIndex) => {
    const fromPanel = panels[fromIndex];
    const toPanel = panels[toIndex];
    const fromKey = fromPanel?.dataset.stagePanel || "";
    const toKey = toPanel?.dataset.stagePanel || "";
    const isPrimaryFlowTransition =
      fromKey !== toKey &&
      ["workstation", "analysis"].includes(fromKey) &&
      ["workstation", "analysis"].includes(toKey);
    const nextOpacityMs = isPrimaryFlowTransition ? slowPanelTransitionMs : defaultPanelTransitionMs;
    const nextTransformMs = isPrimaryFlowTransition ? slowPanelTransformMs : defaultPanelTransformMs;

    currentPanelTransitionMs = nextOpacityMs;

    if (stageViewport) {
      stageViewport.style.setProperty("--stage-panel-opacity-duration", `${nextOpacityMs}ms`);
      stageViewport.style.setProperty("--stage-panel-transform-duration", `${nextTransformMs}ms`);
      stageViewport.style.setProperty("--stage-panel-visibility-delay", `${nextOpacityMs}ms`);
    }
  };

  const setActivePanel = (nextIndex, focusPanel = false, animate = true) => {
    const previousIndex = activeIndex;
    activeIndex = Math.min(buttons.length - 1, Math.max(0, nextIndex));
    setPanelTransitionTiming(previousIndex, activeIndex);

    buttons.forEach((button, index) => {
      const isActive = index === activeIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    panels.forEach((panel, index) => {
      const isActive = index === activeIndex;
      panel.classList.toggle("is-before", index < activeIndex);
      panel.classList.toggle("is-after", index > activeIndex);
      panel.setAttribute("tabindex", isActive ? "0" : "-1");
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });

    if (!animate || previousIndex === activeIndex) {
      panels.forEach((panel, index) => {
        clearPanelTimer(panel);
        const isActive = index === activeIndex;
        panel.classList.remove("is-entering", "is-leaving");
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    } else {
      const previousPanel = panels[previousIndex];
      const activePanel = panels[activeIndex];

      panels.forEach((panel, index) => {
        if (index === previousIndex || index === activeIndex) {
          return;
        }

        clearPanelTimer(panel);
        panel.classList.remove("is-active", "is-entering", "is-leaving");
        panel.hidden = true;
      });

      if (previousPanel) {
        clearPanelTimer(previousPanel);
        previousPanel.hidden = false;
        previousPanel.classList.remove("is-entering", "is-active");
        previousPanel.classList.add("is-leaving");
        schedulePanelCleanup(previousPanel, () => {
          previousPanel.classList.remove("is-leaving");
          previousPanel.hidden = true;
        });
      }

      if (activePanel) {
        const targetIndex = activeIndex;
        clearPanelTimer(activePanel);
        activePanel.hidden = false;
        activePanel.classList.remove("is-leaving");
        activePanel.classList.add("is-entering");

        window.requestAnimationFrame(() => {
          if (activeIndex !== targetIndex) {
            return;
          }
          activePanel.classList.add("is-active");
        });

        schedulePanelCleanup(activePanel, () => {
          activePanel.classList.remove("is-entering");
        });
      }
    }

    if (hasSummaries) {
      summaries.forEach((summary, index) => {
        summary.classList.toggle("is-active", index === activeIndex);
        summary.classList.toggle("is-before", index < activeIndex);
        summary.classList.toggle("is-after", index > activeIndex);
      });
    }

    const activeButton = buttons[activeIndex];
    if (activeButton) {
      updateIndicator(activeButton);
    }

    syncSummaryHeight();

    if (focusPanel) {
      const activePanel = panels[activeIndex];
      if (activePanel) {
        activePanel.focus({ preventScroll: true });
      }
    }
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => setActivePanel(index));

    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
        return;
      }

      event.preventDefault();

      if (event.key === "Home") {
        setActivePanel(0);
        buttons[0].focus();
        return;
      }

      if (event.key === "End") {
        setActivePanel(buttons.length - 1);
        buttons[buttons.length - 1].focus();
        return;
      }

      const nextIndex =
        event.key === "ArrowRight"
          ? (index + 1) % buttons.length
          : (index - 1 + buttons.length) % buttons.length;

      setActivePanel(nextIndex);
      buttons[nextIndex].focus();
    });
  });

  setActivePanel(activeIndex, false, false);
  window.addEventListener("resize", () => {
    const activeButton = buttons[activeIndex];
    if (activeButton) {
      updateIndicator(activeButton);
      syncSummaryHeight();
    }
  });
}

/**
 * 初始化原理图主预览切换逻辑和缩略图键盘导航。
 * @returns {void}
 */
/**
 * 根据样本节律配置生成一条用于临床仪表板展示的 PPG 模拟波形路径。
 * @param {Array<{width: number, height: number}>} beats 节律片段数组，控制节拍频率与波幅。
 * @returns {string} 可直接写入 SVG path `d` 属性的曲线路径。
 */
function buildSamplesWavePath(beats) {
  const baseLine = 176;
  const startX = 24;
  const viewWidth = 640;
  const usableWidth = 592;
  const totalWidth = beats.reduce((sum, beat) => sum + beat.width, 0);
  const scale = totalWidth > 0 ? usableWidth / totalWidth : 1;
  let x = startX;
  let path = `M ${startX - 8} ${baseLine}`;

  beats.forEach((beat) => {
    const width = beat.width * scale;
    const amplitude = beat.height;
    const rise = width * 0.18;
    const peak = width * 0.08;
    const drop = width * 0.18;
    const notch = width * 0.18;
    const settle = Math.max(width - (rise + peak + drop + notch), width * 0.24);
    const peakY = baseLine - amplitude;
    const shoulderY = baseLine - amplitude * 0.84;
    const notchY = baseLine - amplitude * 0.28;
    const reboundY = baseLine - amplitude * 0.42;

    path += ` C ${x + rise * 0.32} ${baseLine} ${x + rise * 0.68} ${baseLine - amplitude * 0.52} ${x + rise} ${peakY}`;
    path += ` C ${x + rise + peak * 0.35} ${peakY - 10} ${x + rise + peak * 0.8} ${shoulderY} ${x + rise + peak} ${shoulderY}`;
    path += ` C ${x + rise + peak + drop * 0.28} ${baseLine - amplitude * 0.08} ${x + rise + peak + drop * 0.72} ${notchY} ${x + rise + peak + drop} ${notchY}`;
    path += ` C ${x + rise + peak + drop + notch * 0.28} ${reboundY} ${x + rise + peak + drop + notch * 0.7} ${baseLine - amplitude * 0.1} ${x + rise + peak + drop + notch} ${baseLine - amplitude * 0.1}`;
    path += ` C ${x + width - settle * 0.55} ${baseLine - amplitude * 0.06} ${x + width - settle * 0.18} ${baseLine} ${x + width} ${baseLine}`;
    x += width;
  });

  path += ` C ${Math.min(x + 18, viewWidth - 20)} ${baseLine} ${viewWidth - 16} ${baseLine} ${viewWidth - 8} ${baseLine}`;
  return path;
}

/**
 * 初始化“样本设计与算法评测”区的样本索引切换逻辑，同步更新指标、波形和病例摘要。
 * @returns {void}
 */
function setupSamplesDashboard() {
  const dashboard = document.getElementById("samplesDashboard");

  if (!dashboard) {
    return;
  }

  // 中文标签优先复用 diagnosis.py 中已有 flag 语义，再用 abnormal_samples_catalog.md 补齐展示型标签。
  const sampleTagLabelsZh = {
    bradycardia: "心动过缓",
    tachycardia: "心动过速",
    heart_rate_normal_range: "心率正常范围",
    low_signal_quality: "信号质量偏低",
    good_signal_quality: "信号质量良好",
    low_confidence: "解算置信度偏低",
    rhythm_irregular: "节律不规则",
    rhythm_regular: "节律较规则",
    peak_spectral_mismatch: "峰频结果不一致",
    spectral_peak_clear: "频谱主峰清晰",
    sinus_like: "窦性样节律",
    borderline_low_rate: "边界低心率",
    endocrine_context: "内分泌背景",
    stable_waveform: "波形稳定",
    stress_trigger: "应激诱发",
    possible_af: "房颤风险",
    infection_context: "感染背景",
    fever_linked: "发热相关",
    urgent_followup: "需尽快评估",
    under_read_risk: "存在低估风险",
    motion_artifact: "运动伪差",
    high_risk: "高风险提示",
  };

  const buttons = Array.from(dashboard.querySelectorAll("[data-sample-option]"));
  const detail = dashboard.querySelector(".samples__detail");
  const elements = {
    file: document.getElementById("samplesLensFile"),
    tokens: document.getElementById("samplesTokens"),
    headlineTop: document.getElementById("samplesMetricHeadlineTop"),
    headlineBottom: document.getElementById("samplesMetricHeadlineBottom"),
    bpm: document.getElementById("samplesMetricBpm"),
    confidence: document.getElementById("samplesMetricConfidence"),
    regularity: document.getElementById("samplesMetricRegularity"),
    quality: document.getElementById("samplesMetricQuality"),
    rrMean: document.getElementById("samplesMetricRrMean"),
    rrStd: document.getElementById("samplesMetricRrStd"),
    peakSpectral: document.getElementById("samplesMetricPeakSpectral"),
    wavePath: document.getElementById("samplesWavePath"),
    waveDesc: document.getElementById("samplesWaveDesc"),
    validationFocus: document.getElementById("samplesValidationFocus"),
    profileName: document.getElementById("samplesProfileName"),
    profileMeta: document.getElementById("samplesProfileMeta"),
    profileComplaint: document.getElementById("samplesProfileComplaint"),
    profileContext: document.getElementById("samplesProfileContext"),
    profileHistory: document.getElementById("samplesProfileHistory"),
    profileIntent: document.getElementById("samplesProfileIntent"),
  };
  const sampleCases = {
    "brady-48": {
      file: "abnormal_bradycardia_48bpm_fs100.csv",
      title: "48 BPM 窦缓样本",
      bpm: "48.62",
      confidence: "0.981",
      regularity: "0.861",
      quality: "0.984",
      rrMean: "1245.0",
      rrStd: "31.22",
      peakSpectral: "0.994",
      tags: ["bradycardia", "good_signal_quality", "sinus_like"],
      validationFocus: "区分生理性低心率与需进一步评估的低速节律，观察 BPM 与规则度是否稳定。",
      profileName: "李晨",
      profileMeta: "24 岁 / 男 / 长期耐力跑训练",
      complaint: "最近运动后心率偏慢，偶尔头晕。",
      context: "近 1 周静息时常感到心跳偏慢，起身较快时会有轻微头晕，无胸痛，无明显呼吸困难。",
      history: "长期坚持耐力跑训练，无已知心脏病史，用于测试生理性窦性心动过缓场景。",
      intent: "验证系统能否降低诊断强度，输出“继续观察 vs 建议进一步检查”的保守型追问策略。",
      beats: [
        { width: 178, height: 72 },
        { width: 170, height: 68 },
        { width: 176, height: 70 },
      ],
    },
    "brady-54": {
      file: "abnormal_bradycardia_54bpm_fs100.csv",
      title: "54 BPM 边界低心率",
      bpm: "53.28",
      confidence: "0.97",
      regularity: "0.869",
      quality: "0.99",
      rrMean: "1107.14",
      rrStd: "26.03",
      peakSpectral: "0.948",
      tags: ["borderline_low_rate", "endocrine_context", "stable_waveform"],
      validationFocus: "验证算法在边界低心率样本下能否维持稳定提取，同时提示内分泌相关背景需要复核。",
      profileName: "周宁",
      profileMeta: "41 岁 / 女 / 甲减随访背景",
      complaint: "体检提示脉搏偏慢，平时偶有疲劳感。",
      context: "症状不明显，无晕厥、无胸闷、无心前区疼痛，属于边界低心率与内分泌病史叠加场景。",
      history: "轻度甲状腺功能减退病史，左甲状腺素片间断服用，需要排除药物与代谢因素影响。",
      intent: "观察系统能否在低风险描述下主动追问甲功、药物依从性和近期复查情况。",
      beats: [
        { width: 156, height: 66 },
        { width: 148, height: 63 },
        { width: 150, height: 64 },
        { width: 146, height: 61 },
      ],
    },
    "tachy-126": {
      file: "abnormal_tachycardia_126bpm_fs100.csv",
      title: "126 BPM 应激性快节律",
      bpm: "124.64",
      confidence: "0.984",
      regularity: "0.91",
      quality: "0.996",
      rrMean: "475.52",
      rrStd: "7.7",
      peakSpectral: "0.976",
      tags: ["tachycardia", "stress_trigger", "good_signal_quality"],
      validationFocus: "验证系统能否把高心率与焦虑、熬夜等非器质性诱因联动表达，而不是直接升级风险。",
      profileName: "王悦",
      profileMeta: "32 岁 / 女 / 焦虑 + 熬夜场景",
      complaint: "最近两天心慌明显，睡眠差，偶有手抖。",
      context: "紧张和熬夜后出现持续快心率，无胸痛，属于高频但相对规则的应激型样本。",
      history: "有焦虑倾向，无明确器质性心脏病史，需先排查生活方式与压力因素。",
      intent: "要求模型给出低到中风险表达，并围绕熬夜、咖啡因摄入和情绪诱因做保守追问。",
      beats: [
        { width: 84, height: 60 },
        { width: 82, height: 58 },
        { width: 80, height: 61 },
        { width: 82, height: 57 },
        { width: 84, height: 60 },
        { width: 80, height: 58 },
      ],
    },
    "tachy-144": {
      file: "abnormal_tachycardia_144bpm_fs100.csv",
      title: "144 BPM 发热相关快节律",
      bpm: "144.29",
      confidence: "0.96",
      regularity: "0.928",
      quality: "0.998",
      rrMean: "416.36",
      rrStd: "5.4",
      peakSpectral: "0.905",
      tags: ["tachycardia", "infection_context", "fever_linked"],
      validationFocus: "在规则快节律基础上引入感染 / 发热语境，确认问诊结果会同时提示脱水、炎症和复测建议。",
      profileName: "陈浩",
      profileMeta: "28 岁 / 男 / 发热后持续快心率",
      complaint: "发热两天后，活动和静息时都觉得心跳偏快。",
      context: "伴随咽痛、低热和乏力，活动后明显心悸，属于感染应激放大的窦性心动过速场景。",
      history: "无高血压、冠心病病史，近期自行服用感冒药，需要评估药物与体温对心率的共同影响。",
      intent: "要求模型补充追问体温、饮水、近期用药和胸闷症状，同时保持非最终诊断语气。",
      beats: [
        { width: 72, height: 58 },
        { width: 70, height: 56 },
        { width: 68, height: 59 },
        { width: 72, height: 57 },
        { width: 70, height: 58 },
        { width: 68, height: 56 },
        { width: 72, height: 59 },
      ],
    },
    "tachy-156": {
      file: "abnormal_tachycardia_156bpm_fs100.csv",
      title: "156 BPM 高危快节律",
      bpm: "156.09",
      confidence: "0.952",
      regularity: "0.915",
      quality: "0.996",
      rrMean: "383.89",
      rrStd: "5.91",
      peakSpectral: "0.88",
      tags: ["tachycardia", "urgent_followup", "under_read_risk"],
      validationFocus: "高心率样本需要同时检验两件事：算法是否仍能提取到高值，以及问诊层是否升级为紧急就医建议。",
      profileName: "赵磊",
      profileMeta: "35 岁 / 男 / 阵发性过速史",
      complaint: "突发心慌胸闷，持续约 15 分钟，伴出汗和轻度气短。",
      context: "样本用于模拟高危持续快节律，当前求解器在极短峰间距下存在低估风险，需要特别标注。",
      history: "既往有阵发性心动过速发作史，无规律服药，属于需要快速分诊的重点场景。",
      intent: "要求模型给出高风险提示，明确建议尽快就医，并主动追问胸痛、晕厥和持续时间。",
      beats: [
        { width: 66, height: 56 },
        { width: 62, height: 58 },
        { width: 60, height: 57 },
        { width: 64, height: 59 },
        { width: 62, height: 56 },
        { width: 60, height: 58 },
        { width: 64, height: 57 },
        { width: 62, height: 58 },
      ],
    },
    irregular: {
      file: "abnormal_irregular_tachycardia_fs100.csv",
      title: "不规则快节律样本",
      bpm: "130.83",
      confidence: "0.821",
      regularity: "0.209",
      quality: "0.995",
      rrMean: "495.0",
      rrStd: "70.45",
      peakSpectral: "0.611",
      tags: ["rhythm_irregular", "peak_spectral_mismatch", "high_risk"],
      validationFocus: "低规则度与峰频错配需要被清晰识别，验证模型是否主动提示进一步心电检查而非给出过度确定的结论。",
      profileName: "孙婕",
      profileMeta: "63 岁 / 女 / 慢病高风险背景",
      complaint: "近 3 天反复感觉心跳忽快忽慢，伴胸闷和轻微头晕。",
      context: "节律忽快忽慢，夜间更明显，活动耐量下降，是典型需要结合慢病背景提升警惕的异常样本。",
      history: "高血压 8 年、2 型糖尿病 5 年，长期服用缬沙坦和二甲双胍，属于慢病高风险人群。",
      intent: "要求模型优先提示节律异常风险、建议进一步心电检查，并追问晕厥、夜间发作与近期血压波动。",
      beats: [
        { width: 96, height: 58 },
        { width: 64, height: 46 },
        { width: 112, height: 66 },
        { width: 70, height: 50 },
        { width: 88, height: 62 },
      ],
    },
  };

  if (!buttons.length || !detail || Object.values(elements).some((element) => !element)) {
    return;
  }

  let activeId =
    buttons.find((button) => button.classList.contains("is-active"))?.dataset.sampleOption ||
    buttons[0]?.dataset.sampleOption ||
    "";
  let transitionTimer = 0;

  const setActiveButton = (sampleId) => {
    buttons.forEach((button) => {
      const isActive = button.dataset.sampleOption === sampleId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  };

  const renderSample = (sampleId, options = {}) => {
    const sample = sampleCases[sampleId];
    const shouldAnimate = options.animate !== false && !prefersReducedMotion();

    if (!sample) {
      return;
    }

    setActiveButton(sampleId);
    activeId = sampleId;

    if (transitionTimer) {
      window.clearTimeout(transitionTimer);
      transitionTimer = 0;
    }

    const commit = () => {
      const titleBpmMatch = sample.title.match(/^(\d+)\s*BPM/);
      const titleWithoutBpm = sample.title.replace(/^\d+\s*BPM\s*/, "").trim();
      elements.file.textContent = sample.file;
      elements.headlineTop.textContent = titleBpmMatch ? `${titleBpmMatch[1]} BPM` : "\u672a\u77e5 BPM";
      elements.headlineBottom.textContent = titleWithoutBpm || sample.title;
      elements.bpm.textContent = sample.bpm;
      elements.confidence.textContent = sample.confidence;
      elements.regularity.textContent = sample.regularity;
      elements.quality.textContent = sample.quality;
      elements.rrMean.textContent = sample.rrMean;
      elements.rrStd.textContent = sample.rrStd;
      elements.peakSpectral.textContent = sample.peakSpectral;
      elements.validationFocus.textContent = sample.validationFocus;
      elements.profileName.textContent = sample.profileName;
      elements.profileMeta.textContent = sample.profileMeta;
      elements.profileComplaint.textContent = sample.complaint;
      elements.profileContext.textContent = sample.context;
      elements.profileHistory.textContent = sample.history;
      elements.profileIntent.textContent = sample.intent;
      elements.wavePath.setAttribute("d", buildSamplesWavePath(sample.beats));
      elements.waveDesc.textContent = `用于展示${sample.title}当前频率与波幅变化的模拟PPG波形。`;
      elements.tokens.textContent = "";

      sample.tags.forEach((tag) => {
        const token = document.createElement("span");
        token.className = "samples__token";
        token.textContent = sampleTagLabelsZh[tag] || tag;
        elements.tokens.appendChild(token);
      });

      window.requestAnimationFrame(() => {
        detail.classList.remove("is-updating");
      });
    };

    if (!shouldAnimate) {
      commit();
      return;
    }

    detail.classList.add("is-updating");
    transitionTimer = window.setTimeout(() => {
      commit();
      transitionTimer = 0;
    }, 150);
  };

  const screenshotMap = {
    "brady-48": "./assets/abnormal_bradycardia_48bpm_fs100.png",
    "brady-54": "./assets/abnormal_bradycardia_54bpm_fs100.png",
    "tachy-126": "./assets/abnormal_tachycardia_126bpm_fs100.png",
    "tachy-144": "./assets/abnormal_tachycardia_144bpm_fs100.png",
    "tachy-156": "./assets/abnormal_tachycardia_156bpm_fs100.png",
    irregular: "./assets/abnormal_irregular_tachycardia_fs100.png",
  };

  const viewToggle = document.getElementById("samplesViewToggle");
  const screenshotPanel = document.getElementById("samplesScreenshot");
  const screenshotImg = document.getElementById("samplesScreenshotImg");
  const lensPanel = document.getElementById("samplesLensPanel");
  const profilePanel = document.getElementById("samplesProfilePanel");
  let screenshotMode = false;

  let viewTransitionTimer = 0;

  /**
   * 切换截图模式与数据面板模式，带淡出→切换→淡入转场动画。
   * @param {boolean} show - true 显示截图，false 显示数据面板
   * @returns {void}
   */
  const setScreenshotMode = (show) => {
    if (viewTransitionTimer) {
      window.clearTimeout(viewTransitionTimer);
      viewTransitionTimer = 0;
    }

    const useAnimation = !prefersReducedMotion();
    const outgoing = show ? [lensPanel, profilePanel] : [screenshotPanel];
    const incoming = show ? [screenshotPanel] : [lensPanel, profilePanel];

    screenshotMode = show;
    viewToggle.setAttribute("aria-pressed", show ? "true" : "false");
    const label = viewToggle.querySelector(".samples__view-btn-label");
    label.textContent = show ? label.dataset.alt : label.dataset.default;

    if (!useAnimation) {
      outgoing.forEach((el) => { el.hidden = true; });
      incoming.forEach((el) => { el.hidden = false; });
      return;
    }

    outgoing.forEach((el) => { el.classList.add("is-exiting"); });
    incoming.forEach((el) => { el.classList.add("is-entering"); });

    viewTransitionTimer = window.setTimeout(() => {
      outgoing.forEach((el) => {
        el.hidden = true;
        el.classList.remove("is-exiting");
      });
      incoming.forEach((el) => {
        el.hidden = false;
      });
      window.requestAnimationFrame(() => {
        incoming.forEach((el) => { el.classList.remove("is-entering"); });
      });
      viewTransitionTimer = 0;
    }, 280);
  };

  let screenshotSwapTimer = 0;

  /**
   * 更新截图路径为当前选中样本对应的截图，带淡出→换图→淡入动画。
   * @param {string} sampleId - 当前选中的样本 ID
   * @param {boolean} [animate=true] - 是否使用动画
   * @returns {void}
   */
  const updateScreenshot = (sampleId, animate) => {
    const src = screenshotMap[sampleId] || "";
    const sample = sampleCases[sampleId];
    const shouldAnimate = animate !== false && !prefersReducedMotion();

    if (screenshotSwapTimer) {
      window.clearTimeout(screenshotSwapTimer);
      screenshotSwapTimer = 0;
    }

    if (!shouldAnimate) {
      screenshotImg.src = src;
      screenshotImg.alt = sample ? `${sample.title}测试截图` : "测试截图";
      return;
    }

    screenshotPanel.classList.add("is-exiting");
    screenshotSwapTimer = window.setTimeout(() => {
      screenshotImg.src = src;
      screenshotImg.alt = sample ? `${sample.title}测试截图` : "测试截图";
      screenshotPanel.classList.remove("is-exiting");
      screenshotSwapTimer = 0;
    }, 280);
  };

  if (viewToggle) {
    viewToggle.addEventListener("click", () => {
      setScreenshotMode(!screenshotMode);
      if (screenshotMode) {
        updateScreenshot(activeId, false);
      }
    });
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      renderSample(button.dataset.sampleOption || "");
      if (screenshotMode) {
        updateScreenshot(button.dataset.sampleOption || "");
      }
    });

    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
        return;
      }

      event.preventDefault();

      if (event.key === "Home") {
        renderSample(buttons[0].dataset.sampleOption || "");
        if (screenshotMode) updateScreenshot(buttons[0].dataset.sampleOption || "");
        buttons[0].focus();
        return;
      }

      if (event.key === "End") {
        const lastButton = buttons[buttons.length - 1];
        renderSample(lastButton.dataset.sampleOption || "");
        if (screenshotMode) updateScreenshot(lastButton.dataset.sampleOption || "");
        lastButton.focus();
        return;
      }

      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (index + delta + buttons.length) % buttons.length;
      const nextButton = buttons[nextIndex];
      renderSample(nextButton.dataset.sampleOption || "");
      if (screenshotMode) updateScreenshot(nextButton.dataset.sampleOption || "");
      nextButton.focus();
    });
  });

  renderSample(activeId, { animate: false });
}

/**
 * 初始化提示词设计区的状态标签切换，联动输入载荷、Prompt 逻辑与结构化输出示例。
 * @returns {void}
 */
function setupPromptsSection() {
  const section = document.getElementById("prompts");

  if (!section) {
    return;
  }

  const buttons = Array.from(section.querySelectorAll("[data-prompt-state]"));
  const grid = section.querySelector(".prompts__grid");
  const elements = {
    inputBpm: document.getElementById("promptInputBpm"),
    inputRhythm: document.getElementById("promptInputRhythm"),
    inputSnr: document.getElementById("promptInputSnr"),
    inputContext: document.getElementById("promptInputContext"),
    flags: document.getElementById("promptFlags"),
    stateLabel: document.getElementById("promptStateLabel"),
    commandPath: document.getElementById("promptCommandPath"),
    stateSummary: document.getElementById("promptStateSummary"),
    role: document.getElementById("promptRoleCopy"),
    safety: document.getElementById("promptSafetyCopy"),
    strategy: document.getElementById("promptStrategyCopy"),
    stateLogic: document.getElementById("promptStateLogic"),
    riskLevel: document.getElementById("promptRiskLevel"),
    riskReason: document.getElementById("promptRiskReason"),
    questions: document.getElementById("promptQuestions"),
    actions: document.getElementById("promptActions"),
  };
  const promptStates = {
    normal: {
      input: {
        bpm: "72",
        rhythm: "0.96",
        snr: "18.8",
        context: "轻度心悸自述 + 近期熬夜 + 无明显慢病史",
        flags: ["stable_sinus", "adequate_signal", "observe_only"],
      },
      window: {
        label: "NORMAL / 基线问诊",
        path: "build_messages()",
        summary: "规则节律且信号质量充足时，系统保持专业助手语气，只做结构化问诊与基础风险筛查。",
        role: "先总结主诉、近期诱因与 PPG 指标，再补充生活方式和症状持续时间，不夸大风险。",
        safety: "明确声明结果仅用于医学辅助沟通，不替代线下检查或医生诊断。",
        strategy: "在基线场景下优先给出观察、记录与必要复测建议，避免把单次波动解释为器质性异常。",
        logic: "处理逻辑：当节律规则、SNR 充足且无高危 flags 时，系统默认采用低风险表达和简短追问。",
      },
      output: {
        riskLevel: "低风险 / 继续观察",
        riskReason: "当前更像生活方式或短期应激引起的波动，系统优先保持中性表达。",
        questions: [
          "最近是否熬夜、饮用咖啡因或运动后立即测量？",
          "心悸是否只在紧张、疲劳或情绪波动时出现？",
          "是否伴随胸痛、黑矇或活动后明显气短？",
        ],
        actions: [
          "建议在静息状态下重复测量并记录触发因素。",
          "维持睡眠、补水和规律作息，观察症状是否缓解。",
          "若症状持续或加重，可线下做基础心电图检查。",
        ],
      },
    },
    "af-risk": {
      input: {
        bpm: "138",
        rhythm: "0.42",
        snr: "14.1",
        context: "心悸反复 + 慢病背景 + 夜间发作更明显",
        flags: ["tachycardia", "irregular_rhythm", "possible_af"],
      },
      window: {
        label: "AF RISK / 保守升级",
        path: "build_messages() -> build_follow_up_messages()",
        summary: "当节律不规则且伴随慢病背景时，系统必须先提示风险，再组织追问，而不是直接给出诊断结论。",
        role: "先总结主诉与结构化 PPG 特征，再围绕心悸持续时间、头晕胸闷和既往病史组织追问。",
        safety: "只输出“房颤风险 / 需进一步评估”这类辅助表达，不替代心电图或医生诊断。",
        strategy: "若同时出现置信度下降或信号质量不足，优先建议复测确认，再决定是否保留异常提醒。",
        logic: "处理逻辑：节律不规则被视为高优先级风险线索，输出先强调异常警示，再引导做心电图与线下评估。",
      },
      output: {
        riskLevel: "中高风险 / 建议尽快评估",
        riskReason: "节律规则度显著下降，且伴随慢病背景，系统默认使用更谨慎的风险描述。",
        questions: [
          "是否出现头晕、黑矇、胸闷或活动耐量下降？",
          "既往是否有高血压、糖尿病、房颤或脑卒中史？",
          "症状持续多久，夜间或静息时是否更明显？",
        ],
        actions: [
          "建议尽快完成心电图或动态心电监测。",
          "保留发作时间、伴随症状和近期用药记录。",
          "若胸痛、晕厥或持续胸闷明显，应尽快线下就医。",
        ],
      },
    },
    "low-quality": {
      input: {
        bpm: "124",
        rhythm: "0.68",
        snr: "6.3",
        context: "运动后立刻采样 + 佩戴松动 + 手指接触不稳定",
        flags: ["tachycardia", "low_signal_quality", "motion_artifact"],
      },
      window: {
        label: "LOW QUALITY / 先复测",
        path: "build_ppg_summary_payload() -> signal quality guard",
        summary: "低信号质量下，系统会先质疑数据可靠性，再决定是否保留低置信度的异常提醒。",
        role: "先提醒采样条件可能影响结果，再追问测量姿势、佩戴松紧和运动干扰，而不是直接放大异常。",
        safety: "避免基于低质量信号做明确判断，所有异常提示都必须带上“仅供参考、需复测确认”。",
        strategy: "当 BPM 偏高但 SNR 过低时，系统优先输出“重测确认”，只有症状明显时才追加线下就医建议。",
        logic: "处理逻辑：先做信号质量守门，再做风险描述，保证噪声不会被误包装成确定性的医学结论。",
      },
      output: {
        riskLevel: "结果待确认 / 先复测",
        riskReason: "当前信号可信度不足，系统将重测建议置于异常结论之前。",
        questions: [
          "采样时是否在走动、说话或刚结束运动？",
          "设备是否贴合，手指是否冰冷或压迫不稳定？",
          "复测后若仍不适，是否伴随胸闷、头晕或乏力？",
        ],
        actions: [
          "静息 1 到 2 分钟后重新采样，尽量保持手部稳定。",
          "检查佩戴松紧、接触面与环境光干扰。",
          "若复测仍异常或症状持续，应尽快线下评估。",
        ],
      },
    },
  };

  if (!buttons.length || !grid || Object.values(elements).some((element) => !element)) {
    return;
  }

  let activeId =
    buttons.find((button) => button.classList.contains("is-active"))?.dataset.promptState ||
    buttons[0]?.dataset.promptState ||
    "";
  let transitionTimer = 0;

  const renderList = (list, items) => {
    list.textContent = "";
    items.forEach((item) => {
      const entry = document.createElement("li");
      entry.textContent = item;
      list.appendChild(entry);
    });
  };

  const renderFlags = (flags) => {
    elements.flags.textContent = "";
    flags.forEach((flag) => {
      const token = document.createElement("span");
      token.className = "prompts__flag";
      token.textContent = flag;
      elements.flags.appendChild(token);
    });
  };

  const setActiveButton = (stateId) => {
    buttons.forEach((button) => {
      const isActive = button.dataset.promptState === stateId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  };

  const renderState = (stateId, options = {}) => {
    const state = promptStates[stateId];
    const shouldAnimate = options.animate !== false && !prefersReducedMotion();

    if (!state) {
      return;
    }

    setActiveButton(stateId);
    activeId = stateId;

    if (transitionTimer) {
      window.clearTimeout(transitionTimer);
      transitionTimer = 0;
    }

    const commit = () => {
      elements.inputBpm.textContent = state.input.bpm;
      elements.inputRhythm.textContent = state.input.rhythm;
      elements.inputSnr.textContent = state.input.snr;
      elements.inputContext.textContent = state.input.context;
      renderFlags(state.input.flags);

      elements.stateLabel.textContent = state.window.label;
      elements.commandPath.textContent = state.window.path;
      elements.stateSummary.textContent = state.window.summary;
      elements.role.textContent = state.window.role;
      elements.safety.textContent = state.window.safety;
      elements.strategy.textContent = state.window.strategy;
      elements.stateLogic.textContent = state.window.logic;

      elements.riskLevel.textContent = state.output.riskLevel;
      elements.riskReason.textContent = state.output.riskReason;
      renderList(elements.questions, state.output.questions);
      renderList(elements.actions, state.output.actions);

      window.requestAnimationFrame(() => {
        grid.classList.remove("is-updating");
      });
    };

    if (!shouldAnimate) {
      commit();
      return;
    }

    grid.classList.add("is-updating");
    transitionTimer = window.setTimeout(() => {
      commit();
      transitionTimer = 0;
    }, 140);
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      renderState(button.dataset.promptState || "");
    });

    button.addEventListener("keydown", (event) => {
      if (
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight" &&
        event.key !== "ArrowUp" &&
        event.key !== "ArrowDown" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }

      event.preventDefault();

      if (event.key === "Home") {
        renderState(buttons[0].dataset.promptState || "");
        buttons[0].focus();
        return;
      }

      if (event.key === "End") {
        const lastButton = buttons[buttons.length - 1];
        renderState(lastButton.dataset.promptState || "");
        lastButton.focus();
        return;
      }

      const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (index + delta + buttons.length) % buttons.length;
      const nextButton = buttons[nextIndex];
      renderState(nextButton.dataset.promptState || "");
      nextButton.focus();
    });
  });

  renderState(activeId, { animate: false });
}

/**
 * 初始化“算法设计”区的阶段切换，联动流水线高亮、查看器内容和键盘导航。
 * @returns {void}
 */
function setupAlgorithmSection() {
  const section = document.getElementById("algorithm");

  if (!section) {
    return;
  }

  const buttons = Array.from(section.querySelectorAll("[data-algo-stage]"));
  const pipeNodes = Array.from(section.querySelectorAll("[data-algo-pipe]"));
  const viewer = document.getElementById("algorithmViewer");
  const elements = {
    title: document.getElementById("algoStageTitle"),
    desc: document.getElementById("algoStageDesc"),
    logicTitle: document.getElementById("algoLogicTitle"),
    logicDesc: document.getElementById("algoLogicDesc"),
    logicFormula: document.getElementById("algoLogicFormula"),
    params: document.getElementById("algoParams"),
    footnote: document.getElementById("algoFootnote"),
  };

  /**
   * 算法各阶段数据定义，每个阶段包含标签、来源文件、标题、描述、核心逻辑和关键参数。
   * @type {Object<string, Object>}
   */
  const stages = {
    input: {
      tag: "STAGE 01 / INPUT",
      source: "data_source.py · signal_processing.py",
      pipe: "input",
      title: "输入与时间基校准",
      desc: "统一 CSV/串口输入与 8 秒滑动窗口，为后续快速傅里叶变换(FFT)、延迟量(lag) 和 RR间期(RR) 换算提供稳定时间基。",
      logicTitle: "有效采样率估计",
      logicDesc: "优先根据时间戳中值间隔反推有效采样率；当样本过少或时间间隔无效时，再回退到配置采样率。串口流与 CSV 回放共享统一的 ChannelFrame 数据抽象。",
      formula: "effective_fs = 1 / median(diff(timestamps))\nif len(timestamps) < 3 or interval_invalid:\n  effective_fs = configured_fs",
      params: ["分析窗口 = 8.0 s", "更新间隔 = 1.0 s", "名义采样率 = 100 Hz", "不足 3 点时回退配置值"],
      footnote: "StreamingPpgAnalyzer 只把最近 8 秒的活动窗口送入核心解算，既保证频域分析长度足够，也避免 UI 刷新频率直接污染算法时间轴。",
    },
    pca: {
      tag: "STAGE 02 / PCA FUSION",
      source: "signal_processing.py",
      pipe: "pca",
      title: "PCA 自适应多通道融合",
      desc: "PCA 每窗口重算，确保通道权重跟随佩戴姿态和皮肤接触变化。",
      logicTitle: "融合投影计算",
      logicDesc: "系统先做逐通道 Z-score 标准化，再对协方差矩阵做特征分解，选最大特征值对应向量作为融合方向。若某一路标准差极小，只会用安全标准差 1.0 继续标准化，不会切换成单独的“均值融合”分支。",
      formula: "safe_std = where(std < 1e-6, 1.0, std)\nZ = (channels - mean) / safe_std\nfused = Z · v_1",
      params: ["标准化 = Z-score", "方差保护 = safe_std", "投影 = 第一主成分", "附带输出 = pca_weights"],
      footnote: "PCA 在每个活动窗口上独立重算，目的不是离线训练固定权重，而是让融合方向跟随当前佩戴姿态、接触质量和波段表现实时调整。",
    },
    bandpass: {
      tag: "STAGE 03 / BANDPASS",
      source: "signal_processing.py",
      pipe: "bandpass",
      title: "Butterworth 心率带通滤波",
      desc: "零相位滤波消除群延迟，使滤波后峰位与原始信号精确对齐。",
      logicTitle: "滤波器参数与退化策略",
      logicDesc: "当 SOS 构建失败或信号长度不足时，系统回退到去均值策略，保证流水线不因边界异常中断。",
      formula: "sos = butter(N=4, Wn=[0.7, 3.5], btype='band', fs=fs, output='sos')\nfiltered = sosfiltfilt(sos, fused_signal)",
      params: ["通带 = 0.7–3.5 Hz", "阶数 = 4", "结构 = SOS", "相位 = 零相位双向", "样本不足时 = 去均值回退"],
      footnote: "使用 4 阶 Butterworth 带通滤波器保留 0.7–3.5 Hz（对应 42–210 BPM）心率频段，抑制基线漂移与高频噪声。采用 SOS 结构双向零相位滤波，避免相位失真影响峰值检测。",
    },
    tripath: {
      tag: "STAGE 04 / TRI-PATH",
      source: "signal_processing.py",
      pipe: "tripath",
      title: "频域 / 自相关 / 峰值三路并行估计",
      desc: "三路候选共享同一条融合信号，但估计视角不同，便于后续做一致性与连续性判决。",
      logicTitle: "三路核心公式",
      logicDesc: "频域法先做周期图(periodogram)和谐波增强评分；自相关法在归一化自相关函数(ACF)上找最优延迟量(lag)；峰值法使用自适应峰距和 RR间期(RR) 清洗，并用 spectral_bpm 做半倍频/倍频纠偏，所以它们不是彼此完全隔离的三条线。",
      formula: "频域: score(f) = P(f) + 0.65·P(2f) + 0.25·P(3f)\n自相关: bpm = 60 × fs / optimal_lag\n峰值: bpm = 60 / median(valid_RR)\n峰值纠偏: peak_bpm = choose_peak_candidate(peak_bpm, spectral_bpm)",
      params: ["谐波权重 = 1 + 0.65 + 0.25", "连续性窗口 = max(18 BPM, prev × 0.18)", "RR间期(RR) 清洗 = 0.3–2.0 s", "峰距 = 0.24–1.0 s 自适应"],
      footnote: "这一层真正提供的是三组 BPM 候选值和支持度证据，而不是立刻给出最终结论。频域、自相关、峰值法各有强项，后面的融合判决负责把它们组织成一个更稳的输出。",
    },
    fusion: {
      tag: "STAGE 05 / FUSION & RHYTHM",
      source: "signal_processing.py · diagnosis.py",
      pipe: "fusion",
      title: "融合判决与节律特征",
      desc: "根据一致性、连续性和支持度在 spectral / autocorr / peak 之间择优输出最终 BPM，并补充 RR间期(RR) 统计、规则性和 flags。",
      logicTitle: "置信度与规则性模型",
      logicDesc: "系统会先看 tracked_spectral、tracked_hybrid、hybrid、peak/autocorr 等分支条件，再合成 confidence、signal_quality、peak_spectral_agreement 和 rhythm_regularity_score；RR间期(RR) 变异系数越小，规则性评分越高。",
      formula: "confidence = 0.30×band_ratio + 0.25×clarity + 0.20×peak_spectral + 0.15×spec_autocorr + 0.10×autocorr_support\nregularity = clamp(1 - rr_cv / 0.18, 0, 1)",
      params: ["方法分支 = tracked_spectral / hybrid / peak / autocorr", "RR间期(RR) 统计 = mean / std / cv", "一致性 = peak vs spectral / autocorr", "标记 = bradycardia / tachycardia / irregular / ..."],
      footnote: "融合层的价值不只是“挑一个 BPM”，还要把 RR间期(RR) 均值、RR间期(RR) 方差、变异系数、规则性评分、峰频一致性和信号质量一起整理出来，供后续问诊与报告层使用。",
    },
    llm: {
      tag: "STAGE 06 / LLM CONTEXT",
      source: "diagnosis.py",
      pipe: "llm",
      title: "结构化摘要与 LLM 问诊接口",
      desc: "build_ppg_summary_payload / build_messages 把算法结果压成统一结构，Mock 与在线接口共用同一输入边界。",
      logicTitle: "结构化摘要载荷",
      logicDesc: "真实 payload 使用 heart_rate_bpm、analysis_method、signal_quality、rhythm_regularity_score、possible_flags、pca_weights 等字段，再由 build_messages / build_follow_up_messages 组装成问诊上下文。",
      formula: "payload = {\n  heart_rate_bpm, peak_bpm, spectral_bpm,\n  confidence, signal_quality,\n  rhythm_regularity_score, rr_mean_ms,\n  rr_std_ms, rr_cv, possible_flags,\n  pca_weights, analysis_method\n}",
      params: ["默认 provider = mock", "在线接口 = OpenAI compatible / DeepSeek-v3.2", "输出 = JSON 问诊结果 + Markdown 报告", "原则 = 保守表达 / 非最终诊断"],
      footnote: "LLM 层并不重新做信号解算，而是消费前一层已经整理好的结构化摘要。MockDiagnosisClient 和在线模型共用同一份输入结构，因此离线演示和在线问诊的接口边界保持一致。",
    },
  };

  if (
    !buttons.length ||
    !viewer ||
    Object.values(elements).some(function (el) { return !el; })
  ) {
    return;
  }

  var activeId =
    (buttons.find(function (b) { return b.classList.contains("is-active"); }) || buttons[0])
      .dataset.algoStage || "";
  var transitionTimer = 0;

  /**
   * 设置当前激活的导航按钮并高亮对应的流水线节点。
   * @param {string} stageId - 当前阶段 ID
   * @returns {void}
   */
  var setActiveButton = function (stageId) {
    buttons.forEach(function (button) {
      var isActive = button.dataset.algoStage === stageId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    var stage = stages[stageId];
    if (stage) {
      pipeNodes.forEach(function (node) {
        node.classList.toggle("is-active", node.dataset.algoPipe === stage.pipe);
      });
    }
  };

  /**
   * 渲染指定阶段的内容到查看器中，带淡出→切换→淡入动画。
   * @param {string} stageId - 目标阶段 ID
   * @param {Object} [options] - 可选配置
   * @param {boolean} [options.animate=true] - 是否使用动画
   * @returns {void}
   */
  var renderStage = function (stageId, options) {
    options = options || {};
    var stage = stages[stageId];
    var shouldAnimate = options.animate !== false && !prefersReducedMotion();

    if (!stage) {
      return;
    }

    setActiveButton(stageId);
    activeId = stageId;

    if (transitionTimer) {
      window.clearTimeout(transitionTimer);
      transitionTimer = 0;
    }

    var commit = function () {
      elements.title.textContent = stage.title;
      elements.desc.textContent = stage.desc;
      elements.logicTitle.textContent = stage.logicTitle;
      elements.logicDesc.textContent = stage.logicDesc;
      elements.logicFormula.textContent = stage.formula;
      elements.footnote.textContent = stage.footnote;

      elements.params.textContent = "";
      stage.params.forEach(function (text) {
        var span = document.createElement("span");
        span.className = "algorithm__tag";
        span.textContent = text;
        elements.params.appendChild(span);
      });

      window.requestAnimationFrame(function () {
        viewer.classList.remove("is-updating");
      });
    };

    if (!shouldAnimate) {
      commit();
      return;
    }

    viewer.classList.add("is-updating");
    transitionTimer = window.setTimeout(function () {
      commit();
      transitionTimer = 0;
    }, 150);
  };

  buttons.forEach(function (button, index) {
    button.addEventListener("click", function () {
      renderStage(button.dataset.algoStage || "");
    });

    button.addEventListener("keydown", function (event) {
      if (
        event.key !== "ArrowUp" &&
        event.key !== "ArrowDown" &&
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }

      event.preventDefault();

      if (event.key === "Home") {
        renderStage(buttons[0].dataset.algoStage || "");
        buttons[0].focus();
        return;
      }

      if (event.key === "End") {
        var last = buttons[buttons.length - 1];
        renderStage(last.dataset.algoStage || "");
        last.focus();
        return;
      }

      var delta = (event.key === "ArrowDown" || event.key === "ArrowRight") ? 1 : -1;
      var nextIndex = (index + delta + buttons.length) % buttons.length;
      var nextButton = buttons[nextIndex];
      renderStage(nextButton.dataset.algoStage || "");
      nextButton.focus();
    });
  });

  renderStage(activeId, { animate: false });
}

/**
 * 初始化“工程部署设计”区的发布阶段切换，联动目录树、流水线说明和分发包高亮。
 * @returns {void}
 */
function setupDeploymentSection() {
  const section = document.getElementById("deployment");

  if (!section) {
    return;
  }

  const buttons = Array.from(section.querySelectorAll("[data-deployment-stage]"));
  const treeLines = Array.from(section.querySelectorAll("[data-deployment-tree]"));
  const artifactLines = Array.from(section.querySelectorAll("[data-deployment-artifact]"));
  const pipelinePane = section.querySelector(".deployment__pane--pipeline");
  const bundlePane = section.querySelector(".deployment__pane--bundle");
  const progressFill = document.getElementById("deploymentProgressFill");
  const stageTag = document.getElementById("deploymentStageTag");
  const stageStatus = document.getElementById("deploymentStageStatus");
  const stageTitle = document.getElementById("deploymentStageTitle");
  const stageCopy = document.getElementById("deploymentStageCopy");
  const stageBullets = document.getElementById("deploymentStageBullets");
  const artifactCopy = document.getElementById("deploymentArtifactCopy");
  const deploymentStages = {
    source: {
      tone: "config",
      progress: "24%",
      tag: "STAGE / SOURCE",
      status: "配置就绪",
      title: "源码准备：入口、配置与目录约束先对齐",
      copy: "run_workstation.py 作为桌面入口，AppConfig 从 .env 解析默认样本、报告目录和信号导出目录，CSV 回放与串口流共享统一数据源抽象。",
      bullets: [
        "入口脚本与 src/ppg_llm_workstation 分层清晰，便于后续打包指定 --paths src。",
        "DEFAULT_CSV_PATH、REPORT_DIRECTORY、SIGNAL_EXPORT_DIRECTORY 全部外置到 .env。",
        "reports 与 exports 的 session 隔离约束，在源码阶段就已经被写进配置和 reporting.py。",
      ],
      trees: ["source", "config", "data", "reports", "exports"],
      artifacts: ["config", "data"],
      artifactCopy: "源码阶段尚未生成最终分发包，但配置模板、样本数据目录和会话导出目录已经被设计成独立、可迁移的运行结构。",
    },
    package: {
      tone: "config",
      progress: "52%",
      tag: "STAGE / PACKAGE",
      status: "环境封装",
      title: "环境封装：清理构建目录并调用 PyInstaller",
      copy: "build_exe.py 会先清理 build 和 dist，再用 PyInstaller 生成 onedir 运行目录，同时显式注入 serial 与 matplotlib.backends.backend_tkagg 等运行依赖。",
      bullets: [
        "打包参数真实对齐 build_exe.py：--clean、--windowed、--onedir。",
        "build/ 保存中间 spec 和构建缓存，dist/ 生成 PPGLLMWorkstation 运行目录。",
        "这一步强调的是稳定运行环境，而不是伪造不存在的单文件 onefile 结果。",
      ],
      trees: ["source", "package"],
      artifacts: ["exe"],
      artifactCopy: "封装阶段会产出 dist/PPGLLMWorkstation 运行目录，其中 PPGLLMWorkstation.exe 作为用户的单入口启动点。",
    },
    assets: {
      tone: "config",
      progress: "78%",
      tag: "STAGE / ASSETS",
      status: "资源注入",
      title: "资源注入：运行目录随包带上配置模板与说明文档",
      copy: "copy_if_exists 会把 data、.env、.env.example 和 README.md 同步复制到运行目录里，保证样本、配置和使用说明跟随 EXE 一起交付。",
      bullets: [
        "运行目录内直接拥有 data/，用户无需回到源码树寻找样本文件。",
        ".env 与 .env.example 同时存在，兼顾现网配置与首次部署模板。",
        "README.md 作为启动说明，减少交付后的人工解释成本。",
      ],
      trees: ["config", "data", "reports", "exports", "release"],
      artifacts: ["config", "readme", "data", "exe"],
      artifactCopy: "资源注入阶段的重点是把 EXE、配置模板、README 和运行目录组装成一个完整交付单元，而不是只丢一个裸可执行文件。",
    },
    release: {
      tone: "ready",
      progress: "100%",
      tag: "STAGE / RELEASE",
      status: "打包完成",
      title: "ZIP 分发：单入口运行目录压缩成最终发布包",
      copy: "release/PPGLLMWorkstation.zip 是最终分发壳，里面保留 EXE 入口、配置模板、说明文档和运行目录结构，用户解压后即可启动并在本地产生 reports / exports session 目录。",
      bullets: [
        "最终形态是 onedir 运行目录加 zip 分发，而非单文件 onefile 可执行包。",
        "用户拿到的是可直接运行的交付物，不需要本地 Python 源码环境。",
        "后续报告与导出数据在用户电脑上继续按 session 自动扩展，目录边界不会被打乱。",
      ],
      trees: ["release", "reports", "exports", "config", "data"],
      artifacts: ["zip", "exe", "config", "readme", "data"],
      artifactCopy: "最终用户拿到的就是 release/PPGLLMWorkstation.zip：解压后具备单入口 EXE、环境配置模板、说明文档和可持续写入的运行目录。",
    },
  };

  if (
    !buttons.length ||
    !treeLines.length ||
    !artifactLines.length ||
    !pipelinePane ||
    !bundlePane ||
    !progressFill ||
    !stageTag ||
    !stageStatus ||
    !stageTitle ||
    !stageCopy ||
    !stageBullets ||
    !artifactCopy
  ) {
    return;
  }

  buttons.forEach((button) => {
    const stageId = button.dataset.deploymentStage || "";
    button.dataset.tone = deploymentStages[stageId]?.tone || "config";
  });

  let activeId =
    buttons.find((button) => button.classList.contains("is-active"))?.dataset.deploymentStage ||
    buttons[0]?.dataset.deploymentStage ||
    "";
  let transitionTimer = 0;

  const setActiveButton = (stageId) => {
    buttons.forEach((button) => {
      const isActive = button.dataset.deploymentStage === stageId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
  };

  const renderBullets = (items) => {
    stageBullets.textContent = "";
    items.forEach((item) => {
      const bullet = document.createElement("li");
      bullet.textContent = item;
      stageBullets.appendChild(bullet);
    });
  };

  const setHighlight = (items, allowed, getter) => {
    items.forEach((item) => {
      const key = getter(item);
      item.classList.toggle("is-active", allowed.includes(key));
    });
  };

  const renderStage = (stageId, options = {}) => {
    const stage = deploymentStages[stageId];
    const shouldAnimate = options.animate !== false && !prefersReducedMotion();

    if (!stage) {
      return;
    }

    setActiveButton(stageId);
    activeId = stageId;

    if (transitionTimer) {
      window.clearTimeout(transitionTimer);
      transitionTimer = 0;
    }

    const commit = () => {
      progressFill.style.width = stage.progress;
      stageTag.textContent = stage.tag;
      stageStatus.textContent = stage.status;
      stageStatus.dataset.tone = stage.tone;
      stageTitle.textContent = stage.title;
      stageCopy.textContent = stage.copy;
      artifactCopy.textContent = stage.artifactCopy;
      renderBullets(stage.bullets);
      setHighlight(treeLines, stage.trees, (item) => item.dataset.deploymentTree || "");
      setHighlight(artifactLines, stage.artifacts, (item) => item.dataset.deploymentArtifact || "");

      window.requestAnimationFrame(() => {
        pipelinePane.classList.remove("is-updating");
        bundlePane.classList.remove("is-updating");
      });
    };

    if (!shouldAnimate) {
      commit();
      return;
    }

    pipelinePane.classList.add("is-updating");
    bundlePane.classList.add("is-updating");
    transitionTimer = window.setTimeout(() => {
      commit();
      transitionTimer = 0;
    }, 140);
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      renderStage(button.dataset.deploymentStage || "");
    });

    button.addEventListener("keydown", (event) => {
      if (
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight" &&
        event.key !== "ArrowUp" &&
        event.key !== "ArrowDown" &&
        event.key !== "Home" &&
        event.key !== "End"
      ) {
        return;
      }

      event.preventDefault();

      if (event.key === "Home") {
        renderStage(buttons[0].dataset.deploymentStage || "");
        buttons[0].focus();
        return;
      }

      if (event.key === "End") {
        const lastButton = buttons[buttons.length - 1];
        renderStage(lastButton.dataset.deploymentStage || "");
        lastButton.focus();
        return;
      }

      const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (index + delta + buttons.length) % buttons.length;
      const nextButton = buttons[nextIndex];
      renderStage(nextButton.dataset.deploymentStage || "");
      nextButton.focus();
    });
  });

  renderStage(activeId, { animate: false });
}

function setupSchematicExplorer() {
  const buttons = Array.from(document.querySelectorAll(".schematic-thumb"));
  const previewTrigger = document.getElementById("schematicPreviewTrigger");
  const image = document.getElementById("schematicPreviewImage");
  const title = document.getElementById("schematicPreviewTitle");
  const type = document.getElementById("schematicPreviewType");
  const description = document.getElementById("schematicPreviewDescription");
  const focus = document.getElementById("schematicPreviewFocus");
  const meaning = document.getElementById("schematicPreviewMeaning");

  if (!buttons.length || !previewTrigger || !image || !title || !type || !description || !focus || !meaning) {
    return;
  }

  let activeIndex = Math.max(
    0,
    buttons.findIndex((button) => button.classList.contains("is-active"))
  );

  const applyState = (nextIndex) => {
    activeIndex = nextIndex;
    const button = buttons[activeIndex];

    buttons.forEach((item, index) => {
      const isActive = index === activeIndex;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", isActive ? "true" : "false");
      item.setAttribute("tabindex", isActive ? "0" : "-1");
    });

    const nextSrc = button.dataset.schematicTarget || "";
    const nextAlt = button.dataset.schematicAlt || "";
    const nextTitle = button.dataset.schematicTitle || "";
    const nextType = button.dataset.schematicType || "";
    const nextDescription = button.dataset.schematicDescription || "";
    const nextFocus = button.dataset.schematicFocus || "";
    const nextMeaning = button.dataset.schematicMeaning || "";

    image.src = nextSrc;
    image.alt = nextAlt;
    previewTrigger.dataset.lightboxSrc = nextSrc;
    previewTrigger.dataset.lightboxAlt = nextAlt;
    previewTrigger.dataset.lightboxTitle = nextTitle;
    previewTrigger.dataset.lightboxDescription = nextDescription;
    previewTrigger.setAttribute("aria-label", `放大查看${nextTitle}`);
    title.textContent = nextTitle;
    type.textContent = nextType;
    description.textContent = nextDescription;
    focus.textContent = nextFocus;
    meaning.textContent = nextMeaning;
  };

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => applyState(index));

    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
        return;
      }

      event.preventDefault();

      if (event.key === "Home") {
        applyState(0);
        buttons[0].focus();
        return;
      }

      if (event.key === "End") {
        applyState(buttons.length - 1);
        buttons[buttons.length - 1].focus();
        return;
      }

      const delta = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + delta + buttons.length) % buttons.length;
      applyState(nextIndex);
      buttons[nextIndex].focus();
    });
  });

  applyState(activeIndex);
}

/**
 * 初始化 PCB 分类筛选与状态说明。
 * @returns {void}
 */
function setupPcbFilters() {
  const filters = Array.from(document.querySelectorAll("[data-pcb-filter]"));
  const cards = Array.from(document.querySelectorAll("[data-pcb-group]"));
  const grid = document.querySelector(".pcb__grid");
  const title = document.getElementById("pcbFilterTitle");
  const description = document.getElementById("pcbFilterDescription");

  if (!filters.length || !cards.length || !grid || !title || !description) {
    return;
  }

  const filterMeta = {
    all: {
      title: "全部工程视图",
      description: "从 3D 装配、走线布局到外形轮廓，统一查看当前板级实现的整体状态。",
    },
    "3d": {
      title: "3D 装配视图",
      description: "重点查看器件堆叠、空间关系与不同板型的装配状态。",
    },
    pcb: {
      title: "PCB 布线视图",
      description: "重点查看走线组织、器件布局与不同层面的工程实现方式。",
    },
    outline: {
      title: "外形边界视图",
      description: "重点查看板级轮廓与结构尺寸边界，为整机装配提供依据。",
    },
  };

  const applyFilter = (value) => {
    grid.classList.toggle("pcb__grid--all", value === "all");

    filters.forEach((button) => {
      const isActive = button.dataset.pcbFilter === value;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    cards.forEach((card) => {
      if (value === "all") {
        card.hidden = false;
        return;
      }

      card.hidden = card.dataset.pcbGroup !== value;
    });

    const meta = filterMeta[value] || filterMeta.all;
    title.textContent = meta.title;
    description.textContent = meta.description;
  };

  filters.forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.pcbFilter || "all"));
  });

  applyFilter("all");
}

/**
 * 初始化图片 Lightbox 预览，并在关闭后把焦点返回到触发元素。
 * @returns {void}
 */
function setupLightbox() {
  const dialog = document.getElementById("lightboxDialog");
  const image = document.getElementById("lightboxImage");
  const title = document.getElementById("lightboxTitle");
  const description = document.getElementById("lightboxDescription");
  const closeButton = document.getElementById("lightboxClose");
  const triggers = Array.from(document.querySelectorAll("[data-lightbox-src]"));

  if (!dialog || !image || !title || !description || !closeButton || !triggers.length || typeof dialog.showModal !== "function") {
    return;
  }

  let lastTrigger = null;

  const openLightbox = (trigger) => {
    lastTrigger = trigger;
    image.src = trigger.dataset.lightboxSrc || "";
    image.alt = trigger.dataset.lightboxAlt || trigger.getAttribute("aria-label") || "";
    title.textContent = trigger.dataset.lightboxTitle || "";
    description.textContent = trigger.dataset.lightboxDescription || "";
    dialog.showModal();
    closeButton.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    dialog.close();
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => openLightbox(trigger));
  });

  closeButton.addEventListener("click", closeLightbox);

  dialog.addEventListener("click", (event) => {
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (isOutside) {
      closeLightbox();
    }
  });

  dialog.addEventListener("close", () => {
    if (lastTrigger) {
      lastTrigger.focus({ preventScroll: true });
    }
  });
}

/**
 * 初始化轻量滚动变量，让 Hero 与总结区等区域具备克制的滚动联动。
 * @returns {void}
 */
function setupScrollVariables() {
  const sections = Array.from(document.querySelectorAll(".section-progress"));

  if (!sections.length) {
    return;
  }

  const update = () => {
    sections.forEach((section) => {
      section.style.setProperty("--progress", getSectionProgress(section).toFixed(4));
    });
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

/**
 * 初始化视觉资产区的轻量滚动联动，让漂浮卡片在滚动时产生克制的上下位移。
 * 移动端与 reduced motion 下回退为纯 CSS 漂浮布局，避免破坏流式排版。
 * @returns {void}
 */
function setupAssetCloud() {
  const stage = document.getElementById("assetCardsStage");

  if (!stage) {
    return;
  }

  const cards = Array.from(stage.querySelectorAll(".asset-card"));

  if (!cards.length) {
    return;
  }

  const resetCards = () => {
    cards.forEach((card) => {
      card.style.removeProperty("transform");
      card.style.removeProperty("--scroll-shift");
    });
  };

  const update = () => {
    if (prefersReducedMotion() || window.innerWidth <= 820) {
      resetCards();
      return;
    }

    const rect = stage.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height));

    cards.forEach((card, index) => {
      const amplitude = (index % 2 === 0 ? -1 : 1) * (18 + (index % 5) * 6);
      const shift = (progress - 0.5) * amplitude;
      const rotation = card.style.getPropertyValue("--r") || "0deg";

      card.style.setProperty("--scroll-shift", `${shift.toFixed(2)}px`);
      card.style.transform = `translate(-50%, -50%) translateY(${shift.toFixed(2)}px) rotate(${rotation})`;
    });
  };

  let ticking = false;
  const requestUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
      ticking = true;
    }
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
}

/**
 * 初始化启动首页点击转场逻辑。
 * @returns {void}
 */
function setupIntroHome() {
  const intro = document.querySelector("[data-intro-home]");
  const introTransitionMs = 1120;
  const topTarget = document.getElementById("top");

  if (!intro) {
    document.body.classList.remove("has-intro", "intro-leaving");
    return;
  }

  const hiddenDuringIntro = Array.from(document.querySelectorAll("main > :not([data-intro-home]), footer, #siteHeader"));
  const introTriggers = Array.from(intro.querySelectorAll(".media-trigger"));
  let hasExited = false;

  const resetToTop = () => {
    const root = document.documentElement;
    const previousRootScrollBehavior = root.style.scrollBehavior;
    const previousBodyScrollBehavior = document.body.style.scrollBehavior;

    root.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";

    if (window.location.hash !== "#top") {
      history.replaceState(null, "", "#top");
    }

    if (topTarget) {
      topTarget.scrollIntoView({ block: "start", inline: "nearest" });
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    root.scrollTop = 0;
    document.body.scrollTop = 0;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      root.scrollTop = 0;
      document.body.scrollTop = 0;
      root.style.scrollBehavior = previousRootScrollBehavior;
      document.body.style.scrollBehavior = previousBodyScrollBehavior;
    });
  };

  hiddenDuringIntro.forEach((element) => {
    element.inert = true;
  });

  introTriggers.forEach((trigger) => {
    trigger.setAttribute("tabindex", "-1");
  });

  resetToTop();

  const finishIntro = () => {
    resetToTop();
    hiddenDuringIntro.forEach((element) => {
      element.inert = false;
    });
    intro.hidden = true;
    document.body.classList.remove("has-intro", "intro-leaving");
    document.body.classList.add("intro-complete");
    hasExited = true;
  };

  const dismissIntro = () => {
    if (hasExited || document.body.classList.contains("intro-leaving")) {
      return;
    }

    resetToTop();

    if (prefersReducedMotion()) {
      finishIntro();
      return;
    }

    document.body.classList.add("intro-leaving");
    window.setTimeout(finishIntro, introTransitionMs);
  };

  intro.addEventListener("click", dismissIntro);
  intro.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    dismissIntro();
  });
}

/**
 * 初始化页面全部交互。
 * @returns {void}
 */
function initPage() {
  refreshHdAssetReferences();
  setupIntroHome();
  setupNavigationDrawer();
  setupSectionTracking();
  setupReveal();
  setupAnchorNavigation();
  setupStageTabs();
  setupSamplesDashboard();
  setupPromptsSection();
  setupAlgorithmSection();
  setupSchematicExplorer();
  setupPcbFilters();
  setupDeploymentSection();
  setupLightbox();
  setupScrollVariables();
  setupAssetCloud();
}

initPage();
