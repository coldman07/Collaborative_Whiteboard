const state = {
    session: null,
    socket: null,
    elements: [],
    tool: "pen",
    color: "#1f6feb",
    width: 5,
    drawing: false,
    draft: null,
    authorName: localStorage.getItem("cw:name") || "",
    localElementIds: new Set(),
    reconnectTimer: null
};

const canvas = document.querySelector("#boardCanvas");
const ctx = canvas.getContext("2d");
const stage = document.querySelector(".canvas-stage");
const emptyState = document.querySelector("#emptyState");
const sessionMeta = document.querySelector("#sessionMeta");
const sessionCode = document.querySelector("#sessionCode");
const liveCount = document.querySelector("#liveCount");
const connectionState = document.querySelector("#connectionState");
const activityFeed = document.querySelector("#activityFeed");
const chatMessages = document.querySelector("#chatMessages");
const displayName = document.querySelector("#displayName");
const sessionTitle = document.querySelector("#sessionTitle");
const joinDialog = document.querySelector("#joinDialog");
const joinForm = document.querySelector("#joinForm");
const joinCode = document.querySelector("#joinCode");
const annotationDialog = document.querySelector("#annotationDialog");
const annotationForm = document.querySelector("#annotationForm");
const annotationTitle = document.querySelector("#annotationTitle");
const annotationInput = document.querySelector("#annotationInput");

displayName.value = state.authorName;

function api(path, options = {}) {
    return fetch(path, {
        headers: {"Content-Type": "application/json", ...(options.headers || {})},
        ...options
    }).then(async response => {
        if (!response.ok) {
            const body = await response.json().catch(() => ({error: response.statusText}));
            throw new Error(body.error || response.statusText);
        }
        if (response.status === 204) {
            return null;
        }
        return response.json();
    });
}

function getAuthorName() {
    const value = displayName.value.trim() || "Guest";
    localStorage.setItem("cw:name", value);
    return value;
}

function resizeCanvas() {
    const rect = stage.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    redraw();
}

function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function makeId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeStoredElement(record) {
    if (record.payloadJson) {
        return JSON.parse(record.payloadJson);
    }
    return record.payload || record;
}

function redraw(extraElement = null) {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const element of state.elements) {
        drawElement(element);
    }
    if (extraElement) {
        drawElement(extraElement);
    }
    emptyState.classList.toggle("is-hidden", state.elements.length > 0 || Boolean(extraElement));
}

function drawElement(element) {
    if (!element) return;
    if (element.type === "stroke" || element.type === "erase") {
        drawStroke(element);
    } else if (["line", "rect", "ellipse", "arrow"].includes(element.type)) {
        drawShape(element);
    } else if (element.type === "text") {
        drawText(element);
    } else if (element.type === "note") {
        drawNote(element);
    }
}

function drawStroke(element) {
    if (!element.points || element.points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = element.width;
    ctx.strokeStyle = element.color;
    ctx.globalAlpha = element.opacity ?? 1;
    ctx.globalCompositeOperation = element.type === "erase" ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(element.points[0].x, element.points[0].y);
    for (const point of element.points.slice(1)) {
        ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
}

function drawShape(element) {
    ctx.save();
    ctx.lineWidth = element.width;
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.fill || "transparent";
    ctx.globalAlpha = element.opacity ?? 1;
    const x = element.x;
    const y = element.y;
    const w = element.w;
    const h = element.h;
    if (element.type === "line" || element.type === "arrow") {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
        if (element.type === "arrow") drawArrowHead(x, y, x + w, y + h, element.color);
    } else if (element.type === "rect") {
        ctx.strokeRect(x, y, w, h);
    } else if (element.type === "ellipse") {
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawArrowHead(fromX, fromY, toX, toY, color) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const length = 14;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - length * Math.cos(angle - Math.PI / 6), toY - length * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - length * Math.cos(angle + Math.PI / 6), toY - length * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawText(element) {
    ctx.save();
    ctx.fillStyle = element.color;
    ctx.font = `${element.fontSize || 24}px Inter, Segoe UI, sans-serif`;
    ctx.textBaseline = "top";
    wrapText(element.text, element.x, element.y, element.maxWidth || 320, element.fontSize || 24, "fill");
    ctx.restore();
}

function drawNote(element) {
    const width = element.w || 190;
    const height = element.h || 130;
    ctx.save();
    ctx.fillStyle = element.fill || "#fff3a3";
    ctx.strokeStyle = "rgba(0,0,0,0.16)";
    ctx.lineWidth = 1;
    ctx.fillRect(element.x, element.y, width, height);
    ctx.strokeRect(element.x, element.y, width, height);
    ctx.fillStyle = "#172033";
    ctx.font = "16px Inter, Segoe UI, sans-serif";
    ctx.textBaseline = "top";
    wrapText(element.text, element.x + 12, element.y + 12, width - 24, 18, "fill");
    ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight, mode) {
    const words = String(text || "").split(/\s+/);
    let line = "";
    let lineY = y;
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx[`${mode}Text`](line, x, lineY);
            line = word;
            lineY += lineHeight + 6;
        } else {
            line = test;
        }
    }
    if (line) {
        ctx[`${mode}Text`](line, x, lineY);
    }
}

function startDrawing(event) {
    if (!state.session || state.session.editingLocked) return;
    const point = pointerPosition(event);
    state.drawing = true;
    canvas.setPointerCapture(event.pointerId);
    if (["pen", "highlighter", "eraser"].includes(state.tool)) {
        state.draft = {
            id: makeId(),
            type: state.tool === "eraser" ? "erase" : "stroke",
            color: state.tool === "highlighter" ? state.color : state.color,
            width: state.tool === "eraser" ? Math.max(14, state.width * 2) : state.width,
            opacity: state.tool === "highlighter" ? 0.35 : 1,
            points: [point],
            authorName: getAuthorName()
        };
    } else if (["line", "rect", "ellipse", "arrow"].includes(state.tool)) {
        state.draft = {
            id: makeId(),
            type: state.tool,
            x: point.x,
            y: point.y,
            w: 0,
            h: 0,
            color: state.color,
            width: state.width,
            authorName: getAuthorName()
        };
    } else if (state.tool === "text") {
        state.drawing = false;
        addTextAt(point);
    } else if (state.tool === "note") {
        state.drawing = false;
        addNoteAt(point);
    }
}

function continueDrawing(event) {
    if (!state.drawing || !state.draft) return;
    const point = pointerPosition(event);
    if (state.draft.points) {
        state.draft.points.push(point);
    } else {
        state.draft.w = point.x - state.draft.x;
        state.draft.h = point.y - state.draft.y;
    }
    sendCursor(point);
    redraw(state.draft);
}

function finishDrawing(event) {
    if (!state.drawing || !state.draft) return;
    canvas.releasePointerCapture(event.pointerId);
    const draft = state.draft;
    state.drawing = false;
    state.draft = null;
    if (draft.points && draft.points.length < 2) return;
    if (!draft.points && Math.abs(draft.w) < 4 && Math.abs(draft.h) < 4) return;
    commitElement(draft);
}

function addTextAt(point) {
    openAnnotationDialog("text", point);
}

function addNoteAt(point) {
    openAnnotationDialog("note", point);
}

function openAnnotationDialog(type, point) {
    state.pendingAnnotation = {type, point};
    annotationTitle.textContent = type === "note" ? "Add sticky note" : "Add text";
    annotationInput.value = "";
    annotationInput.placeholder = type === "note" ? "Type a sticky note" : "Type text to place on the board";
    document.querySelector("#confirmAnnotationBtn").textContent = type === "note" ? "Add note" : "Add text";
    annotationDialog.showModal();
    setTimeout(() => annotationInput.focus(), 0);
}

function closeAnnotationDialog() {
    state.pendingAnnotation = null;
    annotationDialog.close();
}

function submitAnnotation(event) {
    event.preventDefault();
    const text = annotationInput.value.trim();
    const pending = state.pendingAnnotation;
    if (!text || !pending) {
        closeAnnotationDialog();
        return;
    }
    const base = {
        id: makeId(),
        type: pending.type,
        x: pending.point.x,
        y: pending.point.y,
        text,
        authorName: getAuthorName()
    };
    commitElement(pending.type === "note"
        ? {...base, w: 200, h: 130, fill: "#fff3a3"}
        : {...base, color: state.color, fontSize: 24});
    closeAnnotationDialog();
}

function commitElement(element, remote = false) {
    if (state.elements.some(existing => existing.id === element.id)) return;
    state.elements.push(element);
    redraw();
    addActivity(remote ? `${element.authorName || "Someone"} added ${element.type}` : `You added ${element.type}`);
    if (!remote) {
        state.localElementIds.add(element.id);
        sendSocket({type: "canvas:add", authorName: getAuthorName(), element});
    }
}

function undo() {
    for (let i = state.elements.length - 1; i >= 0; i -= 1) {
        if (state.localElementIds.has(state.elements[i].id)) {
            state.elements.splice(i, 1);
            redraw();
            saveBoard();
            addActivity("Undid your last local action");
            return;
        }
    }
}

function clearBoard(remote = false) {
    state.elements = [];
    state.localElementIds.clear();
    redraw();
    addActivity(remote ? "Board cleared by moderator" : "Board cleared");
    if (!remote) {
        sendSocket({type: "canvas:clear", authorName: getAuthorName()});
    }
}

async function createSession() {
    const session = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify({title: sessionTitle.value || "Untitled whiteboard", ownerName: getAuthorName()})
    });
    await openSession(session.id);
}

async function openSession(idOrToken) {
    const resolvedId = parseJoinValue(idOrToken);
    if (!resolvedId) {
        throw new Error("Enter a session ID, token, or share link.");
    }
    const session = await api(`/api/sessions/${encodeURIComponent(resolvedId)}`);
    state.session = session;
    const [storedElements, storedMessages] = await Promise.all([
        api(`/api/sessions/${session.id}/elements`),
        api(`/api/sessions/${session.id}/messages`)
    ]);
    state.elements = storedElements.map(normalizeStoredElement);
    chatMessages.innerHTML = "";
    storedMessages.forEach(addChatMessage);
    updateSessionUi();
    connectSocket();
    redraw();
    history.replaceState(null, "", `/?session=${encodeURIComponent(session.shareToken)}`);
}

function updateSessionUi() {
    if (!state.session) return;
    sessionTitle.value = state.session.title;
    sessionMeta.textContent = `Owned by ${state.session.ownerName} - token ${state.session.shareToken}`;
    sessionCode.textContent = state.session.shareToken;
    document.querySelector("#lockToggle").checked = state.session.editingLocked;
}

function connectSocket() {
    if (!state.session) return;
    if (state.socket) {
        state.socket.close();
    }
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    state.socket = new WebSocket(`${protocol}://${location.host}/ws/sessions/${state.session.id}`);
    connectionState.textContent = "connecting";
    state.socket.addEventListener("open", () => {
        connectionState.textContent = "online";
        addActivity("Realtime connection ready");
    });
    state.socket.addEventListener("message", event => handleSocketMessage(JSON.parse(event.data)));
    state.socket.addEventListener("close", () => {
        connectionState.textContent = "offline";
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = setTimeout(connectSocket, 1600);
    });
}

function handleSocketMessage(event) {
    if (event.type === "canvas:add") {
        commitElement(event.element, true);
    } else if (event.type === "canvas:clear") {
        clearBoard(true);
    } else if (event.type === "chat:message") {
        addChatMessage(event);
    } else if (event.type === "presence:update") {
        liveCount.textContent = event.activeUsers;
    } else if (event.type === "cursor:move") {
        renderRemoteCursor(event.authorName, event.cursor);
    } else if (event.type === "permission:update") {
        state.session.editingLocked = event.editingLocked;
        document.querySelector("#lockToggle").checked = event.editingLocked;
        addActivity(event.editingLocked ? "Editing locked by moderator" : "Editing unlocked by moderator");
    }
}

function sendSocket(payload) {
    if (state.socket && state.socket.readyState === WebSocket.OPEN) {
        state.socket.send(JSON.stringify(payload));
    }
}

function sendCursor(point) {
    sendSocket({type: "cursor:move", authorName: getAuthorName(), cursor: point});
}

function renderRemoteCursor(authorName, cursor) {
    if (!cursor) return;
    const id = `cursor-${authorName.replace(/[^a-z0-9]/gi, "-")}`;
    let node = document.getElementById(id);
    if (!node) {
        node = document.createElement("div");
        node.id = id;
        node.className = "remote-cursor";
        document.querySelector("#cursorLayer").appendChild(node);
    }
    node.textContent = authorName;
    node.style.left = `${cursor.x}px`;
    node.style.top = `${cursor.y}px`;
    clearTimeout(node.hideTimer);
    node.hideTimer = setTimeout(() => node.remove(), 1300);
}

async function saveBoard() {
    if (!state.session) return;
    await api(`/api/sessions/${state.session.id}/elements`, {
        method: "PUT",
        body: JSON.stringify(state.elements.map(element => ({
            id: element.id,
            type: element.type,
            authorName: element.authorName || getAuthorName(),
            payload: element
        })))
    });
    addActivity("Board saved");
}

function exportImage() {
    const link = document.createElement("a");
    link.download = `${state.session?.title || "whiteboard"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function exportPdf() {
    const image = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
        <html>
            <head><title>${state.session?.title || "Whiteboard"}</title></head>
            <body style="margin:0">
                <img src="${image}" style="width:100%;height:auto;display:block">
                <script>window.onload = () => window.print();<\/script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function addChatMessage(message) {
    const node = document.createElement("div");
    node.className = "message";
    node.innerHTML = `<strong></strong><span></span>`;
    node.querySelector("strong").textContent = message.authorName || "Guest";
    node.querySelector("span").textContent = message.message;
    chatMessages.appendChild(node);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addActivity(text) {
    const node = document.createElement("div");
    node.className = "activity";
    node.innerHTML = `<strong></strong><span></span>`;
    node.querySelector("strong").textContent = new Date().toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
    node.querySelector("span").textContent = text;
    activityFeed.prepend(node);
    while (activityFeed.children.length > 12) {
        activityFeed.lastChild.remove();
    }
}

async function setLock(locked) {
    if (!state.session) return;
    state.session = await api(`/api/sessions/${state.session.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({editingLocked: locked})
    });
    sendSocket({type: "permission:update", authorName: getAuthorName(), editingLocked: locked});
    addActivity(locked ? "Editing locked" : "Editing unlocked");
}

function parseJoinValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (raw.startsWith("?")) {
        return new URLSearchParams(raw).get("session") || raw.slice(1).trim();
    }

    try {
        const url = new URL(raw, location.origin);
        const sessionParam = url.searchParams.get("session");
        if (sessionParam) {
            return sessionParam.trim();
        }
        const lastPathPart = url.pathname.split("/").filter(Boolean).pop();
        return lastPathPart || raw;
    } catch {
        return raw;
    }
}

function showJoinDialog() {
    joinCode.value = "";
    joinDialog.showModal();
    setTimeout(() => joinCode.focus(), 0);
}

async function submitJoin(event) {
    event.preventDefault();
    const code = parseJoinValue(joinCode.value);
    if (!code) {
        joinCode.focus();
        return;
    }
    document.querySelector("#confirmJoinBtn").disabled = true;
    try {
        await openSession(code);
        joinDialog.close();
        addActivity(`Joined session ${state.session.shareToken}`);
    } catch (error) {
        alert(error.message);
        joinCode.focus();
    } finally {
        document.querySelector("#confirmJoinBtn").disabled = false;
    }
}

document.querySelectorAll(".tool").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".tool").forEach(item => item.classList.remove("is-active"));
        button.classList.add("is-active");
        state.tool = button.dataset.tool;
    });
});

document.querySelectorAll(".swatches button").forEach(button => {
    button.addEventListener("click", () => {
        state.color = button.dataset.color;
        document.querySelector("#colorPicker").value = state.color;
    });
});

document.querySelector("#colorPicker").addEventListener("input", event => state.color = event.target.value);
document.querySelector("#widthPicker").addEventListener("input", event => state.width = Number(event.target.value));
document.querySelector("#createSessionBtn").addEventListener("click", createSession);
document.querySelector("#joinSessionBtn").addEventListener("click", showJoinDialog);
joinForm.addEventListener("submit", submitJoin);
document.querySelector("#cancelJoinBtn").addEventListener("click", () => joinDialog.close());
annotationForm.addEventListener("submit", submitAnnotation);
document.querySelector("#cancelAnnotationBtn").addEventListener("click", closeAnnotationDialog);
document.querySelector("#shareBtn").addEventListener("click", async () => {
    const url = new URL(location.href);
    if (state.session) url.searchParams.set("session", state.session.shareToken);
    await navigator.clipboard.writeText(url.href);
    addActivity("Share link copied");
});
document.querySelector("#undoBtn").addEventListener("click", undo);
document.querySelector("#clearBtn").addEventListener("click", () => clearBoard(false));
document.querySelector("#saveBtn").addEventListener("click", () => saveBoard().catch(error => alert(error.message)));
document.querySelector("#exportImageBtn").addEventListener("click", exportImage);
document.querySelector("#exportPdfBtn").addEventListener("click", exportPdf);
document.querySelector("#lockToggle").addEventListener("change", event => setLock(event.target.checked));
document.querySelector("#chatForm").addEventListener("submit", event => {
    event.preventDefault();
    const input = document.querySelector("#chatInput");
    const message = input.value.trim();
    if (!message) return;
    sendSocket({type: "chat:message", authorName: getAuthorName(), message});
    input.value = "";
});

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", continueDrawing);
canvas.addEventListener("pointerup", finishDrawing);
canvas.addEventListener("pointercancel", finishDrawing);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();

const params = new URLSearchParams(location.search);
const sessionFromUrl = params.get("session");
if (sessionFromUrl) {
    openSession(sessionFromUrl).catch(error => {
        addActivity(error.message);
        createSession();
    });
} else {
    createSession();
}
