const STORAGE_KEY = "relist-manager-items-v1";
const ARCHIVE_STORAGE_KEY = "relist-manager-archive-v1";

const form = document.querySelector("#itemForm");
const editingIdInput = document.querySelector("#editingId");
const productCodeInput = document.querySelector("#productCodeInput");
const titleInput = document.querySelector("#titleInput");
const descriptionInput = document.querySelector("#descriptionInput");
const priceInput = document.querySelector("#priceInput");
const marketInput = document.querySelector("#marketInput");
const relistDateInput = document.querySelector("#relistDateInput");
const siteInputs = document.querySelectorAll(".site-input");
const otherSiteInput = document.querySelector("#otherSiteInput");
const otherSiteLabel = document.querySelector("#otherSiteLabel");
const folderInput = document.querySelector("#folderInput");
const folderStatus = document.querySelector("#folderStatus");
const itemList = document.querySelector("#itemList");
const emptyState = document.querySelector("#emptyState");
const itemTemplate = document.querySelector("#itemTemplate");
const archiveList = document.querySelector("#archiveList");
const archiveEmptyState = document.querySelector("#archiveEmptyState");
const archiveTemplate = document.querySelector("#archiveTemplate");
const summaryText = document.querySelector("#summaryText");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const sortSelect = document.querySelector("#sortSelect");
const resetButton = document.querySelector("#resetButton");
const clearButton = document.querySelector("#clearButton");
const exportButton = document.querySelector("#exportButton");
const formTitle = document.querySelector("#formTitle");
const saveButton = document.querySelector("#saveButton");
const pageTabs = document.querySelectorAll(".tab-button");
const registerPage = document.querySelector("#registerPage");
const storagePage = document.querySelector("#storagePage");
const archivePage = document.querySelector("#archivePage");

let items = loadItems();
let archivedItems = loadArchivedItems();
let selectedFolder = null;

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    alert("画像データが大きすぎて保存できませんでした。画像枚数を減らすか、画像サイズを小さくしてください。");
    return false;
  }
}

function loadArchivedItems() {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveArchivedItems() {
  localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archivedItems));
}

function formatYen(value) {
  if (!value && value !== 0) return "未入力";
  return Number(value).toLocaleString("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  });
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isDue(dateValue) {
  return dateValue && dateValue <= todayString();
}

function getSiteName(item) {
  const sites = getItemSites(item);
  return sites.map((site) => (site === "その他" && item.otherSite ? item.otherSite : site)).join(" / ") || "未選択";
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function switchPage(pageName) {
  const isRegister = pageName === "register";
  const isStorage = pageName === "storage";
  const isArchive = pageName === "archive";
  registerPage.classList.toggle("active", isRegister);
  storagePage.classList.toggle("active", isStorage);
  archivePage.classList.toggle("active", isArchive);

  pageTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.page === pageName);
  });
}

function compareDateAsc(a, b) {
  const dateA = a.relistDate || "9999-12-31";
  const dateB = b.relistDate || "9999-12-31";
  return dateA.localeCompare(dateB);
}

function getSelectedSites() {
  return Array.from(siteInputs)
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function getItemSites(item) {
  if (Array.isArray(item.sites)) return item.sites;
  if (item.site) return [item.site];
  return ["メルカリ"];
}

function updateOtherSiteVisibility() {
  otherSiteLabel.classList.toggle("hidden", !getSelectedSites().includes("その他"));
}

function setSelectedSites(sites) {
  const selectedSites = sites.length ? sites : ["メルカリ"];
  siteInputs.forEach((input) => {
    input.checked = selectedSites.includes(input.value);
  });
  updateOtherSiteVisibility();
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;
  const sortMode = sortSelect.value;

  const filteredItems = items
    .filter((item) => {
      const text = [item.productCode, item.title, item.description, getSiteName(item)].join(" ").toLowerCase();
      return !query || text.includes(query);
    })
    .filter((item) => {
      if (filter === "due") return isDue(item.relistDate);
      if (filter === "upcoming") return !isDue(item.relistDate);
      return true;
    })
    .sort((a, b) => {
      if (sortMode === "dateDesc") return compareDateAsc(b, a);
      if (sortMode === "updatedDesc") return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      return compareDateAsc(a, b);
    });

  itemList.innerHTML = "";
  emptyState.hidden = filteredItems.length > 0;

  filteredItems.forEach((item) => {
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    node.classList.toggle("is-due", isDue(item.relistDate));

    node.querySelector("h3").textContent = item.title;
    node.querySelector(".product-code").textContent = item.productCode ? `品番: ${item.productCode}` : "品番: 未入力";
    node.querySelector(".site-badge").textContent = getSiteName(item);
    node.querySelector(".description").textContent = item.description || "説明文なし";
    node.querySelector(".price").textContent = `出品価格: ${formatYen(item.price)}`;
    node.querySelector(".market").textContent = `相場予定: ${formatYen(item.market)}`;
    node.querySelector(".date").textContent = `再出品予定日: ${item.relistDate || "未設定"}`;
    node.querySelector(".folder").textContent = item.folderName
      ? `画像: ${item.folderName} (${item.imageCount}枚)`
      : "画像: 未選択";

    const downloadButton = node.querySelector(".download-button");
    downloadButton.disabled = !(item.imageData && item.imageData.length);
    downloadButton.addEventListener("click", () => downloadImages(item.id));
    node.querySelector(".edit-button").addEventListener("click", () => editItem(item.id));
    node.querySelector(".duplicate-button").addEventListener("click", () => duplicateItem(item.id));
    node.querySelector(".complete-delete-button").addEventListener("click", () => archiveCompletedItem(item.id));
    node.querySelector(".delete-button").addEventListener("click", () => deleteItem(item.id));
    itemList.append(node);
  });

  const dueCount = items.filter((item) => isDue(item.relistDate)).length;
  summaryText.textContent = `登録商品 ${items.length}件 / 予定日到来 ${dueCount}件 / 完了履歴 ${archivedItems.length}件`;
  renderArchive();
}

function renderArchive() {
  const sortedArchivedItems = [...archivedItems].sort((a, b) => (b.archivedAt || "").localeCompare(a.archivedAt || ""));

  archiveList.innerHTML = "";
  archiveEmptyState.hidden = sortedArchivedItems.length > 0;

  sortedArchivedItems.forEach((item) => {
    const node = archiveTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".archived-code").textContent = item.productCode ? `品番: ${item.productCode}` : "品番: 未入力";
    node.querySelector("h3").textContent = item.title || "タイトルなし";
    node.querySelector(".archived-at").textContent = `完了削除日: ${formatDateTime(item.archivedAt)}`;
    node.querySelector(".archived-site").textContent = `出品サイト: ${item.siteName || "未選択"}`;
    archiveList.append(node);
  });
}

function resetForm() {
  form.reset();
  editingIdInput.value = "";
  selectedFolder = null;
  setSelectedSites(["メルカリ"]);
  folderStatus.textContent = "フォルダを選択";
  formTitle.textContent = "商品を登録";
  saveButton.textContent = "登録する";
  relistDateInput.value = todayString();
}

function getFolderInfo() {
  if (selectedFolder) return selectedFolder;

  const editingItem = items.find((item) => item.id === editingIdInput.value);
  return editingItem
    ? {
        folderName: editingItem.folderName,
        imageCount: editingItem.imageCount,
        imageFiles: editingItem.imageFiles || [],
        imageData: editingItem.imageData || [],
      }
    : { folderName: "", imageCount: 0, imageFiles: [], imageData: [] };
}

async function submitItem(event) {
  event.preventDefault();
  const folderInfo = getFolderInfo();
  const id = editingIdInput.value || crypto.randomUUID();
  const previousItems = [...items];
  const nextItem = {
    id,
    productCode: productCodeInput.value.trim(),
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    price: priceInput.value,
    market: marketInput.value,
    relistDate: relistDateInput.value,
    sites: getSelectedSites(),
    site: getSelectedSites()[0] || "",
    otherSite: otherSiteInput.value.trim(),
    ...folderInfo,
    updatedAt: new Date().toISOString(),
  };

  if (editingIdInput.value) {
    items = items.map((item) => (item.id === id ? nextItem : item));
  } else {
    items = [nextItem, ...items];
  }

  const saved = saveItems();
  if (!saved) {
    items = previousItems;
    return;
  }
  resetForm();
  render();
  switchPage("storage");
}

function editItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  editingIdInput.value = item.id;
  productCodeInput.value = item.productCode || "";
  titleInput.value = item.title;
  descriptionInput.value = item.description;
  priceInput.value = item.price;
  marketInput.value = item.market;
  relistDateInput.value = item.relistDate;
  setSelectedSites(getItemSites(item));
  otherSiteInput.value = item.otherSite || "";
  selectedFolder = null;
  folderStatus.textContent = item.folderName
    ? `${item.folderName} (${item.imageCount}枚)`
    : "フォルダを選択";
  formTitle.textContent = "商品を編集";
  saveButton.textContent = "更新する";
  switchPage("register");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  items = [
    {
      ...item,
      id: crypto.randomUUID(),
      productCode: item.productCode ? `${item.productCode}-copy` : "",
      title: `${item.title} コピー`,
      updatedAt: new Date().toISOString(),
    },
    ...items,
  ];
  if (!saveItems()) return;
  render();
}

function deleteItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  if (!confirm(`「${item.title}」を削除しますか？`)) return;

  items = items.filter((entry) => entry.id !== id);
  if (!saveItems()) return;
  render();
}

function archiveCompletedItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  if (!confirm(`「${item.title}」を出品完了として削除し、品番をアーカイブに残しますか？`)) return;

  archivedItems = [
    {
      id: crypto.randomUUID(),
      sourceItemId: item.id,
      productCode: item.productCode || "",
      title: item.title || "",
      siteName: getSiteName(item),
      archivedAt: new Date().toISOString(),
    },
    ...archivedItems,
  ];
  items = items.filter((entry) => entry.id !== id);
  saveArchivedItems();
  if (!saveItems()) return;
  render();
  switchPage("archive");
}

function clearAll() {
  if (!items.length) return;
  if (!confirm("登録済みの商品をすべて削除しますか？")) return;

  items = [];
  saveItems();
  resetForm();
  render();
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

function downloadFile(file) {
  const blob = dataUrlToBlob(file.dataUrl);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name.split("/").pop() || "image";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadImages(id) {
  const item = items.find((entry) => entry.id === id);
  const imageData = item?.imageData || [];

  if (!imageData.length) {
    alert("この商品にはダウンロードできる画像データがありません。編集から画像フォルダを選び直してください。");
    return;
  }

  imageData.forEach((file, index) => {
    setTimeout(() => downloadFile(file), index * 250);
  });
}

function exportCsv() {
  const header = ["品番", "タイトル", "説明文", "出品価格", "相場予定", "再出品予定日", "出品サイト", "画像フォルダ", "画像枚数"];
  const rows = items.map((item) => [
    item.productCode,
    item.title,
    item.description,
    item.price,
    item.market,
    item.relistDate,
    getSiteName(item),
    item.folderName,
    item.imageCount,
  ]);
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relist-items-${todayString()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

siteInputs.forEach((input) => {
  input.addEventListener("change", updateOtherSiteVisibility);
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

folderInput.addEventListener("change", async () => {
  const files = Array.from(folderInput.files || []).filter((file) => file.type.startsWith("image/"));
  const firstPath = files[0]?.webkitRelativePath || "";
  const folderName = firstPath.split("/")[0] || "";
  folderStatus.textContent = files.length ? "画像を読み込み中..." : "フォルダを選択";

  const imageData = await Promise.all(
    files.map(async (file) => ({
      name: file.webkitRelativePath || file.name,
      type: file.type,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file),
    })),
  );

  selectedFolder = {
    folderName,
    imageCount: files.length,
    imageFiles: files.map((file) => file.webkitRelativePath || file.name),
    imageData,
  };
  folderStatus.textContent = folderName ? `${folderName} (${files.length}枚)` : "フォルダを選択";
});

form.addEventListener("submit", submitItem);
pageTabs.forEach((tab) => {
  tab.addEventListener("click", () => switchPage(tab.dataset.page));
});
resetButton.addEventListener("click", resetForm);
clearButton.addEventListener("click", clearAll);
exportButton.addEventListener("click", exportCsv);
searchInput.addEventListener("input", render);
statusFilter.addEventListener("change", render);
sortSelect.addEventListener("change", render);

resetForm();
render();
