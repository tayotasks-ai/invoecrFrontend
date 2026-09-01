<script setup>
// Root component is intentionally just a router outlet - each route picks
// its own layout (dashboard chrome vs. bare auth/public pages) via
// src/router/index.js + the layout components under src/layouts.
//
// ConfirmDialog is mounted here (once, outside any router-view) so it can
// float above whichever layout/page is currently showing - see
// composables/useConfirm.js for how views trigger it.
import ConfirmDialog from './components/ConfirmDialog.vue'
</script>

<template>
  <router-view />
  <ConfirmDialog />
</template>
