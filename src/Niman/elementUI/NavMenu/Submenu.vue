<template>
  <el-menu-item  v-if="itemData.leaf" :index="itemData.key" >
    <i :class="itemData.icon || 'el-icon-tickets'" ></i>
    {{itemData.label}}
  </el-menu-item>
  <el-submenu v-else :index="itemData.key" >
    <span slot="title" >
      <i :class="itemData.icon || 'el-icon-folder'"></i>
      {{itemData.label}}
    </span>
    <template v-for="item in itemData.routes">
      <sub-menu :itemData="item"></sub-menu>
    </template>
  </el-submenu>
</template>

<script>
  export default {
    name:'sub-menu',
    props:{
      itemData: {
        type: Object,
        default: {}
      },
    }
  }
  
</script>

<style>
</style>
