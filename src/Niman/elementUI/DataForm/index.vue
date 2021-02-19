<template>
  <div  :class="'form raster max-cols-4 cols-' + cols">
    <div class="cell " v-for="field in fields" :key="field.field" >
      <div :class="'cell col-span-' + labelSpan ">
        <el-tooltip placement="top" :content="field.tooltip" v-if="field.tooltip !== undefined">
          <label :class="setReauiredClass(field)" >
            <i style="color: #FFA500;" class="el-icon-question"></i>
            {{ field.label }}
          </label>
        </el-tooltip>
        <label v-else :class="setReauiredClass(field)" >{{ field.label }}</label>
      </div>
      <div  :class="'cell col-span-' + (24 - labelSpan) ">
        <el-tooltip :disabled="!error[field.field]" :content="error[field.field]" placement="top">
          <el-select
            v-if="field.type === 'Select'"
            v-model="formData[field.field]"
            :multiple="field.muti"
            
            size="mini"
            :class="setErrorClass(field)"
            :disabled="disabled"
            :placeholder="field.placeholder"
            
            @focus="emitAction"
            @input="emitAction"
            @blur="emitAction"
          >
            <el-option v-for="item in field.source" :key="item.value" :label="item.label" :value="item.value"></el-option>
          </el-select>
  
          <modal-select
            v-else-if="field.type === 'ModalSelect'"
            v-model="formData[field.field]"
            :multiple="field.muti"
            :source="field.source"
            :class="setErrorClass(field)"
            :disabled="disabled"
            
            @focus="emitAction"
            @input="emitAction"
            @blur="emitAction"
          ></modal-select>
  
          <el-input-number
            v-else-if="field.type === 'InputNumber'"
           :class="setErrorClass(field)"
            controls-position="right"
            size="mini"
            :disabled="disabled"
            v-model="formData[field.field]"
            :min="field.minValue"
            :max="field.maxValue"
            
            @focus="emitAction"
            @input="emitAction"
            @blur="emitAction"
          ></el-input-number>
  
          <el-input v-else size="mini" :class="setErrorClass(field)" :disabled="disabled" v-model="formData[field.field]"
           :placeholder="field.placeholder"
           
           @focus="emitAction"
           @input="emitAction"
           @blur="emitAction"
           ></el-input>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script>
  import ModalSelect from '../ModalSelect/index.vue';
  import Vue from 'vue';
  import {watchWidth} from '../../Theme/checkScreen.js';
  
  
  export default {
    components: {
      ModalSelect
    },
    props:{
      fields: {
        type: Array,
        default: []
      },
      formData: {
        type: Object,
        default: () => ({})
      },
      error: {
        type: Object,
        default: () => ({})
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      hidden: {
        type: Function,
        default: Function.prototype,
      },
      cols: {
        type: [String, Number],
        default: 'auto',
      },
      labelSpan: {
        type: Number,
        default: 10,
      }
    },
    data() {

      return {
        // screen: '',
        hiddenFields: [],
      };
    },
    created(){
    },
    mounted() {
    },
    beforeUpdate() {
    },
    updated(){
      // console.log(this.formData.anamnesis)
    },
    methods:{
      emitAction() {
        this.$emit('formAction');
      },
      setReauiredClass(field){
        const classes = ['text-right'];
        
        if (field.required) {
          classes.push('required');
        }
        
        return classes.join(' ');
      },
      setErrorClass(field) {
        const classes = [];
        if (this.error[field.field]) {
          classes.push('error');
        }
        
        return classes.join(' ');
      }
    }
  }
  
</script>

<style>
</style>
