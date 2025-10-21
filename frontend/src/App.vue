<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import Canvas from "./components/Canvas.vue";
import Toolbar from "./components/Toolbar.vue";
import ColorPicker from "./components/ColorPicker.vue";
import PropertyPanel from "./components/PropertyPanel.vue";
import Footer from "./components/Footer.vue";
import { useDrawingStore } from "./stores/drawing";

// @ts-ignore
import { SaveImage, GetClipboardImage, Log } from "../wailsjs/go/main/App";
// @ts-ignore
import { Environment } from "../wailsjs/runtime/runtime";

const store = useDrawingStore();
const isMac = ref(false);
const canvasRef = ref<InstanceType<typeof Canvas> | null>(null);

const handlePaste = async () => {
  await Log("[handlePaste] Paste function called");
  try {
    await Log("[handlePaste] Calling GetClipboardImage...");
    const imageData = await GetClipboardImage();
    await Log(
      `[handlePaste] Got response, imageData length: ${imageData?.length || 0}`
    );

    if (imageData && canvasRef.value) {
      await Log("[handlePaste] Loading image to canvas...");
      await canvasRef.value.loadImage(imageData);
      await Log("[handlePaste] Image loaded successfully!");
    } else if (!imageData) {
      await Log("[handlePaste] ERROR: No image data returned from clipboard");
      alert("No image data returned from clipboard");
    } else if (!canvasRef.value) {
      await Log("[handlePaste] ERROR: Canvas not ready");
      alert("Canvas not ready");
    }
  } catch (error) {
    await Log(`[handlePaste] ERROR: ${error}`);
    console.error("Failed to get clipboard image:", error);
    alert("No image in clipboard or failed to read clipboard: " + error);
  }
};

const handleExport = async () => {
  if (!canvasRef.value) return;

  const imageData = canvasRef.value.getImageData();
  if (!imageData) return;

  // Remove data URL prefix
  const base64Data = imageData.split(",")[1];

  try {
    const filepath = await SaveImage(base64Data, "png");
    alert(`Image saved to: ${filepath}`);
  } catch (error) {
    console.error("Failed to save image:", error);
    alert("Failed to save image");
  }
};

const handleClear = () => {
  if (canvasRef.value && confirm("Clear canvas?")) {
    canvasRef.value.clear();
  }
};

const handleUndo = () => {
  if (canvasRef.value) {
    canvasRef.value.undo();
  }
};

const handleRedo = () => {
  if (canvasRef.value) {
    canvasRef.value.redo();
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  // Delete/Backspace to delete selected shapes
  if (event.key === 'Backspace' || event.key === 'Delete') {
    if (canvasRef.value && store.hasSelection) {
      event.preventDefault();
      canvasRef.value.deleteSelectedShapes();
    }
  }
  // Command/Ctrl + V for paste
  else if ((event.metaKey || event.ctrlKey) && event.key === "v") {
    Log("[handleKeyDown] Cmd+V pressed");
    event.preventDefault();
    event.stopPropagation();
    handlePaste();
  }
  // Command/Ctrl + Z for undo
  else if (
    (event.metaKey || event.ctrlKey) &&
    event.key === "z" &&
    !event.shiftKey
  ) {
    event.preventDefault();
    handleUndo();
  }
  // Command/Ctrl + Shift + Z for redo
  else if (
    (event.metaKey || event.ctrlKey) &&
    event.shiftKey &&
    event.key === "z"
  ) {
    event.preventDefault();
    handleRedo();
  }
  // Command/Ctrl + S for save
  else if ((event.metaKey || event.ctrlKey) && event.key === "s") {
    event.preventDefault();
    handleExport();
  }
  // Escape to deselect
  else if (event.key === "Escape") {
    store.clearSelection();
  }
};

// Handle wheel events to hijack scrolling
const handleWheel = (event: WheelEvent) => {
  // Prevent default macOS scrolling behavior
  event.preventDefault();
  window.scrollTo(0, window.scrollY + event.deltaY);
};

const headerButtons = [
  {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    onClick: handlePaste,
    tooltip: { mac: "Paste (⌘V)", win: "Paste (Ctrl+V)" },
    primary: false,
  },
  {
    icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6",
    onClick: handleUndo,
    tooltip: { mac: "Undo (⌘Z)", win: "Undo (Ctrl+Z)" },
    primary: false,
  },
  {
    icon: "M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6",
    onClick: handleRedo,
    tooltip: { mac: "Redo (⌘⇧Z)", win: "Redo (Ctrl+Shift+Z)" },
    primary: false,
  },
  {
    icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    onClick: handleClear,
    tooltip: { mac: "Clear Canvas", win: "Clear Canvas" },
    primary: false,
  },
  {
    icon: "M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4",
    onClick: handleExport,
    tooltip: { mac: "Export (⌘S)", win: "Export (Ctrl+S)" },
    primary: true,
  },
];

onMounted(async () => {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("wheel", handleWheel);

  // Detect platform
  try {
    const env = await Environment();
    isMac.value = env.platform === "darwin";
  } catch (error) {
    // Fallback to user agent detection
    isMac.value = navigator.userAgent.includes("Mac");
  }

  // Load saved state
  await store.loadStateFromBackend();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("wheel", handleWheel);
});
</script>

<template>
  <div class="h-screen flex flex-col font-sans bg-gray-50 dark:bg-gray-900">
    <header
      :class="[
        'flex justify-between items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50',
        isMac ? 'h-[32px] px-3 pl-20' : 'h-[44px] px-5',
        '--wails-draggable',
      ]"
    >
      <h1
        :class="[
          'text-sm font-medium text-gray-900 dark:text-white tracking-tight select-none',
          isMac ? 'text-center flex-1' : '',
        ]"
      >
        Paint App
      </h1>
      <div class="flex gap-1.5">
        <button
          v-for="(btn, index) in headerButtons"
          :key="index"
          @click="btn.onClick"
          :title="isMac ? btn.tooltip.mac : btn.tooltip.win"
          :class="['p-1', btn.primary ? 'icon-btn-primary' : 'icon-btn']"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="btn.icon"
            />
          </svg>
        </button>
      </div>
    </header>

    <div class="panel flex items-center gap-6">
      <ColorPicker />
      <PropertyPanel />
    </div>

    <div class="flex flex-1 overflow-hidden">
      <Toolbar />
      <Canvas ref="canvasRef" />
    </div>

    <Footer />
  </div>
</template>

<style scoped>
.--wails-draggable {
  -webkit-app-region: drag;
  -webkit-user-select: none;
  user-select: none;
  --wails-draggable: drag;
}

.--wails-draggable button {
  -webkit-app-region: no-drag;
}
</style>
