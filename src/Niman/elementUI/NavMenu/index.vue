<template>
    <el-menu @select="handleSelect"  @open="handleOpen" @close="handleClose" :collapse="isCollapse">
      <template v-for="item in menuData" >
        <sub-menu  :itemData="item"></sub-menu>
      </template>
    </el-menu>
</template>

<script>
  import Vue from 'vue';
  import SubMenu from './SubMenu.vue';
  import {treeToList,treeToMap, createDecodeMap} from '../../Utilities/index.js'
  
  export default {
      components: {
        SubMenu
      },
      data() {
        return {
          isCollapse: false,
          menuData: [],
          menuDataMap: {},
        };
      },
      props: {
        
        authList: {
          type: Array,
          default: function() {return []},
        }
      },
      mounted(){
        
        const {
          menuData,
          menuDecode,
        } = Vue.$$getNavMenu( [
          'app',
          'app.pharmacySpecial',
          'app.pharmacySpecial.ydxs',
          'app.pharmacySpecial.ydxs.hospitalization',
          'app.pharmacySpecial.ydxs.hospitalization.rcyrc',
        ])
        
        this.menuData = menuData;
        this.menuDataMap = menuDecode;
        

        console.log(this.menuDataMap);
 
      },
      methods: {
        handleSelect(key, keyPath){
          this.$router.push(this.menuDataMap[key].fullPath);
          console.log('handleSelect',this.menuDataMap[key])
        },
        handleOpen(key, keyPath) {
          console.log('handleOpen',key, keyPath)
        },
        handleClose(key, keyPath) {
           console.log('handleClose',key, keyPath)
        }
      }
    }
</script>

<style>
</style>
