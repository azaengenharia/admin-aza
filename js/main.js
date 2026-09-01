const SUPABASE_URL = "https://ulwhmtpduzxjbkqrqesd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_LLQAnzzF3WFr1Ln5iWPIlw_dtWb3QPH";
const MEDIA_BUCKET = "aza-media";
const RESUMABLE_UPLOAD_URL = "https://ulwhmtpduzxjbkqrqesd.storage.supabase.co/storage/v1/upload/resumable";
const MAX_VIDEO_SIZE_BYTES = 20 * 1024 * 1024;

const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const moduleConfig = {
  properties: {
    table: "properties",
    imageTable: "properties_images",
    imageFk: "property_id",
    storageFolder: "properties",
    eyebrow: "AZA Imóveis",
    title: "Gerenciar imóveis",
    listTitle: "Imóveis cadastrados",
    singular: "imóvel",
    empty: "Nenhum imóvel cadastrado ainda.",
    searchPlaceholder: "Buscar por título, cidade ou código",
    summaryMiddleLabel: "Destaques",
    supportsFeatured: true,
    featuredLabel: "Destaque",
    featuredPill: "Destaque",
    singleFeatured: false,
    fields: [
      ["code", "Código", "text", "AZA-001", true],
      ["title", "Título", "text", "Casa à venda no Centro", true, "wide"],
      ["status", "Status", "select", ["draft", "published", "inactive"], true],
      ["featured", "Destaque", "checkbox"],
      ["purpose", "Finalidade", "select", ["sale", "rent"], true],
      ["property_type", "Tipo", "select", ["Casa", "Apartamento", "Sobrado", "Lote", "Comercial"], true],
      ["city", "Cidade", "text", "Piumhi", true],
      ["neighborhood", "Bairro", "text", "Centro"],
      ["price", "Valor", "number", "650000"],
      ["bedrooms", "Quartos", "number", "3"],
      ["suites", "Suítes", "number", "1"],
      ["bathrooms", "Banheiros", "number", "2"],
      ["parking", "Vagas", "number", "2"],
      ["area", "Área m²", "number", "180"],
      ["description", "Descrição", "textarea", "Resumo comercial do imóvel", false, "wide"],
    ],
  },
  works: {
    table: "works",
    imageTable: "works_images",
    imageFk: "work_id",
    storageFolder: "works",
    eyebrow: "AZA Engenharia",
    title: "Gerenciar obras",
    listTitle: "Obras cadastradas",
    singular: "obra",
    empty: "Nenhuma obra cadastrada ainda.",
    searchPlaceholder: "Buscar por título, cidade, código ou categoria",
    summaryMiddleLabel: "Em foco",
    supportsFeatured: true,
    featuredLabel: "Obra em foco",
    featuredPill: "Obra em foco",
    singleFeatured: true,
    fields: [
      ["code", "Código", "text", "OBRA-001", true],
      ["title", "Título", "text", "Residência em execução", true, "wide"],
      ["status", "Status", "select", ["draft", "published", "inactive"], true],
      ["featured", "Obra em foco", "checkbox"],
      ["category", "Categoria", "select", ["Residencial", "Comercial", "Reforma", "Regularização"], true],
      ["city", "Cidade", "text", "Piumhi", true],
      ["stage", "Etapa", "select", ["Projeto", "Execução", "Acabamento", "Concluída"]],
      ["area", "Área m²", "number", "220"],
      ["description", "Descrição", "textarea", "Resumo da obra", false, "wide"],
    ],
  },
};

const loginView = document.querySelector("#login-view");
const appShell = document.querySelector("#app-shell");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const moduleButtons = document.querySelectorAll("[data-module]");
const moduleEyebrow = document.querySelector("#module-eyebrow");
const moduleTitle = document.querySelector("#module-title");
const listTitle = document.querySelector("#list-title");
const itemList = document.querySelector("#item-list");
const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");
const refreshButton = document.querySelector("#refresh-button");
const newButton = document.querySelector("#new-button");
const logoutButton = document.querySelector("#logout-button");
const editorModal = document.querySelector("#editor-modal");
const closeEditorButton = document.querySelector("#close-editor");
const editorEyebrow = document.querySelector("#editor-eyebrow");
const editorTitle = document.querySelector("#editor-title");
const editorForm = document.querySelector("#editor-form");
const previewCard = document.querySelector("#preview-card");
const summaryTotal = document.querySelector("#summary-total");
const summaryMiddleLabel = document.querySelector("#summary-middle-label");
const summaryFeatured = document.querySelector("#summary-featured");
const summaryPublished = document.querySelector("#summary-published");

let records = { properties: [], works: [] };
let activeModule = "properties";
let activeId = null;
let activeImages = [];
let currentSession = null;
let loadedModules = new Set();
let isSaving = false;
let isUploading = false;
let pendingImageFiles = [];
let pendingImagePreviews = [];

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function config() {
  return moduleConfig[activeModule];
}

function currentRecords() {
  return records[activeModule];
}

function currentRecord() {
  return currentRecords().find((record) => record.id === activeId) || null;
}

function currentFeaturedRecord() {
  return currentRecords().find((record) => record.featured) || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(status) {
  return {
    published: "Publicado",
    draft: "Rascunho",
    inactive: "Inativo",
  }[status] || status || "Sem status";
}

function optionLabel(value) {
  return {
    sale: "Venda",
    rent: "Locação",
  }[value] || statusLabel(value);
}

function normalizeRecord(record) {
  return {
    ...record,
    code: record.code || "",
    title: record.title || "Sem título",
    status: record.status || "draft",
    featured: Boolean(record.featured),
    price: Number(record.price || 0),
    bedrooms: Number(record.bedrooms || 0),
    suites: Number(record.suites || 0),
    bathrooms: Number(record.bathrooms || 0),
    parking: Number(record.parking || 0),
    area: Number(record.area || 0),
    description: record.description || "",
  };
}

function imageUrl(path) {
  if (!path) return "";
  const { data } = supabaseClient.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function mediaType(media) {
  if (media?.media_type) return media.media_type;
  if (media?.file?.type?.startsWith("video/") || media?.type?.startsWith("video/")) return "video";
  return /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(media?.image_url || media?.file?.name || media?.name || "") ? "video" : "image";
}

function isVideo(media) {
  return mediaType(media) === "video";
}

function contentTypeForFile(file) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
  }[extension] || "application/octet-stream";
}

function coverImage() {
  const images = activeImages.filter((media) => !isVideo(media));
  return images.find((image) => image.is_cover) || images[0] || null;
}

function clearPendingImages() {
  pendingImagePreviews.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  pendingImageFiles = [];
  pendingImagePreviews = [];
}

function hasPendingImages() {
  return pendingImagePreviews.length > 0;
}

function setLoginMessage(message, tone = "neutral") {
  loginMessage.textContent = message;
  loginMessage.dataset.tone = tone;
}

function showLogin(message = "") {
  currentSession = null;
  loadedModules = new Set();
  records = { properties: [], works: [] };
  activeImages = [];
  clearPendingImages();
  activeId = null;
  closeEditor();
  renderSummary();
  itemList.innerHTML = "";
  appShell.classList.add("is-hidden");
  loginView.classList.remove("is-hidden");
  if (window.location.hash !== "#login") window.location.hash = "login";
  setLoginMessage(message);
}

function showApp(session) {
  currentSession = session;
  loginView.classList.add("is-hidden");
  appShell.classList.remove("is-hidden");
  if (window.location.hash !== "#painel") window.location.hash = "painel";
  setModule(activeModule, { force: false });
}

function matchesFilters(record) {
  const query = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const haystack = [
    record.title,
    record.code,
    record.city,
    record.neighborhood,
    record.property_type,
    record.category,
    record.stage,
  ].filter(Boolean).join(" ").toLowerCase();

  if (query && !haystack.includes(query)) return false;
  if (status && record.status !== status) return false;
  return true;
}

function renderSummary() {
  const items = currentRecords();
  summaryMiddleLabel.textContent = config().summaryMiddleLabel;
  summaryTotal.textContent = items.length;
  summaryFeatured.textContent = items.filter((item) => item.featured).length;
  summaryPublished.textContent = items.filter((item) => item.status === "published").length;
}

function propertyMeta(record) {
  return [
    `${record.bedrooms || 0} quartos`,
    `${record.suites || 0} suítes`,
    `${record.bathrooms || 0} banh.`,
    `${record.parking || 0} vagas`,
  ];
}

function renderRecordDetails(record) {
  if (activeModule === "properties") {
    return `
      <span class="property-readonly-details">
        <strong>${money.format(record.price || 0)}</strong>
        <span>${optionLabel(record.purpose)} · ${escapeHtml(record.property_type || "Tipo não informado")} · ${record.area || 0} m²</span>
      </span>
      <span class="property-meta-row">
        ${propertyMeta(record).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </span>
    `;
  }

  return `
    <span class="property-readonly-details">
      <strong>${escapeHtml(record.category || "Categoria não informada")}</strong>
      <span>${escapeHtml(record.stage || "Etapa não informada")} · ${record.area || 0} m²</span>
    </span>
  `;
}

function renderList() {
  renderSummary();
  const filtered = currentRecords().filter(matchesFilters);

  if (!filtered.length) {
    itemList.innerHTML = `<div class="empty-state">${config().empty}</div>`;
    return;
  }

  itemList.innerHTML = filtered.map((record) => `
    <button class="item-row${record.id === activeId ? " is-selected" : ""}" type="button" data-id="${record.id}">
      <span class="item-title">
        <strong>${escapeHtml(record.title)}</strong>
        <span>${escapeHtml(record.code)} · ${escapeHtml(record.neighborhood || record.category || "Info não informada")} · ${escapeHtml(record.city || "Cidade não informada")}</span>
      </span>
      ${renderRecordDetails(record)}
      <span class="property-readonly-description">${escapeHtml(record.description || "Sem descrição cadastrada.")}</span>
      <span class="pills">
        ${config().supportsFeatured && record.featured ? `<span class="pill red">${escapeHtml(config().featuredPill)}</span>` : ""}
        <span class="pill ${record.status === "published" ? "" : "muted"}">${statusLabel(record.status)}</span>
      </span>
    </button>
  `).join("");

  itemList.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => openEditor(button.dataset.id));
  });
}

function renderLoading() {
  itemList.innerHTML = `<div class="empty-state">Carregando ${config().listTitle.toLowerCase()}...</div>`;
}

function renderError(message) {
  itemList.innerHTML = `<div class="empty-state">Não foi possível carregar ${config().listTitle.toLowerCase()}: ${escapeHtml(message)}</div>`;
}

async function loadRecords() {
  renderLoading();

  if (!supabaseClient) {
    renderError("serviço de dados indisponível.");
    return;
  }

  if (!currentSession) {
    showLogin("Sua sessão expirou. Entre novamente.");
    return;
  }

  const { data, error } = await supabaseClient
    .from(config().table)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    records[activeModule] = [];
    activeId = null;
    renderSummary();
    renderError(error.message);
    return;
  }

  records[activeModule] = (data || []).map(normalizeRecord);
  activeId = records[activeModule][0]?.id || null;
  loadedModules.add(activeModule);
  renderList();
}

function setModule(moduleName, options = {}) {
  activeModule = moduleName;
  activeId = records[activeModule][0]?.id || null;
  activeImages = [];
  clearPendingImages();
  moduleButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.module === moduleName));

  moduleEyebrow.textContent = config().eyebrow;
  moduleTitle.textContent = config().title;
  listTitle.textContent = config().listTitle;
  searchInput.placeholder = config().searchPlaceholder;
  searchInput.value = "";
  statusFilter.value = "";
  closeEditor();

  if (!currentSession) return;
  if (options.force || !loadedModules.has(activeModule)) {
    loadRecords();
  } else {
    renderList();
  }
}

function emptyRecord() {
  return {
    id: null,
    code: "",
    title: "",
    status: "draft",
    featured: false,
    purpose: "sale",
    property_type: "Casa",
    city: "Piumhi",
    neighborhood: "",
    price: 0,
    bedrooms: 0,
    suites: 0,
    bathrooms: 0,
    parking: 0,
    area: 0,
    category: "Residencial",
    stage: "Projeto",
    description: "",
  };
}

function fieldHtml(field, record) {
  const [name, label, type, options, required, layout] = field;
  const value = record[name] ?? "";
  const wide = layout === "wide" ? " wide" : "";

  if (type === "select") {
    return `
      <label class="${wide}">
        <span>${label}</span>
        <select name="${name}"${required ? " required" : ""}>
          ${options.map((option) => `<option value="${escapeHtml(option)}"${value === option ? " selected" : ""}>${optionLabel(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (type === "textarea") {
    return `
      <label class="${wide}">
        <span>${label}</span>
        <textarea name="${name}" rows="4" placeholder="${escapeHtml(options || "")}">${escapeHtml(value)}</textarea>
      </label>
    `;
  }

  if (type === "checkbox") {
    const selectedFocus = config().singleFeatured && name === "featured" ? currentFeaturedRecord() : null;
    const disabledByFocus = Boolean(selectedFocus && selectedFocus.id !== record.id && !value);
    const title = disabledByFocus
      ? `${selectedFocus.title} já está em foco. Para trocar, abra essa obra e desmarque primeiro.`
      : "";

    return `
      <label class="check${wide}${disabledByFocus ? " is-disabled" : ""}" title="${escapeHtml(title)}">
        <input name="${name}" type="checkbox"${value ? " checked" : ""}${disabledByFocus ? " disabled" : ""}>
        <span>${label}</span>
        ${disabledByFocus ? `<small>${escapeHtml(selectedFocus.title)} já está em foco.</small>` : ""}
      </label>
    `;
  }

  return `
    <label class="${wide}">
      <span>${label}</span>
      <input name="${name}" type="${type}" value="${escapeHtml(value)}" placeholder="${escapeHtml(options || "")}"${required ? " required" : ""}>
    </label>
  `;
}

function formDataToRecord() {
  const data = new FormData(editorForm);
  const record = {};

  config().fields.forEach(([name, , type]) => {
    if (type === "checkbox") {
      record[name] = data.get(name) === "on";
      return;
    }

    const value = data.get(name);
    record[name] = type === "number" ? Number(value || 0) : String(value || "").trim();
  });

  return record;
}

function renderPreview(record) {
  const selectedMedia = coverImage() || activeImages[0];
  const media = selectedMedia
    ? isVideo(selectedMedia)
      ? `<video src="${imageUrl(selectedMedia.image_url)}" controls muted playsinline preload="metadata" aria-label="${escapeHtml(selectedMedia.alt_text || record.title || "Vídeo")}"></video>`
      : `<img src="${imageUrl(selectedMedia.image_url)}" alt="${escapeHtml(selectedMedia.alt_text || record.title || "")}">`
    : hasPendingImages()
      ? isVideo(pendingImagePreviews[0])
        ? `<video src="${pendingImagePreviews[0].previewUrl}" controls muted playsinline preload="metadata" aria-label="${escapeHtml(pendingImagePreviews[0].alt_text || record.title || "Vídeo")}"></video>`
        : `<img src="${pendingImagePreviews[0].previewUrl}" alt="${escapeHtml(pendingImagePreviews[0].alt_text || record.title || "")}">`
    : `<span>${activeModule === "properties" ? "Imagem do imóvel" : "Imagem da obra"}</span>`;

  if (activeModule === "properties") {
    previewCard.innerHTML = `
      <article class="preview-card">
        <div class="media">${media}</div>
        <div class="body">
          <span class="pill ${record.status === "published" ? "" : "muted"}">${statusLabel(record.status)}</span>
          ${config().supportsFeatured && record.featured ? `<span class="pill red">${escapeHtml(config().featuredPill)}</span>` : ""}
          <h3>${escapeHtml(record.title || "Título do imóvel")}</h3>
          <p>${escapeHtml(record.neighborhood || "Bairro")} · ${escapeHtml(record.city || "Cidade")}</p>
          <div class="price">${money.format(record.price || 0)}</div>
          <p>${escapeHtml(record.description || "Descrição resumida para aparecer no site público.")}</p>
        </div>
      </article>
    `;
    return;
  }

  previewCard.innerHTML = `
    <article class="preview-card">
      <div class="media">${media}</div>
      <div class="body">
        <span class="pill ${record.status === "published" ? "" : "muted"}">${statusLabel(record.status)}</span>
        <h3>${escapeHtml(record.title || "Título da obra")}</h3>
        <p>${escapeHtml(record.category || "Categoria")} · ${escapeHtml(record.stage || "Etapa")}</p>
        <p>${escapeHtml(record.description || "Descrição resumida para aparecer no site público.")}</p>
      </div>
    </article>
  `;
}

function imageSectionHtml(isNew) {
  const mediaCount = isNew ? pendingImagePreviews.length : activeImages.length;
  return `
    <section class="image-manager wide">
      <div class="image-manager-head">
        <div>
          <span>Fotos e vídeos</span>
          <strong>${mediaCount} arquivo(s) ${isNew ? "selecionado(s)" : "cadastrado(s)"}</strong>
          <small>${isNew ? "Os arquivos serão enviados junto com o primeiro salvamento. Vídeos de até 20 MB." : "Fotos podem ser capa; vídeos aparecem na galeria. Prefira MP4 de até 20 MB."}</small>
        </div>
        <label class="upload-button">
          <span data-upload-label>${isNew ? "Selecionar mídias" : "Enviar mídias"}</span>
          <input id="image-input" type="file" accept="image/*,video/*" multiple>
        </label>
      </div>
      <div class="drop-zone" id="drop-zone">Arraste fotos ou vídeos aqui ou use o botão acima.</div>
      <div class="image-list" id="image-list"></div>
    </section>
  `;
}

function renderImageList() {
  const list = editorForm.querySelector("#image-list");
  if (!list) return;

  if (!activeId && pendingImagePreviews.length) {
    const firstPendingImageIndex = pendingImagePreviews.findIndex((media) => !isVideo(media));
    list.innerHTML = pendingImagePreviews.map((image, index) => `
      <article class="image-item" data-pending-index="${index}">
        ${isVideo(image)
          ? `<video src="${image.previewUrl}" muted playsinline preload="metadata" aria-label="${escapeHtml(image.alt_text || "Vídeo")}"></video>`
          : `<img src="${image.previewUrl}" alt="${escapeHtml(image.alt_text || "")}">`}
        <div class="image-item-body">
          <span class="pill ${isVideo(image) || index !== firstPendingImageIndex ? "muted" : ""}">${isVideo(image) ? "Vídeo" : index === firstPendingImageIndex ? "Capa inicial" : "Foto"}</span>
          <input class="image-alt-input" value="${escapeHtml(image.alt_text || "")}" placeholder="Descrição da mídia">
          <div class="image-actions">
            <button type="button" data-action="pending-up" ${index === 0 ? "disabled" : ""}>Subir</button>
            <button type="button" data-action="pending-down" ${index === pendingImagePreviews.length - 1 ? "disabled" : ""}>Descer</button>
            <button type="button" data-action="pending-delete">Remover</button>
          </div>
        </div>
      </article>
    `).join("");
    return;
  }

  if (!activeImages.length) {
    list.innerHTML = '<div class="empty-state compact">Nenhuma foto ou vídeo cadastrado ainda.</div>';
    return;
  }

  list.innerHTML = activeImages.map((image, index) => `
    <article class="image-item" data-image-id="${image.id}">
      ${isVideo(image)
        ? `<video src="${imageUrl(image.image_url)}" muted playsinline preload="metadata" aria-label="${escapeHtml(image.alt_text || "Vídeo")}"></video>`
        : `<img src="${imageUrl(image.image_url)}" alt="${escapeHtml(image.alt_text || "")}">`}
      <div class="image-item-body">
        <span class="pill ${image.is_cover ? "" : "muted"}">${isVideo(image) ? "Vídeo" : image.is_cover ? "Capa" : "Foto"}</span>
        <input class="image-alt-input" value="${escapeHtml(image.alt_text || "")}" placeholder="Descrição da mídia">
        <div class="image-actions">
          ${isVideo(image) ? "" : `<button type="button" data-action="cover" ${image.is_cover ? "disabled" : ""}>Capa</button>`}
          <button type="button" data-action="up" ${index === 0 ? "disabled" : ""}>Subir</button>
          <button type="button" data-action="down" ${index === activeImages.length - 1 ? "disabled" : ""}>Descer</button>
          <button type="button" data-action="delete">Excluir</button>
        </div>
      </div>
    </article>
  `).join("");
}

function attachImageHandlers() {
  const input = editorForm.querySelector("#image-input");
  const dropZone = editorForm.querySelector("#drop-zone");
  const list = editorForm.querySelector("#image-list");

  input?.addEventListener("change", () => {
    uploadFiles(input.files);
    input.value = "";
  });

  dropZone?.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });

  dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("is-dragging"));
  dropZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
    uploadFiles(event.dataTransfer.files);
  });

  list?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const pendingItem = button.closest("[data-pending-index]");
    if (pendingItem) {
      handlePendingImageAction(button.dataset.action, Number(pendingItem.dataset.pendingIndex));
      return;
    }
    const item = button.closest("[data-image-id]");
    if (!item) return;
    handleImageAction(button.dataset.action, item.dataset.imageId);
  });

  list?.addEventListener("change", (event) => {
    if (!event.target.classList.contains("image-alt-input")) return;
    const pendingItem = event.target.closest("[data-pending-index]");
    if (pendingItem) {
      updatePendingImageAlt(Number(pendingItem.dataset.pendingIndex), event.target.value);
      return;
    }
    const item = event.target.closest("[data-image-id]");
    if (!item) return;
    updateImageAlt(item.dataset.imageId, event.target.value);
  });
}

function updatePendingImageAlt(index, altText) {
  if (!pendingImagePreviews[index]) return;
  pendingImagePreviews[index].alt_text = altText.trim();
  renderPreview(formDataToRecord());
}

function movePendingImage(index, direction) {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= pendingImagePreviews.length) return;

  [pendingImagePreviews[index], pendingImagePreviews[targetIndex]] = [pendingImagePreviews[targetIndex], pendingImagePreviews[index]];
  [pendingImageFiles[index], pendingImageFiles[targetIndex]] = [pendingImageFiles[targetIndex], pendingImageFiles[index]];
  renderForm(formDataToRecord(), true);
}

function removePendingImage(index) {
  const [image] = pendingImagePreviews.splice(index, 1);
  pendingImageFiles.splice(index, 1);
  if (image) URL.revokeObjectURL(image.previewUrl);
  renderForm(formDataToRecord(), true);
}

function handlePendingImageAction(action, index) {
  if (action === "pending-up") movePendingImage(index, "up");
  if (action === "pending-down") movePendingImage(index, "down");
  if (action === "pending-delete") removePendingImage(index);
}

function renderForm(record, isNew) {
  editorEyebrow.textContent = isNew ? "Novo cadastro" : "Edição";
  editorTitle.textContent = `${isNew ? "Novo" : "Editar"} ${config().singular}`;
  editorForm.dataset.mode = isNew ? "new" : "edit";
  editorForm.dataset.id = record.id || "";

  editorForm.innerHTML = `
    ${config().fields.map((field) => fieldHtml(field, record)).join("")}
    ${imageSectionHtml(isNew)}
    <div class="form-actions">
      <button type="submit">Salvar</button>
      <button type="button" id="delete-button">${isNew ? "Cancelar" : "Excluir"}</button>
    </div>
  `;

  editorForm.oninput = (event) => {
    if (event.target.closest(".image-manager")) return;
    renderPreview(formDataToRecord());
  };
  editorForm.onchange = (event) => {
    if (event.target.closest(".image-manager")) return;
    renderPreview(formDataToRecord());
  };
  editorForm.querySelector("#delete-button").addEventListener("click", () => {
    if (isNew) {
      closeEditor();
      return;
    }
    deleteCurrent();
  });
  renderImageList();
  attachImageHandlers();
  renderPreview(record);
}

async function loadImages(recordId) {
  if (!recordId) {
    activeImages = [];
    return;
  }

  const { data, error } = await supabaseClient
    .from(config().imageTable)
    .select("*")
    .eq(config().imageFk, recordId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    activeImages = [];
    alert(`Não foi possível carregar fotos e vídeos: ${error.message}`);
    return;
  }

  activeImages = data || [];
}

async function openEditor(id = null) {
  activeId = id;
  const record = id ? currentRecord() : emptyRecord();
  activeImages = [];
  clearPendingImages();
  renderList();

  if (id) await loadImages(id);

  renderForm(record, !id);
  editorModal.classList.remove("is-hidden");
  editorModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("editor-open");
}

function closeEditor() {
  editorModal.classList.add("is-hidden");
  editorModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("editor-open");
  clearPendingImages();
}

function filePath(file) {
  const safeName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return `${config().storageFolder}/${activeId}/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;
}

async function uploadFiles(fileList) {
  const selectedFiles = [...fileList];
  const supportedFiles = selectedFiles.filter((file) => (
    file.type.startsWith("image/")
    || file.type.startsWith("video/")
    || /\.(jpe?g|png|gif|webp|avif|mp4|webm|mov|m4v)$/i.test(file.name)
  ));
  if (selectedFiles.length && !supportedFiles.length) {
    alert("Selecione arquivos de imagem ou vídeo.");
  }

  const oversizedVideos = supportedFiles.filter((file) => (
    mediaType(file) === "video" && file.size > MAX_VIDEO_SIZE_BYTES
  ));

  if (oversizedVideos.length) {
    const details = oversizedVideos
      .map((file) => `• ${file.name} (${(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB)`)
      .join("\n");
    const heading = oversizedVideos.length === 1
      ? "Este vídeo é maior que o permitido e não foi enviado:"
      : "Alguns vídeos são maiores que o permitido e não foram enviados:";

    alert(`${heading}\n\n${details}\n\nO limite é de 20 MB por vídeo. Comprima o arquivo ou escolha um vídeo menor e tente novamente.`);
  }

  const files = supportedFiles.filter((file) => !oversizedVideos.includes(file));
  if (!files.length || isUploading) return;

  if (!activeId) {
    pendingImageFiles.push(...files);
    pendingImagePreviews.push(...files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      alt_text: file.name,
      media_type: mediaType(file),
    })));
    renderForm(formDataToRecord(), true);
    return;
  }

  isUploading = true;
  const uploadButton = editorForm.querySelector(".upload-button");
  const uploadLabel = uploadButton?.querySelector("[data-upload-label]");
  if (uploadButton) uploadButton.classList.add("is-loading");

  for (const file of files) {
    await uploadSingleImage(
      file,
      file.name,
      activeImages.length,
      mediaType(file) === "image" && !coverImage(),
      (percentage) => {
        if (uploadLabel) uploadLabel.textContent = `Enviando ${percentage}%`;
      }
    );
  }

  isUploading = false;
  if (uploadButton) uploadButton.classList.remove("is-loading");
  renderForm(currentRecord(), false);
}

async function uploadFileToStorage(file, path, onProgress = () => {}) {
  const useResumableUpload = file.size > 6 * 1024 * 1024 && window.tus?.Upload;

  if (!useResumableUpload) {
    const { error } = await supabaseClient.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { contentType: contentTypeForFile(file), upsert: false });
    if (error) throw error;
    onProgress(100);
    return;
  }

  const accessToken = currentSession?.access_token;
  if (!accessToken) throw new Error("Sua sessão expirou. Entre novamente.");

  await new Promise((resolve, reject) => {
    const upload = new window.tus.Upload(file, {
      endpoint: RESUMABLE_UPLOAD_URL,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      uploadDataDuringCreation: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: MEDIA_BUCKET,
        objectName: path,
        contentType: contentTypeForFile(file),
        cacheControl: "3600",
      },
      onError: reject,
      onProgress(bytesUploaded, bytesTotal) {
        onProgress(Math.round((bytesUploaded / bytesTotal) * 100));
      },
      onSuccess: resolve,
    });
    upload.start();
  });
}

async function uploadSingleImage(file, altText, sortOrder, isCover, onProgress) {
  const path = filePath(file);
  const type = mediaType(file);

  try {
    await uploadFileToStorage(file, path, onProgress);
  } catch (uploadError) {
    alert(`Não foi possível enviar ${file.name}: ${uploadError.message || uploadError}`);
    return null;
  }

  const { data, error: insertError } = await supabaseClient
    .from(config().imageTable)
    .insert({
      [config().imageFk]: activeId,
      image_url: path,
      alt_text: altText || file.name,
      is_cover: type === "image" && isCover,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (insertError) {
    await supabaseClient.storage.from(MEDIA_BUCKET).remove([path]);
    alert(`Não foi possível salvar a imagem ${file.name}: ${insertError.message}`);
    return null;
  }

  activeImages.push(data);
  return data;
}

async function uploadPendingImages() {
  if (!pendingImageFiles.length || !activeId) return;

  isUploading = true;
  const submitButton = editorForm.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = "Enviando mídias...";

  for (let index = 0; index < pendingImageFiles.length; index += 1) {
    const file = pendingImageFiles[index];
    await uploadSingleImage(
      file,
      pendingImagePreviews[index]?.alt_text || file.name,
      activeImages.length,
      mediaType(file) === "image" && !coverImage(),
      (percentage) => {
        if (submitButton) submitButton.textContent = `Enviando ${index + 1}/${pendingImageFiles.length} · ${percentage}%`;
      }
    );
  }

  isUploading = false;
  clearPendingImages();
}

async function updateImageAlt(imageId, altText) {
  const { error } = await supabaseClient
    .from(config().imageTable)
    .update({ alt_text: altText.trim() })
    .eq("id", imageId);

  if (error) {
    alert(`Não foi possível atualizar texto alternativo: ${error.message}`);
    return;
  }

  activeImages = activeImages.map((image) => image.id === imageId ? { ...image, alt_text: altText.trim() } : image);
  renderPreview(formDataToRecord());
}

async function setCoverImage(imageId) {
  const selectedImage = activeImages.find((image) => image.id === imageId);
  if (!selectedImage || isVideo(selectedImage)) return;

  const fk = config().imageFk;
  const table = config().imageTable;

  const clear = await supabaseClient.from(table).update({ is_cover: false }).eq(fk, activeId);
  if (clear.error) {
    alert(`Não foi possível alterar capa: ${clear.error.message}`);
    return;
  }

  const set = await supabaseClient.from(table).update({ is_cover: true }).eq("id", imageId);
  if (set.error) {
    alert(`Não foi possível definir capa: ${set.error.message}`);
    return;
  }

  activeImages = activeImages.map((image) => ({ ...image, is_cover: image.id === imageId }));
  renderForm(currentRecord(), false);
}

async function deleteImage(imageId) {
  const image = activeImages.find((item) => item.id === imageId);
  if (!image || !confirm(`Excluir este ${isVideo(image) ? "vídeo" : "arquivo"}?`)) return;

  const { error: dbError } = await supabaseClient
    .from(config().imageTable)
    .delete()
    .eq("id", imageId);

  if (dbError) {
    alert(`Não foi possível excluir a mídia: ${dbError.message}`);
    return;
  }

  await supabaseClient.storage.from(MEDIA_BUCKET).remove([image.image_url]);
  activeImages = activeImages.filter((item) => item.id !== imageId);

  const nextCover = activeImages.find((media) => !isVideo(media));
  if (image.is_cover && nextCover) {
    await setCoverImage(nextCover.id);
    return;
  }

  await persistImageOrder();
  renderForm(currentRecord(), false);
}

async function moveImage(imageId, direction) {
  const index = activeImages.findIndex((image) => image.id === imageId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= activeImages.length) return;

  const reordered = [...activeImages];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  activeImages = reordered.map((image, order) => ({ ...image, sort_order: order }));
  await persistImageOrder();
  renderForm(currentRecord(), false);
}

async function persistImageOrder() {
  const updates = activeImages.map((image, index) => (
    supabaseClient.from(config().imageTable).update({ sort_order: index }).eq("id", image.id)
  ));

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed) alert(`Não foi possível reordenar as mídias: ${failed.error.message}`);
}

function handleImageAction(action, imageId) {
  if (action === "cover") setCoverImage(imageId);
  if (action === "delete") deleteImage(imageId);
  if (action === "up") moveImage(imageId, "up");
  if (action === "down") moveImage(imageId, "down");
}

async function saveCurrent(event) {
  event.preventDefault();
  if (isSaving) return;

  const submitButton = editorForm.querySelector('button[type="submit"]');
  const isNew = editorForm.dataset.mode === "new";
  const id = editorForm.dataset.id;
  const payload = formDataToRecord();

  isSaving = true;
  submitButton.disabled = true;
  submitButton.textContent = "Salvando...";

  const request = isNew
    ? supabaseClient.from(config().table).insert(payload).select().single()
    : supabaseClient.from(config().table).update(payload).eq("id", id).select().single();

  const { data, error } = await request;

  if (error) {
    isSaving = false;
    submitButton.disabled = false;
    submitButton.textContent = "Salvar";
    alert(`Não foi possível salvar: ${error.message}`);
    return;
  }

  const saved = normalizeRecord(data);
  const items = records[activeModule];
  const index = items.findIndex((item) => item.id === saved.id);

  if (index >= 0) {
    items[index] = saved;
  } else {
    items.unshift(saved);
  }

  activeId = saved.id;
  if (config().singleFeatured && saved.featured) {
    const { error: focusError } = await supabaseClient
      .from(config().table)
      .update({ featured: false })
      .neq("id", saved.id);

    if (focusError) {
      isSaving = false;
      submitButton.disabled = false;
      submitButton.textContent = "Salvar";
      alert(`Cadastro salvo, mas não foi possível atualizar a obra em foco: ${focusError.message}`);
      return;
    }

    records[activeModule] = records[activeModule].map((item) => (
      item.id === saved.id ? { ...item, featured: true } : { ...item, featured: false }
    ));
  }

  if (isNew) {
    await uploadPendingImages();
    await loadImages(saved.id);
    renderForm(saved, false);
  } else {
    closeEditor();
  }
  renderList();

  isSaving = false;
  const currentSubmitButton = editorForm.querySelector('button[type="submit"]');
  if (currentSubmitButton) {
    currentSubmitButton.disabled = false;
    currentSubmitButton.textContent = "Salvar";
  }
}

async function deleteCurrent() {
  const record = currentRecord();
  if (!record) return;
  if (!confirm(`Excluir "${record.title}"?`)) return;

  for (const image of activeImages) {
    await supabaseClient.storage.from(MEDIA_BUCKET).remove([image.image_url]);
  }

  const { error } = await supabaseClient
    .from(config().table)
    .delete()
    .eq("id", record.id);

  if (error) {
    alert(`Não foi possível excluir: ${error.message}`);
    return;
  }

  records[activeModule] = records[activeModule].filter((item) => item.id !== record.id);
  activeId = records[activeModule][0]?.id || null;
  activeImages = [];
  closeEditor();
  renderList();
}

async function handleLogin(event) {
  event.preventDefault();

  if (!supabaseClient) {
    setLoginMessage("Serviço de dados indisponível. Tente novamente em alguns instantes.", "error");
    return;
  }

  const submitButton = loginForm.querySelector('button[type="submit"]');
  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  submitButton.disabled = true;
  setLoginMessage("Entrando...", "neutral");

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  submitButton.disabled = false;

  if (error) {
    setLoginMessage(error.message, "error");
    return;
  }

  setLoginMessage("");
  loadedModules = new Set();
  showApp(data.session);
}

async function handleLogout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  showLogin("Você saiu do painel.");
}

async function initAuth() {
  if (!supabaseClient) {
    showLogin("Serviço de dados indisponível. Tente novamente em alguns instantes.");
    return;
  }

  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    showApp(data.session);
  } else {
    showLogin();
  }

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      showLogin();
      return;
    }

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      currentSession = session;
    }
  });
}

moduleButtons.forEach((button) => button.addEventListener("click", () => setModule(button.dataset.module)));
searchInput.addEventListener("input", renderList);
statusFilter.addEventListener("input", renderList);
refreshButton.addEventListener("click", () => loadRecords());
newButton.addEventListener("click", () => openEditor());
loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", handleLogout);
editorForm.addEventListener("submit", saveCurrent);
closeEditorButton.addEventListener("click", closeEditor);
editorModal.addEventListener("click", (event) => {
  if (event.target === editorModal) closeEditor();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editorModal.classList.contains("is-hidden")) closeEditor();
});

initAuth();
