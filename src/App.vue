<script setup>
// Root component is intentionally just a router outlet - each route picks
// its own layout (dashboard chrome vs. bare auth/public pages) via
// src/router/index.js + the layout components under src/layouts.
</script>

<template>
  <router-view />
</template>
